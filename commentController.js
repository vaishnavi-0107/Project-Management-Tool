/**
 * Comment Controller
 * Threaded comments with @mentions
 */

const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/comments?taskId=xxx
 */
const getComments = asyncHandler(async (req, res) => {
  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: 'taskId is required.' });

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id)) {
    return res.status(403).json({ error: 'Not a project member.' });
  }

  // Get top-level comments with replies
  const comments = await Comment.find({
    task: taskId,
    parentComment: null,
    isDeleted: false,
  })
    .populate('author', 'name email avatar avatarColor')
    .populate('mentions', 'name email')
    .populate({
      path: 'replies',
      match: { isDeleted: false },
      populate: [
        { path: 'author', select: 'name email avatar avatarColor' },
        { path: 'mentions', select: 'name email' },
      ],
    })
    .sort({ createdAt: 1 });

  res.json({ success: true, comments });
});

/**
 * POST /api/comments
 */
const createComment = asyncHandler(async (req, res) => {
  const { content, taskId, parentCommentId } = req.body;

  if (!content || !taskId) {
    return res.status(400).json({ error: 'content and taskId are required.' });
  }

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const project = await Project.findById(task.project);
  if (!project.isMember(req.user._id)) {
    return res.status(403).json({ error: 'Not a project member.' });
  }

  // Extract @mentions from content
  const mentionIds = Comment.extractMentions(content);

  const comment = await Comment.create({
    content,
    task: taskId,
    project: task.project,
    author: req.user._id,
    parentComment: parentCommentId || null,
    mentions: mentionIds,
  });

  const populated = await comment.populate([
    { path: 'author', select: 'name email avatar avatarColor' },
    { path: 'mentions', select: 'name email' },
  ]);

  const io = req.app.get('io');
  io.to(`task:${taskId}`).emit('comment:created', populated);
  io.to(`project:${task.project}`).emit('comment:added', {
    taskId,
    comment: populated,
  });

  // Notify task assignees and watchers
  const notifyUsers = new Set([
    ...task.assignees.map(id => id.toString()),
    ...task.watchedBy.map(id => id.toString()),
  ]);
  notifyUsers.delete(req.user._id.toString());

  for (const userId of notifyUsers) {
    await Notification.createAndEmit(io, {
      recipient: userId,
      sender: req.user._id,
      type: 'task_commented',
      title: 'New Comment',
      message: `${req.user.name} commented on "${task.title}"`,
      entityType: 'task',
      entityId: task._id,
      projectId: task.project,
      link: `/projects/${task.project}/tasks/${task._id}`,
    });
  }

  // Notify mentioned users
  for (const userId of mentionIds) {
    if (userId !== req.user._id.toString() && !notifyUsers.has(userId)) {
      await Notification.createAndEmit(io, {
        recipient: userId,
        sender: req.user._id,
        type: 'mention',
        title: 'You were mentioned',
        message: `${req.user.name} mentioned you in "${task.title}"`,
        entityType: 'comment',
        entityId: comment._id,
        projectId: task.project,
        link: `/projects/${task.project}/tasks/${task._id}`,
      });
    }
  }

  // Notify parent comment author on reply
  if (parentCommentId) {
    const parent = await Comment.findById(parentCommentId);
    if (parent && parent.author.toString() !== req.user._id.toString()) {
      await Notification.createAndEmit(io, {
        recipient: parent.author,
        sender: req.user._id,
        type: 'comment_reply',
        title: 'Reply to your comment',
        message: `${req.user.name} replied to your comment`,
        entityType: 'comment',
        entityId: comment._id,
        projectId: task.project,
        link: `/projects/${task.project}/tasks/${task._id}`,
      });
    }
  }

  res.status(201).json({ success: true, comment: populated });
});

/**
 * PUT /api/comments/:id
 */
const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  if (comment.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Can only edit your own comments.' });
  }

  comment.content = req.body.content;
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();

  const populated = await comment.populate('author', 'name email avatar avatarColor');

  const io = req.app.get('io');
  io.to(`task:${comment.task}`).emit('comment:updated', populated);

  res.json({ success: true, comment: populated });
});

/**
 * DELETE /api/comments/:id
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  if (comment.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Can only delete your own comments.' });
  }

  // Soft delete
  comment.isDeleted = true;
  comment.content = '[deleted]';
  await comment.save();

  const io = req.app.get('io');
  io.to(`task:${comment.task}`).emit('comment:deleted', { commentId: comment._id });

  res.json({ success: true, message: 'Comment deleted.' });
});

/**
 * POST /api/comments/:id/react
 * Add/remove emoji reaction
 */
const toggleReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const existing = comment.reactions.find(r => r.emoji === emoji);
  if (existing) {
    const idx = existing.users.indexOf(req.user._id);
    if (idx > -1) {
      existing.users.splice(idx, 1);
      if (existing.users.length === 0) {
        comment.reactions = comment.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      existing.users.push(req.user._id);
    }
  } else {
    comment.reactions.push({ emoji, users: [req.user._id] });
  }

  await comment.save();
  res.json({ success: true, reactions: comment.reactions });
});

module.exports = { getComments, createComment, updateComment, deleteComment, toggleReaction };

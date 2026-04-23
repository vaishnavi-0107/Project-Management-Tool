/**
 * Task Controller
 * Full CRUD for tasks + drag/drop reordering
 */

const Task = require('../models/Task');
const Board = require('../models/Board');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middlewares/errorHandler');

const verifyMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found.', status: 404 };
  if (!project.isMember(userId)) return { error: 'Not a project member.', status: 403 };
  return { project };
};

/**
 * GET /api/tasks?boardId=xxx
 */
const getTasks = asyncHandler(async (req, res) => {
  const { boardId, projectId, assignee, priority, search } = req.query;

  const filter = { isArchived: false };
  if (boardId) filter.board = boardId;
  if (projectId) filter.project = projectId;
  if (assignee) filter.assignees = assignee;
  if (priority) filter.priority = priority;
  if (search) filter.$text = { $search: search };

  const tasks = await Task.find(filter)
    .populate('assignees', 'name email avatar avatarColor')
    .populate('createdBy', 'name email avatar avatarColor')
    .sort({ columnId: 1, order: 1 });

  res.json({ success: true, tasks });
});

/**
 * POST /api/tasks
 */
const createTask = asyncHandler(async (req, res) => {
  const {
    title, description, boardId, projectId, columnId,
    assignees, priority, dueDate, startDate, labels, estimatedHours,
  } = req.body;

  if (!title || !boardId || !projectId || !columnId) {
    return res.status(400).json({ error: 'title, boardId, projectId, columnId are required.' });
  }

  const { error, status } = await verifyMember(projectId, req.user._id);
  if (error) return res.status(status).json({ error });

  // Get current max order in column
  const maxOrder = await Task.findOne({ board: boardId, columnId })
    .sort({ order: -1 }).select('order');

  const task = await Task.create({
    title, description, board: boardId, project: projectId, columnId,
    assignees: assignees || [], priority, dueDate, startDate, labels,
    estimatedHours, createdBy: req.user._id,
    order: maxOrder ? maxOrder.order + 1 : 0,
  });

  const populated = await task.populate([
    { path: 'assignees', select: 'name email avatar avatarColor' },
    { path: 'createdBy', select: 'name email avatar avatarColor' },
  ]);

  const io = req.app.get('io');
  io.to(`project:${projectId}`).emit('task:created', populated);

  // Notify assignees
  if (assignees && assignees.length > 0) {
    for (const userId of assignees) {
      if (userId.toString() !== req.user._id.toString()) {
        await Notification.createAndEmit(io, {
          recipient: userId,
          sender: req.user._id,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `${req.user.name} assigned you to "${title}"`,
          entityType: 'task',
          entityId: task._id,
          projectId,
          link: `/projects/${projectId}/tasks/${task._id}`,
        });
      }
    }
  }

  res.status(201).json({ success: true, task: populated });
});

/**
 * GET /api/tasks/:id
 */
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignees', 'name email avatar avatarColor')
    .populate('createdBy', 'name email avatar avatarColor')
    .populate('watchedBy', 'name email avatar avatarColor')
    .populate('commentCount');

  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const { error, status } = await verifyMember(task.project, req.user._id);
  if (error) return res.status(status).json({ error });

  res.json({ success: true, task });
});

/**
 * PUT /api/tasks/:id
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const { error, status } = await verifyMember(task.project, req.user._id);
  if (error) return res.status(status).json({ error });

  const {
    title, description, columnId, assignees, priority, status: taskStatus,
    dueDate, startDate, labels, estimatedHours, checklist, coverColor,
  } = req.body;

  // Track assignee changes for notifications
  const prevAssignees = task.assignees.map(a => a.toString());

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (columnId !== undefined) updates.columnId = columnId;
  if (assignees !== undefined) updates.assignees = assignees;
  if (priority !== undefined) updates.priority = priority;
  if (taskStatus !== undefined) updates.status = taskStatus;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (startDate !== undefined) updates.startDate = startDate;
  if (labels !== undefined) updates.labels = labels;
  if (estimatedHours !== undefined) updates.estimatedHours = estimatedHours;
  if (checklist !== undefined) updates.checklist = checklist;
  if (coverColor !== undefined) updates.coverColor = coverColor;

  Object.assign(task, updates);
  await task.save();

  const populated = await task.populate([
    { path: 'assignees', select: 'name email avatar avatarColor' },
    { path: 'createdBy', select: 'name email avatar avatarColor' },
  ]);

  const io = req.app.get('io');
  io.to(`project:${task.project}`).emit('task:updated', populated);

  // Notify new assignees
  if (assignees) {
    const newAssignees = assignees.filter(id => !prevAssignees.includes(id.toString()));
    for (const userId of newAssignees) {
      if (userId.toString() !== req.user._id.toString()) {
        await Notification.createAndEmit(io, {
          recipient: userId,
          sender: req.user._id,
          type: 'task_assigned',
          title: 'Task Assigned',
          message: `${req.user.name} assigned you to "${task.title}"`,
          entityType: 'task',
          entityId: task._id,
          projectId: task.project,
          link: `/projects/${task.project}/tasks/${task._id}`,
        });
      }
    }
  }

  res.json({ success: true, task: populated });
});

/**
 * DELETE /api/tasks/:id
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const { error, status } = await verifyMember(task.project, req.user._id);
  if (error) return res.status(status).json({ error });

  const projectId = task.project;
  const taskId = task._id;
  await task.deleteOne();

  const io = req.app.get('io');
  io.to(`project:${projectId}`).emit('task:deleted', { taskId, projectId });

  res.json({ success: true, message: 'Task deleted.' });
});

/**
 * PUT /api/tasks/reorder
 * Drag-and-drop reorder (move task between columns)
 */
const reorderTasks = asyncHandler(async (req, res) => {
  const { taskId, sourceColumnId, destColumnId, newOrder, projectId } = req.body;

  const { error, status } = await verifyMember(projectId, req.user._id);
  if (error) return res.status(status).json({ error });

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  // If moving to a different column, shift other tasks
  if (sourceColumnId !== destColumnId) {
    // Remove gap in source column
    await Task.updateMany(
      { board: task.board, columnId: sourceColumnId, order: { $gt: task.order } },
      { $inc: { order: -1 } }
    );

    // Make space in dest column
    await Task.updateMany(
      { board: task.board, columnId: destColumnId, order: { $gte: newOrder } },
      { $inc: { order: 1 } }
    );

    task.columnId = destColumnId;
  } else {
    // Same column reorder
    if (newOrder > task.order) {
      await Task.updateMany(
        { board: task.board, columnId: sourceColumnId, order: { $gt: task.order, $lte: newOrder } },
        { $inc: { order: -1 } }
      );
    } else {
      await Task.updateMany(
        { board: task.board, columnId: sourceColumnId, order: { $gte: newOrder, $lt: task.order } },
        { $inc: { order: 1 } }
      );
    }
  }

  task.order = newOrder;
  await task.save();

  const io = req.app.get('io');
  io.to(`project:${projectId}`).emit('task:moved', {
    taskId, sourceColumnId, destColumnId, newOrder,
  });

  res.json({ success: true, message: 'Task reordered.' });
});

/**
 * POST /api/tasks/:id/watch
 * Toggle watching a task
 */
const toggleWatch = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const watching = task.watchedBy.includes(req.user._id);
  if (watching) {
    task.watchedBy = task.watchedBy.filter(id => id.toString() !== req.user._id.toString());
  } else {
    task.watchedBy.push(req.user._id);
  }
  await task.save();

  res.json({ success: true, watching: !watching });
});

module.exports = {
  getTasks, createTask, getTask, updateTask, deleteTask,
  reorderTasks, toggleWatch,
};

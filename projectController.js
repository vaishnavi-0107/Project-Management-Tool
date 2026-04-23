/**
 * Project Controller
 * CRUD + member management for projects
 */

const Project = require('../models/Project');
const Board = require('../models/Board');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/projects
 * Get all projects for current user
 */
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
    isArchived: false,
  })
    .populate('owner', 'name email avatar avatarColor')
    .populate('members.user', 'name email avatar avatarColor')
    .sort({ updatedAt: -1 });

  res.json({ success: true, projects });
});

/**
 * POST /api/projects
 * Create a new project
 */
const createProject = asyncHandler(async (req, res) => {
  const { name, description, color, icon, isPublic, tags } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  const project = await Project.create({
    name,
    description,
    color,
    icon,
    isPublic,
    tags,
    owner: req.user._id,
    members: [],
  });

  // Create a default board for the project
  await Board.create({
    title: 'Main Board',
    project: project._id,
    order: 0,
  });

  const populated = await project.populate([
    { path: 'owner', select: 'name email avatar avatarColor' },
  ]);

  res.status(201).json({ success: true, project: populated });
});

/**
 * GET /api/projects/:id
 * Get a single project
 */
const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email avatar avatarColor')
    .populate('members.user', 'name email avatar avatarColor');

  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  if (!project.isMember(req.user._id)) {
    return res.status(403).json({ error: 'Not a project member.' });
  }

  res.json({ success: true, project });
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  if (project.getUserRole(req.user._id) !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { name, description, color, icon, isPublic, tags } = req.body;
  Object.assign(project, { name, description, color, icon, isPublic, tags });
  await project.save();

  res.json({ success: true, project });
});

/**
 * DELETE /api/projects/:id
 * Delete a project (owner only)
 */
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the project owner can delete it.' });
  }

  // Cascade delete boards and tasks
  const boards = await Board.find({ project: project._id });
  await Task.deleteMany({ project: project._id });
  await Board.deleteMany({ project: project._id });
  await project.deleteOne();

  res.json({ success: true, message: 'Project deleted successfully.' });
});

/**
 * POST /api/projects/:id/members
 * Invite a user to the project
 */
const addMember = asyncHandler(async (req, res) => {
  const { email, userId, role = 'member' } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found.' });

  if (project.getUserRole(req.user._id) !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  // Find user by email or userId
  const query = email ? { email: email.toLowerCase() } : { _id: userId };
  const user = await User.findOne(query);

  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (project.isMember(user._id)) {
    return res.status(409).json({ error: 'User is already a project member.' });
  }

  project.members.push({ user: user._id, role });
  await project.save();

  // Send notification
  const io = req.app.get('io');
  await Notification.createAndEmit(io, {
    recipient: user._id,
    sender: req.user._id,
    type: 'project_invite',
    title: 'Project Invitation',
    message: `${req.user.name} invited you to join "${project.name}"`,
    entityType: 'project',
    entityId: project._id,
    projectId: project._id,
    link: `/projects/${project._id}`,
  });

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email avatar avatarColor')
    .populate('members.user', 'name email avatar avatarColor');

  res.json({ success: true, project: updated });
});

/**
 * DELETE /api/projects/:id/members/:userId
 * Remove a member from the project
 */
const removeMember = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const isAdmin = project.getUserRole(req.user._id) === 'admin';
  const isSelf = req.params.userId === req.user._id.toString();

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Cannot remove this member.' });
  }

  project.members = project.members.filter(
    m => m.user.toString() !== req.params.userId
  );
  await project.save();

  res.json({ success: true, message: 'Member removed.' });
});

/**
 * PUT /api/projects/:id/members/:userId/role
 * Update member role
 */
const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found.' });

  if (project.getUserRole(req.user._id) !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const member = project.members.find(m => m.user.toString() === req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found.' });

  member.role = role;
  await project.save();

  res.json({ success: true, message: 'Role updated.' });
});

module.exports = {
  getProjects, createProject, getProject, updateProject,
  deleteProject, addMember, removeMember, updateMemberRole,
};

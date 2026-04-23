/**
 * Board Controller
 * Manages kanban boards and columns
 */

const Board = require('../models/Board');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { asyncHandler } = require('../middlewares/errorHandler');

// Verify project membership helper
const verifyMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found.', status: 404 };
  if (!project.isMember(userId)) return { error: 'Not a project member.', status: 403 };
  return { project };
};

/**
 * GET /api/boards?projectId=xxx
 */
const getBoards = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: 'projectId is required.' });

  const { error, status } = await verifyMember(projectId, req.user._id);
  if (error) return res.status(status).json({ error });

  const boards = await Board.find({ project: projectId, isArchived: false })
    .sort({ order: 1, createdAt: 1 });

  res.json({ success: true, boards });
});

/**
 * POST /api/boards
 */
const createBoard = asyncHandler(async (req, res) => {
  const { title, description, projectId, background } = req.body;

  const { error, status } = await verifyMember(projectId, req.user._id);
  if (error) return res.status(status).json({ error });

  const count = await Board.countDocuments({ project: projectId });
  const board = await Board.create({
    title, description, project: projectId, background, order: count,
  });

  const io = req.app.get('io');
  io.to(`project:${projectId}`).emit('board:created', board);

  res.status(201).json({ success: true, board });
});

/**
 * PUT /api/boards/:id
 */
const updateBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });

  const { error, status } = await verifyMember(board.project, req.user._id);
  if (error) return res.status(status).json({ error });

  const { title, description, background } = req.body;
  Object.assign(board, { title, description, background });
  await board.save();

  const io = req.app.get('io');
  io.to(`project:${board.project}`).emit('board:updated', board);

  res.json({ success: true, board });
});

/**
 * DELETE /api/boards/:id
 */
const deleteBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });

  const { error, status, project } = await verifyMember(board.project, req.user._id);
  if (error) return res.status(status).json({ error });

  if (project.getUserRole(req.user._id) !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  await Task.deleteMany({ board: board._id });
  await board.deleteOne();

  const io = req.app.get('io');
  io.to(`project:${board.project}`).emit('board:deleted', { boardId: board._id });

  res.json({ success: true, message: 'Board deleted.' });
});

/**
 * POST /api/boards/:id/columns
 * Add a column to board
 */
const addColumn = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });

  const { error, status } = await verifyMember(board.project, req.user._id);
  if (error) return res.status(status).json({ error });

  const { title, color } = req.body;
  const order = board.columns.length;
  board.columns.push({ title, color: color || '#6366f1', order });
  await board.save();

  const newColumn = board.columns[board.columns.length - 1];

  const io = req.app.get('io');
  io.to(`project:${board.project}`).emit('column:created', {
    boardId: board._id,
    column: newColumn,
  });

  res.status(201).json({ success: true, board, column: newColumn });
});

/**
 * PUT /api/boards/:id/columns/:columnId
 */
const updateColumn = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });

  const { error, status } = await verifyMember(board.project, req.user._id);
  if (error) return res.status(status).json({ error });

  const column = board.columns.id(req.params.columnId);
  if (!column) return res.status(404).json({ error: 'Column not found.' });

  const { title, color, limit } = req.body;
  if (title !== undefined) column.title = title;
  if (color !== undefined) column.color = color;
  if (limit !== undefined) column.limit = limit;

  await board.save();

  const io = req.app.get('io');
  io.to(`project:${board.project}`).emit('column:updated', {
    boardId: board._id,
    column,
  });

  res.json({ success: true, board, column });
});

/**
 * DELETE /api/boards/:id/columns/:columnId
 */
const deleteColumn = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });

  const { error, status } = await verifyMember(board.project, req.user._id);
  if (error) return res.status(status).json({ error });

  await Task.deleteMany({ board: board._id, columnId: req.params.columnId });

  board.columns = board.columns.filter(
    c => c._id.toString() !== req.params.columnId
  );
  await board.save();

  const io = req.app.get('io');
  io.to(`project:${board.project}`).emit('column:deleted', {
    boardId: board._id,
    columnId: req.params.columnId,
  });

  res.json({ success: true, message: 'Column deleted.' });
});

/**
 * PUT /api/boards/:id/columns/reorder
 */
const reorderColumns = asyncHandler(async (req, res) => {
  const { columnOrders } = req.body; // [{ id, order }]
  const board = await Board.findById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });

  const { error, status } = await verifyMember(board.project, req.user._id);
  if (error) return res.status(status).json({ error });

  columnOrders.forEach(({ id, order }) => {
    const col = board.columns.id(id);
    if (col) col.order = order;
  });

  board.columns.sort((a, b) => a.order - b.order);
  await board.save();

  const io = req.app.get('io');
  io.to(`project:${board.project}`).emit('columns:reordered', {
    boardId: board._id,
    columns: board.columns,
  });

  res.json({ success: true, board });
});

module.exports = {
  getBoards, createBoard, updateBoard, deleteBoard,
  addColumn, updateColumn, deleteColumn, reorderColumns,
};

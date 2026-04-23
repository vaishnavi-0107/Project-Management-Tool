/**
 * Task Model
 * Individual cards on a kanban board
 */

const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  url: String,
  mimetype: String,
  size: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 200 },
  completed: { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  order: { type: Number, default: 0 },
}, { _id: true });

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  columnId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // Reference to board's column._id
  },
  order: {
    type: Number,
    default: 0, // Order within column
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  priority: {
    type: String,
    enum: ['none', 'low', 'medium', 'high', 'urgent'],
    default: 'none',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'blocked', 'cancelled'],
    default: 'open',
  },
  dueDate: {
    type: Date,
    default: null,
  },
  startDate: {
    type: Date,
    default: null,
  },
  estimatedHours: {
    type: Number,
    min: 0,
    max: 1000,
    default: null,
  },
  labels: [{
    text: String,
    color: String,
  }],
  attachments: [attachmentSchema],
  checklist: [checklistItemSchema],
  isArchived: {
    type: Boolean,
    default: false,
  },
  coverColor: {
    type: String,
    default: null,
  },
  watchedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ───────────────────────────────────────────────
taskSchema.index({ board: 1, columnId: 1, order: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// ─── Virtual: completion percentage ───────────────────────
taskSchema.virtual('checklistProgress').get(function () {
  if (!this.checklist || this.checklist.length === 0) return null;
  const done = this.checklist.filter(i => i.completed).length;
  return Math.round((done / this.checklist.length) * 100);
});

// ─── Virtual: isOverdue ────────────────────────────────────
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.status !== 'completed';
});

// ─── Virtual: comment count ────────────────────────────────
taskSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'task',
  count: true,
});

module.exports = mongoose.model('Task', taskSchema);

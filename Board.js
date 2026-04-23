/**
 * Board Model
 * Kanban board within a project (contains columns)
 */

const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  color: {
    type: String,
    default: '#6366f1',
  },
  order: {
    type: Number,
    required: true,
  },
  limit: {
    type: Number,
    default: null, // WIP limit (null = unlimited)
  },
}, { _id: true });

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Board title is required'],
    trim: true,
    maxlength: [100, 'Board title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  columns: [columnSchema],
  background: {
    type: String,
    default: 'gradient-1', // Can be gradient key or hex color
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// ─── Indexes ───────────────────────────────────────────────
boardSchema.index({ project: 1 });

// ─── Pre-save: Default columns ─────────────────────────────
boardSchema.pre('save', function (next) {
  if (this.isNew && this.columns.length === 0) {
    this.columns = [
      { title: 'To Do', color: '#6366f1', order: 0 },
      { title: 'In Progress', color: '#f59e0b', order: 1 },
      { title: 'Done', color: '#10b981', order: 2 },
    ];
  }
  next();
});

module.exports = mongoose.model('Board', boardSchema);

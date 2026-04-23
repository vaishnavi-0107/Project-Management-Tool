/**
 * Project Model
 * Top-level container for boards and tasks
 */

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [memberSchema],
  color: {
    type: String,
    default: () => {
      const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
      return colors[Math.floor(Math.random() * colors.length)];
    },
  },
  icon: {
    type: String,
    default: '📋',
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  activityLog: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    entity: String,
    entityId: mongoose.Schema.Types.ObjectId,
    timestamp: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ───────────────────────────────────────────────
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ name: 'text', description: 'text' });

// ─── Virtual: member count ─────────────────────────────────
projectSchema.virtual('memberCount').get(function () {
  return this.members.length + 1; // +1 for owner
});

// ─── Method: Check if user is member ──────────────────────
projectSchema.methods.isMember = function (userId) {
  if (this.owner.toString() === userId.toString()) return true;
  return this.members.some(m => m.user.toString() === userId.toString());
};

// ─── Method: Get user role ─────────────────────────────────
projectSchema.methods.getUserRole = function (userId) {
  if (this.owner.toString() === userId.toString()) return 'admin';
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

module.exports = mongoose.model('Project', projectSchema);

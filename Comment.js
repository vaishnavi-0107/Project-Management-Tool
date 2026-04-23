/**
 * Comment Model
 * Threaded comments on tasks with @mention support
 */

const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: String,
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null, // null = top-level comment
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  reactions: [reactionSchema],
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  attachments: [{
    filename: String,
    url: String,
    mimetype: String,
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// ─── Indexes ───────────────────────────────────────────────
commentSchema.index({ task: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ author: 1 });

// ─── Virtual: replies count ────────────────────────────────
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

// ─── Parse @mentions from content ─────────────────────────
commentSchema.statics.extractMentions = function (content) {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]); // user ID
  }
  return mentions;
};

module.exports = mongoose.model('Comment', commentSchema);

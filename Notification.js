/**
 * Notification Model
 * In-app notifications for users
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'task_assigned',
      'task_updated',
      'task_commented',
      'task_due_soon',
      'project_invite',
      'project_updated',
      'mention',
      'comment_reply',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  // Reference to the related entity
  entityType: {
    type: String,
    enum: ['task', 'project', 'comment', 'board'],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  link: String, // Frontend URL to navigate to
}, {
  timestamps: true,
});

// ─── Indexes ───────────────────────────────────────────────
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL: 30 days

// ─── Static: Create and emit notification ──────────────────
notificationSchema.statics.createAndEmit = async function (io, data) {
  try {
    const notification = await this.create(data);
    const populated = await notification.populate([
      { path: 'sender', select: 'name avatar avatarColor' },
    ]);

    // Emit via Socket.io to the recipient
    if (io) {
      io.to(`user:${data.recipient}`).emit('notification:new', populated);
    }

    return populated;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);

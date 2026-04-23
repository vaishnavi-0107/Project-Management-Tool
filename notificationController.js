/**
 * Notification Controller
 */

const Notification = require('../models/Notification');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar avatarColor')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({ success: true, notifications, unreadCount });
});

/**
 * PUT /api/notifications/:id/read
 */
const markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true });
});

/**
 * PUT /api/notifications/read-all
 */
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true });
});

/**
 * DELETE /api/notifications/:id
 */
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  res.json({ success: true });
});

module.exports = { getNotifications, markRead, markAllRead, deleteNotification };

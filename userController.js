/**
 * User Controller
 * Search and profile operations
 */

const User = require('../models/User');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/users/search?q=name
 * Search users by name or email (for inviting to projects)
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters.' });
  }

  const users = await User.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ],
    isActive: true,
    _id: { $ne: req.user._id }, // Exclude self
  })
    .select('name email avatar avatarColor')
    .limit(10);

  res.json({ success: true, users });
});

/**
 * GET /api/users/:id
 * Get user profile
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ success: true, user });
});

module.exports = { searchUsers, getUserProfile };

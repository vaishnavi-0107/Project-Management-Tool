/**
 * Auth Controller
 * Handles signup, login, logout, refresh, profile
 */

const User = require('../models/User');
const { sendTokenResponse, verifyRefreshToken, generateAccessToken } = require('../utils/jwt');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const user = await User.create({ name, email, password });
  sendTokenResponse(user, 201, res);
});

/**
 * POST /api/auth/login
 * Login with email + password
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Include password field explicitly
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  sendTokenResponse(user, 200, res);
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required.' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'User not found.' });
  }

  const accessToken = generateAccessToken(user._id);
  res.json({ success: true, accessToken });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, avatarColor, notificationPreferences } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, avatar, avatarColor, notificationPreferences },
    { new: true, runValidators: true }
  );

  res.json({ success: true, user });
});

/**
 * PUT /api/auth/password
 * Change password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required.' });
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully.' });
});

module.exports = { register, login, refreshToken, getMe, updateProfile, changePassword };

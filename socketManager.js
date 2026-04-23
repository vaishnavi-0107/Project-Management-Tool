/**
 * Socket.io Manager
 * Handles real-time WebSocket connections, rooms, and events
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth Middleware ─────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // ── Project room management ──────────────────────────
    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`  ↳ Joined project room: ${projectId}`);
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // ── Task room (for live comment updates) ─────────────
    socket.on('task:join', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:leave', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    // ── Presence: typing indicators ──────────────────────
    socket.on('typing:start', ({ taskId }) => {
      socket.to(`task:${taskId}`).emit('typing:start', {
        userId,
        user: { name: socket.user.name, avatar: socket.user.avatar, avatarColor: socket.user.avatarColor },
      });
    });

    socket.on('typing:stop', ({ taskId }) => {
      socket.to(`task:${taskId}`).emit('typing:stop', { userId });
    });

    // ── Cursor presence for board ─────────────────────────
    socket.on('board:cursor', ({ projectId, position }) => {
      socket.to(`project:${projectId}`).emit('board:cursor', {
        userId,
        user: { name: socket.user.name, avatarColor: socket.user.avatarColor },
        position,
      });
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.user.name} (${reason})`);
    });

    // ── Error ─────────────────────────────────────────────
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initializeSocket, getIO };

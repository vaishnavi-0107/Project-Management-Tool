/**
 * Socket.io Client Service
 * Manages WebSocket connection and event subscriptions
 */

import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export const initSocket = (token) => {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message)
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const joinProject = (projectId) => {
  socket?.emit('project:join', projectId)
}

export const leaveProject = (projectId) => {
  socket?.emit('project:leave', projectId)
}

export const joinTask = (taskId) => {
  socket?.emit('task:join', taskId)
}

export const leaveTask = (taskId) => {
  socket?.emit('task:leave', taskId)
}

export const emitTyping = (taskId, isTyping) => {
  socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { taskId })
}

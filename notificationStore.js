/**
 * Notification Store (Zustand)
 */

import { create } from 'zustand'
import { notificationAPI } from '../services/api'
import { getSocket } from '../services/socket'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const { data } = await notificationAPI.getAll()
      set({ notifications: data.notifications, unreadCount: data.unreadCount, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  markRead: async (id) => {
    await notificationAPI.markRead(id)
    set((state) => ({
      notifications: state.notifications.map(n =>
        n._id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllRead: async () => {
    await notificationAPI.markAllRead()
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
  },

  remove: async (id) => {
    await notificationAPI.delete(id)
    set((state) => ({
      notifications: state.notifications.filter(n => n._id !== id),
    }))
  },

  // Subscribe to socket events
  subscribeToSocket: () => {
    const socket = getSocket()
    if (!socket) return
    socket.on('notification:new', (notification) => {
      get().addNotification(notification)
    })
  },
}))

export default useNotificationStore

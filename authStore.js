/**
 * Auth Store (Zustand)
 * Global auth state + token management
 */

import { create } from 'zustand'
import { authAPI } from '../services/api'
import { initSocket, disconnectSocket } from '../services/socket'

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // ── Initialize from localStorage ─────────────────────────
  init: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const { data } = await authAPI.getMe()
      set({ user: data.user, isAuthenticated: true, isLoading: false })
      initSocket(token)
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({ isLoading: false })
    }
  },

  // ── Login ─────────────────────────────────────────────────
  login: async (credentials) => {
    const { data } = await authAPI.login(credentials)
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({ user: data.user, isAuthenticated: true })
    initSocket(data.accessToken)
    return data
  },

  // ── Register ──────────────────────────────────────────────
  register: async (userData) => {
    const { data } = await authAPI.register(userData)
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({ user: data.user, isAuthenticated: true })
    initSocket(data.accessToken)
    return data
  },

  // ── Logout ────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    disconnectSocket()
    set({ user: null, isAuthenticated: false })
  },

  // ── Update profile ────────────────────────────────────────
  updateUser: (updates) => {
    set((state) => ({ user: { ...state.user, ...updates } }))
  },
}))

export default useAuthStore

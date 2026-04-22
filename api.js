/**
 * API Service
 * Axios instance with JWT auth interceptors & auto-refresh
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ─── Request interceptor: attach token ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor: auto-refresh on 401 ─────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  )
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
        processQueue(null, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── API methods ────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
}

export const projectAPI = {
  getAll:   ()           => api.get('/projects'),
  getOne:   (id)         => api.get(`/projects/${id}`),
  create:   (data)       => api.post('/projects', data),
  update:   (id, data)   => api.put(`/projects/${id}`, data),
  delete:   (id)         => api.delete(`/projects/${id}`),
  addMember:    (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, uid)  => api.delete(`/projects/${id}/members/${uid}`),
  updateRole:   (id, uid, data) => api.put(`/projects/${id}/members/${uid}/role`, data),
}

export const boardAPI = {
  getAll:   (projectId)  => api.get('/boards', { params: { projectId } }),
  create:   (data)       => api.post('/boards', data),
  update:   (id, data)   => api.put(`/boards/${id}`, data),
  delete:   (id)         => api.delete(`/boards/${id}`),
  addColumn:      (id, data)        => api.post(`/boards/${id}/columns`, data),
  updateColumn:   (id, colId, data) => api.put(`/boards/${id}/columns/${colId}`, data),
  deleteColumn:   (id, colId)       => api.delete(`/boards/${id}/columns/${colId}`),
  reorderColumns: (id, data)        => api.put(`/boards/${id}/columns/reorder`, data),
}

export const taskAPI = {
  getAll:   (params)   => api.get('/tasks', { params }),
  getOne:   (id)       => api.get(`/tasks/${id}`),
  create:   (data)     => api.post('/tasks', data),
  update:   (id, data) => api.put(`/tasks/${id}`, data),
  delete:   (id)       => api.delete(`/tasks/${id}`),
  reorder:  (data)     => api.put('/tasks/reorder', data),
  toggleWatch: (id)    => api.post(`/tasks/${id}/watch`),
}

export const commentAPI = {
  getAll:   (taskId) => api.get('/comments', { params: { taskId } }),
  create:   (data)   => api.post('/comments', data),
  update:   (id, data) => api.put(`/comments/${id}`, data),
  delete:   (id)     => api.delete(`/comments/${id}`),
  react:    (id, emoji) => api.post(`/comments/${id}/react`, { emoji }),
}

export const notificationAPI = {
  getAll:    (params) => api.get('/notifications', { params }),
  markRead:  (id)     => api.put(`/notifications/${id}/read`),
  markAllRead: ()     => api.put('/notifications/read-all'),
  delete:    (id)     => api.delete(`/notifications/${id}`),
}

export const userAPI = {
  search:     (q)  => api.get('/users/search', { params: { q } }),
  getProfile: (id) => api.get(`/users/${id}`),
}

export default api

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import useNotificationStore from './store/notificationStore'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import ProfilePage from './pages/ProfilePage'

// Layout
import AppLayout from './components/shared/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoadingScreen from './components/shared/LoadingScreen'

export default function App() {
  const { init, isAuthenticated, isLoading } = useAuthStore()
  const { init: initTheme } = useThemeStore()
  const { subscribeToSocket } = useNotificationStore()

  useEffect(() => {
    initTheme()
    init()
  }, [])

  useEffect(() => {
    if (isAuthenticated) subscribeToSocket()
  }, [isAuthenticated])

  if (isLoading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import useNotificationStore from '../../store/notificationStore'
import { projectAPI } from '../../services/api'
import Avatar from './Avatar'
import NotificationPanel from '../notifications/NotificationPanel'

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuthStore()
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const { unreadCount, fetchNotifications } = useNotificationStore()
  const [projects, setProjects] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const navigate = useNavigate()
  const { projectId } = useParams()

  useEffect(() => {
    fetchProjects()
    fetchNotifications()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data } = await projectAPI.getAll()
      setProjects(data.projects)
    } catch (e) { console.error(e) }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ background: 'var(--sidebar-bg)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--accent)' }}>P</div>
          <span className="text-white font-bold text-lg tracking-tight">ProjectFlow</span>
          <button onClick={onClose} className="ml-auto lg:hidden text-white/40 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM13 7a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V7zM3 17a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zM13 17a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </NavLink>

          {/* Projects section */}
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/30">Projects</span>
              <NavLink to="/dashboard" className="text-white/30 hover:text-white/60 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </NavLink>
            </div>
            {projects.slice(0, 8).map(project => (
              <NavLink
                key={project._id}
                to={`/projects/${project._id}`}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="text-lg leading-none" style={{ color: project.color }}>
                  {project.icon || '📋'}
                </span>
                <span className="truncate">{project.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="sidebar-link w-full relative"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: 'var(--accent)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dark mode */}
          <button onClick={toggleTheme} className="sidebar-link w-full">
            {isDark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Profile */}
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Avatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.name}</div>
              <div className="text-white/40 text-xs truncate">{user?.email}</div>
            </div>
          </NavLink>

          {/* Logout */}
          <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-400/10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </>
  )
}

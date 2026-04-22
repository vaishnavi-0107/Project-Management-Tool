import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { projectAPI } from '../services/api'
import Modal from '../components/shared/Modal'
import Avatar from '../components/shared/Avatar'
import { formatDistanceToNow } from 'date-fns'

const ICONS = ['📋', '🚀', '💡', '🎯', '🔥', '⚡', '🌟', '🎨', '🛠️', '📊']
const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: '📋', color: COLORS[0] })
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try {
      const { data } = await projectAPI.getAll()
      setProjects(data.projects)
    } catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const { data } = await projectAPI.create(form)
      setProjects(p => [data.project, ...p])
      setShowCreate(false)
      setForm({ name: '', description: '', icon: '📋', color: COLORS[0] })
      toast.success('Project created!')
      navigate(`/projects/${data.project._id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project')
    } finally { setCreating(false) }
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {projects.length === 0
              ? 'Create your first project to get started'
              : `You have ${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-10"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Projects grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-36 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-200)]" />
                <div className="h-4 bg-[var(--surface-200)] rounded w-32" />
              </div>
              <div className="h-3 bg-[var(--surface-200)] rounded w-full mb-2" />
              <div className="h-3 bg-[var(--surface-200)] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">{search ? '🔍' : '📋'}</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {search ? 'No projects match your search' : 'No projects yet'}
          </h3>
          <p className="text-[var(--text-secondary)] mb-6">
            {search ? 'Try a different keyword' : 'Create your first project to organize your work'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => (
            <ProjectCard
              key={project._id}
              project={project}
              onClick={() => navigate(`/projects/${project._id}`)}
            />
          ))}
        </div>
      )}

      {/* Create project modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Project">
        <form onSubmit={handleCreate} className="p-6 space-y-5">
          {/* Icon & Color picker */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Icon</label>
              <div className="grid grid-cols-5 gap-1.5">
                {ICONS.map(icon => (
                  <button key={icon} type="button"
                    onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      form.icon === icon ? 'ring-2 scale-110' : 'hover:bg-[var(--surface-100)]'
                    }`}
                    style={{ ringColor: 'var(--accent)' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Color</label>
              <div className="grid grid-cols-4 gap-1.5">
                {COLORS.map(color => (
                  <button key={color} type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-9 h-9 rounded-lg transition-all ${form.color === color ? 'ring-2 ring-offset-2 scale-110' : ''}`}
                    style={{ background: color, ringColor: color }} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Project Name *</label>
            <input className="input" placeholder="e.g. Website Redesign"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description</label>
            <textarea className="input resize-none" rows={3}
              placeholder="What is this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl border border-[var(--border)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: form.color + '20' }}>
              {form.icon}
            </div>
            <div>
              <div className="font-semibold text-sm text-[var(--text-primary)]">
                {form.name || 'Project Name'}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {form.description || 'No description'}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function ProjectCard({ project, onClick }) {
  const memberCount = (project.members?.length || 0) + 1

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 group"
    >
      {/* Top bar accent */}
      <div className="h-1 -mx-5 -mt-5 mb-4 rounded-t-xl" style={{ background: project.color }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: project.color + '20' }}>
            {project.icon || '📋'}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <svg className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {project.description && (
        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-between">
        {/* Member avatars */}
        <div className="flex -space-x-2">
          <Avatar user={project.owner} size="xs" />
          {project.members?.slice(0, 3).map(m => (
            <Avatar key={m._id} user={m.user} size="xs" />
          ))}
          {memberCount > 4 && (
            <div className="w-6 h-6 rounded-full bg-[var(--surface-200)] border-2 border-white flex items-center justify-center text-xs text-[var(--text-muted)]">
              +{memberCount - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-[var(--text-muted)]">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

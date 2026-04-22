import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { projectAPI, userAPI } from '../../services/api'
import Avatar from '../shared/Avatar'
import Modal from '../shared/Modal'

export default function InviteMemberModal({ project, onClose, onInvited }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState(null)
  const debounce = useRef(null)

  useEffect(() => {
    if (search.length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await userAPI.search(search)
        // Filter out already-members
        const memberIds = new Set([
          project.owner._id,
          ...project.members.map(m => m.user._id || m.user),
        ])
        setResults(data.users.filter(u => !memberIds.has(u._id)))
      } catch { }
      finally { setSearching(false) }
    }, 300)
  }, [search])

  const handleInvite = async (user) => {
    setInviting(user._id)
    try {
      const { data } = await projectAPI.addMember(project._id, { userId: user._id, role: 'member' })
      onInvited(data.project)
      toast.success(`${user.name} invited!`)
      setSearch('')
      setResults([])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to invite')
    } finally { setInviting(null) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Invite Members" size="sm">
      <div className="p-6 space-y-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-10"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {searching && (
          <div className="text-center py-4 text-sm text-[var(--text-muted)]">Searching...</div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map(user => (
              <div key={user._id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-50)] hover:bg-[var(--surface-100)] transition-colors">
                <Avatar user={user} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => handleInvite(user)}
                  disabled={inviting === user._id}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  {inviting === user._id ? '...' : 'Invite'}
                </button>
              </div>
            ))}
          </div>
        )}

        {search.length >= 2 && !searching && results.length === 0 && (
          <p className="text-center py-4 text-sm text-[var(--text-muted)]">No users found</p>
        )}

        {/* Current members */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Current Members ({(project.members?.length || 0) + 1})
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2">
              <Avatar user={project.owner} size="sm" />
              <div className="flex-1">
                <p className="text-sm text-[var(--text-primary)]">{project.owner?.name}</p>
              </div>
              <span className="badge bg-[var(--accent-light)] text-[var(--accent)]">Owner</span>
            </div>
            {project.members?.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Avatar user={m.user} size="sm" />
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">{m.user?.name}</p>
                </div>
                <span className="badge bg-[var(--surface-100)] text-[var(--text-secondary)] capitalize">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

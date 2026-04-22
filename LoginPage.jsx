import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1f36 0%, #2d3352 50%, #1a1f36 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'var(--accent)' }} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'var(--accent)' }} />

        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-8"
            style={{ background: 'var(--accent)' }}>P</div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">ProjectFlow</h1>
          <p className="text-lg text-white/60 max-w-sm leading-relaxed">
            Collaborate in real-time. Organize work with beautiful Kanban boards.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '⚡', title: 'Real-time sync', desc: 'See changes instantly across your team' },
              { icon: '🎯', title: 'Task boards', desc: 'Drag-and-drop Kanban workflows' },
              { icon: '💬', title: 'Team chat', desc: 'Comment threads with @mentions' },
              { icon: '🔔', title: 'Smart alerts', desc: 'Stay on top of every update' },
            ].map(f => (
              <div key={f.title} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-white font-semibold text-sm">{f.title}</div>
                <div className="text-white/40 text-xs mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--surface-50)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--accent)' }}>P</div>
            <span className="font-bold text-xl text-[var(--text-primary)]">ProjectFlow</span>
          </div>

          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Welcome back</h2>
          <p className="text-[var(--text-secondary)] mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-4 p-3 rounded-lg text-xs text-center"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            Demo: <strong>demo@projectflow.com</strong> / <strong>demo1234</strong>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useAuthStore from '../store/authStore'

export default function RegisterPage() {
  const { register } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      toast.success('Account created! Welcome to ProjectFlow 🎉')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--surface-50)]">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--accent)' }}>P</div>
          <span className="font-bold text-xl text-[var(--text-primary)]">ProjectFlow</span>
        </div>

        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Create your account</h2>
        <p className="text-[var(--text-secondary)] mb-8">Free forever. No credit card required.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full Name', field: 'name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email', field: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', field: 'password', type: 'password', placeholder: '6+ characters' },
            { label: 'Confirm Password', field: 'confirm', type: 'password', placeholder: 'Re-enter password' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{label}</label>
              <input type={type} className="input" placeholder={placeholder}
                value={form[field]} onChange={set(field)} required />
            </div>
          ))}

          <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
            {loading ? 'Creating account...' : 'Get started free'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

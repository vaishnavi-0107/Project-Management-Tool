import { useState } from 'react'
import { toast } from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { authAPI } from '../services/api'
import Avatar from '../components/shared/Avatar'

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6']

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ name: user?.name || '', avatarColor: user?.avatarColor || '#6366f1' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await authAPI.updateProfile(form)
      updateUser(data.user)
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update profile') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    setChangingPw(true)
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
      toast.success('Password changed!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profile Settings</h1>

      {/* Profile card */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">Personal Information</h2>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <Avatar user={{ ...user, ...form }} size="xl" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Avatar Color</p>
              <div className="flex gap-2">
                {AVATAR_COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm(f => ({ ...f, avatarColor: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${form.avatarColor === c ? 'ring-2 ring-offset-2 scale-125' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Full Name</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
            <input className="input bg-[var(--surface-100)]" value={user?.email} disabled />
            <p className="text-xs text-[var(--text-muted)] mt-1">Email cannot be changed</p>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password card */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { label: 'Current Password', field: 'currentPassword' },
            { label: 'New Password', field: 'newPassword' },
            { label: 'Confirm New Password', field: 'confirm' },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{label}</label>
              <input type="password" className="input" value={pwForm[field]}
                onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))} required />
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={changingPw}>
            {changingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Account Info</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Member since</span>
            <span className="text-[var(--text-primary)]">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Account type</span>
            <span className="badge bg-[var(--accent-light)] text-[var(--accent)] capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

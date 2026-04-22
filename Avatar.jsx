export default function Avatar({ user, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base', xl: 'w-12 h-12 text-lg' }
  const s = sizes[size] || sizes.md

  if (user?.avatar) {
    return (
      <img src={user.avatar} alt={user.name}
        className={`${s} rounded-full object-cover ring-2 ring-white/20 flex-shrink-0 ${className}`} />
    )
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const color = user?.avatarColor || '#6366f1'

  return (
    <div className={`${s} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${className}`}
      style={{ background: color }}>
      {initials}
    </div>
  )
}

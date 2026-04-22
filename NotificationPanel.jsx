import { formatDistanceToNow } from 'date-fns'
import useNotificationStore from '../../store/notificationStore'

export default function NotificationPanel({ onClose }) {
  const { notifications, markRead, markAllRead, remove } = useNotificationStore()

  const icons = {
    task_assigned:  '👤',
    task_updated:   '✏️',
    task_commented: '💬',
    project_invite: '📨',
    mention:        '@',
    comment_reply:  '↩️',
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed left-64 bottom-4 z-50 w-80 bg-white dark:bg-[var(--surface-100)] rounded-2xl shadow-modal border border-[var(--border)] animate-slide-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Notifications</h3>
          <button onClick={markAllRead}
            className="text-xs text-[var(--accent)] hover:underline font-medium">
            Mark all read
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-96 divide-y divide-[var(--border)]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] text-sm">
              <div className="text-3xl mb-2">🔔</div>
              No notifications yet
            </div>
          ) : notifications.map(n => (
            <div key={n._id}
              className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--surface-50)] transition-colors ${!n.isRead ? 'bg-[var(--accent-light)]' : ''}`}
              onClick={() => markRead(n._id)}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {icons[n.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] font-medium">{n.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{n.message}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--accent)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

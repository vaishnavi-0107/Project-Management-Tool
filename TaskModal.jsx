import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { format, isPast } from 'date-fns'
import { taskAPI, commentAPI } from '../../services/api'
import { joinTask, leaveTask, getSocket, emitTyping } from '../../services/socket'
import useAuthStore from '../../store/authStore'
import Avatar from '../shared/Avatar'
import Modal from '../shared/Modal'

const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent']
const PRIORITY_COLORS = { none: '#9199ba', low: '#3b82f6', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444' }
const LABEL_COLORS = ['#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#6366f1','#8b5cf6','#ec4899']

export default function TaskModal({ task: initialTask, project, members, onClose, onUpdate, onDelete }) {
  const { user } = useAuthStore()
  const [task, setTask] = useState(initialTask)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [showAssignee, setShowAssignee] = useState(false)
  const [showLabelEditor, setShowLabelEditor] = useState(false)
  const [newLabel, setNewLabel] = useState({ text: '', color: LABEL_COLORS[0] })
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimer = useRef(null)
  const commentRef = useRef(null)

  useEffect(() => {
    loadComments()
    joinTask(task._id)

    const socket = getSocket()
    if (socket) {
      socket.on('comment:created', (c) => {
        if (c.task === task._id) {
          setComments(prev => {
            if (prev.some(x => x._id === c._id)) return prev
            return [...prev, c]
          })
        }
      })
      socket.on('comment:updated', (c) => {
        setComments(prev => prev.map(x => x._id === c._id ? c : x))
      })
      socket.on('comment:deleted', ({ commentId }) => {
        setComments(prev => prev.filter(c => c._id !== commentId))
      })
      socket.on('typing:start', ({ userId, user: typingUser }) => {
        if (userId !== user._id) setTypingUsers(p => [...p.filter(u => u.userId !== userId), { userId, ...typingUser }])
      })
      socket.on('typing:stop', ({ userId }) => {
        setTypingUsers(p => p.filter(u => u.userId !== userId))
      })
    }

    return () => {
      leaveTask(task._id)
      socket?.off('comment:created')
      socket?.off('comment:updated')
      socket?.off('comment:deleted')
      socket?.off('typing:start')
      socket?.off('typing:stop')
    }
  }, [task._id])

  const loadComments = async () => {
    try {
      const { data } = await commentAPI.getAll(task._id)
      setComments(data.comments)
    } catch { }
  }

  const updateTask = async (updates) => {
    try {
      const { data } = await taskAPI.update(task._id, updates)
      setTask(data.task)
      onUpdate(data.task)
    } catch { toast.error('Failed to update task') }
  }

  const handleSaveTitle = async () => {
    if (title.trim() && title !== task.title) await updateTask({ title: title.trim() })
    setEditingTitle(false)
  }

  const handleSaveDesc = async () => {
    await updateTask({ description })
    setEditingDesc(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    try {
      await taskAPI.delete(task._id)
      onDelete(task._id)
      toast.success('Task deleted')
    } catch { toast.error('Failed to delete task') }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      await commentAPI.create({ content: commentText.trim(), taskId: task._id })
      setCommentText('')
      clearTimeout(typingTimer.current)
      emitTyping(task._id, false)
    } catch { toast.error('Failed to add comment') }
    finally { setSubmitting(false) }
  }

  const handleCommentInput = (val) => {
    setCommentText(val)
    emitTyping(task._id, true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => emitTyping(task._id, false), 2000)
  }

  const toggleAssignee = async (member) => {
    const uid = member.user._id
    const isAssigned = task.assignees?.some(a => a._id === uid || a === uid)
    const newAssignees = isAssigned
      ? task.assignees.filter(a => (a._id || a) !== uid)
      : [...(task.assignees || []), member.user]
    setTask(t => ({ ...t, assignees: newAssignees }))
    await updateTask({ assignees: newAssignees.map(a => a._id || a) })
  }

  const toggleChecklist = async (itemId) => {
    const newChecklist = task.checklist.map(item =>
      item._id === itemId ? { ...item, completed: !item.completed } : item
    )
    setTask(t => ({ ...t, checklist: newChecklist }))
    await updateTask({ checklist: newChecklist })
  }

  const addChecklistItem = async (text) => {
    if (!text.trim()) return
    const newChecklist = [...(task.checklist || []), { text: text.trim(), completed: false, order: task.checklist?.length || 0 }]
    await updateTask({ checklist: newChecklist })
  }

  const addLabel = async () => {
    if (!newLabel.text.trim()) return
    const labels = [...(task.labels || []), newLabel]
    await updateTask({ labels })
    setNewLabel({ text: '', color: LABEL_COLORS[0] })
  }

  const removeLabel = async (idx) => {
    const labels = task.labels.filter((_, i) => i !== idx)
    await updateTask({ labels })
  }

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed'
  const checklistDone = task.checklist?.filter(i => i.completed).length || 0
  const checklistTotal = task.checklist?.length || 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl bg-white dark:bg-[var(--surface-100)] rounded-2xl shadow-modal animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">

        {/* Cover */}
        {task.coverColor && (
          <div className="h-16 flex-shrink-0" style={{ background: task.coverColor }} />
        )}

        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-5 pb-0">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                className="input text-xl font-bold w-full mb-1"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
              />
            ) : (
              <h2
                className="text-xl font-bold text-[var(--text-primary)] cursor-text hover:bg-[var(--surface-100)] rounded-lg px-1 -mx-1 transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDelete}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-100)] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-0">

            {/* Main column */}
            <div className="flex-1 px-6 py-4 space-y-6">

              {/* Labels */}
              {(task.labels?.length > 0 || showLabelEditor) && (
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {task.labels?.map((label, i) => (
                      <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ background: label.color }}>
                        {label.text}
                        <button onClick={() => removeLabel(i)} className="hover:opacity-70">×</button>
                      </span>
                    ))}
                  </div>
                  {showLabelEditor && (
                    <div className="flex gap-2 items-center p-3 rounded-lg bg-[var(--surface-100)]">
                      <input className="input text-sm flex-1" placeholder="Label text"
                        value={newLabel.text} onChange={e => setNewLabel(l => ({ ...l, text: e.target.value }))} />
                      <div className="flex gap-1">
                        {LABEL_COLORS.map(c => (
                          <button key={c} onClick={() => setNewLabel(l => ({ ...l, color: c }))}
                            className={`w-5 h-5 rounded-full transition-transform ${newLabel.color === c ? 'scale-125 ring-2 ring-offset-1' : ''}`}
                            style={{ background: c }} />
                        ))}
                      </div>
                      <button onClick={addLabel} className="btn-primary text-xs px-3 py-1.5">Add</button>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Description</h3>
                {editingDesc ? (
                  <div>
                    <textarea
                      autoFocus
                      className="input resize-none text-sm"
                      rows={4}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Add a description..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleSaveDesc} className="btn-primary text-xs px-3 py-1.5">Save</button>
                      <button onClick={() => setEditingDesc(false)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-sm text-[var(--text-secondary)] cursor-text hover:bg-[var(--surface-100)] rounded-lg p-2 -mx-2 min-h-16 transition-colors"
                    onClick={() => setEditingDesc(true)}
                  >
                    {task.description || <span className="text-[var(--text-muted)] italic">Click to add a description...</span>}
                  </div>
                )}
              </div>

              {/* Checklist */}
              {task.checklist?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Checklist {checklistTotal > 0 && `(${checklistDone}/${checklistTotal})`}
                    </h3>
                  </div>
                  {checklistTotal > 0 && (
                    <div className="w-full h-1.5 bg-[var(--surface-200)] rounded-full mb-3">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${(checklistDone / checklistTotal) * 100}%`, background: 'var(--accent)' }} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {task.checklist.map(item => (
                      <label key={item._id} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={item.completed}
                          onChange={() => toggleChecklist(item._id)}
                          className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent)]" />
                        <span className={`text-sm ${item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Add checklist item */}
              <AddChecklistItem onAdd={addChecklistItem} />

              {/* Comments */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Comments ({comments.length})
                </h3>
                <div className="space-y-4">
                  {comments.map(comment => (
                    <CommentItem key={comment._id} comment={comment} currentUser={user} />
                  ))}
                </div>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
                    <div className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}

                {/* Comment input */}
                <form onSubmit={handleAddComment} className="flex gap-3 mt-4">
                  <Avatar user={user} size="sm" className="flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <textarea
                      ref={commentRef}
                      className="input text-sm resize-none"
                      rows={2}
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={e => handleCommentInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(e) }
                      }}
                    />
                    {commentText && (
                      <button type="submit" disabled={submitting}
                        className="btn-primary text-xs px-3 py-1.5 mt-2">
                        {submitting ? 'Posting...' : 'Comment'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:w-64 px-6 lg:px-4 pb-6 pt-4 space-y-4 border-t lg:border-t-0 lg:border-l border-[var(--border)]">

              {/* Status / Priority */}
              <SidebarSection title="Priority">
                <div className="flex flex-wrap gap-1">
                  {PRIORITIES.map(p => (
                    <button key={p} onClick={() => updateTask({ priority: p })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        task.priority === p ? 'text-white border-transparent' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                      }`}
                      style={task.priority === p ? { background: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] } : {}}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </SidebarSection>

              {/* Assignees */}
              <SidebarSection title="Assignees">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {task.assignees?.map(a => (
                    <div key={a._id} className="flex items-center gap-1.5 bg-[var(--surface-100)] rounded-full pl-0.5 pr-2 py-0.5">
                      <Avatar user={a} size="xs" />
                      <span className="text-xs text-[var(--text-secondary)]">{a.name?.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <button onClick={() => setShowAssignee(!showAssignee)}
                    className="text-xs text-[var(--accent)] hover:underline font-medium">
                    + Assign member
                  </button>
                  {showAssignee && (
                    <div className="absolute top-6 left-0 z-10 w-48 bg-white dark:bg-[var(--surface-100)] rounded-xl shadow-modal border border-[var(--border)] py-1">
                      {members.map((m, i) => {
                        const isAssigned = task.assignees?.some(a => (a._id || a) === (m.user?._id))
                        return (
                          <button key={i} onClick={() => { toggleAssignee(m); setShowAssignee(false) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--surface-100)] text-left">
                            <Avatar user={m.user} size="xs" />
                            <span className="text-sm text-[var(--text-primary)] flex-1">{m.user?.name}</span>
                            {isAssigned && <span className="text-[var(--accent)] text-xs">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </SidebarSection>

              {/* Due date */}
              <SidebarSection title="Due Date">
                <input
                  type="date"
                  className={`input text-sm ${isOverdue ? 'border-red-300 text-red-600' : ''}`}
                  value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                  onChange={e => updateTask({ dueDate: e.target.value || null })}
                />
                {isOverdue && <p className="text-xs text-red-500 mt-1">Overdue!</p>}
              </SidebarSection>

              {/* Labels */}
              <SidebarSection title="Labels">
                <button onClick={() => setShowLabelEditor(!showLabelEditor)}
                  className="text-xs text-[var(--accent)] hover:underline font-medium">
                  + Add label
                </button>
              </SidebarSection>

              {/* Cover color */}
              <SidebarSection title="Cover">
                <div className="flex gap-1.5 flex-wrap">
                  {['#ef4444','#f97316','#f59e0b','#10b981','#6366f1','#8b5cf6', null].map((c, i) => (
                    <button key={i} onClick={() => updateTask({ coverColor: c })}
                      className={`w-7 h-7 rounded-lg transition-all ${task.coverColor === c ? 'ring-2 ring-offset-1 scale-110' : ''} ${!c ? 'border border-dashed border-[var(--border)]' : ''}`}
                      style={c ? { background: c } : {}}>
                      {!c && <span className="text-xs text-[var(--text-muted)]">✕</span>}
                    </button>
                  ))}
                </div>
              </SidebarSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarSection({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{title}</h4>
      {children}
    </div>
  )
}

function AddChecklistItem({ onAdd }) {
  const [text, setText] = useState('')
  const [show, setShow] = useState(false)

  const handleAdd = () => {
    if (text.trim()) { onAdd(text); setText(''); setShow(false) }
  }

  return (
    <div>
      {show ? (
        <div className="flex gap-2">
          <input className="input text-sm flex-1" placeholder="Checklist item..."
            value={text} onChange={e => setText(e.target.value)} autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShow(false) }} />
          <button onClick={handleAdd} className="btn-primary text-xs px-3">Add</button>
          <button onClick={() => setShow(false)} className="btn-ghost text-xs px-3">✕</button>
        </div>
      ) : (
        <button onClick={() => setShow(true)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add checklist item
        </button>
      )}
    </div>
  )
}

function CommentItem({ comment, currentUser }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)

  const handleEdit = async () => {
    try {
      await commentAPI.update(comment._id, { content: editText })
      setEditing(false)
    } catch { toast.error('Failed to update comment') }
  }

  const handleDelete = async () => {
    try { await commentAPI.delete(comment._id) }
    catch { toast.error('Failed to delete comment') }
  }

  if (comment.isDeleted) return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-[var(--surface-200)] flex-shrink-0" />
      <p className="text-sm italic text-[var(--text-muted)]">[deleted]</p>
    </div>
  )

  return (
    <div className="flex gap-3 group">
      <Avatar user={comment.author} size="sm" className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{comment.author?.name}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
          </span>
          {comment.isEdited && <span className="text-xs text-[var(--text-muted)]">(edited)</span>}
        </div>
        {editing ? (
          <div>
            <textarea className="input text-sm resize-none w-full" rows={2}
              value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
            <div className="flex gap-2 mt-1.5">
              <button onClick={handleEdit} className="btn-primary text-xs px-3 py-1">Save</button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        )}

        {/* Reactions */}
        {comment.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {comment.reactions.map((r, i) => (
              <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-[var(--surface-100)] cursor-pointer hover:bg-[var(--surface-200)]">
                {r.emoji} <span className="text-[var(--text-muted)]">{r.users?.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions on hover */}
      {comment.author?._id === currentUser?._id && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-100)] text-xs">
            ✏️
          </button>
          <button onClick={handleDelete}
            className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 text-xs">
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}

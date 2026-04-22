import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable, rectIntersection,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { projectAPI, boardAPI, taskAPI } from '../services/api'
import { joinProject, leaveProject, getSocket } from '../services/socket'
import useAuthStore from '../store/authStore'
import Modal from '../components/shared/Modal'
import Avatar from '../components/shared/Avatar'
import TaskModal from '../components/task/TaskModal'
import InviteMemberModal from '../components/board/InviteMemberModal'
import { formatDistanceToNow, isPast, format } from 'date-fns'

const PRIORITY_COLORS = {
  none: '#9199ba', low: '#3b82f6', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444',
}
const PRIORITY_LABELS = { none: 'None', low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [project, setProject] = useState(null)
  const [boards, setBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [tasks, setTasks] = useState([]) // flat list
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState(null) // DnD active
  const [selectedTask, setSelectedTask] = useState(null) // modal
  const [showNewBoard, setShowNewBoard] = useState(false)
  const [showNewColumn, setShowNewColumn] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [boardForm, setBoardForm] = useState({ title: '' })
  const [columnForm, setColumnForm] = useState({ title: '', color: '#6366f1' })
  const [newTaskColumn, setNewTaskColumn] = useState(null) // quick add
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ── Load project + board data ─────────────────────────────
  useEffect(() => {
    loadProject()
    joinProject(projectId)

    const socket = getSocket()
    if (socket) {
      socket.on('task:created', handleTaskCreated)
      socket.on('task:updated', handleTaskUpdated)
      socket.on('task:deleted', handleTaskDeleted)
      socket.on('task:moved', handleTaskMoved)
      socket.on('board:created', (b) => setBoards(prev => [...prev, b]))
      socket.on('column:created', ({ boardId, column }) => {
        setBoards(prev => prev.map(b =>
          b._id === boardId ? { ...b, columns: [...b.columns, column] } : b
        ))
      })
    }

    return () => {
      leaveProject(projectId)
      socket?.off('task:created', handleTaskCreated)
      socket?.off('task:updated', handleTaskUpdated)
      socket?.off('task:deleted', handleTaskDeleted)
      socket?.off('task:moved', handleTaskMoved)
    }
  }, [projectId])

  const handleTaskCreated = useCallback((task) => {
    setTasks(prev => {
      if (prev.some(t => t._id === task._id)) return prev
      return [...prev, task]
    })
  }, [])
  const handleTaskUpdated = useCallback((task) => {
    setTasks(prev => prev.map(t => t._id === task._id ? task : t))
    if (selectedTask?._id === task._id) setSelectedTask(task)
  }, [selectedTask])
  const handleTaskDeleted = useCallback(({ taskId }) => {
    setTasks(prev => prev.filter(t => t._id !== taskId))
    if (selectedTask?._id === taskId) setSelectedTask(null)
  }, [selectedTask])
  const handleTaskMoved = useCallback(({ taskId, destColumnId }) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, columnId: destColumnId } : t))
  }, [])

  const loadProject = async () => {
    try {
      const [{ data: pd }, { data: bd }] = await Promise.all([
        projectAPI.getOne(projectId),
        boardAPI.getAll(projectId),
      ])
      setProject(pd.project)
      setBoards(bd.boards)
      const active = bd.boards[0] || null
      setActiveBoard(active)
      if (active) {
        const { data: td } = await taskAPI.getAll({ boardId: active._id })
        setTasks(td.tasks)
      }
    } catch (err) {
      toast.error('Failed to load project')
      navigate('/dashboard')
    } finally { setLoading(false) }
  }

  const switchBoard = async (board) => {
    setActiveBoard(board)
    setTasks([])
    try {
      const { data } = await taskAPI.getAll({ boardId: board._id })
      setTasks(data.tasks)
    } catch { toast.error('Failed to load board') }
  }

  // ── Task helpers ─────────────────────────────────────────
  const getColumnTasks = (columnId) =>
    tasks
      .filter(t => t.columnId?.toString() === columnId?.toString() && !t.isArchived)
      .sort((a, b) => a.order - b.order)

  const handleQuickAddTask = async (columnId) => {
    if (!newTaskTitle.trim()) { setNewTaskColumn(null); return }
    try {
      const { data } = await taskAPI.create({
        title: newTaskTitle.trim(),
        boardId: activeBoard._id,
        projectId,
        columnId,
      })
      // socket will update via task:created event
      setNewTaskTitle('')
      setNewTaskColumn(null)
      toast.success('Task added')
    } catch { toast.error('Failed to add task') }
  }

  // ── DnD handlers ──────────────────────────────────────────
  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find(t => t._id === active.id))
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null)
    if (!over || active.id === over.id) return

    const task = tasks.find(t => t._id === active.id)
    if (!task) return

    // Check if dropped on a column droppable
    const targetColumnId = over.data?.current?.columnId || over.id
    const isCrossColumn = task.columnId?.toString() !== targetColumnId?.toString()

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t._id === active.id ? { ...t, columnId: targetColumnId } : t
    ))

    try {
      await taskAPI.reorder({
        taskId: active.id,
        sourceColumnId: task.columnId,
        destColumnId: targetColumnId,
        newOrder: 0,
        projectId,
      })
    } catch {
      toast.error('Failed to move task')
      setTasks(prev => prev.map(t =>
        t._id === active.id ? { ...t, columnId: task.columnId } : t
      ))
    }
  }

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    try {
      const { data } = await boardAPI.create({ ...boardForm, projectId })
      setBoards(prev => [...prev, data.board])
      setActiveBoard(data.board)
      setTasks([])
      setShowNewBoard(false)
      setBoardForm({ title: '' })
      toast.success('Board created!')
    } catch { toast.error('Failed to create board') }
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!activeBoard) return
    try {
      const { data } = await boardAPI.addColumn(activeBoard._id, columnForm)
      setBoards(prev => prev.map(b => b._id === activeBoard._id ? data.board : b))
      setActiveBoard(data.board)
      setShowNewColumn(false)
      setColumnForm({ title: '', color: '#6366f1' })
      toast.success('Column added!')
    } catch { toast.error('Failed to add column') }
  }

  const handleDeleteColumn = async (columnId) => {
    if (!confirm('Delete this column and all its tasks?')) return
    try {
      await boardAPI.deleteColumn(activeBoard._id, columnId)
      setBoards(prev => prev.map(b =>
        b._id === activeBoard._id
          ? { ...b, columns: b.columns.filter(c => c._id !== columnId) }
          : b
      ))
      setActiveBoard(prev => ({ ...prev, columns: prev.columns.filter(c => c._id !== columnId) }))
      setTasks(prev => prev.filter(t => t.columnId?.toString() !== columnId))
      toast.success('Column deleted')
    } catch { toast.error('Failed to delete column') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!project) return null

  const userRole = project.getUserRole?.(user._id) ||
    (project.owner?._id === user._id ? 'admin' :
      project.members?.find(m => m.user?._id === user._id)?.role || 'member')

  const allMembers = [
    { user: project.owner, role: 'admin' },
    ...(project.members || []),
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)] bg-white dark:bg-[var(--surface-100)] flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: (project.color || '#6366f1') + '20' }}>
          {project.icon || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[var(--text-primary)] text-lg leading-tight truncate">{project.name}</h1>
          {project.description && (
            <p className="text-xs text-[var(--text-muted)] truncate">{project.description}</p>
          )}
        </div>

        {/* Member avatars */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex -space-x-2">
            {allMembers.slice(0, 5).map((m, i) => (
              <Avatar key={i} user={m.user} size="sm" className="ring-2 ring-white dark:ring-[var(--surface-100)]" />
            ))}
          </div>
          {userRole === 'admin' && (
            <button onClick={() => setShowInvite(true)}
              className="w-7 h-7 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Board tabs */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--border)] bg-white dark:bg-[var(--surface-100)] flex-shrink-0 overflow-x-auto">
        {boards.map(board => (
          <button
            key={board._id}
            onClick={() => switchBoard(board)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeBoard?._id === board._id
                ? 'text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-100)]'
            }`}
            style={activeBoard?._id === board._id ? { background: 'var(--accent)' } : {}}
          >
            {board.title}
          </button>
        ))}
        <button
          onClick={() => setShowNewBoard(true)}
          className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-100)] transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Board
        </button>
      </div>

      {/* Kanban Board */}
      {activeBoard ? (
        <div className="flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 p-6 h-full board-scroll">
              {activeBoard.columns
                .slice()
                .sort((a, b) => a.order - b.order)
                .map(column => (
                  <Column
                    key={column._id}
                    column={column}
                    tasks={getColumnTasks(column._id)}
                    projectId={projectId}
                    boardId={activeBoard._id}
                    onTaskClick={setSelectedTask}
                    onDeleteColumn={handleDeleteColumn}
                    onQuickAdd={(colId) => setNewTaskColumn(colId)}
                    isQuickAdding={newTaskColumn === column._id}
                    newTaskTitle={newTaskTitle}
                    onNewTaskTitleChange={setNewTaskTitle}
                    onQuickAddSubmit={handleQuickAddTask}
                    onQuickAddCancel={() => { setNewTaskColumn(null); setNewTaskTitle('') }}
                  />
                ))}

              {/* Add column button */}
              <div className="flex-shrink-0 w-72">
                <button
                  onClick={() => setShowNewColumn(true)}
                  className="w-full h-12 rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add column
                </button>
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeTask && <TaskCard task={activeTask} isDragging />}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
          <div className="text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="mb-4">No boards yet</p>
            <button onClick={() => setShowNewBoard(true)} className="btn-primary">Create a board</button>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}

      {/* New Board */}
      <Modal isOpen={showNewBoard} onClose={() => setShowNewBoard(false)} title="Create Board" size="sm">
        <form onSubmit={handleCreateBoard} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Board Name</label>
            <input className="input" placeholder="e.g. Sprint 1" value={boardForm.title}
              onChange={e => setBoardForm({ title: e.target.value })} required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowNewBoard(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create</button>
          </div>
        </form>
      </Modal>

      {/* New Column */}
      <Modal isOpen={showNewColumn} onClose={() => setShowNewColumn(false)} title="Add Column" size="sm">
        <form onSubmit={handleAddColumn} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Column Name</label>
            <input className="input" placeholder="e.g. Review"
              value={columnForm.title} onChange={e => setColumnForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Color</label>
            <input type="color" className="h-9 w-full rounded-lg border border-[var(--border)] cursor-pointer"
              value={columnForm.color} onChange={e => setColumnForm(f => ({ ...f, color: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowNewColumn(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Add Column</button>
          </div>
        </form>
      </Modal>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          project={project}
          members={allMembers}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => {
            setTasks(prev => prev.map(t => t._id === updated._id ? updated : t))
            setSelectedTask(updated)
          }}
          onDelete={(taskId) => {
            setTasks(prev => prev.filter(t => t._id !== taskId))
            setSelectedTask(null)
          }}
        />
      )}

      {/* Invite Member Modal */}
      {showInvite && (
        <InviteMemberModal
          project={project}
          onClose={() => setShowInvite(false)}
          onInvited={(updated) => setProject(updated)}
        />
      )}
    </div>
  )
}

// ── Column component ──────────────────────────────────────────
function Column({
  column, tasks, projectId, boardId,
  onTaskClick, onDeleteColumn,
  onQuickAdd, isQuickAdding, newTaskTitle,
  onNewTaskTitleChange, onQuickAddSubmit, onQuickAddCancel,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column._id, data: { columnId: column._id } })

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: column.color }} />
          <span className="font-semibold text-sm text-[var(--text-primary)]">{column.title}</span>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-[var(--surface-200)] text-[var(--text-muted)]">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onQuickAdd(column._id)}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-100)] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button onClick={() => onDeleteColumn(column._id)}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-24 transition-colors ${
          isOver ? 'bg-[var(--accent-light)] border-2 border-dashed border-[var(--accent)]' : 'bg-[var(--surface-100)]'
        }`}
      >
        <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {/* Quick add form */}
        {isQuickAdding && (
          <div className="animate-fade-in">
            <textarea
              autoFocus
              className="input text-sm resize-none"
              placeholder="Task title..."
              rows={2}
              value={newTaskTitle}
              onChange={e => onNewTaskTitleChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onQuickAddSubmit(column._id) }
                if (e.key === 'Escape') onQuickAddCancel()
              }}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => onQuickAddSubmit(column._id)} className="btn-primary text-xs px-3 py-1.5">Add</button>
              <button onClick={onQuickAddCancel} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
            </div>
          </div>
        )}

        {tasks.length === 0 && !isQuickAdding && (
          <div className="text-center py-6 text-xs text-[var(--text-muted)]">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sortable Task Card wrapper ────────────────────────────────
function SortableTaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { columnId: task.columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────
function TaskCard({ task, onClick, isDragging }) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed'

  return (
    <div
      onClick={onClick}
      className={`task-card ${isDragging ? 'shadow-modal' : ''}`}
    >
      {/* Cover color */}
      {task.coverColor && (
        <div className="h-8 -mx-3 -mt-3 mb-3 rounded-t-xl" style={{ background: task.coverColor }} />
      )}

      {/* Labels */}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ background: label.color }}>
              {label.text}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-[var(--text-primary)] leading-snug mb-2">{task.title}</p>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Priority */}
          {task.priority && task.priority !== 'none' && (
            <span className={`priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-[var(--text-muted)]'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}

          {/* Checklist */}
          {task.checklist?.length > 0 && (
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
            </span>
          )}
        </div>

        {/* Assignees */}
        {task.assignees?.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map(a => (
              <Avatar key={a._id} user={a} size="xs" className="ring-1 ring-white" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

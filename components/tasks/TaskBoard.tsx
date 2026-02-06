'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Clock, AlertCircle, User, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Task, TaskStatus, TaskPriority, UserRole } from '@/types/tasks'
import { cn } from '@/lib/utils'

interface TaskBoardProps {
  tasks: Task[]
  currentUserRole: UserRole
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onTaskCreate?: (task: Omit<Task, 'id' | 'createdAt'>) => void
  className?: string
}

const statusColumns: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: 'Pending', label: 'Pending', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900/20' },
  { id: 'Completed', label: 'Completed', color: 'bg-green-100 dark:bg-green-900/20' },
  { id: 'Blocked', label: 'Blocked', color: 'bg-red-100 dark:bg-red-900/20' },
]

export function TaskBoard({
  tasks,
  currentUserRole,
  onTaskUpdate,
  onTaskCreate,
  className,
}: TaskBoardProps) {
  const [draggedTask, setDraggedTask] = React.useState<string | null>(null)
  const [newTask, setNewTask] = React.useState({
    title: '',
    category: 'Administrative' as Task['category'],
    priority: 'Medium' as TaskPriority,
  })

  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      Pending: [],
      'In Progress': [],
      Completed: [],
      Blocked: [],
      Cancelled: [],
    }
    tasks.forEach((task) => {
      grouped[task.status].push(task)
    })
    return grouped
  }, [tasks])

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'Critical':
        return 'text-living-coral border-living-coral'
      case 'High':
        return 'text-orange-500 border-orange-500'
      case 'Medium':
        return 'text-yellow-500 border-yellow-500'
      default:
        return 'text-gray-500 border-gray-500'
    }
  }

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault()
    if (draggedTask && onTaskUpdate) {
      onTaskUpdate(draggedTask, { status: targetStatus })
      setDraggedTask(null)
    }
  }

  const renderTaskCard = (task: Task) => {
    const priorityColor = getPriorityColor(task.priority)

    return (
      <motion.div
        key={task.id}
        draggable
        onDragStart={() => handleDragStart(task.id)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-4 rounded-lg border-2 cursor-move bg-white dark:bg-deep-indigo/50 mb-3',
          'hover:shadow-lg transition-all duration-200',
          priorityColor.includes('living-coral') && 'border-living-coral/30',
          priorityColor.includes('orange') && 'border-orange-500/30',
          priorityColor.includes('yellow') && 'border-yellow-500/30'
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-deep-indigo dark:text-vapor flex-1">{task.title}</h4>
          <Badge variant="outline" className={cn('text-xs', priorityColor)}>
            {task.priority}
          </Badge>
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {task.assignedTo && (
              <>
                <User className="w-3 h-3" />
                <span>{task.assignedTo}</span>
              </>
            )}
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="mt-2">
          <Badge variant="outline" className="text-xs">
            {task.category}
          </Badge>
        </div>
      </motion.div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Create New Task */}
      {onTaskCreate && (
        <Card variant="glass" className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="New task..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTask.title) {
                  onTaskCreate({
                    caseId: '',
                    title: newTask.title,
                    createdBy: currentUserRole,
                    status: 'Pending',
                    priority: newTask.priority,
                    category: newTask.category,
                  })
                  setNewTask({ title: '', category: 'Administrative', priority: 'Medium' })
                }
              }}
            />
            <Button
              onClick={() => {
                if (newTask.title && onTaskCreate) {
                  onTaskCreate({
                    caseId: '',
                    title: newTask.title,
                    createdBy: currentUserRole,
                    status: 'Pending',
                    priority: newTask.priority,
                    category: newTask.category,
                  })
                  setNewTask({ title: '', category: 'Administrative', priority: 'Medium' })
                }
              }}
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {statusColumns.map((column) => {
          const columnTasks = tasksByStatus[column.id]

          return (
            <div
              key={column.id}
              className="flex flex-col"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={cn('p-3 rounded-t-lg', column.color)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-deep-indigo dark:text-vapor">
                    {column.label}
                  </h3>
                  <Badge variant="outline">{columnTasks.length}</Badge>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-900/30 rounded-b-lg p-3 min-h-[400px]">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No tasks</div>
                ) : (
                  columnTasks.map((task) => renderTaskCard(task))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


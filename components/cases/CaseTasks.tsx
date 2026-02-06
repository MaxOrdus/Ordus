'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CheckSquare, Plus, User, Calendar, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Task, TaskPriority, TaskCategory } from '@/types/tasks'
import { cn } from '@/lib/utils'

interface CaseTasksProps {
  caseId: string
  tasks: Task[]
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'caseId'>) => void
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void
  className?: string
}

export function CaseTasks({ caseId, tasks, onAddTask, onUpdateTask, className }: CaseTasksProps) {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newTask, setNewTask] = React.useState({
    title: '',
    category: 'Administrative' as TaskCategory,
    priority: 'Medium' as TaskPriority,
  })

  const pendingTasks = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress')
  const completedTasks = tasks.filter((t) => t.status === 'Completed')

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'Critical':
        return 'border-living-coral text-living-coral'
      case 'High':
        return 'border-orange-500 text-orange-500'
      case 'Medium':
        return 'border-yellow-500 text-yellow-500'
      default:
        return 'border-gray-500 text-gray-500'
    }
  }

  const handleAddTask = () => {
    if (newTask.title && onAddTask) {
      onAddTask({
        title: newTask.title,
        createdBy: 'Current User',
        status: 'Pending',
        priority: newTask.priority,
        category: newTask.category,
      })
      setNewTask({ title: '', category: 'Administrative', priority: 'Medium' })
      setShowAddForm(false)
    }
  }

  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-electric-teal" />
            Case Tasks
          </CardTitle>
          {onAddTask && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Task Form */}
        {showAddForm && onAddTask && (
          <div className="p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg space-y-3">
            <Input
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTask()
                }
              }}
            />
            <div className="flex gap-2">
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value as TaskPriority })
                }
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
                <option value="Critical">Critical</option>
              </select>
              <select
                value={newTask.category}
                onChange={(e) =>
                  setNewTask({ ...newTask, category: e.target.value as TaskCategory })
                }
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50"
              >
                <option value="OCF Forms">OCF Forms</option>
                <option value="Discovery">Discovery</option>
                <option value="Pleadings">Pleadings</option>
                <option value="Medical Records">Medical Records</option>
                <option value="Undertakings">Undertakings</option>
                <option value="Settlement">Settlement</option>
                <option value="LAT">LAT</option>
                <option value="Court">Court</option>
                <option value="Client Communication">Client Communication</option>
                <option value="Administrative">Administrative</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTask} className="flex-1">
                Add Task
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Active Tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <h3 className="font-semibold text-deep-indigo dark:text-vapor mb-3">
              Active Tasks ({pendingTasks.length})
            </h3>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'p-3 rounded-lg border-2 flex items-start justify-between',
                    getPriorityColor(task.priority),
                    'bg-white/50 dark:bg-deep-indigo/30'
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={task.status === 'Completed'}
                        onChange={(e) => {
                          if (onUpdateTask) {
                            onUpdateTask(task.id, {
                              status: e.target.checked ? 'Completed' : 'Pending',
                            })
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="font-medium text-deep-indigo dark:text-vapor">
                        {task.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 ml-6 mt-2 text-xs text-gray-500">
                      {task.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assignedTo}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h3 className="font-semibold text-deep-indigo dark:text-vapor mb-3">
              Completed ({completedTasks.length})
            </h3>
            <div className="space-y-2">
              {completedTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800/30 flex items-center gap-2 opacity-75"
                >
                  <CheckSquare className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 line-through">
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No tasks for this case</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


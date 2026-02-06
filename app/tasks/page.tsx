'use client'

import * as React from 'react'
import { DashboardLayout, PageHeader, PageContent } from '@/components/layout/DashboardLayout'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { Task, UserRole } from '@/types/tasks'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { getTasks, createTask, updateTask } from '@/lib/db/tasks'
import { Loader2, AlertCircle } from 'lucide-react'

export default function TasksPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Map user role to UserRole type
  const currentUserRole: UserRole = React.useMemo(() => {
    if (!user?.role) return 'Lawyer'
    // Map roles
    const roleMap: Record<string, UserRole> = {
      'Lawyer': 'Lawyer',
      'LawClerk': 'LawClerk',
      'LegalAssistant': 'LegalAssistant',
      'AccidentBenefitsCoordinator': 'AccidentBenefitsCoordinator',
      'Admin': 'Lawyer',
      'SuperAdmin': 'Lawyer',
      'Paralegal': 'LawClerk',
    }
    return roleMap[user.role] || 'Lawyer'
  }, [user?.role])

  // Fetch tasks
  React.useEffect(() => {
    async function fetchTasks() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const data = await getTasks()
        setTasks(data)
      } catch (err: any) {
        console.error('Error fetching tasks:', err)
        setError(err.message || 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [user])

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
    )

    try {
      await updateTask(taskId, updates)
    } catch (err) {
      console.error('Error updating task:', err)
      // Revert on error - refetch tasks
      const data = await getTasks()
      setTasks(data)
    }
  }

  const handleTaskCreate = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const newTask = await createTask(task)
      setTasks((prev) => [newTask, ...prev])
    } catch (err) {
      console.error('Error creating task:', err)
    }
  }

  const subtitle = loading 
    ? 'Loading...' 
    : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}. Drag and drop to update status.`

  return (
    <DashboardLayout activeNavId="tasks">
      <PageHeader
        title="Task Board"
        subtitle={subtitle}
      />

      <PageContent>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-electric-teal" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-living-coral mb-4" />
            <p className="text-living-coral mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-electric-teal hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <TaskBoard
            tasks={tasks}
            currentUserRole={currentUserRole}
            onTaskUpdate={handleTaskUpdate}
            onTaskCreate={handleTaskCreate}
          />
        )}
      </PageContent>
    </DashboardLayout>
  )
}

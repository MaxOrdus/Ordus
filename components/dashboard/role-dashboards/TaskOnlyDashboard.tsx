'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Calendar,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getTasks, updateTask } from '@/lib/db/tasks'
import { getWeeklyTimeStats } from '@/lib/db/time-entries'
import { getColleaguesOnSameCases, TeamRole } from '@/lib/db/case-team'
import { Task } from '@/lib/db/tasks'

interface TaskOnlyDashboardProps {
  userId: string
  userRole: string
}

/**
 * Task-Only Dashboard - Law Clerk / Legal Assistant view
 * Shows only their assigned tasks, no case browsing
 */
export function TaskOnlyDashboard({ userId, userRole }: TaskOnlyDashboardProps) {
  const router = useRouter()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [colleagues, setColleagues] = React.useState<{
    userId: string
    userName: string
    userRole: string
    teamRole: TeamRole
    sharedCaseCount: number
  }[]>([])
  const [timeStats, setTimeStats] = React.useState({ weeklyTotal: 0, streakDays: 0, dailyBreakdown: [] as { date: string; hours: number }[] })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Get tasks assigned to this user
        const myTasks = await getTasks({ assignedTo: userId })

        // Get time stats
        const stats = await getWeeklyTimeStats(userId)

        // Get colleagues on the same cases
        const myColleagues = await getColleaguesOnSameCases(userId)

        setTasks(myTasks)
        setTimeStats(stats)
        setColleagues(myColleagues)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  // Group tasks
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tasksDueToday = React.useMemo(() => {
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    return tasks.filter(t => {
      if (!t.dueDate || t.completed) return false
      const due = new Date(t.dueDate)
      return due >= today && due <= endOfDay
    })
  }, [tasks, today])

  const tasksDueThisWeek = React.useMemo(() => {
    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    return tasks.filter(t => {
      if (!t.dueDate || t.completed) return false
      const due = new Date(t.dueDate)
      return due > today && due <= weekFromNow
    })
  }, [tasks, today])

  const overdueTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (!t.dueDate || t.completed) return false
      return new Date(t.dueDate) < today
    })
  }, [tasks, today])

  const completedThisWeek = React.useMemo(() => {
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    return tasks.filter(t => {
      if (!t.completed || !t.updatedAt) return false
      const completedDate = new Date(t.updatedAt)
      return completedDate >= weekAgo
    })
  }, [tasks, today])

  const pendingTasks = tasks.filter(t => !t.completed)

  // Toggle task completion
  const handleToggleTask = async (task: Task) => {
    const newCompleted = !task.completed
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, completed: newCompleted } : t
    ))

    try {
      await updateTask(task.id, { completed: newCompleted })
    } catch (err) {
      // Rollback on error
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, completed: !newCompleted } : t
      ))
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
          My Tasks
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your task queue and progress
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/tasks?filter=today')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Due Today</span>
            <Calendar className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">{tasksDueToday.length}</p>
          <p className="text-xs text-gray-500 mt-2">Tasks</p>
        </Card>

        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/tasks')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
            <CheckSquare className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">{tasksDueThisWeek.length}</p>
          <p className="text-xs text-gray-500 mt-2">Upcoming</p>
        </Card>

        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/time')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Hours This Week</span>
            <Clock className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">
            {timeStats.weeklyTotal.toFixed(1)}h
          </p>
          <p className="text-xs text-gray-500 mt-2">{timeStats.streakDays} day streak</p>
        </Card>

        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/tasks?filter=overdue')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Overdue</span>
            <AlertCircle className="w-5 h-5 text-living-coral" />
          </div>
          <p className="text-3xl font-bold text-living-coral">{overdueTasks.length}</p>
          <p className="text-xs text-living-coral mt-2">Needs attention</p>
        </Card>
      </div>

      {/* Overdue Tasks - Urgent */}
      {overdueTasks.length > 0 && (
        <Card variant="glass" className="p-6 border-2 border-living-coral/30">
          <h2
            className="text-xl font-bold text-living-coral mb-4 flex items-center gap-2 cursor-pointer hover:text-living-coral/80 transition-colors"
            onClick={() => router.push('/tasks?filter=overdue')}
          >
            <AlertCircle className="w-5 h-5" />
            Overdue Tasks
          </h2>
          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task)}
                variant="overdue"
              />
            ))}
          </div>
        </Card>
      )}

      {/* Due Today */}
      <Card variant="glass" className="p-6">
        <h2
          className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
          onClick={() => router.push('/tasks?filter=today')}
        >
          <Calendar className="w-5 h-5 text-electric-teal" />
          Due Today
        </h2>
        {tasksDueToday.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tasks due today</p>
        ) : (
          <div className="space-y-3">
            {tasksDueToday.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Due This Week */}
      <Card variant="glass" className="p-6">
        <h2
          className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
          onClick={() => router.push('/tasks')}
        >
          <CheckSquare className="w-5 h-5 text-electric-teal" />
          Due This Week
        </h2>
        {tasksDueThisWeek.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tasks due this week</p>
        ) : (
          <div className="space-y-3">
            {tasksDueThisWeek.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* All Pending Tasks */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/tasks')}
          >
            <CheckSquare className="w-5 h-5 text-electric-teal" />
            All Pending Tasks ({pendingTasks.length})
          </h2>
          <button
            onClick={() => router.push('/tasks')}
            className="text-electric-teal hover:underline text-sm"
          >
            View all
          </button>
        </div>
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-500">All caught up! No pending tasks.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.slice(0, 10).map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task)}
              />
            ))}
            {pendingTasks.length > 10 && (
              <p className="text-center text-gray-500 text-sm pt-2">
                +{pendingTasks.length - 10} more tasks
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Completed This Week */}
      <Card variant="glass" className="p-6">
        <h2
          className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
          onClick={() => router.push('/tasks?filter=completed')}
        >
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          Completed This Week ({completedThisWeek.length})
        </h2>
        {completedThisWeek.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tasks completed this week</p>
        ) : (
          <div className="space-y-3">
            {completedThisWeek.slice(0, 5).map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task)}
                variant="completed"
              />
            ))}
          </div>
        )}
      </Card>

      {/* Team Section */}
      <Card variant="glass" className="p-6">
        <h2 className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-electric-teal" />
          My Team
        </h2>
        {colleagues.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No team members on your cases yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {colleagues.map((colleague) => (
              <div
                key={colleague.userId}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30 hover:bg-white/70 dark:hover:bg-deep-indigo/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-teal to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {colleague.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-deep-indigo dark:text-vapor text-sm truncate">
                    {colleague.userName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{colleague.userRole}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    colleague.teamRole === 'lead_lawyer'
                      ? 'text-blue-600 border-blue-300'
                      : colleague.teamRole === 'paralegal'
                      ? 'text-teal-600 border-teal-300'
                      : 'text-gray-600 border-gray-300'
                  }
                >
                  {colleague.teamRole === 'lead_lawyer'
                    ? 'Lead'
                    : colleague.teamRole === 'paralegal'
                    ? 'Paralegal'
                    : 'Team'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

interface TaskItemProps {
  task: Task
  onToggle: () => void
  variant?: 'default' | 'overdue' | 'completed'
}

function TaskItem({ task, onToggle, variant = 'default' }: TaskItemProps) {
  const bgClass = variant === 'overdue'
    ? 'bg-living-coral/5 border border-living-coral/20'
    : variant === 'completed'
    ? 'bg-green-500/5 border border-green-500/20'
    : 'bg-white/50 dark:bg-deep-indigo/30'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${bgClass}`}>
      <button
        onClick={onToggle}
        className="flex-shrink-0"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 hover:text-electric-teal transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-deep-indigo dark:text-vapor'}`}>
          {task.title}
        </p>
        <p className="text-sm text-gray-500">{task.category}</p>
      </div>
      <div className="flex items-center gap-2">
        {task.dueDate && (
          <Badge variant={variant === 'overdue' ? 'destructive' : 'secondary'}>
            {new Date(task.dueDate).toLocaleDateString()}
          </Badge>
        )}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <Card key={i} variant="glass" className="p-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </Card>
        ))}
      </div>
    </div>
  )
}

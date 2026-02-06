'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Users,
  Briefcase,
  Calendar,
  CheckSquare
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCases } from '@/lib/db/cases'
import { getTasks, Task } from '@/lib/db/tasks'
import { getCasesForTeamMember } from '@/lib/db/case-team'

// Use lightweight query for dashboard - don't need full joins
import { PICase } from '@/types/pi-case'

interface FirmDashboardProps {
  userId: string
  userRole?: string
}

// Map user role to task role for filtering
function mapUserRoleToTaskRole(userRole?: string): string | undefined {
  if (!userRole) return undefined
  const roleMap: Record<string, string> = {
    'Lawyer': 'Lawyer',
    'Paralegal': 'Paralegal',
    'LawClerk': 'LawClerk',
    'LegalAssistant': 'LegalAssistant',
    'AccidentBenefitsCoordinator': 'AccidentBenefitsCoordinator',
    'Admin': 'Lawyer', // Admins can see Lawyer tasks
    'SuperAdmin': 'Lawyer', // SuperAdmins can see Lawyer tasks
  }
  return roleMap[userRole]
}

/**
 * Firm Dashboard - Admin/Partner view
 * Shows all firm cases, firm-wide metrics, complete oversight
 */
export function FirmDashboard({ userId, userRole }: FirmDashboardProps) {
  const router = useRouter()
  const [cases, setCases] = React.useState<PICase[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [myCaseIds, setMyCaseIds] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        console.log(`[FirmDashboard] Fetching data for user: ${userId}, role: ${userRole}`)
        
        const taskRole = mapUserRoleToTaskRole(userRole)
        
        // Fetch all data in parallel
        const [casesData, tasksData, memberCaseIds] = await Promise.all([
          getCases({ lightweight: true }),
          getTasks({ assignedTo: userId, assignedToRole: taskRole }),
          getCasesForTeamMember(userId)
        ])
        
        console.log(`[FirmDashboard] Loaded ${casesData.length} total cases, ${tasksData.length} tasks, ${memberCaseIds.length} assigned case IDs`)
        setCases(casesData)
        setTasks(tasksData)
        setMyCaseIds(memberCaseIds)
      } catch (err) {
        console.error('[FirmDashboard] Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  // Calculations
  const activeCases = cases.filter(c => c.status === 'Active')
  const pipelineValue = cases.reduce((sum, c) => sum + (c.estimatedValue || 0), 0)

  const casesByStage = React.useMemo(() => {
    const stages: Record<string, number> = {}
    cases.forEach(c => {
      stages[c.stage] = (stages[c.stage] || 0) + 1
    })
    return stages
  }, [cases])

  // Critical deadlines (cases with limitation dates coming up)
  const criticalCases = React.useMemo(() => {
    const now = new Date()
    return cases
      .filter(c => c.limitationDate)
      .map(c => ({
        ...c,
        daysUntilLimitation: Math.ceil(
          (new Date(c.limitationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      }))
      .filter(c => c.daysUntilLimitation <= 180 && c.daysUntilLimitation > 0)
      .sort((a, b) => a.daysUntilLimitation - b.daysUntilLimitation)
      .slice(0, 5)
  }, [cases])

  // Stalled cases (no activity in 30+ days)
  const stalledCases = React.useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return cases
      .filter(c => {
        const lastActivity = c.updatedAt ? new Date(c.updatedAt) : new Date(c.dateOpened || '')
        return lastActivity < thirtyDaysAgo && c.status === 'Active'
      })
      .slice(0, 5)
  }, [cases])

  // My Assigned Cases
  const myAssignedCases = React.useMemo(() => {
    return cases.filter(c => 
      c.primaryLawyerId === userId || 
      c.assignedParalegalId === userId || 
      myCaseIds.includes(c.id)
    )
  }, [cases, userId, myCaseIds])

  // Tasks due this week
  const tasksDueThisWeek = React.useMemo(() => {
    const now = new Date()
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    return tasks
      .filter(t => {
        if (!t.dueDate || t.completed) return false
        const due = new Date(t.dueDate)
        return due >= now && due <= weekFromNow
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  }, [tasks])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
          Firm Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Strategic oversight of all firm cases and metrics
        </p>
      </div>

      {/* My Work Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks Due This Week */}
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/tasks')}
          >
            <CheckSquare className="w-5 h-5 text-electric-teal" />
            Tasks Due This Week
          </h2>
          {tasksDueThisWeek.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tasks due this week</p>
          ) : (
            <div className="space-y-3">
              {tasksDueThisWeek.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30"
                >
                  <div>
                    <p className="font-medium text-deep-indigo dark:text-vapor">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.category}</p>
                  </div>
                  <Badge variant="secondary">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/tasks')}
              className="text-electric-teal hover:underline"
            >
              View all tasks
            </button>
          </div>
        </Card>

        {/* My Assigned Cases */}
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/cases')}
          >
            <Briefcase className="w-5 h-5 text-electric-teal" />
            My Assigned Cases
          </h2>
          {myAssignedCases.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No cases assigned yet</p>
          ) : (
            <div className="space-y-3">
              {myAssignedCases.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30 hover:bg-white/70 dark:hover:bg-deep-indigo/50 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-deep-indigo dark:text-vapor">{c.title}</p>
                    <p className="text-sm text-gray-500">{c.stage}</p>
                  </div>
                  <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {myAssignedCases.length > 5 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/cases')}
                className="text-electric-teal hover:underline"
              >
                View all {myAssignedCases.length} assigned cases
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/cases')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Cases</span>
            <Briefcase className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">{cases.length}</p>
          <p className="text-xs text-gray-500 mt-2">{activeCases.length} active</p>
        </Card>

        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/cases')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Pipeline Value</span>
            <DollarSign className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">
            ${(pipelineValue / 1000000).toFixed(1)}M
          </p>
          <p className="text-xs text-gray-500 mt-2">Total potential</p>
        </Card>

        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/cases?filter=critical')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Critical Deadlines</span>
            <AlertTriangle className="w-5 h-5 text-living-coral" />
          </div>
          <p className="text-3xl font-bold text-living-coral">{criticalCases.length}</p>
          <p className="text-xs text-living-coral mt-2">Within 6 months</p>
        </Card>

        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/cases?filter=stalled')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Stalled Cases</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-500">{stalledCases.length}</p>
          <p className="text-xs text-yellow-600 mt-2">No activity 30+ days</p>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cases by Stage */}
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/cases')}
          >
            <TrendingUp className="w-5 h-5 text-electric-teal" />
            Cases by Stage
          </h2>
          <div className="space-y-3">
            {Object.entries(casesByStage).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{stage}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-electric-teal rounded-full"
                      style={{ width: `${(count / cases.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-deep-indigo dark:text-vapor w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Limitation Dates Coming */}
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/cases?filter=critical')}
          >
            <Calendar className="w-5 h-5 text-living-coral" />
            Limitation Dates Coming
          </h2>
          {criticalCases.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No critical deadlines</p>
          ) : (
            <div className="space-y-3">
              {criticalCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30 hover:bg-white/70 dark:hover:bg-deep-indigo/50 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-deep-indigo dark:text-vapor">{c.title}</p>
                    <p className="text-sm text-gray-500">{c.stage}</p>
                  </div>
                  <Badge
                    variant={c.daysUntilLimitation <= 60 ? 'destructive' : 'secondary'}
                  >
                    {c.daysUntilLimitation} days
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Stalled Cases */}
      {stalledCases.length > 0 && (
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/cases?filter=stalled')}
          >
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Cases Needing Attention
          </h2>
          <div className="space-y-3">
            {stalledCases.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/cases/${c.id}`)}
                className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium text-deep-indigo dark:text-vapor">{c.title}</p>
                  <p className="text-sm text-gray-500">{c.stage}</p>
                </div>
                <Badge variant="outline" className="text-yellow-600">
                  Stalled
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Cases Table */}
      <Card variant="glass" className="p-6">
        <h2
          className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
          onClick={() => router.push('/cases')}
        >
          <Users className="w-5 h-5 text-electric-teal" />
          All Cases
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Client</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Stage</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Value</th>
              </tr>
            </thead>
            <tbody>
              {cases.slice(0, 10).map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-deep-indigo/30 cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <p className="font-medium text-deep-indigo dark:text-vapor">{c.title}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{c.stage}</td>
                  <td className="py-3 px-4">
                    <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-electric-teal">
                    {c.estimatedValue ? `$${c.estimatedValue.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cases.length > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/cases')}
              className="text-electric-teal hover:underline"
            >
              View all {cases.length} cases
            </button>
          </div>
        )}
      </Card>
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

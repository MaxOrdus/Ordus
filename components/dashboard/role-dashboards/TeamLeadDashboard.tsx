'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  DollarSign,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  CheckSquare
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCasesByIds } from '@/lib/db/cases'
import { getTasks } from '@/lib/db/tasks'
import { getWeeklyTimeStats } from '@/lib/db/time-entries'
import { getTeamMembersUnderLead, getCasesWhereUserIsLead, getCasesForTeamMember } from '@/lib/db/case-team'
import { getFirmUsers } from '@/lib/db/users'
import { PICase } from '@/types/pi-case'
import { Task } from '@/lib/db/tasks'
import { User } from '@/types/auth'
import { Scale } from 'lucide-react'

interface TeamLeadDashboardProps {
  userId: string
  userRole: string
}

// Map user role to task role for filtering
function mapUserRoleToTaskRole(userRole: string): string | undefined {
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
 * Team Lead Dashboard - Senior Lawyer / Paralegal view
 * Shows their cases + team's cases, team workload
 */
interface CaseWithTeam extends PICase {
  lawyerName?: string
  paralegalName?: string
}

export function TeamLeadDashboard({ userId, userRole }: TeamLeadDashboardProps) {
  const router = useRouter()
  const [cases, setCases] = React.useState<PICase[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [firmUsers, setFirmUsers] = React.useState<User[]>([])
  const [teamMembers, setTeamMembers] = React.useState<{ userId: string; userName: string; userRole: string; caseCount: number }[]>([])
  const [timeStats, setTimeStats] = React.useState({ weeklyTotal: 0, streakDays: 0, dailyBreakdown: [] as { date: string; hours: number }[] })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        // STEP 1: Get case IDs first (needed for the main case fetch)
        const [leadCaseIds, memberCaseIds] = await Promise.all([
          getCasesWhereUserIsLead(userId),
          getCasesForTeamMember(userId)
        ])

        const allCaseIds = [...new Set([...leadCaseIds, ...memberCaseIds])]

        // STEP 2: Fetch everything else in PARALLEL
        const taskRole = mapUserRoleToTaskRole(userRole)
        const [myCases, myTasks, team, stats, users] = await Promise.all([
          // Get only the cases we need, not all cases (use lightweight for dashboard)
          getCasesByIds(allCaseIds, { lightweight: true }),
          // Get tasks assigned to this user OR assigned to their role
          getTasks({ assignedTo: userId, assignedToRole: taskRole }),
          // Get team members
          getTeamMembersUnderLead(userId),
          // Get time stats
          getWeeklyTimeStats(userId),
          // Get firm users for lawyer/paralegal names
          getFirmUsers(),
        ])

        setCases(myCases)
        setTasks(myTasks)
        setTeamMembers(team)
        setTimeStats(stats)
        setFirmUsers(users)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  // Create user map for lawyer/paralegal lookups
  const userMap = React.useMemo(() => {
    const map = new Map<string, User>()
    firmUsers.forEach(u => map.set(u.id, u))
    return map
  }, [firmUsers])

  // Enrich cases with lawyer/paralegal names
  const casesWithTeam = React.useMemo((): CaseWithTeam[] => {
    return cases.map(c => {
      const lawyerId = c.primaryLawyerId
      const paralegalId = c.assignedParalegalId
      
      const lawyer = lawyerId ? userMap.get(lawyerId) : undefined
      const paralegal = paralegalId ? userMap.get(paralegalId) : undefined
      
      return {
        ...c,
        lawyerName: lawyer?.name,
        paralegalName: paralegal?.name,
      }
    })
  }, [cases, userMap, firmUsers])

  // Extract client name only (remove "v. Insurance Co.")
  const getClientName = (title: string) => {
    return title.split(/\s+v\.?\s+|\s+vs\.?\s+/i)[0].trim()
  }

  // Get first name only
  const getFirstName = (fullName?: string) => {
    if (!fullName) return null
    return fullName.split(' ')[0]
  }

  // Calculations
  const pipelineValue = casesWithTeam.reduce((sum, c) => sum + (c.estimatedValue || 0), 0)
  const activeCases = casesWithTeam.filter(c => c.status === 'Active')

  // Critical deadlines
  const criticalCases = React.useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    console.log(`[TeamLeadDashboard] Checking limitation dates for ${casesWithTeam.length} cases`)
    
    const casesWithLimitation = casesWithTeam.filter(c => {
      if (!c.limitationDate) {
        console.log(`[TeamLeadDashboard] Case "${c.title}" has no limitationDate`)
        return false
      }
      return true
    })
    
    console.log(`[TeamLeadDashboard] Found ${casesWithLimitation.length} cases with limitation dates`)
    
    const casesWithDays = casesWithLimitation
      .map(c => {
        const limitationDate = new Date(c.limitationDate!)
        limitationDate.setHours(0, 0, 0, 0)
        const daysUntilLimitation = Math.ceil(
          (limitationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        console.log(`[TeamLeadDashboard] Case "${c.title}" limitation date: ${limitationDate.toLocaleDateString()}, days until: ${daysUntilLimitation}`)
        return {
          ...c,
          daysUntilLimitation
        }
      })
      .filter(c => {
        const inRange = c.daysUntilLimitation <= 180 && c.daysUntilLimitation > 0
        if (!inRange) {
          console.log(`[TeamLeadDashboard] Case "${c.title}" limitation date is ${c.daysUntilLimitation} days away (outside 180-day window)`)
        }
        return inRange
      })
      .sort((a, b) => a.daysUntilLimitation - b.daysUntilLimitation)
      .slice(0, 5)
    
    console.log(`[TeamLeadDashboard] Found ${casesWithDays.length} critical cases (within 180 days)`)
    return casesWithDays
  }, [casesWithTeam])

  // Stalled cases
  const stalledCases = React.useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return casesWithTeam
      .filter(c => {
        const lastActivity = c.updatedAt ? new Date(c.updatedAt) : new Date(c.dateOpened || '')
        return lastActivity < thirtyDaysAgo && c.status === 'Active'
      })
      .slice(0, 5)
  }, [casesWithTeam])

  // Tasks due this week
  const tasksDueThisWeek = React.useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    weekFromNow.setHours(23, 59, 59, 999) // End of day 7 days from now

    console.log(`[TeamLeadDashboard] Filtering tasks: ${tasks.length} total tasks`)
    const filtered = tasks
      .filter(t => {
        // Check if completed by status or completedAt
        const isCompleted = t.status === 'Completed' || !!t.completedAt
        if (isCompleted) {
          console.log(`[TeamLeadDashboard] Task "${t.title}" is completed (status: ${t.status}), skipping`)
          return false
        }
        if (!t.dueDate) {
          console.log(`[TeamLeadDashboard] Task "${t.title}" has no due date, skipping`)
          return false
        }
        const due = new Date(t.dueDate)
        due.setHours(0, 0, 0, 0)
        const isInRange = due >= now && due <= weekFromNow
        console.log(`[TeamLeadDashboard] Task "${t.title}" due ${due.toLocaleDateString()}, in range: ${isInRange}`)
        return isInRange
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
    
    console.log(`[TeamLeadDashboard] Found ${filtered.length} tasks due this week`)
    return filtered
  }, [tasks])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
          My Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your cases and team overview
        </p>
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
            <span className="text-sm text-gray-600 dark:text-gray-400">My Cases</span>
            <Briefcase className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">{casesWithTeam.length}</p>
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
          <p className="text-xs text-gray-500 mt-2">My cases</p>
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
          onClick={() => router.push('/admin')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Team Members</span>
            <Users className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">{teamMembers.length}</p>
          <p className="text-xs text-gray-500 mt-2">On my cases</p>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Critical Deadlines */}
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/cases?filter=critical')}
          >
            <Calendar className="w-5 h-5 text-living-coral" />
            Critical Deadlines
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
                    <p className="font-medium text-deep-indigo dark:text-vapor">{getClientName(c.title)}</p>
                    <p className="text-sm text-gray-500">{c.stage}</p>
                  </div>
                  <Badge variant={c.daysUntilLimitation <= 60 ? 'destructive' : 'secondary'}>
                    {c.daysUntilLimitation} days
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Team Workload */}
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/admin')}
          >
            <Users className="w-5 h-5 text-electric-teal" />
            Team Workload
          </h2>
          {teamMembers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No team members assigned</p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-electric-teal/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-electric-teal">
                        {member.userName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-deep-indigo dark:text-vapor">{member.userName}</p>
                      <p className="text-xs text-gray-500">{member.userRole}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{member.caseCount} cases</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

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

      {/* Cases Needing Attention */}
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
                <Badge variant="outline" className="text-yellow-600">Stalled</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My Cases List */}
      <Card variant="glass" className="p-6">
        <h2
          className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
          onClick={() => router.push('/cases')}
        >
          <Briefcase className="w-5 h-5 text-electric-teal" />
          My Cases
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Client</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Lawyer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Paralegal</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Stage</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Value</th>
              </tr>
            </thead>
            <tbody>
              {casesWithTeam.slice(0, 10).map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-deep-indigo/30 cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-deep-indigo/70 dark:text-white/70" />
                      <p className="font-medium text-deep-indigo dark:text-vapor">{getClientName(c.title)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {c.lawyerName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400">
                            {c.lawyerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {getFirstName(c.lawyerName)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {c.paralegalName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">
                            {c.paralegalName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {getFirstName(c.paralegalName)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{c.stage}</td>
                  <td className="py-3 px-4">
                    <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-electric-teal">
                    {c.estimatedValue ? `$${c.estimatedValue.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {casesWithTeam.length > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/cases')}
              className="text-electric-teal hover:underline"
            >
              View all {casesWithTeam.length} cases
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

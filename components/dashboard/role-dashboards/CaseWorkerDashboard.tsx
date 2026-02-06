'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  Clock,
  CheckSquare,
  Calendar,
  FileText,
  AlertCircle,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCasesByIds } from '@/lib/db/cases'
import { getTasks } from '@/lib/db/tasks'
import { getWeeklyTimeStats } from '@/lib/db/time-entries'
import { getCasesForTeamMember, getColleaguesOnSameCases, TeamRole } from '@/lib/db/case-team'
import { getFirmUsers } from '@/lib/db/users'
import { PICase } from '@/types/pi-case'
import { Task } from '@/lib/db/tasks'
import { User } from '@/types/auth'
import { Scale } from 'lucide-react'

interface CaseWorkerDashboardProps {
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
 * Case Worker Dashboard - AB Coordinator / Junior Lawyer view
 * Shows only cases assigned to them, SABS-focused for AB Coordinators
 */
interface CaseWithTeam extends PICase {
  lawyerName?: string
  paralegalName?: string
}

export function CaseWorkerDashboard({ userId, userRole }: CaseWorkerDashboardProps) {
  const router = useRouter()
  const [cases, setCases] = React.useState<PICase[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [firmUsers, setFirmUsers] = React.useState<User[]>([])
  const [colleagues, setColleagues] = React.useState<{
    userId: string
    userName: string
    userRole: string
    teamRole: TeamRole
    sharedCaseCount: number
  }[]>([])
  const [timeStats, setTimeStats] = React.useState({ weeklyTotal: 0, streakDays: 0, dailyBreakdown: [] as { date: string; hours: number }[] })
  const [loading, setLoading] = React.useState(true)

  const isABCoordinator = userRole === 'AccidentBenefitsCoordinator'

  React.useEffect(() => {
    async function fetchData() {
      try {
        console.log(`[CaseWorkerDashboard] Fetching data for user: ${userId}`)
        
        // STEP 1: Get case IDs first (needed for cases and colleagues)
        const memberCaseIds = await getCasesForTeamMember(userId)
        console.log(`[CaseWorkerDashboard] Found ${memberCaseIds.length} case IDs:`, memberCaseIds)

        // STEP 2: Fetch everything else in PARALLEL
        const taskRole = mapUserRoleToTaskRole(userRole)
        const [myCases, myTasks, stats, myColleagues, users] = await Promise.all([
          // Get only the cases we need, not all cases
          getCasesByIds(memberCaseIds, { lightweight: true }),
          // Get tasks assigned to this user OR assigned to their role
          getTasks({ assignedTo: userId, assignedToRole: taskRole }),
          // Get time stats
          getWeeklyTimeStats(userId),
          // Get colleagues (this still needs memberCaseIds internally, but runs in parallel with others)
          getColleaguesOnSameCases(userId),
          // Get firm users for lawyer/paralegal names
          getFirmUsers(),
        ])

        console.log(`[CaseWorkerDashboard] Loaded ${myCases.length} cases, ${myTasks.length} tasks`)
        setCases(myCases)
        setTasks(myTasks)
        setTimeStats(stats)
        setColleagues(myColleagues)
        setFirmUsers(users)
      } catch (err) {
        console.error('[CaseWorkerDashboard] Error fetching data:', err)
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
  }, [cases, userMap])

  // Extract client name only (remove "v. Insurance Co.")
  const getClientName = (title: string) => {
    return title.split(/\s+v\.?\s+|\s+vs\.?\s+/i)[0].trim()
  }

  // Get first name only
  const getFirstName = (fullName?: string) => {
    if (!fullName) return null
    return fullName.split(' ')[0]
  }

  // Tasks due this week
  const tasksDueThisWeek = React.useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    weekFromNow.setHours(23, 59, 59, 999) // End of day 7 days from now

    console.log(`[CaseWorkerDashboard] Filtering tasks: ${tasks.length} total tasks`)
    const filtered = tasks
      .filter(t => {
        // Check if completed by status or completedAt
        const isCompleted = t.status === 'Completed' || !!t.completedAt
        if (isCompleted) {
          console.log(`[CaseWorkerDashboard] Task "${t.title}" is completed (status: ${t.status}), skipping`)
          return false
        }
        if (!t.dueDate) {
          console.log(`[CaseWorkerDashboard] Task "${t.title}" has no due date, skipping`)
          return false
        }
        const due = new Date(t.dueDate)
        due.setHours(0, 0, 0, 0)
        const isInRange = due >= now && due <= weekFromNow
        console.log(`[CaseWorkerDashboard] Task "${t.title}" due ${due.toLocaleDateString()}, in range: ${isInRange}`)
        return isInRange
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    
    console.log(`[CaseWorkerDashboard] Found ${filtered.length} tasks due this week`)
    return filtered
  }, [tasks])

  // OCF-3 renewals (for AB Coordinators)
  const ocfRenewals = React.useMemo(() => {
    if (!isABCoordinator) return []

    // Filter tasks that are OCF-3 related
    return tasks
      .filter(t =>
        !t.completed &&
        (t.title.toLowerCase().includes('ocf-3') || t.title.toLowerCase().includes('renewal'))
      )
      .slice(0, 5)
  }, [tasks, isABCoordinator])

  // Treatment gaps - cases with SABS where no recent treatment
  const treatmentGaps = React.useMemo(() => {
    if (!isABCoordinator) return []

    // For now, show cases that might need treatment follow-up
    // In a real implementation, this would check treatment dates
    return casesWithTeam
      .filter(c => c.hasSABS && c.status === 'Active')
      .slice(0, 5)
  }, [casesWithTeam, isABCoordinator])

  // Overdue tasks
  const overdueTasks = React.useMemo(() => {
    const now = new Date()
    return tasks.filter(t => {
      if (!t.dueDate || t.completed) return false
      return new Date(t.dueDate) < now
    })
  }, [tasks])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
          {isABCoordinator ? 'SABS Dashboard' : 'My Dashboard'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isABCoordinator
            ? 'Your assigned cases and SABS workflow tasks'
            : 'Your assigned cases and tasks'
          }
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Assigned Cases</span>
            <Briefcase className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">{casesWithTeam.length}</p>
          <p className="text-xs text-gray-500 mt-2">Active files</p>
        </Card>

        <Card
          variant="glass"
          hover
          className="p-6 cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => router.push('/tasks')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Tasks Due</span>
            <CheckSquare className="w-5 h-5 text-electric-teal" />
          </div>
          <p className="text-3xl font-bold text-deep-indigo dark:text-vapor">{tasksDueThisWeek.length}</p>
          <p className="text-xs text-gray-500 mt-2">This week</p>
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

      {/* Two Column Layout */}
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
              {tasksDueThisWeek.slice(0, 5).map((task) => (
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

        {/* AB Coordinator: OCF-3 Renewals */}
        {isABCoordinator ? (
          <Card variant="glass" className="p-6">
            <h2
              className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
              onClick={() => router.push('/tasks?filter=ocf')}
            >
              <FileText className="w-5 h-5 text-yellow-500" />
              OCF-3 Renewals Coming
            </h2>
            {ocfRenewals.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No OCF-3 renewals pending</p>
            ) : (
              <div className="space-y-3">
                {ocfRenewals.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
                  >
                    <div>
                      <p className="font-medium text-deep-indigo dark:text-vapor">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.category}</p>
                    </div>
                    <Badge variant="outline" className="text-yellow-600">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'TBD'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          /* Non-AB: Upcoming Deadlines */
          <Card variant="glass" className="p-6">
            <h2
              className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
              onClick={() => router.push('/cases')}
            >
              <Calendar className="w-5 h-5 text-living-coral" />
              Upcoming Deadlines
            </h2>
            {(() => {
              const casesWithLimitation = casesWithTeam.filter(c => {
                if (!c.limitationDate) {
                  console.log(`[CaseWorkerDashboard] Case "${c.title}" has no limitationDate`)
                  return false
                }
                return true
              })
              
              console.log(`[CaseWorkerDashboard] Found ${casesWithLimitation.length} cases with limitation dates out of ${casesWithTeam.length} total`)
              
              if (casesWithLimitation.length === 0) {
                return <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
              }
              
              return (
                <div className="space-y-3">
                  {casesWithLimitation
                    .sort((a, b) => new Date(a.limitationDate!).getTime() - new Date(b.limitationDate!).getTime())
                    .slice(0, 5)
                    .map((c) => {
                      const limitationDate = new Date(c.limitationDate!)
                      const now = new Date()
                      const daysUntil = Math.ceil((limitationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      
                      return (
                        <div
                          key={c.id}
                          onClick={() => router.push(`/cases/${c.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30 hover:bg-white/70 dark:hover:bg-deep-indigo/50 transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="font-medium text-deep-indigo dark:text-vapor">{getClientName(c.title)}</p>
                            <p className="text-sm text-gray-500">{c.stage}</p>
                          </div>
                          <Badge variant={daysUntil <= 60 ? 'destructive' : 'secondary'}>
                            {limitationDate.toLocaleDateString()} ({daysUntil > 0 ? `${daysUntil} days` : 'Overdue'})
                          </Badge>
                        </div>
                      )
                    })}
                </div>
              )
            })()}
          </Card>
        )}
      </div>

      {/* AB Coordinator: Treatment Gaps */}
      {isABCoordinator && treatmentGaps.length > 0 && (
        <Card variant="glass" className="p-6">
          <h2
            className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
            onClick={() => router.push('/cases?filter=sabs')}
          >
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Treatment Gaps Detected
          </h2>
          <div className="space-y-3">
            {treatmentGaps.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/cases/${c.id}`)}
                className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium text-deep-indigo dark:text-vapor">{c.title}</p>
                  <p className="text-sm text-gray-500">May need treatment follow-up</p>
                </div>
                <Badge variant="outline" className="text-yellow-600">Review</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My Assigned Cases */}
      <Card variant="glass" className="p-6">
        <h2
          className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
          onClick={() => router.push('/cases')}
        >
          <Briefcase className="w-5 h-5 text-electric-teal" />
          My Assigned Cases
        </h2>
        {casesWithTeam.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No cases assigned yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Lawyer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Paralegal</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Stage</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                  {isABCoordinator && (
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">SABS</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {casesWithTeam.map((c) => (
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
                    {isABCoordinator && (
                      <td className="py-3 px-4">
                        {c.hasSABS ? (
                          <Badge variant="outline" className="text-electric-teal">Active</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Team Section */}
      <Card variant="glass" className="p-6">
        <h2
          className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4 flex items-center gap-2 cursor-pointer hover:text-electric-teal transition-colors"
          onClick={() => router.push('/admin')}
        >
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

'use client'

import * as React from 'react'
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  addCaseTeamMember,
  removeCaseTeamMember,
  getCaseTeamMembers,
  TeamRole,
  CaseTeamMember
} from '@/lib/db/case-team'
import { getFirmUsers } from '@/lib/db/users'
import { getCases } from '@/lib/db/cases'
import { User } from '@/types/auth'
import { PICase } from '@/types/pi-case'
import { Loader2, AlertCircle, Users, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CaseWithTeam extends PICase {
  teamMembers: CaseTeamMember[]
}

// Avatar colors based on role
const roleColors: Record<string, { ring: string; bg: string; accent: string }> = {
  SuperAdmin: { ring: 'ring-emerald-400', bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', accent: '#10b981' },
  Admin: { ring: 'ring-emerald-400', bg: 'bg-gradient-to-br from-emerald-400 to-teal-500', accent: '#14b8a6' },
  Lawyer: { ring: 'ring-sky-400', bg: 'bg-gradient-to-br from-sky-400 to-blue-600', accent: '#0ea5e9' },
  LawClerk: { ring: 'ring-violet-400', bg: 'bg-gradient-to-br from-violet-400 to-purple-600', accent: '#8b5cf6' },
  Paralegal: { ring: 'ring-cyan-400', bg: 'bg-gradient-to-br from-cyan-400 to-teal-500', accent: '#22d3ee' },
  LegalAssistant: { ring: 'ring-indigo-400', bg: 'bg-gradient-to-br from-indigo-400 to-blue-500', accent: '#818cf8' },
  AccidentBenefitsCoordinator: { ring: 'ring-rose-400', bg: 'bg-gradient-to-br from-rose-400 to-pink-500', accent: '#fb7185' },
}

const roleLabels: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Administrator',
  Lawyer: 'Lawyer',
  LawClerk: 'Law Clerk',
  Paralegal: 'Paralegal',
  LegalAssistant: 'Legal Assistant',
  AccidentBenefitsCoordinator: 'AB Coordinator',
}

const rolePriority: Record<string, number> = {
  SuperAdmin: 0,
  Admin: 1,
  Lawyer: 2,
  Paralegal: 3,
  LawClerk: 4,
  LegalAssistant: 5,
  AccidentBenefitsCoordinator: 6,
}

// Mini Org Chart Tree for Case Teams
// Structure: Two separate trees side by side
// 1. TORT TEAM: Tort Lead (Lawyer) → Lawyers below
// 2. AB TEAM: AB Lead (Paralegal) → Assistants below
function CaseTeamTree({ 
  members, 
  firmUsers, 
  onRemove 
}: { 
  members: CaseTeamMember[]
  firmUsers: User[]
  onRemove: (userId: string) => void
}) {
  // Group by role
  const tortLeads = members.filter(m => m.teamRole === 'lead_lawyer')
  const abLeads = members.filter(m => m.teamRole === 'paralegal') // AB/SABS team leads
  const tortLawyers = members.filter(m => m.teamRole === 'team_member') // Lawyers under tort lead
  const abAssistants = members.filter(m => m.teamRole === 'ab_assistant') // Assistants under AB lead

  const MemberNode = ({ 
    member, 
    isLead = false,
    showConnector = false,
    teamType = 'tort'
  }: { 
    member: CaseTeamMember
    isLead?: boolean
    showConnector?: boolean
    teamType?: 'tort' | 'ab'
  }) => {
    const memberUser = firmUsers.find(u => u.id === member.userId)
    const colors = memberUser ? (roleColors[memberUser.role] || roleColors.LegalAssistant) : roleColors.Lawyer
    const initials = (member.userName || 'U')?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const firstName = member.userName?.split(' ')[0] || 'Unknown'

    // Role labels based on team type
    let roleLabel = ''
    let badgeColor = ''
    
    if (member.teamRole === 'lead_lawyer') {
      roleLabel = 'Tort Lead'
      badgeColor = 'bg-blue-100 text-blue-700'
    } else if (member.teamRole === 'paralegal') {
      roleLabel = 'AB Lead'
      badgeColor = 'bg-teal-100 text-teal-700'
    } else if (member.teamRole === 'team_member') {
      roleLabel = 'Lawyer'
      badgeColor = 'bg-blue-50 text-blue-600'
    } else if (member.teamRole === 'ab_assistant') {
      roleLabel = 'Assistant'
      badgeColor = 'bg-teal-50 text-teal-600'
    }

    const connectorColor = teamType === 'tort' 
      ? 'bg-gradient-to-b from-blue-400 to-blue-300' 
      : 'bg-gradient-to-b from-teal-400 to-teal-300'

    return (
      <div className="flex flex-col items-center">
        {showConnector && (
          <div className={cn("w-0.5 h-3", connectorColor)} />
        )}
        <div className="relative group">
          <div className={cn(
            "rounded-full p-0.5 transition-all",
            isLead ? "ring-2" : "ring-1",
            colors.ring,
            "group-hover:ring-offset-1 group-hover:ring-offset-white"
          )}>
            <div className={cn(
              "rounded-full flex items-center justify-center text-white font-bold shadow-md",
              colors.bg,
              isLead ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs"
            )}>
              {initials}
            </div>
          </div>
          {/* Remove button on hover */}
          <button
            onClick={() => onRemove(member.userId)}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Remove"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
        <p className="mt-1 text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center truncate max-w-[60px]">
          {firstName}
        </p>
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", badgeColor)}>
          {roleLabel}
        </span>
      </div>
    )
  }

  // Single branch tree component
  const TeamBranch = ({ 
    lead, 
    subordinates, 
    teamType,
    label 
  }: { 
    lead: CaseTeamMember | null
    subordinates: CaseTeamMember[]
    teamType: 'tort' | 'ab'
    label: string
  }) => {
    const branchColor = teamType === 'tort' ? 'from-blue-400 to-blue-300' : 'from-teal-400 to-teal-300'
    const labelColor = teamType === 'tort' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-teal-600 border-teal-200 bg-teal-50'
    
    if (!lead && subordinates.length === 0) return null

    return (
      <div className="flex flex-col items-center">
        {/* Team label */}
        <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full border mb-2", labelColor)}>
          {label}
        </span>
        
        {/* Lead */}
        {lead && (
          <>
            <MemberNode member={lead} isLead teamType={teamType} />
            
            {/* Connector down */}
            {subordinates.length > 0 && (
              <div className={cn("w-0.5 h-4 mt-1 bg-gradient-to-b", branchColor)} />
            )}
          </>
        )}
        
        {/* Horizontal connector for multiple subordinates */}
        {subordinates.length > 1 && (
          <div 
            className={cn("h-0.5 bg-gradient-to-r", branchColor)}
            style={{ width: `${Math.max(50, subordinates.length * 45)}px` }}
          />
        )}
        
        {/* Subordinates */}
        {subordinates.length > 0 && (
          <div className="flex gap-2 justify-center">
            {subordinates.map(member => (
              <MemberNode 
                key={member.id} 
                member={member} 
                showConnector={!!lead && subordinates.length > 1}
                teamType={teamType}
              />
            ))}
          </div>
        )}
        
        {/* If no lead but has subordinates, show them directly */}
        {!lead && subordinates.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {subordinates.map((member, idx) => (
              <MemberNode key={member.id} member={member} isLead={idx === 0} teamType={teamType} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // If only one member and they're not a lead, show simple view
  if (members.length === 1) {
    const member = members[0]
    const teamType = member.teamRole === 'paralegal' || member.teamRole === 'ab_assistant' ? 'ab' : 'tort'
    return (
      <div className="flex justify-center py-2">
        <MemberNode member={member} isLead teamType={teamType} />
      </div>
    )
  }

  const hasTortTeam = tortLeads.length > 0 || tortLawyers.length > 0
  const hasAbTeam = abLeads.length > 0 || abAssistants.length > 0

  return (
    <div className="py-2">
      <div className={cn(
        "flex justify-center",
        hasTortTeam && hasAbTeam ? "gap-8" : "gap-4"
      )}>
        {/* TORT TEAM BRANCH */}
        {hasTortTeam && (
          <TeamBranch 
            lead={tortLeads[0] || null}
            subordinates={tortLawyers}
            teamType="tort"
            label="Tort"
          />
        )}
        
        {/* Vertical divider between teams */}
        {hasTortTeam && hasAbTeam && (
          <div className="w-px bg-gray-200 dark:bg-gray-700 self-stretch mx-2" />
        )}
        
        {/* AB/SABS TEAM BRANCH */}
        {hasAbTeam && (
          <TeamBranch 
            lead={abLeads[0] || null}
            subordinates={abAssistants}
            teamType="ab"
            label="SABS/AB"
          />
        )}
      </div>
    </div>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [firmUsers, setFirmUsers] = React.useState<User[]>([])
  const [cases, setCases] = React.useState<CaseWithTeam[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Drag state
  const [draggedUser, setDraggedUser] = React.useState<User | null>(null)
  const [dropTargetCase, setDropTargetCase] = React.useState<string | null>(null)
  const [showRoleSelector, setShowRoleSelector] = React.useState<{ caseId: string; userId: string } | null>(null)
  const [assignError, setAssignError] = React.useState<string | null>(null)

  // Collapsed sections in org chart
  const [expandedRoles, setExpandedRoles] = React.useState<Set<string>>(new Set(['Lawyer', 'Paralegal']))

  React.useEffect(() => {
    async function fetchData() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        // Fetch users and cases in parallel
        const [usersData, casesData] = await Promise.all([
          getFirmUsers(),
          getCases()
        ])

        setFirmUsers(usersData)

        // Fetch team members for each case
        const casesWithTeam = await Promise.all(
          casesData.map(async (c) => {
            try {
              const teamMembers = await getCaseTeamMembers(c.id)
              return { ...c, teamMembers }
            } catch {
              return { ...c, teamMembers: [] }
            }
          })
        )

        setCases(casesWithTeam)
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to load team data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Group users by role and sort
  const usersByRole = React.useMemo(() => {
    const grouped: Record<string, User[]> = {}
    firmUsers.forEach(u => {
      const role = u.role || 'Other'
      if (!grouped[role]) grouped[role] = []
      grouped[role].push(u)
    })
    // Sort within each role by name
    Object.values(grouped).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)))
    return grouped
  }, [firmUsers])

  // Get sorted role keys
  const sortedRoles = React.useMemo(() => {
    return Object.keys(usersByRole).sort((a, b) => 
      (rolePriority[a] ?? 99) - (rolePriority[b] ?? 99)
    )
  }, [usersByRole])

  // Get top person (Admin only - SuperAdmin is hidden as they're the SaaS owner)
  const topPerson = React.useMemo(() => {
    const admins = usersByRole['Admin'] || []
    return admins[0] || null
  }, [usersByRole])

  // Filter out SuperAdmin from visible roles (they're the SaaS platform owner)
  const visibleRoles = React.useMemo(() => {
    return sortedRoles.filter(role => role !== 'SuperAdmin')
  }, [sortedRoles])

  const toggleRole = (role: string) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(role)) {
        newSet.delete(role)
      } else {
        newSet.add(role)
      }
      return newSet
    })
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, userToDrag: User) => {
    setDraggedUser(userToDrag)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDragEnd = () => {
    setDraggedUser(null)
    setDropTargetCase(null)
  }

  const handleDragOver = (e: React.DragEvent, caseId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropTargetCase(caseId)
  }

  const handleDragLeave = () => {
    setDropTargetCase(null)
  }

  const handleDrop = async (e: React.DragEvent, caseId: string) => {
    e.preventDefault()
    setDropTargetCase(null)

    if (!draggedUser || !user) return

    // Check if user is already on this case
    const targetCase = cases.find(c => c.id === caseId)
    if (targetCase?.teamMembers.some(m => m.userId === draggedUser.id)) {
      setDraggedUser(null)
      return
    }

    // Show role selector
    setShowRoleSelector({ caseId, userId: draggedUser.id })
  }

  const handleAssignRole = async (role: TeamRole) => {
    if (!showRoleSelector || !user) return

    const { caseId, userId } = showRoleSelector
    const userToAdd = firmUsers.find(u => u.id === userId)
    setAssignError(null)

    try {
      const newMember = await addCaseTeamMember(caseId, userId, role, user.id)

      // Update local state
      setCases(prev => prev.map(c => {
        if (c.id === caseId) {
          return {
            ...c,
            teamMembers: [...c.teamMembers, {
              ...newMember,
              userName: userToAdd?.name,
              userRole: userToAdd?.role,
            }]
          }
        }
        return c
      }))

      // Invalidate cases cache so Cases page will refetch with updated team
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    } catch (err: any) {
      console.error('[Team] Error adding team member:', err)
      setAssignError(err.message || 'Failed to assign team member')
    }

    setShowRoleSelector(null)
    setDraggedUser(null)
  }

  const handleRemoveMember = async (caseId: string, userId: string) => {
    if (!user) return

    try {
      await removeCaseTeamMember(caseId, userId)

      // Update local state
      setCases(prev => prev.map(c => {
        if (c.id === caseId) {
          return {
            ...c,
            teamMembers: c.teamMembers.filter(m => m.userId !== userId)
          }
        }
        return c
      }))

      // Invalidate cases cache so Cases page will refetch with updated team
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    } catch (err) {
      console.error('Error removing team member:', err)
    }
  }

  // Draggable person avatar component
  const DraggableAvatar = ({ user: u, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) => {
    const colors = roleColors[u.role] || roleColors.LegalAssistant
    const isDragging = draggedUser?.id === u.id

    const sizeClasses = {
      sm: 'w-10 h-10 text-xs',
      md: 'w-12 h-12 text-sm',
      lg: 'w-16 h-16 text-lg',
    }

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, u)}
        onDragEnd={handleDragEnd}
        className={cn(
          "flex flex-col items-center cursor-grab active:cursor-grabbing transition-all group",
          isDragging && "opacity-50 scale-95"
        )}
      >
        <div className={cn(
          "rounded-full p-0.5 transition-all",
          "ring-2",
          colors.ring,
          "group-hover:ring-offset-2 group-hover:ring-offset-white dark:group-hover:ring-offset-gray-900 group-hover:scale-110"
        )}>
          <div className={cn(
            "rounded-full flex items-center justify-center text-white font-bold shadow-lg",
            colors.bg,
            sizeClasses[size]
          )}>
            {u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        </div>
        <p className="mt-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 text-center truncate max-w-[80px]">
          {u.name?.split(' ')[0]}
        </p>
      </div>
    )
  }

  const subtitle = loading 
    ? 'Loading...' 
    : `Drag team members from the org chart onto cases to assign them`

  return (
    <DashboardLayout activeNavId="team">
      <div className="h-full flex flex-col overflow-hidden">
        <PageHeader
          title="Team Assignment"
          subtitle={subtitle}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-electric-teal" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center">
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
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Visual Org Chart */}
            <div className="w-80 border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto bg-gradient-to-b from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50 backdrop-blur-sm">
              {/* Top Person */}
              {topPerson && (
                <div className="flex flex-col items-center pt-6 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
                  <DraggableAvatar user={topPerson} size="lg" />
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{topPerson.name}</p>
                  <p className="text-xs text-gray-500">{roleLabels[topPerson.role]}</p>
                  <span 
                    className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: roleColors[topPerson.role]?.accent || '#6b7280' }}
                  >
                    Diamond Law
                  </span>
                  {/* Connector line */}
                  <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-sky-400 mt-4" />
                </div>
              )}

              {/* Role Sections (SuperAdmin hidden - they're the SaaS owner) */}
              <div className="p-4 space-y-3">
                {visibleRoles.map(role => {
                  const roleUsers = usersByRole[role]
                  const colors = roleColors[role] || roleColors.LegalAssistant
                  const isExpanded = expandedRoles.has(role)
                  
                  // Filter out the top person
                  const filteredUsers = roleUsers.filter(u => u.id !== topPerson?.id)
                  if (filteredUsers.length === 0) return null

                  return (
                    <div key={role} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-gray-100/50 dark:border-gray-700/50">
                      {/* Role Header */}
                      <button
                        onClick={() => toggleRole(role)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors.accent }}
                          />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {roleLabels[role] || role}s
                            </p>
                            <p className="text-xs text-gray-500">
                              {filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Mini avatars preview when collapsed */}
                          {!isExpanded && (
                            <div className="flex -space-x-2">
                              {filteredUsers.slice(0, 3).map(u => (
                                <div 
                                  key={u.id}
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                                    "ring-2 ring-white dark:ring-gray-800",
                                    colors.bg
                                  )}
                                >
                                  {u.name?.charAt(0)}
                                </div>
                              ))}
                              {filteredUsers.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800">
                                  +{filteredUsers.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Grid of Avatars */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100/50 dark:border-gray-700/50">
                          <div className="grid grid-cols-4 gap-3">
                            {filteredUsers.map(u => (
                              <DraggableAvatar key={u.id} user={u} size="sm" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="p-4 text-center text-xs text-gray-500 border-t border-gray-200/50 dark:border-gray-700/50">
                <strong className="text-gray-900 dark:text-white">{firmUsers.length}</strong> Team Members
              </div>
            </div>

            {/* Right Panel - Cases */}
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Cases ({cases.length})
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {cases.map(c => (
                  <Card
                    key={c.id}
                    variant="glass"
                    className={cn(
                      "p-4 transition-all",
                      dropTargetCase === c.id && "ring-2 ring-electric-teal bg-electric-teal/5"
                    )}
                    onDragOver={(e) => handleDragOver(e, c.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, c.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-deep-indigo dark:text-vapor truncate">
                          {c.title}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{c.stage}</p>
                      </div>
                      <Badge variant={c.status === 'Active' ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
                        {c.status}
                      </Badge>
                    </div>

                    {/* Team Members - Mini Org Chart */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Team ({c.teamMembers.length})
                      </p>

                      {c.teamMembers.length === 0 ? (
                        <div className={cn(
                          "p-3 border-2 border-dashed rounded-lg text-center text-sm text-gray-400",
                          dropTargetCase === c.id ? "border-electric-teal bg-electric-teal/10" : "border-gray-300 dark:border-gray-600"
                        )}>
                          {dropTargetCase === c.id ? "Drop to assign" : "Drag team member here"}
                        </div>
                      ) : (
                        <CaseTeamTree 
                          members={c.teamMembers} 
                          firmUsers={firmUsers}
                          onRemove={(userId) => handleRemoveMember(c.id, userId)}
                        />
                      )}

                      {/* Drop zone indicator when dragging */}
                      {dropTargetCase === c.id && c.teamMembers.length > 0 && (
                        <div className="p-2 border-2 border-dashed border-electric-teal rounded-lg text-center text-sm text-electric-teal bg-electric-teal/10">
                          Drop to add
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {assignError && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{assignError}</span>
            <button onClick={() => setAssignError(null)} className="ml-2 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Role Selector Modal */}
        {showRoleSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card variant="glass" className="p-6 w-80">
              <h3 className="text-lg font-semibold text-deep-indigo dark:text-vapor mb-4">
                Select Role
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Assign {firmUsers.find(u => u.id === showRoleSelector.userId)?.name} as:
              </p>
              {/* Tort Team Roles */}
              <p className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Tort Team
              </p>
              <div className="space-y-2 mb-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                  onClick={() => handleAssignRole('lead_lawyer')}
                >
                  <span className={cn("w-3 h-3 rounded-full mr-2", "bg-blue-500")} />
                  <div className="text-left">
                    <span className="block">Tort Lead</span>
                    <span className="text-[10px] text-gray-400">Leads tort/litigation</span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start border-blue-100 hover:border-blue-300 hover:bg-blue-50"
                  onClick={() => handleAssignRole('team_member')}
                >
                  <span className={cn("w-3 h-3 rounded-full mr-2", "bg-blue-300")} />
                  <div className="text-left">
                    <span className="block">Lawyer</span>
                    <span className="text-[10px] text-gray-400">Under Tort Lead</span>
                  </div>
                </Button>
              </div>

              {/* AB/SABS Team Roles */}
              <p className="text-xs font-medium text-teal-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                AB/SABS Team
              </p>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start border-teal-200 hover:border-teal-400 hover:bg-teal-50"
                  onClick={() => handleAssignRole('paralegal')}
                >
                  <span className={cn("w-3 h-3 rounded-full mr-2", "bg-teal-500")} />
                  <div className="text-left">
                    <span className="block">AB Lead</span>
                    <span className="text-[10px] text-gray-400">Leads accident benefits</span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start border-teal-100 hover:border-teal-300 hover:bg-teal-50"
                  onClick={() => handleAssignRole('ab_assistant' as TeamRole)}
                >
                  <span className={cn("w-3 h-3 rounded-full mr-2", "bg-teal-300")} />
                  <div className="text-left">
                    <span className="block">Assistant</span>
                    <span className="text-[10px] text-gray-400">Under AB Lead</span>
                  </div>
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => {
                  setShowRoleSelector(null)
                  setDraggedUser(null)
                }}
              >
                Cancel
              </Button>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

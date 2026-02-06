'use client'

/**
 * Organization Chart Component
 * Beautiful hierarchical tree visualization of team structure
 */

import * as React from 'react'
import { User } from '@/types/auth'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, ChevronRight, Mail, Briefcase, Users } from 'lucide-react'

interface OrgChartProps {
  users: User[]
  firmName?: string
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
  SuperAdmin: 'Super Administrator',
  Admin: 'Firm Administrator',
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

export function OrgChart({ users, firmName = 'Diamond Law' }: OrgChartProps) {
  const [expandedRoles, setExpandedRoles] = React.useState<Set<string>>(new Set(['SuperAdmin', 'Admin', 'Lawyer']))
  const [hoveredUser, setHoveredUser] = React.useState<string | null>(null)

  // Group users by role
  const usersByRole = React.useMemo(() => {
    const grouped: Record<string, User[]> = {}
    users.forEach(u => {
      const role = u.role || 'Other'
      if (!grouped[role]) grouped[role] = []
      grouped[role].push(u)
    })
    // Sort within each role by name
    Object.values(grouped).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)))
    return grouped
  }, [users])

  // Get sorted role keys
  const sortedRoles = React.useMemo(() => {
    return Object.keys(usersByRole).sort((a, b) => 
      (rolePriority[a] ?? 99) - (rolePriority[b] ?? 99)
    )
  }, [usersByRole])

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

  // Get top person (SuperAdmin or first Admin)
  const topPerson = React.useMemo(() => {
    const superAdmins = usersByRole['SuperAdmin'] || []
    const admins = usersByRole['Admin'] || []
    return superAdmins[0] || admins[0] || null
  }, [usersByRole])

  const PersonAvatar = ({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
    const colors = roleColors[user.role] || roleColors.LegalAssistant
    const isHovered = hoveredUser === user.id
    
    const sizeClasses = {
      sm: 'w-10 h-10 text-sm',
      md: 'w-14 h-14 text-lg',
      lg: 'w-20 h-20 text-2xl',
      xl: 'w-24 h-24 text-3xl',
    }

    const ringSize = {
      sm: 'ring-2',
      md: 'ring-2',
      lg: 'ring-4',
      xl: 'ring-4',
    }

    return (
      <div 
        className="relative group"
        onMouseEnter={() => setHoveredUser(user.id)}
        onMouseLeave={() => setHoveredUser(null)}
      >
        <div className={cn(
          "rounded-full p-0.5 transition-all duration-300",
          ringSize[size],
          colors.ring,
          isHovered && "ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-110"
        )}>
          <div className={cn(
            "rounded-full flex items-center justify-center text-white font-bold shadow-lg",
            colors.bg,
            sizeClasses[size]
          )}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
            )}
          </div>
        </div>

        {/* Hover tooltip */}
        {isHovered && (
          <div className={cn(
            "absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 p-3",
            "bg-white dark:bg-gray-800 rounded-xl shadow-xl",
            "border border-gray-200 dark:border-gray-700 min-w-[200px]",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold", colors.bg)}>
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{roleLabels[user.role] || user.role}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-3 h-3" />
                <span>{user.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const Connector = ({ direction = 'down' }: { direction?: 'down' | 'right' }) => (
    <div className={cn(
      "bg-gradient-to-r from-emerald-400 to-sky-400",
      direction === 'down' ? 'w-0.5 h-8' : 'h-0.5 w-8'
    )} />
  )

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No team members yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Add team members to see the organization chart
        </p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-y-auto p-8">
      {/* Top Person / Firm Leader */}
      {topPerson && (
        <div className="flex flex-col items-center mb-8">
          <PersonAvatar user={topPerson} size="xl" />
          <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{topPerson.name}</h3>
          <p className="text-sm text-gray-500">{roleLabels[topPerson.role] || topPerson.role}</p>
          <span 
            className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: roleColors[topPerson.role]?.accent || '#6b7280' }}
          >
            {firmName}
          </span>
          <Connector />
        </div>
      )}

      {/* Role-based sections */}
      <div className="max-w-6xl mx-auto space-y-6">
        {sortedRoles.map(role => {
          const roleUsers = usersByRole[role]
          // Skip the top person's role if they're the only one
          if (role === topPerson?.role && roleUsers.length === 1) return null
          
          const isExpanded = expandedRoles.has(role)
          const colors = roleColors[role] || roleColors.LegalAssistant
          const displayUsers = isExpanded ? roleUsers : roleUsers.slice(0, 0)
          
          // Filter out the top person if they're in this role
          const filteredUsers = roleUsers.filter(u => u.id !== topPerson?.id)
          if (filteredUsers.length === 0) return null

          return (
            <div key={role} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Role Header */}
              <button
                onClick={() => toggleRole(role)}
                className={cn(
                  "w-full px-6 py-4 flex items-center justify-between",
                  "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                )}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className={cn("w-3 h-3 rounded-full")}
                    style={{ backgroundColor: colors.accent }}
                  />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {roleLabels[role] || role}s
                    </h3>
                    <p className="text-sm text-gray-500">
                      {filteredUsers.length} team member{filteredUsers.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Preview avatars when collapsed */}
                  {!isExpanded && filteredUsers.length > 0 && (
                    <div className="flex -space-x-3">
                      {filteredUsers.slice(0, 5).map(u => (
                        <div 
                          key={u.id}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                            "ring-2 ring-white dark:ring-gray-800",
                            colors.bg
                          )}
                        >
                          {u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                      ))}
                      {filteredUsers.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800">
                          +{filteredUsers.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 pb-6">
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {filteredUsers.map(user => (
                        <div key={user.id} className="flex flex-col items-center text-center group">
                          <PersonAvatar user={user} size="md" />
                          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white truncate w-full">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate w-full">
                            {user.email?.split('@')[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 flex justify-center gap-6 text-sm text-gray-500">
        <span><strong className="text-gray-900 dark:text-white">{users.length}</strong> Team Members</span>
        <span><strong className="text-gray-900 dark:text-white">{sortedRoles.length}</strong> Roles</span>
      </div>
    </div>
  )
}

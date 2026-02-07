'use client'

import * as React from 'react'
import { DashboardLayout, PageHeader, PageContent } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Loader2, Search, ChevronUp, ChevronDown, RefreshCw, Calendar, Scale, MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCases } from '@/lib/hooks/useData'
import { getFirmUsers } from '@/lib/db/users'
import { QueryError, EmptyState } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { PICase } from '@/types/pi-case'
import { User } from '@/types/auth'

type SortField = 'title' | 'fileNumber' | 'dateOfLoss' | 'stage' | 'status'
type SortDir = 'asc' | 'desc'

interface CaseWithTeam extends PICase {
  lawyerName?: string
  paralegalName?: string
}

export default function CasesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortField, setSortField] = React.useState<SortField>('title')
  const [sortDir, setSortDir] = React.useState<SortDir>('asc')
  const [firmUsers, setFirmUsers] = React.useState<User[]>([])
  const [usersLoading, setUsersLoading] = React.useState(true)

  const { 
    data: cases = [], 
    isLoading, 
    isError, 
    error, 
    refetch,
    isFetching 
  } = useCases({ 
    lightweight: false, // We need full data to get lawyer/paralegal IDs
    enabled: !!user,
  })

  // Fetch firm users to get names
  React.useEffect(() => {
    async function fetchUsers() {
      if (!user) return
      try {
        const users = await getFirmUsers()
        setFirmUsers(users)
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setUsersLoading(false)
      }
    }
    fetchUsers()
  }, [user])

  // Create a user map for quick lookups
  const userMap = React.useMemo(() => {
    const map = new Map<string, User>()
    firmUsers.forEach(u => map.set(u.id, u))
    return map
  }, [firmUsers])

  // Enrich cases with lawyer/paralegal names
  const casesWithTeam = React.useMemo((): CaseWithTeam[] => {
    return cases.map(c => {
      // Try to get lawyer from primaryLawyerId or lead_lawyer_id
      const lawyerId = (c as any).primaryLawyerId || (c as any).lead_lawyer_id || (c as any).leadLawyerId
      const paralegalId = (c as any).assignedParalegalId || (c as any).paralegal_id || (c as any).paralegalId
      
      const lawyer = lawyerId ? userMap.get(lawyerId) : undefined
      const paralegal = paralegalId ? userMap.get(paralegalId) : undefined
      
      return {
        ...c,
        lawyerName: lawyer?.name,
        paralegalName: paralegal?.name,
      }
    })
  }, [cases, userMap])

  const filteredAndSortedCases = React.useMemo(() => {
    let result = casesWithTeam

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.stage?.toLowerCase().includes(query) ||
          c.status?.toLowerCase().includes(query) ||
          c.lawyerName?.toLowerCase().includes(query) ||
          c.paralegalName?.toLowerCase().includes(query)
      )
    }

    result = [...result].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'dateOfLoss':
          aVal = a.dateOfLoss || ''
          bVal = b.dateOfLoss || ''
          break
        case 'stage':
          aVal = a.stage || ''
          bVal = b.stage || ''
          break
        case 'status':
          aVal = a.status || ''
          bVal = b.status || ''
          break
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [searchQuery, casesWithTeam, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
    )
  }

  // Status styling
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Active':
        return {
          dot: 'bg-emerald-500',
          text: 'text-emerald-700 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        }
      case 'Closed':
        return {
          dot: 'bg-slate-400',
          text: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-50 dark:bg-slate-500/10',
        }
      case 'Settled':
        return {
          dot: 'bg-amber-500',
          text: 'text-amber-700 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-500/10',
        }
      case 'Pending':
        return {
          dot: 'bg-blue-500',
          text: 'text-blue-700 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-500/10',
        }
      default:
        return {
          dot: 'bg-gray-400',
          text: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-500/10',
        }
    }
  }

  // Stage badge styling
  const getStageStyles = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'intake':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
      case 'discovery':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
      case 'negotiation':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
      case 'litigation':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
      case 'trial':
        return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
      default:
        return 'bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400'
    }
  }

  // Get first name only
  const getFirstName = (fullName?: string) => {
    if (!fullName) return null
    return fullName.split(' ')[0]
  }

  const subtitle = isLoading 
    ? 'Loading...' 
    : `${filteredAndSortedCases.length} ${filteredAndSortedCases.length === 1 ? 'case' : 'cases'}`

  return (
    <DashboardLayout activeNavId="cases">
      <PageHeader
        title="Cases"
        subtitle={subtitle}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2 text-gray-500", isFetching && "animate-spin")} />
              <span className="text-gray-600 dark:text-gray-300">Refresh</span>
            </Button>
            <Button 
              onClick={() => router.push('/cases/new')}
              className="bg-deep-indigo hover:bg-deep-indigo/90 dark:bg-electric-teal dark:hover:bg-electric-teal/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </>
        }
      />

      <PageContent>
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-deep-indigo dark:focus:border-electric-teal focus:ring-deep-indigo/20 dark:focus:ring-electric-teal/20"
          />
        </div>

        {/* Error State */}
        {isError && (
          <QueryError 
            error={error instanceof Error ? error : new Error('Failed to load cases')} 
            onRetry={() => refetch()}
          />
        )}

        {/* Loading State */}
        {(isLoading || usersLoading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-deep-indigo dark:text-electric-teal" />
          </div>
        ) : !isError && filteredAndSortedCases.length === 0 ? (
          <EmptyState
            title={cases.length === 0 ? 'No cases yet' : 'No cases match your search'}
            description={cases.length === 0 ? 'Create your first case to get started' : 'Try adjusting your search query'}
            action={
              cases.length === 0 && (
                <Button 
                  onClick={() => router.push('/cases/new')}
                  className="bg-deep-indigo hover:bg-deep-indigo/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Case
                </Button>
              )
            }
          />
        ) : !isError && (
          /* Clean Table Design */
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th
                      className="text-left px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-deep-indigo dark:hover:text-electric-teal transition-colors select-none"
                      onClick={() => handleSort('title')}
                    >
                      Client <SortIcon field="title" />
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      File No.
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Lawyer
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Paralegal
                    </th>
                    <th
                      className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-deep-indigo dark:hover:text-electric-teal transition-colors select-none whitespace-nowrap"
                      onClick={() => handleSort('dateOfLoss')}
                    >
                      DOL <SortIcon field="dateOfLoss" />
                    </th>
                    <th
                      className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-deep-indigo dark:hover:text-electric-teal transition-colors select-none"
                      onClick={() => handleSort('stage')}
                    >
                      Stage <SortIcon field="stage" />
                    </th>
                    <th
                      className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-deep-indigo dark:hover:text-electric-teal transition-colors select-none"
                      onClick={() => handleSort('status')}
                    >
                      Status <SortIcon field="status" />
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredAndSortedCases.map((piCase) => {
                    const statusStyles = getStatusStyles(piCase.status || 'Active')
                    
                    return (
                      <tr
                        key={piCase.id}
                        onClick={() => router.push(`/cases/${piCase.id}`)}
                        className="group cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        {/* Client Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-deep-indigo/10 to-deep-indigo/5 dark:from-white/10 dark:to-white/5 flex items-center justify-center group-hover:from-deep-indigo/20 group-hover:to-deep-indigo/10 dark:group-hover:from-white/15 dark:group-hover:to-white/10 transition-all flex-shrink-0">
                              <Scale className="w-4 h-4 text-deep-indigo/70 dark:text-white/70" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white group-hover:text-deep-indigo dark:group-hover:text-electric-teal transition-colors truncate">
                                {piCase.title.split(/\s+v\.?\s+|\s+vs\.?\s+/i)[0].trim()}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* File Number */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {piCase.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>

                        {/* Lawyer */}
                        <td className="px-4 py-3.5">
                          {piCase.lawyerName ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400">
                                  {piCase.lawyerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                                {getFirstName(piCase.lawyerName)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Paralegal */}
                        <td className="px-4 py-3.5">
                          {piCase.paralegalName ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">
                                  {piCase.paralegalName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                                {getFirstName(piCase.paralegalName)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Date of Loss */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm whitespace-nowrap">
                              {piCase.dateOfLoss ? new Date(piCase.dateOfLoss).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: '2-digit' 
                              }) : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Stage */}
                        <td className="px-4 py-3.5">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            getStageStyles(piCase.stage || 'Intake')
                          )}>
                            {piCase.stage || 'Intake'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
                            statusStyles.bg, statusStyles.text
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusStyles.dot)} />
                            {piCase.status || 'Active'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3.5">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageContent>
    </DashboardLayout>
  )
}

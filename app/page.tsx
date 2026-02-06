'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { isUserLeadOnAnyCases } from '@/lib/db/case-team'

// Lazy load dashboard components
const FirmDashboard = dynamic(
  () => import('@/components/dashboard/role-dashboards/FirmDashboard').then(mod => ({ default: mod.FirmDashboard })),
  { loading: () => <DashboardSkeleton />, ssr: false }
)

const TeamLeadDashboard = dynamic(
  () => import('@/components/dashboard/role-dashboards/TeamLeadDashboard').then(mod => ({ default: mod.TeamLeadDashboard })),
  { loading: () => <DashboardSkeleton />, ssr: false }
)

const CaseWorkerDashboard = dynamic(
  () => import('@/components/dashboard/role-dashboards/CaseWorkerDashboard').then(mod => ({ default: mod.CaseWorkerDashboard })),
  { loading: () => <DashboardSkeleton />, ssr: false }
)

const TaskOnlyDashboard = dynamic(
  () => import('@/components/dashboard/role-dashboards/TaskOnlyDashboard').then(mod => ({ default: mod.TaskOnlyDashboard })),
  { loading: () => <DashboardSkeleton />, ssr: false }
)

const CommandPalette = dynamic(
  () => import('@/components/command-palette/CommandPalette').then(mod => ({ default: mod.CommandPalette })),
  { ssr: false }
)

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

type DashboardType = 'firm' | 'teamLead' | 'caseWorker' | 'taskOnly'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeNavItem, setActiveNavItem] = React.useState('dashboard')
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const [dashboardType, setDashboardType] = React.useState<DashboardType | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Determine which dashboard to show based on role
  React.useEffect(() => {
    async function determineDashboard() {
      if (!user?.id || !user?.role) {
        setLoading(false)
        return
      }

      const role = user.role

      // Admin/Partner always get firm dashboard
      if (role === 'SuperAdmin' || role === 'Admin') {
        setDashboardType('firm')
        setLoading(false)
        return
      }

      // Clerks/Assistants always get task-only dashboard
      if (role === 'LawClerk' || role === 'LegalAssistant') {
        setDashboardType('taskOnly')
        setLoading(false)
        return
      }

      // AB Coordinators always get case worker dashboard
      if (role === 'AccidentBenefitsCoordinator') {
        setDashboardType('caseWorker')
        setLoading(false)
        return
      }

      // For Lawyers and Paralegals: check if they're a lead on any case
      if (role === 'Lawyer' || role === 'Paralegal') {
        try {
          const isLead = await isUserLeadOnAnyCases(user.id)
          setDashboardType(isLead ? 'teamLead' : 'caseWorker')
        } catch (err) {
          console.error('Error checking lead status:', err)
          // Default to case worker if check fails
          setDashboardType('caseWorker')
        }
        setLoading(false)
        return
      }

      // Default fallback
      setDashboardType('caseWorker')
      setLoading(false)
    }

    determineDashboard()
  }, [user?.id, user?.role])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNavClick = React.useCallback((id: string) => {
    setActiveNavItem(id)
    if (id !== 'dashboard') {
      router.push(`/${id}`)
    }
  }, [router])

  // Render the appropriate dashboard
  const renderDashboard = () => {
    if (loading || !user?.id) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-electric-teal" />
        </div>
      )
    }

    switch (dashboardType) {
      case 'firm':
        return <FirmDashboard userId={user.id} userRole={user.role} />
      case 'teamLead':
        return <TeamLeadDashboard userId={user.id} userRole={user.role} />
      case 'caseWorker':
        return <CaseWorkerDashboard userId={user.id} userRole={user.role} />
      case 'taskOnly':
        return <TaskOnlyDashboard userId={user.id} userRole={user.role} />
      default:
        return <DashboardSkeleton />
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
        <GlobalNavRail activeItem={activeNavItem} onItemClick={handleNavClick} />

        <main className="flex-1 ml-20 overflow-y-auto">
          <div className="container mx-auto px-8 py-8">
            {renderDashboard()}
          </div>
        </main>

        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}

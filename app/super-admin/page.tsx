'use client'

import * as React from 'react'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Building2, 
  Users, 
  UserPlus, 
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Activity,
  Server,
  Database,
  Lock,
  Shield,
  MoreHorizontal,
  Copy
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { getSupabase } from '@/lib/supabase/singleton'
import { UserRole } from '@/types/tasks'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'

// Initial empty state for charts
const initialGrowthData = [
  { name: 'Jan', firms: 0, users: 0 },
  { name: 'Feb', firms: 0, users: 0 },
  { name: 'Mar', firms: 0, users: 0 },
  { name: 'Apr', firms: 0, users: 0 },
  { name: 'May', firms: 0, users: 0 },
  { name: 'Jun', firms: 0, users: 0 },
]

const initialRoleDistributionData = [
  { name: 'Lawyers', value: 0, color: '#00D2D3' },
  { name: 'Clerks', value: 0, color: '#FF9F43' },
  { name: 'Assistants', value: 0, color: '#FF6B6B' },
  { name: 'Admins', value: 0, color: '#5F27CD' },
]

interface Firm {
  id: string
  name: string
  created_at: string
  userCount: number
  caseCount: number
  status: 'Active' | 'Suspended' | 'Trial'
}

interface PlatformUser {
  id: string
  name: string
  email?: string
  role: UserRole
  firmId?: string
  firmName?: string
  isActive: boolean
  lastLoginAt?: string
}

interface PlatformStats {
  totalFirms: number
  totalUsers: number
  totalCases: number
  activeUsers: number
  systemHealth: number
}

export default function SuperAdminPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'firms' | 'users' | 'settings'>('overview')
  const [firms, setFirms] = React.useState<Firm[]>([])
  const [users, setUsers] = React.useState<PlatformUser[]>([])
  const [stats, setStats] = React.useState<PlatformStats>({ 
    totalFirms: 0, 
    totalUsers: 0, 
    totalCases: 0, 
    activeUsers: 0,
    systemHealth: 100
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [growthData, setGrowthData] = React.useState<any[]>(initialGrowthData)
  const [roleDistributionData, setRoleDistributionData] = React.useState<any[]>(initialRoleDistributionData)
  
  // Modal states
  const [showAddFirm, setShowAddFirm] = React.useState(false)
  const [showAddUser, setShowAddUser] = React.useState(false)
  const [newFirmName, setNewFirmName] = React.useState('')
  const [newUser, setNewUser] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'Admin' as UserRole,
    firmId: ''
  })
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState('')
  const [showSQLHelper, setShowSQLHelper] = React.useState(false)
  const [generatedSQL, setGeneratedSQL] = React.useState('')
  
  // Pagination state
  const [firmsPage, setFirmsPage] = React.useState(1)
  const [usersPage, setUsersPage] = React.useState(1)
  const PAGE_SIZE = 15

  const supabase = React.useMemo(() => getSupabase(), [])
  const isSuperAdmin = user?.role === 'SuperAdmin'

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

  // Load platform data
  React.useEffect(() => {
    async function loadData() {
      if (!user || user.role !== 'SuperAdmin') {
        setIsLoading(false)
        return
      }

      try {
        // Load all firms
        const { data: firmsData } = await supabase
          .from('firms')
          .select('*')
          .order('name')

        // Load all users
        const { data: usersData } = await supabase
          .from('users_metadata')
          .select('id, name, role, firm_id, is_active, last_login_at, created_at')
          .order('name')

        // Calculate Growth Data (last 6 months) - Cumulative counts
        const today = new Date()
        const months = []
        
        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
          months.push({
            name: d.toLocaleString('default', { month: 'short' }),
            year: d.getFullYear(),
            month: d.getMonth(),
            endDate: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) // End of month
          })
        }
        
        // Sort all entities by creation date
        const allFirmsSorted = [...(firmsData || [])].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        const allUsersSorted = [...(usersData || [])].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        // Calculate cumulative counts for each month
        const growthChartData = months.map((monthInfo, index) => {
          // Count all entities created on or before this month's end date
          const firmsCount = allFirmsSorted.filter(f => {
            const createdDate = new Date(f.created_at)
            return createdDate <= monthInfo.endDate
          }).length
          
          const usersCount = allUsersSorted.filter(u => {
            const createdDate = new Date(u.created_at)
            return createdDate <= monthInfo.endDate
          }).length
          
          return {
            name: monthInfo.name,
            firms: firmsCount,
            users: usersCount
          }
        })
        
        setGrowthData(growthChartData)

        // Calculate Role Distribution
        const roles: Record<string, number> = {
          Lawyer: 0,
          LawClerk: 0,
          LegalAssistant: 0,
          Admin: 0,
          SuperAdmin: 0,
          AccidentBenefitsCoordinator: 0,
          Other: 0
        }
        
        usersData?.forEach(u => {
          if (roles[u.role] !== undefined) {
            roles[u.role]++
          } else {
            roles['Other']++
          }
        })

        const roleChartData = [
          { name: 'Lawyers', value: roles['Lawyer'] || 0, color: '#00D2D3' },
          { name: 'Clerks', value: roles['LawClerk'] || 0, color: '#FF9F43' },
          { name: 'Assistants', value: roles['LegalAssistant'] || 0, color: '#FF6B6B' },
          { name: 'Admins', value: (roles['Admin'] || 0) + (roles['SuperAdmin'] || 0), color: '#5F27CD' },
          { name: 'AB Coords', value: roles['AccidentBenefitsCoordinator'] || 0, color: '#1dd1a1' },
        ].filter(item => item.value > 0) // Only show roles with users
        
        setRoleDistributionData(roleChartData)

        // Load case counts per firm (simplified for performance)
        const { data: caseCounts } = await supabase
          .from('cases')
          .select('firm_id')

        // Calculate stats
        const firmCaseCounts: Record<string, number> = {}
        caseCounts?.forEach(c => {
          firmCaseCounts[c.firm_id] = (firmCaseCounts[c.firm_id] || 0) + 1
        })

        const firmUserCounts: Record<string, number> = {}
        usersData?.forEach(u => {
          if (u.firm_id) {
            firmUserCounts[u.firm_id] = (firmUserCounts[u.firm_id] || 0) + 1
          }
        })

        // Map firms with counts
        const enrichedFirms: Firm[] = (firmsData || []).map(f => ({
          id: f.id,
          name: f.name,
          created_at: f.created_at,
          userCount: firmUserCounts[f.id] || 0,
          caseCount: firmCaseCounts[f.id] || 0,
          status: 'Active' // Mock status for now
        }))

        // Map users with firm names
        const firmNames: Record<string, string> = {}
        firmsData?.forEach(f => { firmNames[f.id] = f.name })

        const enrichedUsers: PlatformUser[] = (usersData || []).map(u => ({
          id: u.id,
          name: u.name,
          role: u.role as UserRole,
          firmId: u.firm_id,
          firmName: u.firm_id ? firmNames[u.firm_id] : 'Platform',
          isActive: u.is_active,
          lastLoginAt: u.last_login_at
        }))

        setFirms(enrichedFirms)
        setUsers(enrichedUsers)
        setStats({
          totalFirms: enrichedFirms.length,
          totalUsers: enrichedUsers.length,
          totalCases: caseCounts?.length || 0,
          activeUsers: enrichedUsers.filter(u => u.isActive).length,
          systemHealth: 99.9 // Mock uptime
        })
      } catch (error) {
        console.error('Error loading platform data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  const handleCreateFirm = async () => {
    if (!newFirmName.trim()) {
      setActionError('Firm name is required')
      return
    }

    setActionLoading(true)
    setActionError('')

    try {
      const response = await fetch('/api/admin/firms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFirmName.trim() })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create firm')
      }

      setFirms([...firms, { ...result.firm, userCount: 0, caseCount: 0, status: 'Active' }])
      setStats({ ...stats, totalFirms: stats.totalFirms + 1 })
      setNewFirmName('')
      setShowAddFirm(false)
      setActionError('')
    } catch (error: any) {
      setActionError(error.message || 'Failed to create firm')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.firmId) {
      setActionError('All fields are required')
      return
    }

    setActionLoading(true)
    setActionError('')

    try {
      console.log('[SuperAdmin] Creating user via API:', newUser.email)
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role,
          firmId: newUser.firmId
        })
      })

      const result = await response.json()
      console.log('[SuperAdmin] API response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      const firm = firms.find(f => f.id === newUser.firmId)
      setUsers([...users, {
        id: result.user.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        firmId: newUser.firmId,
        firmName: firm?.name || 'Unknown',
        isActive: true
      }])
      setStats({ ...stats, totalUsers: stats.totalUsers + 1, activeUsers: stats.activeUsers + 1 })
      setNewUser({ name: '', email: '', password: '', role: 'Admin', firmId: '' })
      setShowAddUser(false)
      setShowSQLHelper(false)
      setGeneratedSQL('')
      setActionError('')
    } catch (error: any) {
      console.error('[SuperAdmin] Full error:', error)
      setActionError(error.message || 'Failed to create user')
    } finally {
      setActionLoading(false)
    }
  }

  const generateUserSQL = (userData: typeof newUser) => {
    if (!userData.name || !userData.email || !userData.firmId) {
      setActionError('Please fill in Name, Email, and Firm first')
      return
    }
    
    const sql = `-- ============================================
-- STEP 1: CREATE USER IN SUPABASE DASHBOARD FIRST
-- ============================================
-- 1. Go to: Authentication → Users → Add User
-- 2. Enter email: ${userData.email}
-- 3. Enter password: ${userData.password || 'CHANGE_ME'}
-- 4. Click "Create User"

-- ============================================
-- STEP 2: RUN THIS SQL (auto-finds user by email)
-- ============================================

INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  id,
  '${userData.name}',
  '${userData.role}',
  '${userData.firmId}'::uuid,
  true
FROM auth.users
WHERE email = '${userData.email}'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  firm_id = EXCLUDED.firm_id,
  is_active = EXCLUDED.is_active;

-- After running, refresh the users list in the app.`
    setGeneratedSQL(sql)
    setShowSQLHelper(true)
  }

  const handleDeleteFirm = async (firmId: string) => {
    if (!confirm('DANGER: Deleting a firm will delete ALL associated users, cases, and data. This cannot be undone. Are you sure?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/firms?id=${firmId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete firm')
      }

      setFirms(firms.filter(f => f.id !== firmId))
      setStats({ ...stats, totalFirms: stats.totalFirms - 1 })
    } catch (error: any) {
      alert('Failed to delete firm: ' + error.message)
    }
  }

  const handleToggleUserActive = async (userId: string, currentlyActive: boolean) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { isActive: !currentlyActive }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user')
      }

      setUsers(users.map(u => 
        u.id === userId ? { ...u, isActive: !currentlyActive } : u
      ))
      setStats({
        ...stats,
        activeUsers: currentlyActive ? stats.activeUsers - 1 : stats.activeUsers + 1
      })
    } catch (error: any) {
      alert('Failed to update user: ' + error.message)
    }
  }

  const roleColors: Record<string, string> = {
    SuperAdmin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    Admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    Lawyer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    LawClerk: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    LegalAssistant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    AccidentBenefitsCoordinator: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  }

  // Filter and paginate firms
  const allFilteredFirms = firms.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalFirmsPages = Math.ceil(allFilteredFirms.length / PAGE_SIZE)
  const filteredFirms = allFilteredFirms.slice((firmsPage - 1) * PAGE_SIZE, firmsPage * PAGE_SIZE)

  // Filter and paginate users
  const allFilteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.firmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalUsersPages = Math.ceil(allFilteredUsers.length / PAGE_SIZE)
  const filteredUsers = allFilteredUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE)
  
  // Reset page when search changes
  React.useEffect(() => {
    setFirmsPage(1)
    setUsersPage(1)
  }, [searchQuery])

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
        <GlobalNavRail activeItem="super-admin" onItemClick={(id) => {
          router.push(id === 'dashboard' ? '/' : `/${id}`)
        }} />
        
        <main className="flex-1 ml-20 flex items-center justify-center">
          <Card variant="glass" className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-living-coral mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Only the Platform Super Admin can access this page.
              </p>
              <Button className="mt-6" onClick={() => router.push('/')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail activeItem="super-admin" onItemClick={(id) => {
        if (id === 'super-admin') return
        router.push(id === 'dashboard' ? '/' : `/${id}`)
      }} />
      
      <main className="flex-1 ml-20 overflow-y-auto">
        <div className="container mx-auto px-8 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2 flex items-center gap-3">
                Platform Control Center <span className="text-2xl">👑</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Overview of all firms, users, and system performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Card className="bg-white/50 dark:bg-white/10 backdrop-blur-sm border-none">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-deep-indigo dark:text-vapor">
                    Systems Operational
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-teal"></div>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card variant="glass" className="border-t-4 border-t-electric-teal">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-electric-teal/10">
                        <Building2 className="w-6 h-6 text-electric-teal" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        +12%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">{stats.totalFirms}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Law Firms</p>
                  </CardContent>
                </Card>

                <Card variant="glass" className="border-t-4 border-t-purple-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        +8%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Registered Users</p>
                  </CardContent>
                </Card>

                <Card variant="glass" className="border-t-4 border-t-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        Active
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">{stats.totalCases}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Managed Cases</p>
                  </CardContent>
                </Card>

                <Card variant="glass" className="border-t-4 border-t-living-coral">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                        <Activity className="w-6 h-6 text-living-coral" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Stable
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">{stats.systemHealth}%</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">System Uptime</p>
                  </CardContent>
                </Card>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex gap-2 bg-white/50 dark:bg-gray-800/50 p-1 rounded-xl">
                  {(['overview', 'firms', 'users', 'settings'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        activeTab === tab
                          ? 'bg-white dark:bg-gray-700 text-electric-teal shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-deep-indigo dark:hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {(activeTab === 'firms' || activeTab === 'users') && (
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-electric-teal"
                      />
                    </div>
                  )}
                  {activeTab === 'firms' && (
                    <Button onClick={() => setShowAddFirm(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" /> Add Firm
                    </Button>
                  )}
                  {activeTab === 'users' && (
                    <Button onClick={() => setShowAddUser(true)} size="sm">
                      <UserPlus className="w-4 h-4 mr-2" /> Add User
                    </Button>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Growth Chart */}
                        <Card variant="glass" className="lg:col-span-2">
                          <CardHeader>
                            <CardTitle>Platform Growth</CardTitle>
                            <CardDescription>New firms and users over the last 6 months</CardDescription>
                          </CardHeader>
                          <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={growthData}>
                                <defs>
                                  <linearGradient id="colorFirms" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00D2D3" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#00D2D3" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#5F27CD" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#5F27CD" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="firms" stroke="#00D2D3" fillOpacity={1} fill="url(#colorFirms)" />
                                <Area type="monotone" dataKey="users" stroke="#5F27CD" fillOpacity={1} fill="url(#colorUsers)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {/* System Status */}
                        <div className="space-y-6">
                          <Card variant="glass">
                            <CardHeader>
                              <CardTitle>System Health</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Database className="w-5 h-5 text-blue-500" />
                                  <span className="text-sm font-medium">Database Cluster</span>
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Healthy</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Server className="w-5 h-5 text-purple-500" />
                                  <span className="text-sm font-medium">API Gateway</span>
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Healthy</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Lock className="w-5 h-5 text-orange-500" />
                                  <span className="text-sm font-medium">Auth Services</span>
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Healthy</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Shield className="w-5 h-5 text-red-500" />
                                  <span className="text-sm font-medium">Security Monitor</span>
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                              </div>
                            </CardContent>
                          </Card>

                          <Card variant="glass">
                            <CardHeader>
                              <CardTitle>User Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[150px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={roleDistributionData} layout="vertical">
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                                  <Tooltip cursor={{fill: 'transparent'}} />
                                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {roleDistributionData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      
                      {/* Recent Activity Tables */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <Card variant="glass">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle>Recent Firms</CardTitle>
                                <Button size="sm" variant="ghost" onClick={() => setActiveTab('firms')}>View All</Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {firms.slice(0, 5).map(firm => (
                                  <div key={firm.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-lg border border-transparent hover:border-electric-teal/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded bg-electric-teal/10 flex items-center justify-center text-electric-teal">
                                          <Building2 className="w-4 h-4" />
                                       </div>
                                       <div>
                                          <p className="font-medium text-sm text-deep-indigo dark:text-vapor">{firm.name}</p>
                                          <p className="text-xs text-gray-500">{firm.userCount} users • {firm.caseCount} cases</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-medium">
                                        {firm.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                           <Card variant="glass">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle>Recent Users</CardTitle>
                                <Button size="sm" variant="ghost" onClick={() => setActiveTab('users')}>View All</Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {users.slice(0, 5).map(u => (
                                  <div key={u.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-lg border border-transparent hover:border-purple-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <span className="text-purple-600 dark:text-purple-400 text-xs font-bold">
                                          {u.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm text-deep-indigo dark:text-vapor">{u.name}</p>
                                        <p className="text-xs text-gray-500">{u.firmName}</p>
                                      </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColors[u.role]}`}>
                                      {u.role}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                      </div>
                    </div>
                  )}

                  {activeTab === 'firms' && (
                    <div className="space-y-6">
                       <Card variant="glass">
                        <CardContent className="p-0 overflow-hidden">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="px-6 py-4">Firm Name</th>
                                <th className="px-6 py-4">Users</th>
                                <th className="px-6 py-4">Cases</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredFirms.map(firm => (
                                <tr key={firm.id} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded bg-electric-teal/10 flex items-center justify-center text-electric-teal">
                                        <Building2 className="w-4 h-4" />
                                      </div>
                                      <span className="font-medium text-deep-indigo dark:text-vapor">{firm.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">{firm.userCount}</td>
                                  <td className="px-6 py-4">{firm.caseCount}</td>
                                  <td className="px-6 py-4">{new Date(firm.created_at).toLocaleDateString()}</td>
                                  <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                      {firm.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <Eye className="w-4 h-4 text-gray-500" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <Edit className="w-4 h-4 text-gray-500" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 hover:text-red-500"
                                        onClick={() => handleDeleteFirm(firm.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredFirms.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p>No firms found matching your search.</p>
                            </div>
                          )}
                          
                          {/* Pagination */}
                          {totalFirmsPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-500">
                                Showing {((firmsPage - 1) * PAGE_SIZE) + 1}-{Math.min(firmsPage * PAGE_SIZE, allFilteredFirms.length)} of {allFilteredFirms.length}
                              </p>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={firmsPage === 1} onClick={() => setFirmsPage(p => p - 1)}>
                                  <ChevronLeft className="w-4 h-4" /> Prev
                                </Button>
                                <span className="px-3 py-1 bg-white/50 dark:bg-white/10 rounded text-sm">{firmsPage} / {totalFirmsPages}</span>
                                <Button size="sm" variant="ghost" disabled={firmsPage === totalFirmsPages} onClick={() => setFirmsPage(p => p + 1)}>
                                  Next <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                       </Card>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div className="space-y-6">
                      <Card variant="glass">
                        <CardContent className="p-0 overflow-hidden">
                           <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Firm</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Last Login</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs">
                                        {u.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium text-deep-indigo dark:text-vapor">{u.name}</p>
                                        <p className="text-xs text-gray-500">{u.email || 'No email'}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-gray-600 dark:text-gray-300">{u.firmName}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {u.isActive ? (
                                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>
                                    ) : (
                                      <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Inactive</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-gray-500">
                                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className={u.isActive ? "text-red-500 hover:bg-red-50" : "text-green-500 hover:bg-green-50"}
                                        onClick={() => handleToggleUserActive(u.id, u.isActive)}
                                        disabled={u.id === user?.id}
                                      >
                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredUsers.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p>No users found matching your search.</p>
                            </div>
                          )}
                          
                          {/* Pagination */}
                          {totalUsersPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-500">
                                Showing {((usersPage - 1) * PAGE_SIZE) + 1}-{Math.min(usersPage * PAGE_SIZE, allFilteredUsers.length)} of {allFilteredUsers.length}
                              </p>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={usersPage === 1} onClick={() => setUsersPage(p => p - 1)}>
                                  <ChevronLeft className="w-4 h-4" /> Prev
                                </Button>
                                <span className="px-3 py-1 bg-white/50 dark:bg-white/10 rounded text-sm">{usersPage} / {totalUsersPages}</span>
                                <Button size="sm" variant="ghost" disabled={usersPage === totalUsersPages} onClick={() => setUsersPage(p => p + 1)}>
                                  Next <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card variant="glass">
                        <CardHeader>
                          <CardTitle>System Configuration</CardTitle>
                          <CardDescription>Global settings for the entire platform</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                            <div>
                              <p className="font-medium">Maintenance Mode</p>
                              <p className="text-xs text-gray-500">Disable access for all non-admin users</p>
                            </div>
                            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                              <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                            <div>
                              <p className="font-medium">New Registrations</p>
                              <p className="text-xs text-gray-500">Allow new firms to sign up</p>
                            </div>
                            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-electric-teal">
                              <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card variant="glass">
                         <CardHeader>
                          <CardTitle>Data & Backup</CardTitle>
                          <CardDescription>Manage platform data retention and backups</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <Button variant="secondary" className="w-full justify-start">
                              <Database className="w-4 h-4 mr-2" /> Trigger Manual Backup
                           </Button>
                           <Button variant="secondary" className="w-full justify-start">
                              <Activity className="w-4 h-4 mr-2" /> View System Logs
                           </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </main>

      {/* Add Firm Modal */}
      <AnimatePresence>
        {showAddFirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowAddFirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold text-deep-indigo dark:text-vapor">
                  Create New Firm
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddFirm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <Input
                  label="Firm Name"
                  value={newFirmName}
                  onChange={(e) => setNewFirmName(e.target.value)}
                  placeholder="Smith & Associates LLP"
                />
                
                {actionError && (
                  <div className="p-3 rounded bg-red-100 text-red-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {actionError}
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowAddFirm(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleCreateFirm} disabled={actionLoading}>
                    {actionLoading ? 'Creating...' : 'Create Firm'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowAddUser(false)}
          >
             <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold text-deep-indigo dark:text-vapor">
                  Add User to Firm
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddUser(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Firm
                  </label>
                  <select
                    value={newUser.firmId}
                    onChange={(e) => setNewUser({ ...newUser, firmId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-deep-indigo dark:text-vapor focus:ring-2 focus:ring-electric-teal"
                  >
                    <option value="">Select a firm...</option>
                    {firms.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                
                <Input
                  label="Full Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Jane Smith"
                />
                
                <Input
                  label="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="jane@lawfirm.com"
                />
                
                <Input
                  label="Temporary Password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="At least 6 characters"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-deep-indigo dark:text-vapor focus:ring-2 focus:ring-electric-teal"
                  >
                    <option value="Admin">Firm Admin</option>
                    <option value="Lawyer">Lawyer</option>
                    <option value="LawClerk">Law Clerk</option>
                    <option value="LegalAssistant">Legal Assistant</option>
                    <option value="AccidentBenefitsCoordinator">AB Coordinator</option>
                  </select>
                </div>
                
                {actionError && (
                  <div className="p-3 rounded bg-red-100 text-red-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {actionError}
                  </div>
                )}

                {showSQLHelper && generatedSQL && (
                  <div className="p-4 rounded-lg bg-gray-900 text-green-400 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 text-white hover:text-gray-300"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSQL)
                        alert('SQL copied to clipboard!')
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <pre className="whitespace-pre-wrap">{generatedSQL}</pre>
                    <p className="text-yellow-400 text-xs mt-2">
                      💡 Copy this SQL and run it in Supabase SQL Editor after creating the user in Authentication → Users
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => {
                    setShowAddUser(false)
                    setShowSQLHelper(false)
                    setGeneratedSQL('')
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1" 
                    onClick={() => generateUserSQL(newUser)}
                  >
                    Generate SQL
                  </Button>
                  <Button className="flex-1" onClick={handleCreateUser} disabled={actionLoading}>
                    {actionLoading ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  )
}

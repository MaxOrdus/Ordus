'use client'

import * as React from 'react'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Users,
  UserPlus,
  Trash2,
  Edit,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Briefcase,
  DollarSign,
  Activity,
  Calendar,
  FileText,
  Shield,
  Search
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { getSupabase } from '@/lib/supabase/singleton'
import { UserRole } from '@/types/tasks'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  useFirm,
  useDeleteTeamMember, 
  useFirmStats, 
  TeamMember 
} from '@/lib/hooks/useData'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Lawyer', label: 'Lawyer' },
  { value: 'Paralegal', label: 'Paralegal' },
  { value: 'LawClerk', label: 'Law Clerk' },
  { value: 'LegalAssistant', label: 'Legal Assistant' },
  { value: 'AccidentBenefitsCoordinator', label: 'AB Coordinator' },
]


// Placeholder chart data - will be replaced with real time entry data
// TODO: Integrate with time_entries table to show actual billable hours
const PLACEHOLDER_ACTIVITY_DATA = [
  { name: 'Mon', value: 0 },
  { name: 'Tue', value: 0 },
  { name: 'Wed', value: 0 },
  { name: 'Thu', value: 0 },
  { name: 'Fri', value: 0 },
  { name: 'Sat', value: 0 },
  { name: 'Sun', value: 0 },
]

const COLORS = ['#00D2D3', '#FF9F43', '#FF6B6B', '#5F27CD']

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuth()
    const [editingFirmName, setEditingFirmName] = React.useState(false)
  const [newFirmName, setNewFirmName] = React.useState('')
  const [showAddMember, setShowAddMember] = React.useState(false)
  const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null)
  const [newMember, setNewMember] = React.useState({ name: '', email: '', role: 'Lawyer' as UserRole, password: '' })
  const [addingMember, setAddingMember] = React.useState(false)
  const [addError, setAddError] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = React.useState(true)

  const supabase = React.useMemo(() => getSupabase(), [])
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin'

  // React Query hooks
  const { data: firm, isLoading: firmLoading } = useFirm(user?.firmId)
  const { data: stats, isLoading: statsLoading } = useFirmStats(user?.firmId)

  // Fetch team members with emails from admin API
  const fetchTeamMembers = React.useCallback(async () => {
    if (!user?.firmId) return
    setTeamLoading(true)
    try {
      const response = await fetch(`/api/admin/team?firmId=${user.firmId}`)
      if (response.ok) {
        const { data } = await response.json()
        setTeamMembers(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch team:', error)
    } finally {
      setTeamLoading(false)
    }
  }, [user?.firmId])

  React.useEffect(() => {
    fetchTeamMembers()
  }, [fetchTeamMembers])

  const deleteMember = useDeleteTeamMember()

  React.useEffect(() => {
    if (firm) setNewFirmName(firm.name)
  }, [firm])

  const handleUpdateFirmName = async () => {
    if (!firm || !newFirmName.trim()) return
    await supabase.from('firms').update({ name: newFirmName.trim() }).eq('id', firm.id)
    setEditingFirmName(false)
  }

  const handleAddMember = async () => {
    if (!user?.firmId || !newMember.email || !newMember.name || !newMember.password) {
      setAddError('Please fill in all fields')
      return
    }
    setAddingMember(true)
    setAddError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: newMember.email, password: newMember.password })
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      await supabase.from('users_metadata').insert({
        id: authData.user.id,
        name: newMember.name,
        role: newMember.role,
        firm_id: user.firmId,
        is_active: true
      })

      fetchTeamMembers()
      setNewMember({ name: '', email: '', role: 'Lawyer', password: '' })
      setShowAddMember(false)
    } catch (error: any) {
      setAddError(error.message || 'Failed to add team member')
    } finally {
      setAddingMember(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingMember) return
    try {
      // Use admin API to update user (handles both metadata and auth email/password)
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingMember.id,
          updates: {
            name: editingMember.name,
            role: editingMember.role,
            isActive: editingMember.isActive,
            email: editingMember.email,
            ...(newPassword && { password: newPassword }),
          }
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user')
      }
      fetchTeamMembers()
      setShowEditModal(false)
      setEditingMember(null)
      setNewPassword('')
    } catch (error: any) {
      alert(error.message || 'Failed to update user')
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (memberId === user?.id) return alert("You can't delete yourself!")
    await deleteMember.mutateAsync(memberId)
    fetchTeamMembers()
    setShowDeleteConfirm(null)
  }

  const isLoading = firmLoading || teamLoading || statsLoading

  // Filtered team members for display
  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group team members by category
  const teamGroups = React.useMemo(() => {
    return {
      lawyers: filteredMembers.filter(m => m.role === 'Lawyer'),
      paralegals: filteredMembers.filter(m => m.role === 'Paralegal'),
      clerks: filteredMembers.filter(m => ['LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator'].includes(m.role)),
      admins: filteredMembers.filter(m => ['Admin', 'SuperAdmin'].includes(m.role)),
    }
  }, [filteredMembers])

  const groupConfig = [
    { key: 'lawyers', label: 'Lawyers', icon: Briefcase, color: 'blue' },
    { key: 'paralegals', label: 'Paralegals', icon: FileText, color: 'teal' },
    { key: 'clerks', label: 'Clerks & Support Staff', icon: Users, color: 'green' },
    { key: 'admins', label: 'Administrators', icon: Shield, color: 'purple' },
  ] as const

  // Calculate case status data for charts
  const caseStatusData = [
    { name: 'Active', value: stats?.activeCases || 0 },
    { name: 'Closed', value: (stats?.totalCases || 0) - (stats?.activeCases || 0) },
  ]

  if (!isAdmin) {
    return (
      <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
        <GlobalNavRail activeItem="admin" onItemClick={(id) => router.push(id === 'dashboard' ? '/' : `/${id}`)} />
        <main className="flex-1 ml-20 flex items-center justify-center">
          <Card variant="glass" className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-living-coral mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-2">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-400">Only administrators can access this page.</p>
              <Button className="mt-6" onClick={() => router.push('/')}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail activeItem="admin" onItemClick={(id) => {
        if (id === 'admin') return
        router.push(id === 'dashboard' ? '/' : `/${id}`)
      }} />
      
      <main className="flex-1 ml-20 overflow-y-auto">
        <div className="container mx-auto px-8 py-8 max-w-7xl">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
               {editingFirmName ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={newFirmName} 
                      onChange={(e) => setNewFirmName(e.target.value)} 
                      className="text-3xl font-bold h-12 w-96" 
                      autoFocus 
                    />
                    <Button size="sm" onClick={handleUpdateFirmName}><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingFirmName(false); setNewFirmName(firm?.name || '') }}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-1">
                      {firm?.name || 'My Law Firm'}
                    </h1>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingFirmName(true)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Shield className="w-4 h-4 text-electric-teal" />
                Firm Admin Dashboard
              </p>
            </div>
            <div className="flex items-center gap-3">
               <div className="text-right hidden md:block">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Plan</p>
                  <p className="font-semibold text-deep-indigo dark:text-vapor">Professional</p>
               </div>
               <Button onClick={() => setShowAddMember(true)} className="shadow-lg shadow-electric-teal/20">
                <UserPlus className="w-4 h-4 mr-2" /> Add Team Member
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-electric-teal" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Top Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card variant="glass" hover>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>
                    </div>
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">{stats?.activeCases || 0}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Cases</p>
                  </CardContent>
                </Card>

                <Card variant="glass" hover>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Online</span>
                    </div>
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">{stats?.totalTeamMembers || 0}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Team Members</p>
                  </CardContent>
                </Card>

                <Card variant="glass" hover>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                        <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">+5%</span>
                    </div>
                    {/* Estimated based on active cases */}
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">${((stats?.activeCases || 0) * 12.5).toFixed(1)}k</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Est. Pipeline Value</p>
                  </CardContent>
                </Card>

                <Card variant="glass" hover>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Action</span>
                    </div>
                    <p className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">3</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Critical Deadlines</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Row: Charts & Firm Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Firm Performance Chart */}
                <Card variant="glass" className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Firm Performance</CardTitle>
                    <CardDescription>Start tracking time to see activity data</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={PLACEHOLDER_ACTIVITY_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                          cursor={{fill: 'transparent'}}
                        />
                        <Bar dataKey="value" fill="#00D2D3" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Case Distribution & Firm Info Combined */}
                <Card variant="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Case Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[120px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={caseStatusData}
                            innerRadius={35}
                            outerRadius={50}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {caseStatusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-deep-indigo dark:text-vapor">{stats?.totalCases || 0}</p>
                          <p className="text-[10px] text-gray-500">Total</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300 text-xs truncate">{firm?.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-gray-600 dark:text-gray-400 hover:text-electric-teal">
                          <FileText className="w-3 h-3 mr-1" /> Reports
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-gray-600 dark:text-gray-400 hover:text-electric-teal">
                          <Calendar className="w-3 h-3 mr-1" /> Court
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Team Roster - Full Width */}
              <Card variant="glass">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Team Roster</CardTitle>
                    <CardDescription>Manage staff roles and access</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search team..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredMembers.length === 0 && searchQuery ? (
                    <div className="text-center py-8 text-gray-500">
                      No team members found matching &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {groupConfig.map((group) => {
                        const members = teamGroups[group.key]
                        const GroupIcon = group.icon
                        const colorClasses = {
                          blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                          teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
                          green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
                          purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
                        }

                        return (
                          <div key={group.key} className={`rounded-xl border-2 ${colorClasses[group.color].split(' ').slice(4).join(' ')} overflow-hidden`}>
                            {/* Column Header */}
                            <div className={`p-3 ${colorClasses[group.color].split(' ').slice(0, 4).join(' ')}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GroupIcon className="w-4 h-4" />
                                  <span className="font-semibold text-sm">{group.label}</span>
                                </div>
                                <span className="text-xs font-bold bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                                  {members.length}
                                </span>
                              </div>
                            </div>

                            {/* Column Members */}
                            <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto bg-white/30 dark:bg-black/10">
                              {members.length > 0 ? (
                                members.map((member) => (
                                  <div
                                    key={member.id}
                                    className={`group flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ${member.isActive ? 'hover:bg-white/60 dark:hover:bg-white/10' : 'opacity-50'}`}
                                    title={member.name}
                                  >
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${member.isActive ? 'bg-gradient-to-br from-electric-teal to-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-500'}`}>
                                      {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-deep-indigo dark:text-vapor text-sm leading-tight">{member.name}</p>
                                      {member.id === user?.id && <span className="text-[10px] text-electric-teal font-semibold">You</span>}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingMember({ ...member }); setShowEditModal(true) }}>
                                        <Edit className="w-3.5 h-3.5 text-gray-500 hover:text-electric-teal" />
                                      </Button>
                                      {member.id !== user?.id && (
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowDeleteConfirm(member.id)}>
                                          <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-400 text-center py-6">No {group.label.toLowerCase()}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowAddMember(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4">Add Team Member</h3>
              <div className="space-y-4">
                <Input label="Full Name" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Jane Smith" />
                <Input label="Email" type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} placeholder="jane@lawfirm.com" />
                <Input label="Temporary Password" type="password" value={newMember.password} onChange={(e) => setNewMember({ ...newMember, password: e.target.value })} placeholder="At least 6 characters" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value as UserRole })} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {AVAILABLE_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </div>
                {addError && <p className="text-sm text-red-500">{addError}</p>}
                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowAddMember(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleAddMember} disabled={addingMember}>{addingMember ? 'Adding...' : 'Add Member'}</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {showEditModal && editingMember && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowEditModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4">Edit Team Member</h3>
              <div className="space-y-4">
                <Input label="Full Name" value={editingMember.name} onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })} />
                <Input label="Email" type="email" value={editingMember.email || ''} onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select value={editingMember.role} onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as UserRole })} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {AVAILABLE_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="isActive" checked={editingMember.isActive} onChange={(e) => setEditingMember({ ...editingMember, isActive: e.target.checked })} className="w-4 h-4 rounded" />
                  <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Active (can log in)</label>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Input
                    label="Reset Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                  />
                  <p className="text-xs text-gray-500 mt-1">Only fill this if you need to reset the user&apos;s password</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => { setShowEditModal(false); setEditingMember(null); setNewPassword('') }}>Cancel</Button>
                  <Button className="flex-1" onClick={handleSaveEdit}>Save Changes</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-living-coral mx-auto mb-4" />
                <h3 className="text-xl font-bold text-deep-indigo dark:text-vapor mb-2">Deactivate Team Member?</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{teamMembers.find(m => m.id === showDeleteConfirm)?.name}</p>
                <div className="space-y-3">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => handleDeleteMember(showDeleteConfirm)} disabled={deleteMember.isPending}>
                    {deleteMember.isPending ? 'Deactivating...' : 'Deactivate User'}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

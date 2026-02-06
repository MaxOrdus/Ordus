'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Calendar, User, AlertCircle, Loader2, Users } from 'lucide-react'
import { generateTimelineFromDOL } from '@/lib/timeline-calculator'
import { generateInitialCaseTasks } from '@/lib/workflow-engine'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/components/auth/AuthProvider'
import { Deadline, PICase } from '@/types/pi-case'
import { createCase } from '@/lib/db/cases'
import { createTask } from '@/lib/db/tasks'

// Roles that require assigning a Lawyer or Paralegal when creating a case
const ROLES_REQUIRING_ASSIGNMENT = ['LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator']

interface TeamMember {
  id: string
  name: string
  role: string
}

export default function NewCasePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    clientName: '',
    dateOfLoss: '',
    clientBirthDate: '',
    statementOfClaimIssued: '',
    assignedLawyerId: '',
    assignedParalegalId: '',
  })
  const [previewDeadlines, setPreviewDeadlines] = React.useState<Deadline[]>([])
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = React.useState(false)

  // Check if current user needs to assign a lawyer/paralegal
  const requiresAssignment = user?.role && ROLES_REQUIRING_ASSIGNMENT.includes(user.role)

  // Fetch team members for assignment dropdowns
  React.useEffect(() => {
    async function fetchTeamMembers() {
      if (!user?.firmId) return
      setLoadingTeam(true)
      try {
        const res = await fetch(`/api/admin/team?firmId=${user.firmId}`)
        if (res.ok) {
          const { data } = await res.json()
          setTeamMembers(data || [])
        }
      } catch (err) {
        console.error('Error fetching team:', err)
      } finally {
        setLoadingTeam(false)
      }
    }
    fetchTeamMembers()
  }, [user?.firmId])

  // Filter lawyers and paralegals for dropdowns
  const lawyers = teamMembers.filter(m => m.role === 'Lawyer')
  const paralegals = teamMembers.filter(m => m.role === 'Paralegal')

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

  // Auto-generate timeline preview when DOL is entered
  React.useEffect(() => {
    if (formData.dateOfLoss) {
      const deadlines = generateTimelineFromDOL(
        formData.dateOfLoss,
        'preview',
        formData.clientBirthDate || undefined,
        formData.statementOfClaimIssued || undefined
      )
      setPreviewDeadlines(deadlines)
    } else {
      setPreviewDeadlines([])
    }
  }, [formData.dateOfLoss, formData.clientBirthDate, formData.statementOfClaimIssued])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !user.firmId) {
      setError('You must be logged in with a firm to create a case')
      return
    }

    // Validate: If user is a clerk/coordinator, they must assign a lawyer or paralegal
    if (requiresAssignment && !formData.assignedLawyerId && !formData.assignedParalegalId) {
      setError('You must assign a Lawyer or Paralegal to this case')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Calculate limitation date from deadlines
      const limitationDeadline = previewDeadlines.find(d => d.type === 'LIMITATION_PERIOD')

      // Determine primary lawyer: assigned lawyer, or if user is lawyer/paralegal, themselves
      const primaryLawyerId = formData.assignedLawyerId ||
        (['Lawyer', 'Paralegal', 'Admin', 'SuperAdmin'].includes(user.role || '') ? user.id : undefined)

      // Build team members list
      const teamMemberIds = new Set<string>([user.id])
      if (formData.assignedLawyerId) teamMemberIds.add(formData.assignedLawyerId)
      if (formData.assignedParalegalId) teamMemberIds.add(formData.assignedParalegalId)

      // Create the case in the database
      const newCase = await createCase({
        firmId: user.firmId,
        title: `${formData.clientName} v. Insurance Co.`,
        dateOfLoss: formData.dateOfLoss,
        dateOpened: new Date().toISOString().split('T')[0],
        limitationDate: limitationDeadline?.dueDate,
        status: 'Active',
        stage: 'Intake',
        estimatedValue: 0,
        notes: [],
        tags: [],
        primaryLawyerId: primaryLawyerId,
        assignedParalegalId: formData.assignedParalegalId || undefined,
        assignedTeamMembers: Array.from(teamMemberIds),
        sabs: {
          caseId: '',
          migStatus: 'MIG',
          catStatus: 'Not Assessed',
          ocf18Submissions: [],
          irbPaid: 0,
          medicalPaid: 0,
          attendantCarePaid: 0,
          totalPaid: 0,
          medicalRehabLimit: 3500,
          attendantCareLimit: 0,
          latApplications: [],
        },
        tort: {
          caseId: '',
          limitationDate: limitationDeadline?.dueDate || '',
          limitationStatus: 'Active',
          discoveryCompleted: false,
          plaintiffUndertakings: [],
          defenseUndertakings: [],
          aodDrafted: false,
          scheduleA: [],
          scheduleB: [],
          scheduleC: [],
          offers: [],
          defendants: [],
          juryNoticeFiled: false,
        },
      })

      // Generate initial tasks from workflow engine
      const initialTasks = generateInitialCaseTasks(newCase, user.id)

      // Create tasks in the database
      for (const task of initialTasks) {
        try {
          await createTask({
            ...task,
            caseId: newCase.id,
          })
        } catch (taskErr) {
          console.error('Error creating task:', taskErr)
        }
      }

      alert(`Case created! ${initialTasks.length} tasks auto-generated from deadlines.`)
      router.push('/cases')
    } catch (err: any) {
      console.error('Error creating case:', err)
      setError(err.message || 'Failed to create case')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail activeItem="cases" onItemClick={(id) => {
        if (id === 'cases') return
        router.push(id === 'dashboard' ? '/' : `/${id}`)
      }} />
      
      <main className="flex-1 ml-20 overflow-y-auto">
        <div className="container mx-auto px-8 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push('/cases')} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
            </Button>
            <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
              New Case Intake
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter case details. Timeline will be auto-generated from Date of Loss.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-electric-teal" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Client Name"
                  placeholder="John Doe"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.clientBirthDate}
                  onChange={(e) => setFormData({ ...formData, clientBirthDate: e.target.value })}
                />
              </CardContent>
            </Card>

            {/* Accident Information */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-electric-teal" />
                  Accident Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Date of Loss (DOL)"
                  type="date"
                  value={formData.dateOfLoss}
                  onChange={(e) => setFormData({ ...formData, dateOfLoss: e.target.value })}
                  required
                />
                <Input
                  label="Statement of Claim Issued (Optional)"
                  type="date"
                  value={formData.statementOfClaimIssued}
                  onChange={(e) => setFormData({ ...formData, statementOfClaimIssued: e.target.value })}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The Date of Loss is the &ldquo;Big Bang&rdquo; event. All critical deadlines will be calculated from this date.
                </p>
              </CardContent>
            </Card>

            {/* Case Assignment */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-electric-teal" />
                  Case Assignment
                  {requiresAssignment && (
                    <span className="text-xs text-living-coral font-normal ml-2">* Required</span>
                  )}
                </CardTitle>
                {requiresAssignment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    As a {user?.role}, you must assign a Lawyer or Paralegal to this case.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assign Lawyer {requiresAssignment && !formData.assignedParalegalId && <span className="text-living-coral">*</span>}
                  </label>
                  <select
                    value={formData.assignedLawyerId}
                    onChange={(e) => setFormData({ ...formData, assignedLawyerId: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-deep-indigo dark:text-vapor"
                    disabled={loadingTeam}
                  >
                    <option value="">
                      {loadingTeam ? 'Loading...' : 'Select a Lawyer (optional)'}
                    </option>
                    {lawyers.map(lawyer => (
                      <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assign Paralegal {requiresAssignment && !formData.assignedLawyerId && <span className="text-living-coral">*</span>}
                  </label>
                  <select
                    value={formData.assignedParalegalId}
                    onChange={(e) => setFormData({ ...formData, assignedParalegalId: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-deep-indigo dark:text-vapor"
                    disabled={loadingTeam}
                  >
                    <option value="">
                      {loadingTeam ? 'Loading...' : 'Select a Paralegal (optional)'}
                    </option>
                    {paralegals.map(paralegal => (
                      <option key={paralegal.id} value={paralegal.id}>{paralegal.name}</option>
                    ))}
                  </select>
                </div>

                {requiresAssignment && (
                  <p className="text-xs text-gray-500">
                    You must select at least one: a Lawyer or a Paralegal.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timeline Preview */}
            {previewDeadlines.length > 0 && (
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-electric-teal" />
                    Auto-Generated Timeline
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    These deadlines will be automatically created when you save the case.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {previewDeadlines.map((deadline) => (
                      <div
                        key={deadline.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30"
                      >
                        <div>
                          <p className="font-medium text-deep-indigo dark:text-vapor">
                            {deadline.description}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(deadline.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {deadline.daysRemaining} days
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Case...
                  </>
                ) : (
                  'Create Case'
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push('/cases')} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      </div>
    </ProtectedRoute>
  )
}


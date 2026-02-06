'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettlementCalculator } from '@/components/cases/SettlementCalculator'
import { UndertakingsModule } from '@/components/cases/UndertakingsModule'
import { MedicalEvidenceMatrix } from '@/components/cases/MedicalEvidenceMatrix'
import { OCFFormTracker } from '@/components/sabs/OCFFormTracker'
import { SABSTortHydraulic } from '@/components/cases/SABSTortHydraulic'
import { LATApplicationManager } from '@/components/sabs/LATApplicationManager'
import { SABSWorkflowChecklist } from '@/components/sabs/SABSWorkflowChecklist'
import { SABSTimeline } from '@/components/sabs/SABSTimeline'
import { FileOpeningMemoTracker } from '@/components/sabs/FileOpeningMemoTracker'
import { ClientReviewTracker } from '@/components/sabs/ClientReviewTracker'
import { CaseTasks } from '@/components/cases/CaseTasks'
import { ExpertReportsManager } from '@/components/cases/ExpertReportsManager'
import { DualRailTimeline } from '@/components/cases/DualRailTimeline'
import { SettlementNegotiationTracker } from '@/components/cases/SettlementNegotiationTracker'
import { ClientCommunicationLog } from '@/components/cases/ClientCommunicationLog'
import { DisbursementManager } from '@/components/cases/DisbursementManager'
import { PreTrialManager } from '@/components/cases/PreTrialManager'
import { DefendantsManager } from '@/components/cases/DefendantsManager'
import { TortWorkflowChecklist } from '@/components/cases/TortWorkflowChecklist'
import { DiscoveryManager } from '@/components/cases/DiscoveryManager'
import { CourtMode } from '@/components/mobile/CourtMode'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  ArrowLeft,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { PICase, OCF18Submission, LATApplication, SettlementOffer, Disbursement, ExpertReport, TortClaim } from '@/types/pi-case'
import { Task } from '@/types/tasks'
import { generateTimelineFromDOL } from '@/lib/timeline-calculator'
import { getCaseById } from '@/lib/db/cases'
import { getTasks, createTask, updateTask } from '@/lib/db/tasks'
import { getChecklistCompletions, toggleChecklistItem } from '@/lib/db/checklist'
import {
  updateOCF1ReceivedDate,
  updateOCF3ExpiryDate,
  updateSABSCategory,
  addOCF18Submission,
  updateOCF18Status,
  getOCF18Submissions,
  addLATApplication,
  updateLATApplication,
  getLATApplications,
} from '@/lib/db/sabs'
import {
  updateTortClaim,
  addSettlementOffer,
  updateSettlementOffer,
  getSettlementOffers,
  getDefendants,
  addDefendant,
  updateDefendant,
} from '@/lib/db/tort'
import {
  getDisbursements,
  addDisbursement,
  updateDisbursement,
} from '@/lib/db/disbursements'
import {
  getCommunications,
  addCommunication,
  updateCommunication,
  Communication,
} from '@/lib/db/communications'
import {
  getExpertReports,
  addExpertReport,
  updateExpertReport,
} from '@/lib/db/experts'
import {
  getUndertakings,
  addUndertaking,
  updateUndertakingStatus,
} from '@/lib/db/undertakings'
import { Undertaking, Defendant } from '@/types/pi-case'
import { useAuth } from '@/components/auth/AuthProvider'

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const caseId = params.id as string

  const [caseData, setCaseData] = React.useState<PICase | null>(null)
  const [caseTasks, setCaseTasks] = React.useState<Task[]>([])
  const [checklistCompletions, setChecklistCompletions] = React.useState<Record<string, boolean>>({})
  const [communications, setCommunications] = React.useState<Communication[]>([])
  const [disbursements, setDisbursements] = React.useState<Disbursement[]>([])
  const [expertReports, setExpertReports] = React.useState<ExpertReport[]>([])
  const [settlementOffers, setSettlementOffers] = React.useState<SettlementOffer[]>([])
  const [ocf18Submissions, setOcf18Submissions] = React.useState<OCF18Submission[]>([])
  const [latApplications, setLatApplications] = React.useState<LATApplication[]>([])
  const [undertakings, setUndertakings] = React.useState<Undertaking[]>([])
  const [defendants, setDefendants] = React.useState<Defendant[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'sabs' | 'tort' | 'evidence' | 'experts' | 'financial' | 'communication' | 'pretrial'>('overview')
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const [isCourtMode, setIsCourtMode] = React.useState(false)

  // Fetch case data, tasks, and related data
  React.useEffect(() => {
    async function loadCase() {
      if (!caseId) return

      setIsLoading(true)
      setError(null)
      try {
        // Load core case data first
        const [data, tasks, completions] = await Promise.all([
          getCaseById(caseId),
          getTasks({ caseId }),
          getChecklistCompletions(caseId)
        ])
        if (!data) {
          setError('Case not found')
          return
        }

        setCaseData(data)
        setCaseTasks(tasks)

        // Convert completions to simple boolean map
        const completionMap: Record<string, boolean> = {}
        Object.entries(completions).forEach(([itemId, completion]) => {
          completionMap[itemId] = completion.completed
        })
        setChecklistCompletions(completionMap)

        // Load additional data in parallel (these may fail if tables don't exist yet)
        const [comms, disbs, experts, offers, ocf18s, lats, undertks, defs] = await Promise.all([
          getCommunications(caseId).catch((): Communication[] => []),
          getDisbursements(caseId).catch((): Disbursement[] => []),
          getExpertReports(caseId).catch((): ExpertReport[] => []),
          getSettlementOffers(caseId).catch((): SettlementOffer[] => []),
          getOCF18Submissions(caseId).catch((): OCF18Submission[] => []),
          getLATApplications(caseId).catch((): LATApplication[] => []),
          getUndertakings(caseId).catch((): Undertaking[] => []),
          getDefendants(caseId).catch((): Defendant[] => []),
        ])

        setCommunications(comms)
        setDisbursements(disbs)
        setExpertReports(experts)
        setSettlementOffers(offers)
        setOcf18Submissions(ocf18s)
        setLatApplications(lats)
        setUndertakings(undertks)
        setDefendants(defs)
      } catch (err) {
        console.error('Failed to load case:', err)
        setError('Failed to load case data')
      } finally {
        setIsLoading(false)
      }
    }
    loadCase()
  }, [caseId])

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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sabs', label: 'SABS' },
    { id: 'tort', label: 'Tort' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'experts', label: 'Experts' },
    { id: 'financial', label: 'Financial' },
    { id: 'communication', label: 'Communication' },
    { id: 'pretrial', label: 'Pre-Trial' },
  ]

  // Loading state
  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
          <GlobalNavRail activeItem="cases" onItemClick={(id) => router.push(id === 'dashboard' ? '/' : `/${id}`)} />
          <main className="flex-1 ml-20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-electric-teal" />
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  // Error state
  if (error || !caseData) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
          <GlobalNavRail activeItem="cases" onItemClick={(id) => router.push(id === 'dashboard' ? '/' : `/${id}`)} />
          <main className="flex-1 ml-20 flex items-center justify-center">
            <Card variant="glass" className="max-w-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-living-coral mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-2">
                  {error || 'Case not found'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  The case you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
                </p>
                <Button onClick={() => router.push('/cases')}>
                  Back to Cases
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  const criticalDeadlines = generateTimelineFromDOL(
    caseData.dateOfLoss,
    caseData.id,
    undefined,
    caseData.tort?.statementOfClaimIssued
  )

  // Court Mode - show mobile-optimized view
  if (isCourtMode) {
    return (
      <ProtectedRoute>
        <CourtMode caseData={caseData} onExit={() => setIsCourtMode(false)} />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail activeItem="cases" onItemClick={(id) => {
        if (id === 'cases') return
        router.push(id === 'dashboard' ? '/' : `/${id}`)
      }} />

      <main className="flex-1 ml-20 overflow-y-auto">
        <div className="container mx-auto px-8 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push('/cases')} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
            </Button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
                  {caseData.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>Date of Loss: {new Date(caseData.dateOfLoss).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Stage: {caseData.stage}</span>
                </div>
              </div>
              <Badge variant={caseData.status === 'Critical' ? 'destructive' : 'default'}>
                {caseData.status}
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  px-4 py-2 font-medium text-sm border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-electric-teal text-electric-teal'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-deep-indigo dark:hover:text-vapor'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Critical Deadlines */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-living-coral" />
                    Critical Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {criticalDeadlines.slice(0, 5).map((deadline) => (
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
                        <Badge variant={deadline.daysRemaining <= 30 ? 'destructive' : 'outline'}>
                          {deadline.daysRemaining} days
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Estimated Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-electric-teal">
                      ${(caseData.estimatedValue || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Current Offer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-violet-500">
                      ${caseData.currentOffer?.toLocaleString() || 'N/A'}
                    </p>
                  </CardContent>
                </Card>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Disbursements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-500">
                      ${(caseData.totalDisbursements || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Case Tasks */}
              <CaseTasks
                caseId={caseData.id}
                tasks={caseTasks}
                onAddTask={async (task) => {
                  if (!user?.id) return
                  try {
                    const newTask = await createTask({
                      ...task,
                      caseId: caseData.id,
                      createdBy: user.id,
                    })
                    setCaseTasks(prev => [newTask, ...prev])
                  } catch (err) {
                    console.error('Failed to create task:', err)
                  }
                }}
                onUpdateTask={async (id, updates) => {
                  try {
                    const updated = await updateTask(id, updates)
                    setCaseTasks(prev => prev.map(t => t.id === id ? updated : t))
                  } catch (err) {
                    console.error('Failed to update task:', err)
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'sabs' && caseData.sabs && (
            <div className="space-y-6">
              {/* SABS Workflow Checklist - Based on AB Manual */}
              <SABSWorkflowChecklist
                caseData={caseData}
                sabs={caseData.sabs}
                completions={checklistCompletions}
                onItemToggle={async (itemId, completed) => {
                  // Optimistic update
                  setChecklistCompletions(prev => ({ ...prev, [itemId]: completed }))
                  try {
                    await toggleChecklistItem(caseId, itemId, completed, user?.id)
                  } catch (err) {
                    // Revert on error
                    console.error('Failed to toggle checklist item:', err)
                    setChecklistCompletions(prev => ({ ...prev, [itemId]: !completed }))
                  }
                }}
                onItemUpdate={(itemId, updates) => {
                  console.log('Checklist item updated:', itemId, updates)
                }}
              />

              {/* SABS Timeline Visualization */}
              <SABSTimeline caseData={caseData} sabs={caseData.sabs} />

              <OCFFormTracker
                caseId={caseData.id}
                sabs={{ ...caseData.sabs, ocf18Submissions }}
                dateOfLoss={caseData.dateOfLoss}
                onUpdateOCF1={async (date) => {
                  try {
                    await updateOCF1ReceivedDate(caseId, date)
                    setCaseData(prev => prev ? {
                      ...prev,
                      sabs: { ...prev.sabs, ocf1ReceivedDate: date }
                    } : null)
                  } catch (err) {
                    console.error('Failed to update OCF-1:', err)
                  }
                }}
                onUpdateOCF3={async (date) => {
                  try {
                    await updateOCF3ExpiryDate(caseId, date)
                    setCaseData(prev => prev ? {
                      ...prev,
                      sabs: { ...prev.sabs, ocf3ExpiryDate: date }
                    } : null)
                  } catch (err) {
                    console.error('Failed to update OCF-3:', err)
                  }
                }}
                onAddOCF18={async (submission) => {
                  try {
                    const newSubmission = await addOCF18Submission({
                      ...submission,
                      caseId,
                    })
                    setOcf18Submissions(prev => [newSubmission, ...prev])
                  } catch (err) {
                    console.error('Failed to add OCF-18:', err)
                  }
                }}
                onUpdateOCF18Status={async (id, status) => {
                  try {
                    await updateOCF18Status(id, status)
                    setOcf18Submissions(prev => prev.map(s =>
                      s.id === id ? { ...s, status } : s
                    ))
                  } catch (err) {
                    console.error('Failed to update OCF-18 status:', err)
                  }
                }}
                onUpdateCategory={async (category) => {
                  try {
                    await updateSABSCategory(caseId, category)
                    setCaseData(prev => prev ? {
                      ...prev,
                      sabs: { ...prev.sabs, migStatus: category }
                    } : null)
                  } catch (err) {
                    console.error('Failed to update category:', err)
                  }
                }}
              />

              <LATApplicationManager
                caseId={caseData.id}
                applications={latApplications}
                onAddApplication={async (app) => {
                  try {
                    const newApp = await addLATApplication({
                      ...app,
                      caseId,
                    })
                    setLatApplications(prev => [newApp, ...prev])
                  } catch (err) {
                    console.error('Failed to add LAT application:', err)
                  }
                }}
                onUpdateApplication={async (id, updates) => {
                  try {
                    const updated = await updateLATApplication(id, updates)
                    setLatApplications(prev => prev.map(a =>
                      a.id === id ? updated : a
                    ))
                  } catch (err) {
                    console.error('Failed to update LAT application:', err)
                  }
                }}
              />

              {/* Client Opening Memo Tracker - Track completion status */}
              <FileOpeningMemoTracker
                caseData={caseData}
                onSave={(data) => {
                  console.log('Opening memo tracker saved:', data)
                }}
              />

              {/* Client Review Tracker - Track reviews and schedule next */}
              <ClientReviewTracker
                caseData={caseData}
                onSave={(data) => {
                  console.log('Client review tracker saved:', data)
                }}
              />
            </div>
          )}

          {activeTab === 'tort' && caseData.tort && (
            <div className="space-y-6">
              <TortWorkflowChecklist
                caseData={caseData}
                tort={caseData.tort}
                defendants={defendants}
                completions={checklistCompletions}
                onItemToggle={async (itemId, completed) => {
                  try {
                    await toggleChecklistItem(caseData.id, itemId, completed)
                    setChecklistCompletions(prev => ({
                      ...prev,
                      [itemId]: completed,
                    }))
                  } catch (err) {
                    console.error('Failed to toggle checklist item:', err)
                  }
                }}
              />

              <DualRailTimeline caseData={caseData} />

              <DefendantsManager
                caseId={caseData.id}
                defendants={defendants}
                onAddDefendant={async (defendant) => {
                  try {
                    const newDefendant = await addDefendant(caseData.id, defendant)
                    setDefendants(prev => [...prev, newDefendant])
                  } catch (err) {
                    console.error('Failed to add defendant:', err)
                  }
                }}
                onUpdateDefendant={async (id, updates) => {
                  try {
                    const updated = await updateDefendant(id, updates)
                    setDefendants(prev => prev.map(d =>
                      d.id === id ? updated : d
                    ))
                  } catch (err) {
                    console.error('Failed to update defendant:', err)
                  }
                }}
              />

              <DiscoveryManager
                caseId={caseData.id}
                tort={caseData.tort}
                onUpdateTort={async (updates) => {
                  try {
                    await updateTortClaim(caseData.id, updates)
                    setCaseData(prev => prev ? {
                      ...prev,
                      tort: prev.tort ? { ...prev.tort, ...updates } : prev.tort
                    } : prev)
                  } catch (err) {
                    console.error('Failed to update tort claim:', err)
                  }
                }}
              />

              <UndertakingsModule
                caseId={caseData.id}
                plaintiffUndertakings={undertakings.filter(u => u.type === 'Plaintiff')}
                defenseUndertakings={undertakings.filter(u => u.type === 'Defense')}
                onAddUndertaking={async (undertaking) => {
                  try {
                    const newUndertaking = await addUndertaking({
                      ...undertaking,
                      caseId: caseData.id,
                    })
                    setUndertakings(prev => [newUndertaking, ...prev])
                  } catch (err) {
                    console.error('Failed to add undertaking:', err)
                  }
                }}
                onUpdateStatus={async (id, status) => {
                  try {
                    const updated = await updateUndertakingStatus(id, status)
                    setUndertakings(prev => prev.map(u =>
                      u.id === id ? updated : u
                    ))
                  } catch (err) {
                    console.error('Failed to update undertaking status:', err)
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'evidence' && (
            <MedicalEvidenceMatrix
              providers={caseData.medicalProviders || []}
              caseId={caseData.id}
              onRequestRecords={async (providerId) => {
                // Find the provider to get their name
                const provider = caseData.medicalProviders?.find(p => p.id === providerId)
                const providerName = provider?.name || 'Unknown Provider'

                // Create a task to request the records
                if (!user?.id) {
                  console.error('User not logged in')
                  return
                }

                try {
                  const newTask = await createTask({
                    caseId: caseData.id,
                    title: `Request Records: ${providerName}`,
                    description: `Request updated clinical notes and records from ${providerName}`,
                    status: 'Pending',
                    priority: 'Medium',
                    category: 'Medical Records',
                    assignedTo: 'LegalAssistant',
                    createdBy: user.id,
                  })
                  setCaseTasks(prev => [newTask, ...prev])
                } catch (err) {
                  console.error('Failed to create records request task:', err)
                }
              }}
            />
          )}

          {activeTab === 'experts' && (
            <div className="space-y-6">
              <ExpertReportsManager
                caseId={caseData.id}
                expertReports={expertReports}
                preTrialDate={caseData.tort?.preTrialDate}
                onAddExpert={async (expert) => {
                  try {
                    const newExpert = await addExpertReport({
                      ...expert,
                      caseId,
                    })
                    setExpertReports(prev => [newExpert, ...prev])
                  } catch (err) {
                    console.error('Failed to add expert:', err)
                  }
                }}
                onUpdateExpert={async (id, updates) => {
                  try {
                    const updated = await updateExpertReport(id, updates)
                    setExpertReports(prev => prev.map(e =>
                      e.id === id ? updated : e
                    ))
                  } catch (err) {
                    console.error('Failed to update expert:', err)
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6">
              <SettlementCalculator />

              <SettlementNegotiationTracker
                caseId={caseData.id}
                offers={settlementOffers}
                currentDisbursements={disbursements.reduce((sum, d) => sum + d.amount, 0)}
                onAddOffer={async (offer) => {
                  try {
                    const newOffer = await addSettlementOffer({
                      ...offer,
                      caseId,
                    })
                    setSettlementOffers(prev => [newOffer, ...prev])
                  } catch (err) {
                    console.error('Failed to add offer:', err)
                  }
                }}
                onUpdateOffer={async (id, updates) => {
                  try {
                    const updated = await updateSettlementOffer(id, updates)
                    setSettlementOffers(prev => prev.map(o =>
                      o.id === id ? updated : o
                    ))
                  } catch (err) {
                    console.error('Failed to update offer:', err)
                  }
                }}
              />

              <SABSTortHydraulic
                tortIncomeLoss={0}
                tortFutureLoss={0}
                sabsIRBPaid={caseData.sabs?.irbPaid || 0}
                sabsFutureIRB={0}
                sabsMedicalPaid={caseData.sabs?.medicalPaid || 0}
                tortFutureCare={0}
                sabsMedicalLimit={caseData.sabs?.medicalRehabLimit || 65000}
              />

              <DisbursementManager
                caseId={caseData.id}
                disbursements={disbursements}
                caseValue={caseData.estimatedValue || 0}
                onAddDisbursement={async (disb) => {
                  try {
                    const newDisb = await addDisbursement({
                      ...disb,
                      caseId,
                    })
                    setDisbursements(prev => [newDisb, ...prev])
                  } catch (err) {
                    console.error('Failed to add disbursement:', err)
                  }
                }}
                onUpdateDisbursement={async (id, updates) => {
                  try {
                    const updated = await updateDisbursement(id, updates)
                    setDisbursements(prev => prev.map(d =>
                      d.id === id ? updated : d
                    ))
                  } catch (err) {
                    console.error('Failed to update disbursement:', err)
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="space-y-6">
              <ClientCommunicationLog
                caseId={caseData.id}
                communications={communications}
                onAddCommunication={async (comm) => {
                  try {
                    const newComm = await addCommunication({
                      ...comm,
                      caseId,
                    })
                    setCommunications(prev => [newComm, ...prev])
                  } catch (err) {
                    console.error('Failed to add communication:', err)
                  }
                }}
                onUpdateCommunication={async (id, updates) => {
                  try {
                    const updated = await updateCommunication(id, updates)
                    setCommunications(prev => prev.map(c =>
                      c.id === id ? updated : c
                    ))
                  } catch (err) {
                    console.error('Failed to update communication:', err)
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'pretrial' && caseData.tort && (
            <div className="space-y-6">
              <PreTrialManager
                caseId={caseData.id}
                tort={caseData.tort}
                onUpdateTort={async (updates) => {
                  try {
                    const updatedTort = await updateTortClaim(caseId, updates)
                    setCaseData(prev => prev ? {
                      ...prev,
                      tort: updatedTort
                    } : null)
                  } catch (err) {
                    console.error('Failed to update tort:', err)
                  }
                }}
              />
            </div>
          )}
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

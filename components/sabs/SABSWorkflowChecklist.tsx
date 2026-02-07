'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  Briefcase,
  Stethoscope,
  DollarSign,
  Send,
  Calendar,
  CheckSquare
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SABSClaim, PICase } from '@/types/pi-case'
import { generateTimelineFromDOL, generateOCF1Deadline } from '@/lib/timeline-calculator'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  title: string
  description?: string
  category: 'Initial' | 'Forms' | 'Productions' | 'Referrals' | 'Benefits' | 'LAT' | 'Settlement'
  deadline?: string
  deadlineType?: 'DOL' | 'Received' | 'Custom'
  daysOffset?: number // Days from DOL or received date
  assignedTo?: 'Lawyer' | 'LawClerk' | 'LegalAssistant' | 'AccidentBenefitsCoordinator'
  critical: boolean
  completed: boolean
  completedDate?: string
  notes?: string
}

interface SABSWorkflowChecklistProps {
  caseData: PICase
  sabs: SABSClaim
  completions?: Record<string, boolean>
  onItemToggle: (itemId: string, completed: boolean) => void
  onItemUpdate?: (itemId: string, updates: Partial<ChecklistItem>) => void
}

/**
 * SABS Workflow Checklist Component
 * Based on AB Manual workflow requirements
 */
export function SABSWorkflowChecklist({
  caseData,
  sabs,
  completions = {},
  onItemToggle,
  onItemUpdate,
}: SABSWorkflowChecklistProps) {
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>('Initial')

  // Generate checklist items based on AB Manual (Complete workflow from manual)
  const checklistItems: ChecklistItem[] = React.useMemo(() => {
    const dol = new Date(caseData.dateOfLoss)
    const items: ChecklistItem[] = []

    // Helper to calculate deadline from DOL
    const addDays = (days: number) => new Date(dol.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
    const addMonths = (months: number) => {
      const date = new Date(dol)
      date.setMonth(date.getMonth() + months)
      return date.toISOString()
    }

    // ============================================
    // WITHIN 1 WEEK OF DOL (AB Manual Section 4-5)
    // ============================================
    items.push({
      id: 'client-contact',
      title: 'Client Contact & Opening Memo',
      description: 'Complete initial client interview and document accident details, injuries, and strategy',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 7,
      deadline: addDays(7),
      assignedTo: 'Lawyer',
      critical: true,
      completed: !!caseData.dateOpened,
      completedDate: caseData.dateOpened,
    })

    items.push({
      id: 'prepare-ocf1',
      title: 'Prepare OCF-1 Application',
      description: 'Draft OCF-1 Application for Accident Benefits',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 7,
      deadline: addDays(7),
      assignedTo: 'LawClerk',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'request-ab-file',
      title: 'Request AB File from Insurer',
      description: 'Fax/email request to adjuster for the AB claim file',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 7,
      deadline: addDays(7),
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'assign-ot-psw',
      title: 'Assign OT & PSW',
      description: 'Arrange Occupational Therapist and Personal Support Worker for client',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 7,
      deadline: addDays(7),
      assignedTo: 'AccidentBenefitsCoordinator',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'ensure-clinic-setup',
      title: 'Ensure Clinic Setup',
      description: 'Verify treatment facilities are arranged (physio, chiro, massage)',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 7,
      deadline: addDays(7),
      assignedTo: 'AccidentBenefitsCoordinator',
      critical: true,
      completed: caseData.medicalProviders.some(m => m.type === 'Physio' || m.type === 'Chiro'),
    })

    items.push({
      id: 'get-ocf3',
      title: 'Get OCF-3 from Treating Physician',
      description: 'Obtain Disability Certificate from clinic or family doctor',
      category: 'Forms',
      deadlineType: 'DOL',
      daysOffset: 7,
      deadline: addDays(7),
      assignedTo: 'LawClerk',
      critical: true,
      completed: !!sabs.ocf3ExpiryDate,
    })

    items.push({
      id: 'get-ocf2',
      title: 'Get OCF-2 from Employer',
      description: 'Request Employer\'s Confirmation of Income (required for IRB claims)',
      category: 'Forms',
      deadlineType: 'DOL',
      daysOffset: 7,
      deadline: addDays(7),
      assignedTo: 'LawClerk',
      critical: sabs.electedBenefitType === 'IRB',
      completed: false,
    })

    // ============================================
    // WITHIN 3 WEEKS OF DOL (AB Manual Section 9)
    // ============================================
    items.push({
      id: 'submit-expenses',
      title: 'Submit Initial Expenses',
      description: 'Submit OCF-6 expense claims to insurer',
      category: 'Forms',
      deadlineType: 'DOL',
      daysOffset: 21,
      deadline: addDays(21),
      assignedTo: 'LegalAssistant',
      critical: false,
      completed: false,
    })

    items.push({
      id: 'request-fd-cnrs',
      title: 'Request FD CNRs',
      description: 'Request Clinical Notes & Records from Family Doctor',
      category: 'Productions',
      deadlineType: 'DOL',
      daysOffset: 21,
      deadline: addDays(21),
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: caseData.medicalProviders.some(m => m.type === 'GP' && m.recordsObtained),
    })

    items.push({
      id: 'request-hospital-records',
      title: 'Request Hospital Records',
      description: 'ER records, ambulance reports, admission records',
      category: 'Productions',
      deadlineType: 'DOL',
      daysOffset: 21,
      deadline: addDays(21),
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: caseData.medicalProviders.some(m => m.type === 'Hospital' && m.recordsObtained),
    })

    items.push({
      id: 'ensure-client-treatment',
      title: 'Ensure Client Attending Treatment',
      description: 'Confirm client is actively attending physio/chiro/massage appointments',
      category: 'Referrals',
      deadlineType: 'DOL',
      daysOffset: 21,
      deadline: addDays(21),
      assignedTo: 'AccidentBenefitsCoordinator',
      critical: true,
      completed: false,
    })

    // ============================================
    // 1 MONTH POST-DOL
    // ============================================
    items.push({
      id: 'send-ac-hk-1mo',
      title: 'Send AC & HK Forms (1 Month)',
      description: 'Send Attendant Care and Housekeeping assessment forms',
      category: 'Forms',
      deadlineType: 'DOL',
      daysOffset: 30,
      deadline: addDays(30),
      assignedTo: 'LawClerk',
      critical: false,
      completed: false,
    })

    // OCF-1 Submission
    items.push({
      id: 'ocf1-submit',
      title: 'Submit OCF-1 Application',
      description: 'Submit within 30 days of receiving package',
      category: 'Forms',
      deadlineType: 'Received',
      daysOffset: 30,
      deadline: sabs.ocf1ReceivedDate
        ? generateOCF1Deadline(sabs.ocf1ReceivedDate, caseData.id).dueDate
        : addDays(30),
      assignedTo: 'LawClerk',
      critical: true,
      completed: !!sabs.ocf1SubmittedDate,
      completedDate: sabs.ocf1SubmittedDate,
    })

    // ============================================
    // 3 MONTHS POST-DOL (AB Manual Section 10)
    // ============================================
    items.push({
      id: 'refer-psych-3mo',
      title: 'Refer for Psychological Assessment',
      description: 'Schedule psychological assessment if mental health issues present',
      category: 'Referrals',
      deadlineType: 'DOL',
      daysOffset: 90,
      deadline: addMonths(3),
      assignedTo: 'Lawyer',
      critical: false,
      completed: caseData.expertReports.some(e => e.expertType === 'Psychological'),
    })

    // ============================================
    // 4 MONTHS POST-DOL
    // ============================================
    items.push({
      id: 'ensure-productions-4mo',
      title: 'Ensure Productions Requested (4 Months)',
      description: 'Verify all document requests have been sent and followed up',
      category: 'Productions',
      deadlineType: 'DOL',
      daysOffset: 120,
      deadline: addMonths(4),
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'request-cnrs-4mo',
      title: 'Request Updated CNRs (4 Months)',
      description: 'Request current clinical notes and records from all providers',
      category: 'Productions',
      deadlineType: 'DOL',
      daysOffset: 120,
      deadline: addMonths(4),
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: false,
    })

    // ============================================
    // 5 MONTHS POST-DOL
    // ============================================
    items.push({
      id: 'ur-client-5mo',
      title: 'U&R with Client (5 Months)',
      description: 'Update & Review call/meeting with client to discuss progress',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 150,
      deadline: addMonths(5),
      assignedTo: 'Lawyer',
      critical: false,
      completed: false,
    })

    items.push({
      id: 'send-ac-hk-5mo',
      title: 'Send AC & HK Forms (5 Months)',
      description: 'Updated Attendant Care and Housekeeping forms',
      category: 'Forms',
      deadlineType: 'DOL',
      daysOffset: 150,
      deadline: addMonths(5),
      assignedTo: 'LawClerk',
      critical: false,
      completed: false,
    })

    // ============================================
    // 6 MONTHS POST-DOL (AB Manual Section 10)
    // ============================================
    items.push({
      id: 'george-review-6mo',
      title: 'George Review (6 Months)',
      description: 'Senior lawyer file review and strategy assessment',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 180,
      deadline: addMonths(6),
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'refer-physiatry-6mo',
      title: 'Refer for Physiatry/Ortho (6 Months)',
      description: 'Schedule physiatry or orthopedic assessment',
      category: 'Referrals',
      deadlineType: 'DOL',
      daysOffset: 180,
      deadline: addMonths(6),
      assignedTo: 'Lawyer',
      critical: false,
      completed: caseData.expertReports.some(e => e.expertType === 'Orthopedic'),
    })

    // ============================================
    // 9 MONTHS POST-DOL
    // ============================================
    items.push({
      id: 'ur-client-9mo',
      title: 'U&R with Client (9 Months)',
      description: 'Update & Review call/meeting with client',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 270,
      deadline: addMonths(9),
      assignedTo: 'Lawyer',
      critical: false,
      completed: false,
    })

    // ============================================
    // 12 MONTHS POST-DOL (AB Manual Section 14)
    // ============================================
    items.push({
      id: 'george-review-12mo',
      title: 'George Review (12 Months)',
      description: 'Comprehensive senior lawyer file review',
      category: 'Initial',
      deadlineType: 'DOL',
      daysOffset: 365,
      deadline: addMonths(12),
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'refer-cpa-neuro-12mo',
      title: 'Refer for CPA/Neuro (12 Months)',
      description: 'Chronic Pain Assessment or Neurological evaluation',
      category: 'Referrals',
      deadlineType: 'DOL',
      daysOffset: 365,
      deadline: addMonths(12),
      assignedTo: 'Lawyer',
      critical: false,
      completed: caseData.expertReports.some(e => e.expertType === 'Neurological'),
    })

    items.push({
      id: 'send-ac-hk-12mo',
      title: 'Send AC & HK Forms (12 Months)',
      description: 'Updated Attendant Care and Housekeeping forms',
      category: 'Forms',
      deadlineType: 'DOL',
      daysOffset: 365,
      deadline: addMonths(12),
      assignedTo: 'LawClerk',
      critical: false,
      completed: false,
    })

    items.push({
      id: 'irb-medical-review-12mo',
      title: 'Prepare IRB & Medical Review (12 Months)',
      description: 'Comprehensive benefits and medical status review',
      category: 'Benefits',
      deadlineType: 'DOL',
      daysOffset: 365,
      deadline: addMonths(12),
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    // ============================================
    // BENEFITS MANAGEMENT (Ongoing)
    // ============================================
    items.push({
      id: 'setup-irb',
      title: 'Set Up Income Replacement Benefits',
      description: 'Calculate IRB and ensure payments begin (70% of gross income, max $400/week)',
      category: 'Benefits',
      assignedTo: 'AccidentBenefitsCoordinator',
      critical: sabs.electedBenefitType === 'IRB',
      completed: sabs.irbPaid > 0,
    })

    items.push({
      id: 'setup-neb',
      title: 'Set Up Non-Earner Benefits (if applicable)',
      description: 'For clients who don\'t qualify for IRB - $185/week',
      category: 'Benefits',
      assignedTo: 'AccidentBenefitsCoordinator',
      critical: sabs.electedBenefitType === 'NEB',
      completed: false,
    })

    items.push({
      id: 'mig-bust-strategy',
      title: 'MIG Removal Strategy',
      description: 'Gather evidence for MIG removal (pre-existing conditions, psychological issues)',
      category: 'Benefits',
      assignedTo: 'Lawyer',
      critical: sabs.migStatus === 'MIG',
      completed: sabs.migBustStatus === 'Approved',
    })

    items.push({
      id: 'cat-assessment',
      title: 'CAT Assessment (if applicable)',
      description: 'Assess for Catastrophic Impairment designation',
      category: 'Benefits',
      assignedTo: 'Lawyer',
      critical: sabs.migStatus === 'CAT' || sabs.catStatus === 'Pending',
      completed: sabs.catStatus === 'Approved',
    })

    // ============================================
    // LAT (Based on AB Manual Section 15)
    // ============================================
    items.push({
      id: 'lat-application',
      title: 'File LAT Application (if denied)',
      description: 'File LAT application within 2 years of denial',
      category: 'LAT',
      assignedTo: 'Lawyer',
      critical: sabs.latApplications.length > 0,
      completed: sabs.latApplications.some(l => l.status === 'Filed'),
    })

    return items
  }, [caseData, sabs])

  const getCategoryIcon = (category: ChecklistItem['category']) => {
    switch (category) {
      case 'Initial': return <Calendar className="w-4 h-4" />
      case 'Forms': return <FileText className="w-4 h-4" />
      case 'Productions': return <Briefcase className="w-4 h-4" />
      case 'Referrals': return <Stethoscope className="w-4 h-4" />
      case 'Benefits': return <DollarSign className="w-4 h-4" />
      case 'LAT': return <Send className="w-4 h-4" />
      case 'Settlement': return <CheckCircle2 className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: ChecklistItem['category']) => {
    switch (category) {
      case 'Initial': return 'text-blue-500'
      case 'Forms': return 'text-electric-teal'
      case 'Productions': return 'text-purple-500'
      case 'Referrals': return 'text-green-500'
      case 'Benefits': return 'text-yellow-500'
      case 'LAT': return 'text-orange-500'
      case 'Settlement': return 'text-living-coral'
    }
  }

  const categories = ['Initial', 'Forms', 'Productions', 'Referrals', 'Benefits', 'LAT', 'Settlement'] as const

  // Check if item is completed (from prop or built-in status)
  const isItemCompleted = (item: ChecklistItem) => {
    // Database completions take precedence
    if (completions[item.id] !== undefined) {
      return completions[item.id]
    }
    // Fall back to built-in completion status
    return item.completed
  }

  const getItemsByCategory = (category: ChecklistItem['category']) => {
    return checklistItems.filter(item => item.category === category)
  }

  const getCompletionStats = () => {
    const total = checklistItems.length
    const completed = checklistItems.filter(i => isItemCompleted(i)).length
    const critical = checklistItems.filter(i => i.critical && !isItemCompleted(i)).length
    return { total, completed, critical, percentage: Math.round((completed / total) * 100) }
  }

  const stats = getCompletionStats()

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-electric-teal" />
            SABS Workflow Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-deep-indigo dark:text-vapor">{stats.completed}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-deep-indigo dark:text-vapor">{stats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-living-coral">{stats.critical}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-electric-teal">{stats.percentage}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Complete</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-electric-teal to-cyan-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Sections */}
      {categories.map((category) => {
        const items = getItemsByCategory(category)
        const categoryCompleted = items.filter(i => isItemCompleted(i)).length
        const isExpanded = expandedCategory === category

        return (
          <Card key={category} variant="glass">
            <CardHeader>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', getCategoryColor(category), 'bg-opacity-10')}>
                    {getCategoryIcon(category)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {categoryCompleted} of {items.length} completed
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {Math.round((categoryCompleted / items.length) * 100)}%
                </Badge>
              </button>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <div className="space-y-3">
                  {items.map((item) => {
                    const completed = isItemCompleted(item)
                    const isOverdue = item.deadline && new Date(item.deadline) < new Date() && !completed
                    const daysUntilDeadline = item.deadline
                      ? Math.ceil((new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border-2 transition-all',
                          completed
                            ? 'bg-green-500/5 border-green-500/20'
                            : isOverdue
                            ? 'bg-living-coral/10 border-living-coral'
                            : item.critical
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
                        )}
                      >
                        <button
                          onClick={() => onItemToggle(item.id, !completed)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400 hover:text-electric-teal transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={cn(
                              'font-semibold',
                              completed ? 'line-through text-gray-500' : 'text-deep-indigo dark:text-vapor'
                            )}>
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.critical && !completed && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                              {item.assignedTo && (
                                <Badge variant="outline" className="text-xs">{item.assignedTo}</Badge>
                              )}
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 flex-wrap">
                            {item.deadline && (
                              <div className="flex items-center gap-1 text-xs">
                                <Clock className={cn(
                                  'w-3 h-3',
                                  isOverdue ? 'text-living-coral' : 'text-gray-400'
                                )} />
                                <span className={cn(
                                  isOverdue ? 'text-living-coral font-semibold' : 'text-gray-600 dark:text-gray-400'
                                )}>
                                  {isOverdue 
                                    ? `Overdue: ${new Date(item.deadline).toLocaleDateString()}`
                                    : daysUntilDeadline !== null
                                    ? `Due in ${daysUntilDeadline} days (${new Date(item.deadline).toLocaleDateString()})`
                                    : `Due: ${new Date(item.deadline).toLocaleDateString()}`
                                  }
                                </span>
                              </div>
                            )}
                            {item.completedDate && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed {new Date(item.completedDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}


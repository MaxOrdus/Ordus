'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Users,
  Gavel,
  Scale,
  Calendar,
  CheckSquare,
  Send,
  FileSearch,
  MessageSquare,
  AlertTriangle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TortClaim, PICase, Defendant } from '@/types/pi-case'
import { cn } from '@/lib/utils'

interface TortChecklistItem {
  id: string
  title: string
  description?: string
  category: 'Pleadings' | 'Discovery' | 'Examinations' | 'Pre-Trial' | 'Trial' | 'Settlement'
  deadline?: string
  deadlineType?: 'DOL' | 'Filed' | 'Custom'
  daysOffset?: number
  assignedTo?: 'Lawyer' | 'LawClerk' | 'LegalAssistant'
  critical: boolean
  completed: boolean
  completedDate?: string
}

interface TortWorkflowChecklistProps {
  caseData: PICase
  tort: TortClaim
  defendants: Defendant[]
  completions?: Record<string, boolean>
  onItemToggle: (itemId: string, completed: boolean) => void
}

/**
 * Tort Workflow Checklist Component
 * Tracks all civil litigation steps from NOI to Trial
 */
export function TortWorkflowChecklist({
  caseData,
  tort,
  defendants,
  completions = {},
  onItemToggle,
}: TortWorkflowChecklistProps) {
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>('Pleadings')

  // Generate checklist items based on tort workflow
  const checklistItems: TortChecklistItem[] = React.useMemo(() => {
    const dol = new Date(caseData.dateOfLoss)
    const items: TortChecklistItem[] = []

    // Helper to calculate deadline from DOL
    const addDays = (days: number) => new Date(dol.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

    // ============================================
    // PLEADINGS (Notice of Intent → Statement of Claim → Statement of Defense)
    // ============================================
    items.push({
      id: 'noi-sent',
      title: 'Notice of Intent to Sue Sent',
      description: 'Send NOI to all potential defendants (required 120 days before SOC)',
      category: 'Pleadings',
      deadlineType: 'DOL',
      daysOffset: 120,
      deadline: addDays(120),
      assignedTo: 'LawClerk',
      critical: true,
      completed: !!tort.noticeOfIntentDate,
      completedDate: tort.noticeOfIntentDate,
    })

    items.push({
      id: 'soc-drafted',
      title: 'Statement of Claim Drafted',
      description: 'Draft SOC with all causes of action and damages',
      category: 'Pleadings',
      assignedTo: 'Lawyer',
      critical: true,
      completed: !!tort.statementOfClaimIssued,
    })

    items.push({
      id: 'soc-issued',
      title: 'Statement of Claim Issued',
      description: 'File SOC with court to obtain court file number',
      category: 'Pleadings',
      deadlineType: 'DOL',
      daysOffset: 730, // 2 years limitation
      deadline: addDays(730),
      assignedTo: 'LawClerk',
      critical: true,
      completed: !!tort.statementOfClaimIssued,
      completedDate: tort.statementOfClaimIssued,
    })

    items.push({
      id: 'soc-served',
      title: 'Statement of Claim Served',
      description: 'Serve SOC on all defendants',
      category: 'Pleadings',
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: defendants.length > 0 && defendants.every(d => d.served),
    })

    // Add service tracking for each defendant
    defendants.forEach((defendant, index) => {
      items.push({
        id: `defendant-served-${defendant.id}`,
        title: `Serve ${defendant.name} (${defendant.role})`,
        description: `Serve defendant via personal service or alternatives to service`,
        category: 'Pleadings',
        assignedTo: 'LegalAssistant',
        critical: true,
        completed: defendant.served,
        completedDate: defendant.servedDate,
      })
    })

    items.push({
      id: 'sod-received',
      title: 'Statement of Defense Received',
      description: 'Receive and review all Statements of Defense',
      category: 'Pleadings',
      assignedTo: 'Lawyer',
      critical: true,
      completed: !!tort.statementOfDefenseReceived,
      completedDate: tort.statementOfDefenseReceived,
    })

    items.push({
      id: 'reply-filed',
      title: 'Reply (if needed)',
      description: 'File Reply to Statement of Defense if new matters raised',
      category: 'Pleadings',
      assignedTo: 'Lawyer',
      critical: false,
      completed: false,
    })

    // ============================================
    // DISCOVERY
    // ============================================
    items.push({
      id: 'affd-docs-prepared',
      title: 'Affidavit of Documents Prepared',
      description: 'Prepare client\'s Affidavit of Documents (Schedule A & B)',
      category: 'Discovery',
      assignedTo: 'LawClerk',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'affd-docs-exchanged',
      title: 'Affidavit of Documents Exchanged',
      description: 'Exchange Affidavits of Documents with defense',
      category: 'Discovery',
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: tort.discoveryCompleted,
    })

    items.push({
      id: 'productions-reviewed',
      title: 'Defense Productions Reviewed',
      description: 'Review all documents produced by defense',
      category: 'Discovery',
      assignedTo: 'Lawyer',
      critical: true,
      completed: tort.discoveryCompleted,
    })

    items.push({
      id: 'request-productions',
      title: 'Request Further Productions',
      description: 'Send request for additional documents if needed',
      category: 'Discovery',
      assignedTo: 'LawClerk',
      critical: false,
      completed: false,
    })

    // ============================================
    // EXAMINATIONS
    // ============================================
    items.push({
      id: 'plaintiff-exam-scheduled',
      title: 'Plaintiff Examination Scheduled',
      description: 'Schedule date for plaintiff\'s examination for discovery',
      category: 'Examinations',
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'plaintiff-exam-prep',
      title: 'Prepare Plaintiff for Examination',
      description: 'Meet with client to prepare for examination questions',
      category: 'Examinations',
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'plaintiff-exam-conducted',
      title: 'Plaintiff Examination Conducted',
      description: 'Attend plaintiff\'s examination for discovery',
      category: 'Examinations',
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'defendant-exam-scheduled',
      title: 'Defendant Examination Scheduled',
      description: 'Schedule date to examine defendant(s)',
      category: 'Examinations',
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'defendant-exam-conducted',
      title: 'Defendant Examination Conducted',
      description: 'Examine defendant(s) for discovery',
      category: 'Examinations',
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    // Check if all plaintiff undertakings are completed (Answered or Served)
    const allPlaintiffUndertakingsComplete = tort.plaintiffUndertakings.length > 0 &&
      tort.plaintiffUndertakings.every(u => u.status === 'Answered' || u.status === 'Served')

    items.push({
      id: 'undertakings-answered',
      title: 'Undertakings Answered',
      description: 'Answer all undertakings from examinations',
      category: 'Examinations',
      assignedTo: 'LawClerk',
      critical: true,
      completed: allPlaintiffUndertakingsComplete,
    })

    items.push({
      id: 'defense-undertakings-received',
      title: 'Defense Undertakings Received',
      description: 'Receive and review defense answers to undertakings',
      category: 'Examinations',
      assignedTo: 'LawClerk',
      critical: true,
      completed: false,
    })

    // ============================================
    // PRE-TRIAL
    // ============================================
    items.push({
      id: 'mediation-scheduled',
      title: 'Mediation Scheduled',
      description: 'Schedule mandatory mediation (if applicable)',
      category: 'Pre-Trial',
      assignedTo: 'LegalAssistant',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'mediation-brief',
      title: 'Mediation Brief Prepared',
      description: 'Prepare mediation brief outlining case theory and damages',
      category: 'Pre-Trial',
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'mediation-conducted',
      title: 'Mediation Conducted',
      description: 'Attend mediation session',
      category: 'Pre-Trial',
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'trial-record-served',
      title: 'Trial Record Served',
      description: 'Serve Trial Record to set matter down for trial',
      category: 'Pre-Trial',
      assignedTo: 'LawClerk',
      critical: true,
      completed: !!tort.trialRecordServed,
      completedDate: tort.trialRecordServed,
    })

    items.push({
      id: 'jury-notice-served',
      title: 'Jury Notice Served (if jury trial)',
      description: 'Serve Jury Notice to elect trial by jury',
      category: 'Pre-Trial',
      assignedTo: 'LawClerk',
      critical: false,
      completed: !!tort.juryNoticeDate,
      completedDate: tort.juryNoticeDate,
    })

    items.push({
      id: 'pretrial-conference',
      title: 'Pre-Trial Conference Attended',
      description: 'Attend pre-trial conference with judge',
      category: 'Pre-Trial',
      assignedTo: 'Lawyer',
      critical: true,
      completed: !!tort.preTrialDate && new Date(tort.preTrialDate) < new Date(),
      completedDate: tort.preTrialDate,
    })

    items.push({
      id: 'expert-reports-served',
      title: 'Expert Reports Served',
      description: 'Serve all expert reports per timeline',
      category: 'Pre-Trial',
      assignedTo: 'LawClerk',
      critical: true,
      completed: caseData.expertReports.length > 0,
    })

    // ============================================
    // TRIAL
    // ============================================
    items.push({
      id: 'trial-brief',
      title: 'Trial Brief Prepared',
      description: 'Prepare comprehensive trial brief',
      category: 'Trial',
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'witness-list',
      title: 'Witness List Prepared',
      description: 'Finalize witness list and order of testimony',
      category: 'Trial',
      assignedTo: 'Lawyer',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'trial-book',
      title: 'Trial Book Prepared',
      description: 'Prepare trial book with exhibits and documents',
      category: 'Trial',
      assignedTo: 'LawClerk',
      critical: true,
      completed: false,
    })

    items.push({
      id: 'trial-conducted',
      title: 'Trial Conducted',
      description: 'Attend trial',
      category: 'Trial',
      assignedTo: 'Lawyer',
      critical: true,
      completed: !!tort.trialDate && new Date(tort.trialDate) < new Date(),
      completedDate: tort.trialDate,
    })

    items.push({
      id: 'judgment-obtained',
      title: 'Judgment Obtained',
      description: 'Obtain judgment or verdict',
      category: 'Trial',
      assignedTo: 'Lawyer',
      critical: true,
      completed: !!tort.trialOutcome?.result,
    })

    // ============================================
    // SETTLEMENT
    // ============================================
    items.push({
      id: 'settlement-offer-considered',
      title: 'Settlement Offers Considered',
      description: 'Review and advise client on any settlement offers',
      category: 'Settlement',
      assignedTo: 'Lawyer',
      critical: false,
      completed: false,
    })

    items.push({
      id: 'rule-49-offer',
      title: 'Rule 49 Offer Served',
      description: 'Serve formal offer to settle for cost protection',
      category: 'Settlement',
      assignedTo: 'Lawyer',
      critical: false,
      completed: false,
    })

    return items
  }, [caseData, tort, defendants])

  const getCategoryIcon = (category: TortChecklistItem['category']) => {
    switch (category) {
      case 'Pleadings': return <FileText className="w-4 h-4" />
      case 'Discovery': return <FileSearch className="w-4 h-4" />
      case 'Examinations': return <MessageSquare className="w-4 h-4" />
      case 'Pre-Trial': return <Calendar className="w-4 h-4" />
      case 'Trial': return <Gavel className="w-4 h-4" />
      case 'Settlement': return <Scale className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: TortChecklistItem['category']) => {
    switch (category) {
      case 'Pleadings': return 'text-blue-500'
      case 'Discovery': return 'text-purple-500'
      case 'Examinations': return 'text-electric-teal'
      case 'Pre-Trial': return 'text-yellow-500'
      case 'Trial': return 'text-living-coral'
      case 'Settlement': return 'text-green-500'
    }
  }

  const categories = ['Pleadings', 'Discovery', 'Examinations', 'Pre-Trial', 'Trial', 'Settlement'] as const

  // Check if item is completed (from prop or built-in status)
  const isItemCompleted = (item: TortChecklistItem) => {
    if (completions[item.id] !== undefined) {
      return completions[item.id]
    }
    return item.completed
  }

  const getItemsByCategory = (category: TortChecklistItem['category']) => {
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
            Tort Litigation Checklist
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
                  {items.length > 0 ? Math.round((categoryCompleted / items.length) * 100) : 0}%
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

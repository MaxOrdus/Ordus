/**
 * Automated Workflow Engine
 * Generates tasks from deadlines, monitors treatment gaps, and triggers alerts
 */

import { Deadline, DeadlineType, PICase, MedicalProvider } from '@/types/pi-case'
import { Task, TaskCategory, TaskPriority, TaskTemplate, TaskTrigger, UserRole } from '@/types/tasks'
import { generateTimelineFromDOL } from './timeline-calculator'

/**
 * Task templates for common workflows
 * Based on AB Manual workflow requirements
 */
export const TASK_TEMPLATES: TaskTemplate[] = [
  // ============================================
  // WITHIN 1 WEEK OF DOL (AB Manual Section 4-5)
  // ============================================
  {
    id: 'client-contact-memo',
    name: 'Client Contact & Opening Memo',
    description: 'Complete initial client interview and document accident details, injuries, and strategy',
    category: 'Administrative',
    defaultAssignee: 'Lawyer',
    defaultPriority: 'Critical',
    estimatedHours: 1,
    trigger: { type: 'OnCaseOpen' },
  },
  {
    id: 'prepare-ocf1',
    name: 'Prepare OCF-1 Application',
    description: 'Draft OCF-1 Application for Accident Benefits',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Critical',
    estimatedHours: 1.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_NOTICE', daysBefore: 7 },
  },
  {
    id: 'request-ab-file',
    name: 'Request AB File from Insurer',
    description: 'Fax/email request to adjuster for the AB claim file',
    category: 'Administrative',
    defaultAssignee: 'LegalAssistant',
    defaultPriority: 'High',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_NOTICE', daysBefore: 7 },
  },
  {
    id: 'assign-ot-psw',
    name: 'Assign OT & PSW',
    description: 'Arrange Occupational Therapist and Personal Support Worker for client',
    category: 'Client Communication',
    defaultAssignee: 'AccidentBenefitsCoordinator',
    defaultPriority: 'Critical',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_NOTICE', daysBefore: 7 },
  },
  {
    id: 'ensure-clinic-setup',
    name: 'Ensure Clinic Setup',
    description: 'Verify treatment facilities are arranged (physio, chiro, massage)',
    category: 'Client Communication',
    defaultAssignee: 'AccidentBenefitsCoordinator',
    defaultPriority: 'Critical',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_NOTICE', daysBefore: 7 },
  },
  {
    id: 'get-ocf3',
    name: 'Get OCF-3 from Treating Physician',
    description: 'Obtain Disability Certificate from clinic or family doctor',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Critical',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_NOTICE', daysBefore: 7 },
  },
  {
    id: 'get-ocf2',
    name: 'Get OCF-2 from Employer',
    description: 'Request Employer Confirmation of Income (required for IRB claims)',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'High',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_NOTICE', daysBefore: 7 },
  },
  {
    id: 'sabs-notice',
    name: 'Send SABS Notice',
    description: 'Notify insurer of accident within 7 days',
    category: 'OCF Forms',
    defaultAssignee: 'LegalAssistant',
    defaultPriority: 'Critical',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_NOTICE', daysBefore: 7 },
  },
  // ============================================
  // WITHIN 3 WEEKS OF DOL (AB Manual Section 9)
  // ============================================
  {
    id: 'submit-expenses',
    name: 'Submit Initial Expenses',
    description: 'Submit OCF-6 expense claims to insurer',
    category: 'OCF Forms',
    defaultAssignee: 'LegalAssistant',
    defaultPriority: 'Medium',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_3WEEK', daysBefore: 21 },
  },
  {
    id: 'request-fd-cnrs',
    name: 'Request FD CNRs',
    description: 'Request Clinical Notes & Records from Family Doctor',
    category: 'Medical Records',
    defaultAssignee: 'LegalAssistant',
    defaultPriority: 'Critical',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_3WEEK', daysBefore: 21 },
  },
  {
    id: 'request-hospital-records',
    name: 'Request Hospital Records',
    description: 'ER records, ambulance reports, admission records',
    category: 'Medical Records',
    defaultAssignee: 'LegalAssistant',
    defaultPriority: 'Critical',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_3WEEK', daysBefore: 21 },
  },
  {
    id: 'ensure-client-treatment',
    name: 'Ensure Client Attending Treatment',
    description: 'Confirm client is actively attending physio/chiro/massage appointments',
    category: 'Client Communication',
    defaultAssignee: 'AccidentBenefitsCoordinator',
    defaultPriority: 'Critical',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_3WEEK', daysBefore: 21 },
  },
  // ============================================
  // 1 MONTH POST-DOL
  // ============================================
  {
    id: 'send-ac-hk-1mo',
    name: 'Send AC & HK Forms (1 Month)',
    description: 'Send Attendant Care and Housekeeping assessment forms',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_1MONTH', daysBefore: 30 },
  },
  {
    id: 'ocf1-submit',
    name: 'Submit OCF-1 Application',
    description: 'Complete and submit OCF-1 within 30 days of receiving package',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Critical',
    estimatedHours: 2,
    trigger: { type: 'OnDeadline', deadlineType: 'OCF1_DEADLINE', daysBefore: 30 },
  },
  // ============================================
  // 3 MONTHS POST-DOL (AB Manual Section 10)
  // ============================================
  {
    id: 'refer-psych-3mo',
    name: 'Refer for Psychological Assessment',
    description: 'Schedule psychological assessment if mental health issues present',
    category: 'Medical Records',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_3MONTH', daysBefore: 90 },
  },
  // ============================================
  // 4 MONTHS POST-DOL
  // ============================================
  {
    id: 'ensure-productions-4mo',
    name: 'Ensure Productions Requested (4 Months)',
    description: 'Verify all document requests have been sent and followed up',
    category: 'Administrative',
    defaultAssignee: 'LegalAssistant',
    defaultPriority: 'High',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_4MONTH', daysBefore: 120 },
  },
  {
    id: 'request-cnrs-4mo',
    name: 'Request Updated CNRs (4 Months)',
    description: 'Request current clinical notes and records from all providers',
    category: 'Medical Records',
    defaultAssignee: 'LegalAssistant',
    defaultPriority: 'High',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_4MONTH', daysBefore: 120 },
  },
  // ============================================
  // 5 MONTHS POST-DOL
  // ============================================
  {
    id: 'ur-client-5mo',
    name: 'U&R with Client (5 Months)',
    description: 'Update & Review call/meeting with client to discuss progress',
    category: 'Client Communication',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_5MONTH', daysBefore: 150 },
  },
  {
    id: 'send-ac-hk-5mo',
    name: 'Send AC & HK Forms (5 Months)',
    description: 'Updated Attendant Care and Housekeeping forms',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_5MONTH', daysBefore: 150 },
  },
  // ============================================
  // 6 MONTHS POST-DOL (AB Manual Section 10)
  // ============================================
  {
    id: 'george-review-6mo',
    name: 'George Review (6 Months)',
    description: 'Senior lawyer file review and strategy assessment',
    category: 'Administrative',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Critical',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_6MONTH', daysBefore: 180 },
  },
  {
    id: 'refer-physiatry-6mo',
    name: 'Refer for Physiatry/Ortho (6 Months)',
    description: 'Schedule physiatry or orthopedic assessment',
    category: 'Medical Records',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_6MONTH', daysBefore: 180 },
  },
  // ============================================
  // 9 MONTHS POST-DOL
  // ============================================
  {
    id: 'ur-client-9mo',
    name: 'U&R with Client (9 Months)',
    description: 'Update & Review call/meeting with client',
    category: 'Client Communication',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_9MONTH', daysBefore: 270 },
  },
  // ============================================
  // 12 MONTHS POST-DOL (AB Manual Section 14)
  // ============================================
  {
    id: 'george-review-12mo',
    name: 'George Review (12 Months)',
    description: 'Comprehensive senior lawyer file review',
    category: 'Administrative',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Critical',
    estimatedHours: 2,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_12MONTH', daysBefore: 365 },
  },
  {
    id: 'refer-cpa-neuro-12mo',
    name: 'Refer for CPA/Neuro (12 Months)',
    description: 'Chronic Pain Assessment or Neurological evaluation',
    category: 'Medical Records',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_12MONTH', daysBefore: 365 },
  },
  {
    id: 'send-ac-hk-12mo',
    name: 'Send AC & HK Forms (12 Months)',
    description: 'Updated Attendant Care and Housekeeping forms',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Medium',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_12MONTH', daysBefore: 365 },
  },
  {
    id: 'irb-medical-review-12mo',
    name: 'Prepare IRB & Medical Review (12 Months)',
    description: 'Comprehensive benefits and medical status review',
    category: 'Administrative',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'Critical',
    estimatedHours: 2,
    trigger: { type: 'OnDeadline', deadlineType: 'SABS_12MONTH', daysBefore: 365 },
  },
  // ============================================
  // OCF FORM DEADLINES
  // ============================================
  {
    id: 'ocf3-renewal',
    name: 'Renew OCF-3 Certificate',
    description: 'Client must renew disability certificate before expiry',
    category: 'OCF Forms',
    defaultAssignee: 'Paralegal',
    defaultPriority: 'High',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'OCF3_RENEWAL', daysBefore: 30 },
  },
  {
    id: 'ocf18-followup',
    name: 'Follow Up on OCF-18',
    description: 'Check if OCF-18 was deemed approved (10 business days)',
    category: 'OCF Forms',
    defaultAssignee: 'AccidentBenefitsCoordinator',
    defaultPriority: 'High',
    estimatedHours: 0.5,
    trigger: { type: 'OnDeadline', deadlineType: 'OCF18_DEEMED_APPROVAL', daysBefore: 0 },
  },
  // ============================================
  // TORT DEADLINES
  // ============================================
  {
    id: 'tort-notice',
    name: 'Send Notice of Intent to Sue',
    description: 'Send notice within 120 days for pre-judgment interest',
    category: 'Pleadings',
    defaultAssignee: 'LawClerk',
    defaultPriority: 'High',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'TORT_NOTICE', daysBefore: 120 },
  },
  {
    id: 'limitation-warning',
    name: 'Limitation Period Approaching',
    description: 'File Statement of Claim before limitation expires',
    category: 'Pleadings',
    defaultAssignee: 'Lawyer',
    defaultPriority: 'Critical',
    estimatedHours: 4,
    trigger: { type: 'OnDeadline', deadlineType: 'LIMITATION_PERIOD', daysBefore: 30 },
  },
  {
    id: 'pretrial-brief',
    name: 'File Pre-Trial Brief',
    description: 'File comprehensive pre-trial brief 5 days before conference',
    category: 'Court',
    defaultAssignee: 'Lawyer',
    defaultPriority: 'Critical',
    estimatedHours: 8,
    trigger: { type: 'OnDeadline', deadlineType: 'PRETRIAL_BRIEF', daysBefore: 5 },
  },
  {
    id: 'expert-report',
    name: 'Serve Expert Report',
    description: 'Serve expert report 90 days before Pre-Trial',
    category: 'Medical Records',
    defaultAssignee: 'LawClerk',
    defaultPriority: 'High',
    estimatedHours: 1,
    trigger: { type: 'OnDeadline', deadlineType: 'EXPERT_REPORT', daysBefore: 90 },
  },
  {
    id: 'rule48-warning',
    name: 'Rule 48 Dismissal Risk',
    description: 'Set action down before 5-year dismissal deadline',
    category: 'Court',
    defaultAssignee: 'Lawyer',
    defaultPriority: 'Critical',
    estimatedHours: 2,
    trigger: { type: 'OnDeadline', deadlineType: 'RULE48_DISMISSAL', daysBefore: 60 },
  },
]

/**
 * Generate tasks from deadlines based on templates
 */
export function generateTasksFromDeadlines(
  deadlines: Deadline[],
  caseId: string,
  caseTitle: string,
  createdBy: string
): Task[] {
  const tasks: Task[] = []
  const now = new Date()

  for (const deadline of deadlines) {
    if (deadline.status !== 'Active' || !deadline.autoGenerated) continue

    const template = TASK_TEMPLATES.find(
      (t) => t.trigger.type === 'OnDeadline' && t.trigger.deadlineType === deadline.type
    )

    if (!template) continue

    const dueDate = new Date(deadline.dueDate)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Only generate task if within the trigger window
    const triggerDays = template.trigger.type === 'OnDeadline' ? template.trigger.daysBefore : 0
    if (daysUntilDue > triggerDays) continue

    // Determine priority based on urgency
    let priority: TaskPriority = template.defaultPriority
    if (daysUntilDue <= 3) priority = 'Critical'
    else if (daysUntilDue <= 7) priority = 'High'
    else if (daysUntilDue <= 14) priority = 'Medium'

    tasks.push({
      id: `task-${deadline.id}-${Date.now()}`,
      caseId,
      title: `${template.name} - ${caseTitle}`,
      description: `${template.description}\n\nDeadline: ${deadline.description}\nDue: ${dueDate.toLocaleDateString()}`,
      assignedTo: template.defaultAssignee,
      createdBy,
      createdAt: new Date().toISOString(),
      dueDate: deadline.dueDate,
      status: 'Pending',
      priority,
      category: template.category,
      metadata: {
        deadlineId: deadline.id,
        deadlineType: deadline.type,
        autoGenerated: true,
      },
    })
  }

  return tasks
}

/**
 * Generate tasks when a case is opened
 */
export function generateInitialCaseTasks(
  caseData: PICase,
  createdBy: string
): Task[] {
  const tasks: Task[] = []

  // Generate timeline deadlines
  const deadlines = generateTimelineFromDOL(
    caseData.dateOfLoss,
    caseData.id,
    undefined, // clientBirthDate - would come from client data
    caseData.tort.statementOfClaimIssued
  )

  // Generate tasks from deadlines
  const deadlineTasks = generateTasksFromDeadlines(deadlines, caseData.id, caseData.title, createdBy)

  // Add initial intake tasks
  tasks.push({
    id: `intake-${caseData.id}-${Date.now()}`,
    caseId: caseData.id,
    title: `Complete Intake - ${caseData.title}`,
    description: 'Gather initial case information and client details',
    assignedTo: 'LegalAssistant',
    createdBy,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    priority: 'High',
    category: 'Administrative',
    metadata: { autoGenerated: true, trigger: 'OnCaseOpen' },
  })

  tasks.push(...deadlineTasks)

  return tasks
}

/**
 * Detect treatment gaps and generate alert tasks
 */
export function detectTreatmentGaps(
  medicalProviders: MedicalProvider[],
  caseId: string,
  caseTitle: string,
  createdBy: string,
  gapThresholdDays: number = 14
): Task[] {
  const tasks: Task[] = []
  const now = new Date()

  for (const provider of medicalProviders) {
    if (!provider.lastRecordDate) continue

    const lastRecord = new Date(provider.lastRecordDate)
    const daysSinceLastRecord = Math.ceil((now.getTime() - lastRecord.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceLastRecord > gapThresholdDays && !provider.gapDetected) {
      tasks.push({
        id: `gap-alert-${provider.id}-${Date.now()}`,
        caseId,
        title: `Treatment Gap Detected - ${provider.name}`,
        description: `No records from ${provider.name} in ${daysSinceLastRecord} days. Client should resume treatment to document ongoing issues.`,
        assignedTo: 'LawClerk',
        createdBy,
        createdAt: new Date().toISOString(),
        status: 'Pending',
        priority: daysSinceLastRecord > 30 ? 'High' : 'Medium',
        category: 'Client Communication',
        metadata: {
          providerId: provider.id,
          providerName: provider.name,
          gapStartDate: provider.lastRecordDate,
          gapDays: daysSinceLastRecord,
          autoGenerated: true,
          trigger: 'TreatmentGap',
        },
      })
    }
  }

  return tasks
}

/**
 * Generate email reminder for critical deadline
 */
export interface EmailReminder {
  id: string
  deadlineId: string
  caseId: string
  recipient: string
  subject: string
  body: string
  scheduledDate: string
  sent: boolean
  sentDate?: string
}

export function generateEmailReminders(
  deadlines: Deadline[],
  caseTitle: string,
  recipientEmail: string,
  reminderDays: number[] = [7, 3, 1] // Remind 7 days, 3 days, and 1 day before
): EmailReminder[] {
  const reminders: EmailReminder[] = []
  const now = new Date()

  for (const deadline of deadlines) {
    if (deadline.status !== 'Active' || !deadline.critical) continue

    const dueDate = new Date(deadline.dueDate)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    for (const daysBefore of reminderDays) {
      if (daysUntilDue <= daysBefore && daysUntilDue > 0) {
        const scheduledDate = new Date(dueDate)
        scheduledDate.setDate(scheduledDate.getDate() - daysBefore)

        reminders.push({
          id: `reminder-${deadline.id}-${daysBefore}`,
          deadlineId: deadline.id,
          caseId: deadline.caseId,
          recipient: recipientEmail,
          subject: `⚠️ Critical Deadline: ${deadline.description}`,
          body: `This is a reminder that the following deadline is approaching:\n\n` +
            `Case: ${caseTitle}\n` +
            `Deadline: ${deadline.description}\n` +
            `Due Date: ${dueDate.toLocaleDateString()}\n` +
            `Days Remaining: ${daysUntilDue}\n\n` +
            `Please take action to ensure this deadline is met.`,
          scheduledDate: scheduledDate.toISOString(),
          sent: false,
        })
      }
    }
  }

  return reminders
}

/**
 * Check for overdue deadlines and generate urgent tasks
 */
export function checkOverdueDeadlines(
  deadlines: Deadline[],
  caseId: string,
  caseTitle: string,
  createdBy: string
): Task[] {
  const tasks: Task[] = []
  const now = new Date()

  for (const deadline of deadlines) {
    if (deadline.status !== 'Active' && deadline.status !== 'Overdue') continue

    const dueDate = new Date(deadline.dueDate)
    const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOverdue > 0 && deadline.critical) {
      tasks.push({
        id: `overdue-${deadline.id}-${Date.now()}`,
        caseId,
        title: `🚨 OVERDUE: ${deadline.description}`,
        description: `This critical deadline is ${daysOverdue} day(s) overdue. Immediate action required.`,
        assignedTo: 'Lawyer',
        createdBy,
        createdAt: new Date().toISOString(),
        status: 'Pending',
        priority: 'Critical',
        category: deadline.type.includes('OCF') ? 'OCF Forms' : 'Court',
        metadata: {
          deadlineId: deadline.id,
          deadlineType: deadline.type,
          daysOverdue,
          autoGenerated: true,
          trigger: 'OverdueDeadline',
        },
      })
    }
  }

  return tasks
}


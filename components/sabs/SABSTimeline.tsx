'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  Send,
  User,
  Briefcase
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SABSClaim, PICase } from '@/types/pi-case'
import { generateTimelineFromDOL, generateOCF1Deadline, generateOCF3RenewalAlert } from '@/lib/timeline-calculator'
import { cn } from '@/lib/utils'

interface SABSTimelineProps {
  caseData: PICase
  sabs: SABSClaim
}

interface TimelineMilestone {
  id: string
  title: string
  description: string
  date: string
  status: 'completed' | 'pending' | 'overdue' | 'upcoming'
  critical: boolean
  category: 'Notice' | 'Forms' | 'Productions' | 'Referrals' | 'Benefits' | 'LAT'
  icon: React.ReactNode
}

/**
 * SABS Timeline Visualization
 * Shows chronological flow of SABS workflow based on AB Manual
 */
export function SABSTimeline({ caseData, sabs }: SABSTimelineProps) {
  const dol = React.useMemo(() => new Date(caseData.dateOfLoss), [caseData.dateOfLoss])

  // Generate timeline milestones based on AB Manual workflow (Complete timeline)
  const milestones: TimelineMilestone[] = React.useMemo(() => {
    const items: TimelineMilestone[] = []
    const now = new Date()

    // Helper functions
    const addDays = (days: number) => {
      const date = new Date(dol)
      date.setDate(date.getDate() + days)
      return date
    }
    const addMonths = (months: number) => {
      const date = new Date(dol)
      date.setMonth(date.getMonth() + months)
      return date
    }
    const getStatus = (targetDate: Date, isCompleted: boolean): TimelineMilestone['status'] => {
      if (isCompleted) return 'completed'
      if (targetDate < now) return 'overdue'
      const daysUntil = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil <= 14 ? 'pending' : 'upcoming'
    }

    // ============================================
    // DOL - The Big Bang
    // ============================================
    items.push({
      id: 'dol',
      title: 'Date of Loss',
      description: 'Accident occurred',
      date: caseData.dateOfLoss,
      status: 'completed',
      critical: true,
      category: 'Notice',
      icon: <Calendar className="w-5 h-5" />,
    })

    // ============================================
    // WITHIN 1 WEEK (AB Manual Section 4-5)
    // ============================================
    const weekOneDate = addDays(7)
    items.push({
      id: 'sabs-notice',
      title: 'SABS Notice to Insurer',
      description: 'Must notify within 7 days',
      date: weekOneDate.toISOString(),
      status: sabs.noticeDate ? 'completed' : getStatus(weekOneDate, false),
      critical: true,
      category: 'Notice',
      icon: <Send className="w-5 h-5" />,
    })

    items.push({
      id: 'client-contact',
      title: 'Client Contact & Opening Memo',
      description: 'Complete intake, accident details, injuries, and strategy',
      date: weekOneDate.toISOString(),
      status: caseData.dateOpened ? 'completed' : getStatus(weekOneDate, false),
      critical: true,
      category: 'Forms',
      icon: <User className="w-5 h-5" />,
    })

    items.push({
      id: 'clinic-setup',
      title: 'Clinic Setup (OT, PSW, Physio)',
      description: 'Assign OT & PSW, ensure treatment facilities arranged',
      date: weekOneDate.toISOString(),
      status: getStatus(weekOneDate, caseData.medicalProviders.some(m => m.type === 'Physio')),
      critical: true,
      category: 'Referrals',
      icon: <Briefcase className="w-5 h-5" />,
    })

    items.push({
      id: 'ocf3-get',
      title: 'Get OCF-3 & OCF-2',
      description: 'Disability Certificate from physician, Employer Income Confirmation',
      date: weekOneDate.toISOString(),
      status: sabs.ocf3ExpiryDate ? 'completed' : getStatus(weekOneDate, false),
      critical: true,
      category: 'Forms',
      icon: <FileText className="w-5 h-5" />,
    })

    // ============================================
    // WITHIN 3 WEEKS (AB Manual Section 9)
    // ============================================
    const threeWeeksDate = addDays(21)
    items.push({
      id: 'productions-3wk',
      title: 'Request FD CNRs & Hospital Records',
      description: 'Request Clinical Notes from Family Doctor and Hospital',
      date: threeWeeksDate.toISOString(),
      status: getStatus(threeWeeksDate, caseData.medicalProviders.some(m => m.recordsObtained)),
      critical: true,
      category: 'Productions',
      icon: <Briefcase className="w-5 h-5" />,
    })

    items.push({
      id: 'client-treatment-3wk',
      title: 'Ensure Client Attending Treatment',
      description: 'Confirm active attendance at physio/chiro/massage',
      date: threeWeeksDate.toISOString(),
      status: getStatus(threeWeeksDate, false),
      critical: true,
      category: 'Referrals',
      icon: <User className="w-5 h-5" />,
    })

    // ============================================
    // 1 MONTH
    // ============================================
    const oneMonthDate = addDays(30)
    items.push({
      id: 'ac-hk-1mo',
      title: 'AC & HK Forms (1 Month)',
      description: 'Send Attendant Care and Housekeeping assessment forms',
      date: oneMonthDate.toISOString(),
      status: getStatus(oneMonthDate, false),
      critical: false,
      category: 'Forms',
      icon: <FileText className="w-5 h-5" />,
    })

    // OCF-1 Deadline (if received)
    if (sabs.ocf1ReceivedDate) {
      const ocf1Deadline = generateOCF1Deadline(sabs.ocf1ReceivedDate, caseData.id)
      items.push({
        id: 'ocf1-deadline',
        title: 'OCF-1 Submission Deadline',
        description: 'Submit within 30 days of receipt',
        date: ocf1Deadline.dueDate,
        status: sabs.ocf1SubmittedDate ? 'completed' : getStatus(new Date(ocf1Deadline.dueDate), false),
        critical: true,
        category: 'Forms',
        icon: <FileText className="w-5 h-5" />,
      })
    }

    // ============================================
    // 3 MONTHS (AB Manual Section 10)
    // ============================================
    const threeMonthDate = addMonths(3)
    items.push({
      id: 'psych-referral-3mo',
      title: 'Psychological Assessment Referral',
      description: 'Schedule if mental health issues present',
      date: threeMonthDate.toISOString(),
      status: getStatus(threeMonthDate, caseData.expertReports.some(e => e.expertType === 'Psychological')),
      critical: false,
      category: 'Referrals',
      icon: <Briefcase className="w-5 h-5" />,
    })

    // ============================================
    // 4 MONTHS
    // ============================================
    const fourMonthDate = addMonths(4)
    items.push({
      id: 'productions-4mo',
      title: 'Ensure Productions & Updated CNRs',
      description: 'Verify all document requests sent, request current records',
      date: fourMonthDate.toISOString(),
      status: getStatus(fourMonthDate, false),
      critical: true,
      category: 'Productions',
      icon: <Briefcase className="w-5 h-5" />,
    })

    // ============================================
    // 5 MONTHS
    // ============================================
    const fiveMonthDate = addMonths(5)
    items.push({
      id: 'ur-5mo',
      title: 'U&R with Client (5 Months)',
      description: 'Update & Review meeting with client',
      date: fiveMonthDate.toISOString(),
      status: getStatus(fiveMonthDate, false),
      critical: false,
      category: 'Notice',
      icon: <User className="w-5 h-5" />,
    })

    items.push({
      id: 'ac-hk-5mo',
      title: 'AC & HK Forms (5 Months)',
      description: 'Updated Attendant Care and Housekeeping forms',
      date: fiveMonthDate.toISOString(),
      status: getStatus(fiveMonthDate, false),
      critical: false,
      category: 'Forms',
      icon: <FileText className="w-5 h-5" />,
    })

    // ============================================
    // 6 MONTHS (AB Manual Section 10)
    // ============================================
    const sixMonthDate = addMonths(6)
    items.push({
      id: 'george-review-6mo',
      title: 'George Review (6 Months)',
      description: 'Senior lawyer file review and strategy assessment',
      date: sixMonthDate.toISOString(),
      status: getStatus(sixMonthDate, false),
      critical: true,
      category: 'Notice',
      icon: <AlertTriangle className="w-5 h-5" />,
    })

    items.push({
      id: 'physiatry-referral-6mo',
      title: 'Physiatry/Ortho Assessment',
      description: 'Schedule physiatry or orthopedic assessment',
      date: sixMonthDate.toISOString(),
      status: getStatus(sixMonthDate, caseData.expertReports.some(e => e.expertType === 'Orthopedic')),
      critical: false,
      category: 'Referrals',
      icon: <Briefcase className="w-5 h-5" />,
    })

    // ============================================
    // 9 MONTHS
    // ============================================
    const nineMonthDate = addMonths(9)
    items.push({
      id: 'ur-9mo',
      title: 'U&R with Client (9 Months)',
      description: 'Update & Review meeting with client',
      date: nineMonthDate.toISOString(),
      status: getStatus(nineMonthDate, false),
      critical: false,
      category: 'Notice',
      icon: <User className="w-5 h-5" />,
    })

    // ============================================
    // 12 MONTHS (AB Manual Section 14)
    // ============================================
    const twelveMonthDate = addMonths(12)
    items.push({
      id: 'george-review-12mo',
      title: 'George Review (12 Months)',
      description: 'Comprehensive senior lawyer file review',
      date: twelveMonthDate.toISOString(),
      status: getStatus(twelveMonthDate, false),
      critical: true,
      category: 'Notice',
      icon: <AlertTriangle className="w-5 h-5" />,
    })

    items.push({
      id: 'cpa-neuro-12mo',
      title: 'CPA/Neuro Referral (12 Months)',
      description: 'Chronic Pain Assessment or Neurological evaluation',
      date: twelveMonthDate.toISOString(),
      status: getStatus(twelveMonthDate, caseData.expertReports.some(e => e.expertType === 'Neurological')),
      critical: false,
      category: 'Referrals',
      icon: <Briefcase className="w-5 h-5" />,
    })

    items.push({
      id: 'irb-review-12mo',
      title: 'IRB & Medical Review (12 Months)',
      description: 'Comprehensive benefits and medical status review',
      date: twelveMonthDate.toISOString(),
      status: getStatus(twelveMonthDate, false),
      critical: true,
      category: 'Benefits',
      icon: <FileText className="w-5 h-5" />,
    })

    items.push({
      id: 'ac-hk-12mo',
      title: 'AC & HK Forms (12 Months)',
      description: 'Updated Attendant Care and Housekeeping forms',
      date: twelveMonthDate.toISOString(),
      status: getStatus(twelveMonthDate, false),
      critical: false,
      category: 'Forms',
      icon: <FileText className="w-5 h-5" />,
    })

    // ============================================
    // OCF-3 Renewal (if exists)
    // ============================================
    if (sabs.ocf3ExpiryDate) {
      const ocf3Alert = generateOCF3RenewalAlert(sabs.ocf3ExpiryDate, caseData.id)
      items.push({
        id: 'ocf3-renewal',
        title: 'OCF-3 Renewal Alert',
        description: 'Renew 30 days before expiry',
        date: ocf3Alert.dueDate,
        status: new Date(sabs.ocf3ExpiryDate) < now
          ? 'overdue'
          : new Date(ocf3Alert.dueDate) < now
          ? 'pending'
          : 'upcoming',
        critical: true,
        category: 'Forms',
        icon: <FileText className="w-5 h-5" />,
      })
    }

    // ============================================
    // OCF-18 Submissions (dynamic)
    // ============================================
    sabs.ocf18Submissions.forEach((submission) => {
      items.push({
        id: `ocf18-${submission.id}`,
        title: `OCF-18: ${submission.treatmentType}`,
        description: `$${submission.amount.toLocaleString()} - Deemed approval in 10 business days`,
        date: submission.submissionDate,
        status: submission.status === 'Approved' || submission.status === 'Deemed Approved'
          ? 'completed'
          : submission.status === 'Denied'
          ? 'completed'
          : new Date(submission.responseDeadline) < now
          ? 'overdue'
          : 'pending',
        critical: true,
        category: 'Forms',
        icon: <FileText className="w-5 h-5" />,
      })
    })

    // ============================================
    // CAT Assessment (if applicable)
    // ============================================
    if (sabs.catStatus === 'Pending' || sabs.catStatus === 'Approved') {
      items.push({
        id: 'cat-assessment',
        title: 'CAT Assessment',
        description: 'Catastrophic Impairment determination',
        date: sabs.catAssessmentDate || sabs.catApplicationDate || '',
        status: sabs.catStatus === 'Approved' ? 'completed' : 'pending',
        critical: true,
        category: 'Benefits',
        icon: <AlertTriangle className="w-5 h-5" />,
      })
    }

    // ============================================
    // LAT Applications (dynamic)
    // ============================================
    sabs.latApplications.forEach((lat) => {
      items.push({
        id: `lat-${lat.id}`,
        title: `LAT Application: ${lat.denialType}`,
        description: `Filed: ${lat.applicationFiled || 'Pending'} - Limitation: ${new Date(lat.limitationDate).toLocaleDateString()}`,
        date: lat.applicationFiled || lat.denialDate,
        status: lat.status === 'Completed' || lat.status === 'Settled'
          ? 'completed'
          : lat.status === 'Filed'
          ? 'pending'
          : new Date(lat.limitationDate) < now
          ? 'overdue'
          : 'pending',
        critical: true,
        category: 'LAT',
        icon: <Send className="w-5 h-5" />,
      })
    })

    // Sort by date
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [caseData, sabs, dol])

  const getStatusColor = (status: TimelineMilestone['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'overdue':
        return 'text-living-coral bg-living-coral/10 border-living-coral/20'
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'upcoming':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    }
  }

  const getStatusIcon = (status: TimelineMilestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-living-coral" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'upcoming':
        return <Calendar className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-electric-teal" />
          SABS Timeline
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Chronological workflow based on AB Manual
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-electric-teal via-blue-500 to-purple-500" />

          {/* Milestones */}
          <div className="space-y-6 relative">
            {milestones.map((milestone, index) => {
              const isLast = index === milestones.length - 1
              const date = new Date(milestone.date)
              const daysFromDOL = Math.ceil((date.getTime() - dol.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex items-start gap-4"
                >
                  {/* Timeline Dot */}
                  <div className={cn(
                    'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2',
                    getStatusColor(milestone.status)
                  )}>
                    {getStatusIcon(milestone.status)}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all',
                    getStatusColor(milestone.status),
                    milestone.critical && 'ring-2 ring-offset-2',
                    milestone.critical && milestone.status === 'overdue' && 'ring-living-coral',
                    milestone.critical && milestone.status === 'pending' && 'ring-yellow-500'
                  )}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-deep-indigo dark:text-vapor mb-1">
                          {milestone.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {milestone.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{date.toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{daysFromDOL >= 0 ? `+${daysFromDOL}` : daysFromDOL} days from DOL</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.critical && (
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{milestone.category}</Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-living-coral" />
              <span className="text-gray-600 dark:text-gray-400">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Upcoming</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


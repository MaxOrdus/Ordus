'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Calendar, DollarSign, FileText, Scale, ArrowRight, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PICase } from '@/types/pi-case'
import { cn } from '@/lib/utils'

interface DualRailTimelineProps {
  caseData: PICase
  className?: string
}

interface TimelineEvent {
  id: string
  date: string
  label: string
  type: 'sabs' | 'tort' | 'connection'
  description?: string
  status?: 'completed' | 'pending' | 'upcoming'
}

export function DualRailTimeline({ caseData, className }: DualRailTimelineProps) {
  // Generate timeline events from case data
  const timelineEvents = React.useMemo(() => {
    const events: TimelineEvent[] = []
    const dol = new Date(caseData.dateOfLoss)

    // SABS Events (Bottom Rail)
    if (caseData.sabs.noticeDate) {
      events.push({
        id: 'sabs-notice',
        date: caseData.sabs.noticeDate,
        label: 'SABS Notice',
        type: 'sabs',
        status: 'completed',
        description: 'Notice to insurer within 7 days',
      })
    }
    if (caseData.sabs.ocf1SubmittedDate) {
      events.push({
        id: 'ocf1',
        date: caseData.sabs.ocf1SubmittedDate,
        label: 'OCF-1 Submitted',
        type: 'sabs',
        status: 'completed',
      })
    }
    if (caseData.sabs.ocf18Submissions.length > 0) {
      caseData.sabs.ocf18Submissions.forEach((submission, idx) => {
        events.push({
          id: `ocf18-${idx}`,
          date: submission.submissionDate,
          label: `OCF-18: ${submission.treatmentType}`,
          type: 'sabs',
          status: submission.status === 'Approved' ? 'completed' : 'pending',
          description: `$${submission.amount.toLocaleString()}`,
        })
      })
    }
    if (caseData.sabs.catApplicationDate) {
      events.push({
        id: 'cat-application',
        date: caseData.sabs.catApplicationDate,
        label: 'CAT Application',
        type: 'sabs',
        status: caseData.sabs.catStatus === 'Approved' ? 'completed' : 'pending',
      })
    }

    // Tort Events (Top Rail)
    if (caseData.tort.noticeOfIntentDate) {
      events.push({
        id: 'tort-notice',
        date: caseData.tort.noticeOfIntentDate,
        label: 'Notice of Intent',
        type: 'tort',
        status: 'completed',
        description: 'DOL + 120 days',
      })
    }
    if (caseData.tort.statementOfClaimIssued) {
      events.push({
        id: 'soc-issued',
        date: caseData.tort.statementOfClaimIssued,
        label: 'Statement of Claim Issued',
        type: 'tort',
        status: 'completed',
      })
    }
    if (caseData.tort.statementOfClaimServed) {
      events.push({
        id: 'soc-served',
        date: caseData.tort.statementOfClaimServed,
        label: 'Statement of Claim Served',
        type: 'tort',
        status: 'completed',
      })
    }
    if (caseData.tort.discoveryDate) {
      events.push({
        id: 'discovery',
        date: caseData.tort.discoveryDate,
        label: 'Examinations for Discovery',
        type: 'tort',
        status: caseData.tort.discoveryCompleted ? 'completed' : 'pending',
      })
    }
    if (caseData.tort.trialRecordServed) {
      events.push({
        id: 'trial-record',
        date: caseData.tort.trialRecordServed,
        label: 'Trial Record Served',
        type: 'tort',
        status: 'completed',
        description: 'Set Down for Action',
      })
    }
    if (caseData.tort.preTrialDate) {
      events.push({
        id: 'pretrial',
        date: caseData.tort.preTrialDate,
        label: 'Pre-Trial Conference',
        type: 'tort',
        status: 'upcoming',
      })
    }
    if (caseData.tort.trialDate) {
      events.push({
        id: 'trial',
        date: caseData.tort.trialDate,
        label: 'Trial',
        type: 'tort',
        status: 'upcoming',
      })
    }

    // Sort by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [caseData])

  // Calculate timeline span
  const timelineStart = React.useMemo(() => {
    return new Date(caseData.dateOfLoss)
  }, [caseData.dateOfLoss])

  const timelineEnd = React.useMemo(() => {
    const dates = timelineEvents.map((e) => new Date(e.date))
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date()
    // Add 6 months buffer
    maxDate.setMonth(maxDate.getMonth() + 6)
    return maxDate
  }, [timelineEvents])

  const getEventPosition = (date: string) => {
    const eventDate = new Date(date)
    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    const daysFromStart = (eventDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    return (daysFromStart / totalDays) * 100
  }

  const getEventColor = (status?: string, type?: string) => {
    if (status === 'completed') return type === 'sabs' ? 'bg-electric-teal' : 'bg-violet-500'
    if (status === 'pending') return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const tortEvents = timelineEvents.filter((e) => e.type === 'tort')
  const sabsEvents = timelineEvents.filter((e) => e.type === 'sabs')

  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6 text-electric-teal" />
          <CardTitle>Dual-Rail Timeline</CardTitle>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Visualize SABS and Tort claims running on parallel tracks
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Track */}
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2" />

          {/* Tort Rail (Top) */}
          <div className="relative mb-16">
            <div className="flex items-center gap-4 mb-4">
              <Badge variant="default" className="bg-violet-500">Tort</Badge>
              <h3 className="font-semibold text-deep-indigo dark:text-vapor">Civil Litigation Track</h3>
            </div>
            <div className="relative h-20">
              {tortEvents.map((event) => {
                const position = getEventPosition(event.date)
                const color = getEventColor(event.status, event.type)

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-0"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 border-white dark:border-deep-indigo',
                          color
                        )}
                      />
                      <div className="mt-2 w-32 text-center">
                        <p className="text-xs font-medium text-deep-indigo dark:text-vapor truncate">
                          {event.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* SABS Rail (Bottom) */}
          <div className="relative mt-16">
            <div className="flex items-center gap-4 mb-4">
              <Badge variant="default" className="bg-electric-teal">SABS</Badge>
              <h3 className="font-semibold text-deep-indigo dark:text-vapor">No-Fault Benefits Track</h3>
            </div>
            <div className="relative h-20">
              {sabsEvents.map((event) => {
                const position = getEventPosition(event.date)
                const color = getEventColor(event.status, event.type)

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-0"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 border-white dark:border-deep-indigo',
                          color
                        )}
                      />
                      <div className="mt-2 w-32 text-center">
                        <p className="text-xs font-medium text-deep-indigo dark:text-vapor truncate">
                          {event.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Connection Lines (SABS to Tort interactions) */}
          {caseData.sabs.totalPaid > 0 && (
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none">
              {sabsEvents
                .filter((e) => e.id.includes('ocf18') || e.id === 'cat-application')
                .map((sabsEvent) => {
                  const sabsPos = getEventPosition(sabsEvent.date)
                  // Find nearest tort event for connection
                  const nearestTort = tortEvents.reduce((prev, curr) => {
                    const prevDist = Math.abs(
                      getEventPosition(prev.date) - getEventPosition(sabsEvent.date)
                    )
                    const currDist = Math.abs(
                      getEventPosition(curr.date) - getEventPosition(sabsEvent.date)
                    )
                    return currDist < prevDist ? curr : prev
                  }, tortEvents[0])

                  if (!nearestTort) return null

                  const tortPos = getEventPosition(nearestTort.date)
                  const midPoint = (sabsPos + tortPos) / 2
                  const distance = Math.abs(tortPos - sabsPos)
                  const angle = Math.atan2(100, distance) * (180 / Math.PI)

                  return (
                    <motion.div
                      key={`connection-${sabsEvent.id}`}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="absolute"
                      style={{
                        left: `${Math.min(sabsPos, tortPos)}%`,
                        width: `${distance}%`,
                        top: '50%',
                        height: '100px',
                      }}
                    >
                      <svg className="w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                        <line
                          x1="0"
                          y1="0"
                          x2="100%"
                          y2="100%"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="text-gray-400 opacity-50"
                        />
                      </svg>
                    </motion.div>
                  )
                })}
            </div>
          )}

          {/* Date Range */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
            <span>{timelineStart.toLocaleDateString()}</span>
            <span>Date of Loss</span>
            <span>{timelineEnd.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Tort Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-electric-teal" />
            <span className="text-xs text-gray-600 dark:text-gray-400">SABS Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


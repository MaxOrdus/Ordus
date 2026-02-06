'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Calendar, AlertCircle, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TreatmentEvent {
  date: string
  type: 'Physio' | 'Chiro' | 'GP' | 'Specialist' | 'Massage' | 'Other'
  provider: string
}

interface TreatmentGapDetectorProps {
  caseId: string
  dateOfLoss: string
  treatments: TreatmentEvent[]
  gapThresholdDays?: number
  onGapDetected?: (gapStart: string, gapEnd: string) => void
}

export function TreatmentGapDetector({
  caseId,
  dateOfLoss,
  treatments,
  gapThresholdDays = 14,
  onGapDetected,
}: TreatmentGapDetectorProps) {
  // Sort treatments by date
  const sortedTreatments = React.useMemo(() => {
    return [...treatments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [treatments])

  // Detect gaps
  const gaps = React.useMemo(() => {
    const detectedGaps: Array<{ start: string; end: string; days: number }> = []
    
    for (let i = 0; i < sortedTreatments.length - 1; i++) {
      const current = new Date(sortedTreatments[i].date)
      const next = new Date(sortedTreatments[i + 1].date)
      const daysBetween = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysBetween > gapThresholdDays) {
        detectedGaps.push({
          start: sortedTreatments[i].date,
          end: sortedTreatments[i + 1].date,
          days: daysBetween,
        })
      }
    }
    
    // Check gap from last treatment to today
    if (sortedTreatments.length > 0) {
      const lastTreatment = new Date(sortedTreatments[sortedTreatments.length - 1].date)
      const today = new Date()
      const daysSinceLast = Math.floor((today.getTime() - lastTreatment.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceLast > gapThresholdDays) {
        detectedGaps.push({
          start: sortedTreatments[sortedTreatments.length - 1].date,
          end: today.toISOString().split('T')[0],
          days: daysSinceLast,
        })
      }
    }
    
    return detectedGaps
  }, [sortedTreatments, gapThresholdDays])

  // Generate calendar view (last 12 months)
  const calendarMonths = React.useMemo(() => {
    const months: Array<{ month: string; year: number; days: Array<{ day: number; hasTreatment: boolean; type?: string }> }> = []
    const today = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      
      const days = Array.from({ length: daysInMonth }, (_, idx) => {
        const dayDate = new Date(date.getFullYear(), date.getMonth(), idx + 1)
        const dayStr = dayDate.toISOString().split('T')[0]
        const treatment = treatments.find((t) => t.date === dayStr)
        
        return {
          day: idx + 1,
          hasTreatment: !!treatment,
          type: treatment?.type,
        }
      })
      
      months.push({ month: monthName, year: date.getFullYear(), days })
    }
    
    return months
  }, [treatments])

  const getTreatmentColor = (type?: string) => {
    switch (type) {
      case 'Physio':
        return 'bg-electric-teal'
      case 'Chiro':
        return 'bg-violet-500'
      case 'GP':
        return 'bg-green-500'
      case 'Specialist':
        return 'bg-blue-500'
      case 'Massage':
        return 'bg-pink-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <Card variant="glass" className="p-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-electric-teal" />
              Treatment Gap Detector
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Visualize treatment frequency and detect gaps that could impact case value
            </p>
          </div>
          <Badge variant={gaps.length > 0 ? 'destructive' : 'default'}>
            {gaps.length} {gaps.length === 1 ? 'Gap' : 'Gaps'} Detected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gaps Alert */}
        {gaps.length > 0 && (
          <div className="p-4 bg-living-coral/10 border-2 border-living-coral rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-living-coral flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-living-coral mb-2">Treatment Gaps Detected</h3>
                <div className="space-y-2">
                  {gaps.map((gap, index) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-deep-indigo dark:text-vapor">
                        {gap.days} day gap: {new Date(gap.start).toLocaleDateString()} to{' '}
                        {new Date(gap.end).toLocaleDateString()}
                      </p>
                      {onGapDetected && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 text-xs"
                          onClick={() => onGapDetected(gap.start, gap.end)}
                        >
                          Generate Client Reminder
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Heatmap */}
        <div>
          <h3 className="font-semibold mb-4 text-deep-indigo dark:text-vapor">Treatment Calendar (Last 12 Months)</h3>
          <div className="grid grid-cols-12 gap-2">
            {calendarMonths.map((monthData, monthIdx) => (
              <div key={`${monthData.year}-${monthData.month}`} className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center mb-2">
                  {monthData.month}
                </p>
                <div className="grid grid-cols-7 gap-0.5">
                  {monthData.days.map((dayData, dayIdx) => {
                    const isGapDay = gaps.some((gap) => {
                      const dayDate = new Date(monthData.year, calendarMonths.indexOf(monthData), dayData.day)
                      return dayDate >= new Date(gap.start) && dayDate <= new Date(gap.end)
                    })

                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          'w-3 h-3 rounded-sm border',
                          dayData.hasTreatment
                            ? `${getTreatmentColor(dayData.type)} border-transparent`
                            : isGapDay
                            ? 'bg-living-coral/30 border-living-coral animate-pulse-slow'
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        )}
                        title={
                          dayData.hasTreatment
                            ? `${dayData.type} on ${monthData.month} ${dayData.day}`
                            : isGapDay
                            ? `Gap period: ${monthData.month} ${dayData.day}`
                            : `No treatment: ${monthData.month} ${dayData.day}`
                        }
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-electric-teal" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Physio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-violet-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Chiro</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">GP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-living-coral/30 border border-living-coral" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Gap</span>
            </div>
          </div>
        </div>

        {/* Treatment List */}
        <div>
          <h3 className="font-semibold mb-4 text-deep-indigo dark:text-vapor">Recent Treatments</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedTreatments.slice(-10).reverse().map((treatment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full', getTreatmentColor(treatment.type))} />
                  <div>
                    <p className="font-medium text-sm text-deep-indigo dark:text-vapor">
                      {treatment.type} - {treatment.provider}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(treatment.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


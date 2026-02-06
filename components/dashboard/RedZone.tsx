'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, Calendar, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Deadline } from '@/types/pi-case'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface RedZoneProps {
  deadlines: Deadline[]
  className?: string
}

export function RedZone({ deadlines, className }: RedZoneProps) {
  const router = useRouter()
  
  // Filter critical deadlines (active and overdue)
  const criticalDeadlines = deadlines
    .filter((d) => d.critical && (d.status === 'Active' || d.status === 'Overdue'))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 10)

  const getDeadlineIcon = (type: Deadline['type']) => {
    switch (type) {
      case 'LIMITATION_PERIOD':
      case 'RULE48_DISMISSAL':
        return AlertTriangle
      case 'OCF18_DEEMED_APPROVAL':
      case 'OCF1_DEADLINE':
        return FileText
      default:
        return Calendar
    }
  }

  const getDeadlineColor = (daysRemaining: number, status: Deadline['status']) => {
    if (status === 'Overdue' || status === 'Missed') return 'text-living-coral'
    if (daysRemaining <= 7) return 'text-living-coral'
    if (daysRemaining <= 30) return 'text-orange-500'
    return 'text-yellow-500'
  }

  const getDeadlineBadge = (daysRemaining: number, status: Deadline['status']) => {
    if (status === 'Overdue' || status === 'Missed') {
      return <Badge variant="destructive">OVERDUE</Badge>
    }
    if (daysRemaining <= 7) {
      return <Badge variant="destructive">{daysRemaining} days</Badge>
    }
    if (daysRemaining <= 30) {
      return <Badge variant="warning">{daysRemaining} days</Badge>
    }
    return <Badge variant="outline">{daysRemaining} days</Badge>
  }

  if (criticalDeadlines.length === 0) {
    return (
      <Card variant="glass" className={cn('p-6', className)}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-deep-indigo dark:text-vapor mb-2">
            All Clear!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No critical deadlines in the next 30 days
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-living-coral/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-living-coral" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor">
              Red Zone
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Critical deadlines requiring immediate attention
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/cases')}>
          View All →
        </Button>
      </div>

      <div className="space-y-3">
        {criticalDeadlines.map((deadline, index) => {
          const Icon = getDeadlineIcon(deadline.type)
          const color = getDeadlineColor(deadline.daysRemaining, deadline.status)
          const isUrgent = deadline.daysRemaining <= 7 || deadline.status === 'Overdue'

          return (
            <motion.div
              key={deadline.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => router.push(`/cases?id=${deadline.caseId}`)}
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                isUrgent
                  ? 'bg-living-coral/10 border-living-coral hover:bg-living-coral/20'
                  : 'bg-orange-500/10 border-orange-500 hover:bg-orange-500/20',
                deadline.status === 'Overdue' && 'animate-pulse-slow'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className={cn('w-5 h-5 mt-0.5', color)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-deep-indigo dark:text-vapor mb-1">
                      {deadline.description}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(deadline.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  {getDeadlineBadge(deadline.daysRemaining, deadline.status)}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {criticalDeadlines.length >= 10 && (
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => router.push('/cases')}>
            View {deadlines.length - 10} more deadlines →
          </Button>
        </div>
      )}
    </Card>
  )
}


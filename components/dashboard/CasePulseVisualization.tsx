'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Clock, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export interface CasePulseData {
  id: string
  title: string
  daysSinceActivity: number
  caseValue: number
  status: 'fresh' | 'stalled' | 'critical'
  clientName?: string
  lastActivity?: string
}

interface CasePulseVisualizationProps {
  cases: CasePulseData[]
  onCaseClick?: (caseId: string) => void
  className?: string
}

export function CasePulseVisualization({
  cases,
  onCaseClick,
  className,
}: CasePulseVisualizationProps) {
  const router = useRouter()
  
  const getStatusColor = (status: CasePulseData['status'], days: number) => {
    if (status === 'critical' || days >= 120) {
      return {
        bg: 'bg-white/50 dark:bg-white/5',
        border: 'border-l-4 border-l-living-coral',
        text: 'text-living-coral',
        badgeVariant: 'destructive' as const,
        pulse: 'animate-pulse-slow',
      }
    }
    if (status === 'stalled' || days >= 90) {
      return {
        bg: 'bg-white/50 dark:bg-white/5',
        border: 'border-l-4 border-l-orange-500',
        text: 'text-orange-500',
        badgeVariant: 'warning' as const,
        pulse: '',
      }
    }
    if (days >= 60) {
      return {
        bg: 'bg-white/50 dark:bg-white/5',
        border: 'border-l-4 border-l-yellow-500',
        text: 'text-yellow-500',
        badgeVariant: 'warning' as const,
        pulse: '',
      }
    }
    return {
      bg: 'bg-white/50 dark:bg-white/5',
      border: 'border-l-4 border-l-electric-teal',
      text: 'text-electric-teal',
      badgeVariant: 'default' as const,
      pulse: '',
    }
  }

  const getStatusLabel = (status: CasePulseData['status'], days: number) => {
    if (status === 'critical' || days >= 120) return 'Critical'
    if (status === 'stalled' || days >= 90) return 'Stalled'
    if (days >= 60) return 'Warning'
    return 'Active'
  }

  // Sort cases by urgency (critical first, then by days)
  const sortedCases = [...cases].sort((a, b) => {
    if (a.status === 'critical' && b.status !== 'critical') return -1
    if (b.status === 'critical' && a.status !== 'critical') return 1
    return b.daysSinceActivity - a.daysSinceActivity
  })

  const criticalCases = cases.filter((c) => c.status === 'critical' || c.daysSinceActivity >= 120)
  const stalledCases = cases.filter((c) => c.status === 'stalled' || c.daysSinceActivity >= 90)
  const totalValue = cases.reduce((sum, c) => sum + c.caseValue, 0)

  const handleCaseClick = (caseId: string) => {
    if (onCaseClick) {
      onCaseClick(caseId)
    } else {
      router.push(`/cases?id=${caseId}`)
    }
  }

  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor">
            Case Health Monitor
          </h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/cases')}>
            View All →
          </Button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Monitor case activity and identify cases requiring immediate attention
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-living-coral/10 border border-living-coral/30"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-living-coral" />
            <span className="text-2xl font-bold text-living-coral">
              {criticalCases.length}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Critical Cases</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30"
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-2xl font-bold text-orange-500">
              {stalledCases.length}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Stalled Cases</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-lg bg-electric-teal/10 border border-electric-teal/30"
        >
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-electric-teal" />
            <span className="text-2xl font-bold text-electric-teal">
              ${(totalValue / 1000000).toFixed(1)}M
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Pipeline Value</p>
        </motion.div>
      </div>

      {/* Case List */}
      <div className="space-y-3 max-h-96 overflow-y-auto immersive-scroll">
        {sortedCases.slice(0, 10).map((caseItem, index) => {
          const colors = getStatusColor(caseItem.status, caseItem.daysSinceActivity)
          const statusLabel = getStatusLabel(caseItem.status, caseItem.daysSinceActivity)

          return (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleCaseClick(caseItem.id)}
              className={cn(
                'p-4 rounded-r-lg cursor-pointer transition-all duration-200',
                colors.bg,
                colors.border,
                'hover:shadow-md hover:bg-white/80 dark:hover:bg-white/10',
                colors.pulse && 'ring-1 ring-living-coral/50'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-deep-indigo dark:text-vapor truncate">
                      {caseItem.title}
                    </h3>
                    <Badge variant={colors.badgeVariant}>
                      {statusLabel}
                    </Badge>
                  </div>
                  {caseItem.clientName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {caseItem.clientName}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {caseItem.daysSinceActivity} days ago
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${caseItem.caseValue.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex items-center">
                  {caseItem.status === 'critical' || caseItem.daysSinceActivity >= 120 ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 rounded-full bg-living-coral"
                    />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {cases.length > 10 && (
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => router.push('/cases')}>
            View {cases.length - 10} more cases →
          </Button>
        </div>
      )}
    </Card>
  )
}

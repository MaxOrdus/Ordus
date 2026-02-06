'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Phone, Mail, Calendar } from 'lucide-react'
import { detectTreatmentGaps } from '@/lib/workflow-engine'
import { PICase, MedicalProvider } from '@/types/pi-case'
import { Task } from '@/types/tasks'
import { useAuth } from '@/components/auth/AuthProvider'

interface TreatmentGapAlertsProps {
  cases: PICase[]
}

export function TreatmentGapAlerts({ cases }: TreatmentGapAlertsProps) {
  const { user } = useAuth()
  const [gapTasks, setGapTasks] = React.useState<Task[]>([])

  React.useEffect(() => {
    if (!user) return

    const allGapTasks: Task[] = []
    
    for (const caseData of cases) {
      const gaps = detectTreatmentGaps(
        caseData.medicalProviders,
        caseData.id,
        caseData.title,
        user.id,
        14 // 14-day threshold
      )
      allGapTasks.push(...gaps)
    }

    setGapTasks(allGapTasks.sort((a, b) => {
      // Sort by priority and days
      const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }))
  }, [cases, user])

  if (gapTasks.length === 0) {
    return null
  }

  return (
    <Card variant="glass" className="border-l-4 border-l-living-coral">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-living-coral">
          <AlertTriangle className="w-5 h-5" />
          Treatment Gap Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gapTasks.slice(0, 5).map((task) => {
            const gapDays = task.metadata?.gapDays || 0
            return (
              <div
                key={task.id}
                className="flex items-start justify-between p-3 bg-living-coral/5 rounded-lg border border-living-coral/20"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    {task.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {gapDays} days gap
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {task.metadata?.providerName}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => alert('Call client functionality coming soon')}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => alert('Email client functionality coming soon')}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
            )
          })}
          {gapTasks.length > 5 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
              +{gapTasks.length - 5} more gap alerts
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


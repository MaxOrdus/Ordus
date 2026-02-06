'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Clock, CheckCircle2 } from 'lucide-react'
import { generateEmailReminders, EmailReminder } from '@/lib/workflow-engine'
import { Deadline } from '@/types/pi-case'
import { useAuth } from '@/components/auth/AuthProvider'

interface EmailRemindersProps {
  deadlines: Deadline[]
  caseTitle: string
}

export function EmailReminders({ deadlines, caseTitle }: EmailRemindersProps) {
  const { user } = useAuth()
  const [reminders, setReminders] = React.useState<EmailReminder[]>([])

  React.useEffect(() => {
    if (!user) return

    const email = user.email
    const allReminders = generateEmailReminders(deadlines, caseTitle, email)
    
    // Filter to only show upcoming reminders (not sent yet)
    const upcomingReminders = allReminders
      .filter((r) => !r.sent && new Date(r.scheduledDate) >= new Date())
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())

    setReminders(upcomingReminders.slice(0, 5))
  }, [deadlines, caseTitle, user])

  if (reminders.length === 0) {
    return null
  }

  return (
    <Card variant="glass" className="border-l-4 border-l-electric-teal">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-electric-teal">
          <Mail className="w-5 h-5" />
          Scheduled Email Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reminders.map((reminder) => {
            const scheduledDate = new Date(reminder.scheduledDate)
            const daysUntil = Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            
            return (
              <div
                key={reminder.id}
                className="flex items-start justify-between p-3 bg-electric-teal/5 rounded-lg border border-electric-teal/20"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    {reminder.subject}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {reminder.body.split('\n')[0]}
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {daysUntil === 0 ? 'Today' : `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {scheduledDate.toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
                <div className="ml-4">
                  {reminder.sent ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Mail className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


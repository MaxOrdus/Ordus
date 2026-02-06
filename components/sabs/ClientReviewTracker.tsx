'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Check, Clock, Calendar, Plus, CalendarClock, Loader2 } from 'lucide-react'
import { PICase } from '@/types/pi-case'
import { getCaseTracking, addReviewEntry, scheduleNextReview, ReviewEntry } from '@/lib/db/case-tracking'
import { createTask } from '@/lib/db/tasks'
import { useAuth } from '@/components/auth/AuthProvider'

interface ClientReviewTrackerProps {
  caseData: PICase
  onSave?: (data: ReviewTrackerData) => void
}

interface ReviewTrackerData {
  lastReviewDate: string | null
  nextReviewDate: string | null
  entries: ReviewEntry[]
}

/**
 * Client Review & Update Tracker Component
 * Tracks when client reviews were done and schedules next review
 */
export function ClientReviewTracker({ caseData, onSave }: ClientReviewTrackerProps) {
  const { user } = useAuth()
  const [data, setData] = React.useState<ReviewTrackerData>({
    lastReviewDate: null,
    nextReviewDate: null,
    entries: []
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const [showAddEntry, setShowAddEntry] = React.useState(false)
  const [showSchedule, setShowSchedule] = React.useState(false)
  const [newEntry, setNewEntry] = React.useState({
    reviewDate: new Date().toISOString().split('T')[0],
    conductedBy: '',
    notes: ''
  })
  const [scheduledDate, setScheduledDate] = React.useState('')

  // Load data from database on mount
  React.useEffect(() => {
    async function loadTracking() {
      try {
        const tracking = await getCaseTracking(caseData.id)
        setData({
          lastReviewDate: tracking.lastReviewDate,
          nextReviewDate: tracking.nextReviewDate,
          entries: tracking.reviewEntries
        })
      } catch (err) {
        console.error('Failed to load case tracking:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadTracking()
  }, [caseData.id])

  const handleAddReview = async () => {
    if (!newEntry.conductedBy.trim()) {
      alert('Please enter who conducted the review')
      return
    }

    setIsSaving(true)
    try {
      const tracking = await addReviewEntry(caseData.id, {
        reviewDate: newEntry.reviewDate,
        conductedBy: newEntry.conductedBy.trim(),
        notes: newEntry.notes.trim() || undefined
      })

      const updatedData = {
        lastReviewDate: tracking.lastReviewDate,
        nextReviewDate: tracking.nextReviewDate,
        entries: tracking.reviewEntries
      }

      setData(updatedData)
      setShowAddEntry(false)
      setNewEntry({
        reviewDate: new Date().toISOString().split('T')[0],
        conductedBy: '',
        notes: ''
      })

      if (onSave) {
        onSave(updatedData)
      }
    } catch (err) {
      console.error('Failed to save review entry:', err)
      alert('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleScheduleNext = async () => {
    if (!scheduledDate) {
      alert('Please select a date')
      return
    }

    setIsSaving(true)
    try {
      // Save to case tracking
      const tracking = await scheduleNextReview(caseData.id, scheduledDate)

      // Create a task for the follow-up (don't fail if task creation fails)
      if (user?.id) {
        try {
          await createTask({
            caseId: caseData.id,
            title: `Client Review Follow-up: ${caseData.title}`,
            description: 'Scheduled client review and update meeting',
            dueDate: scheduledDate,
            status: 'Pending',
            priority: 'Medium',
            category: 'Client Communication',
            assignedTo: 'Lawyer',
            createdBy: user.id,
          })
        } catch (taskErr) {
          console.error('Failed to create task (non-blocking):', taskErr)
          // Continue anyway - the schedule date was saved
        }
      }

      const updatedData = {
        ...data,
        nextReviewDate: tracking.nextReviewDate
      }

      setData(updatedData)
      setShowSchedule(false)
      setScheduledDate('')

      if (onSave) {
        onSave(updatedData)
      }
    } catch (err) {
      console.error('Failed to schedule next review:', err)
      alert('Failed to schedule. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = () => {
    if (!data.nextReviewDate) return false
    return new Date(data.nextReviewDate) < new Date()
  }

  const getDaysSinceLastReview = () => {
    if (!data.lastReviewDate) return null
    const days = Math.floor((Date.now() - new Date(data.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const daysSince = getDaysSinceLastReview()

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-electric-teal" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-electric-teal" />
            <CardTitle>Client Review & Update</CardTitle>
          </div>
          {data.entries.length > 0 ? (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
              <Check className="w-4 h-4" />
              {data.entries.length} Review{data.entries.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
              <Clock className="w-4 h-4" />
              No reviews yet
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Track regular client check-ins and schedule follow-ups
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Review</div>
            {data.lastReviewDate ? (
              <>
                <div className="font-medium text-gray-900 dark:text-white">{formatDate(data.lastReviewDate)}</div>
                {daysSince !== null && (
                  <div className={`text-xs mt-1 ${daysSince > 30 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {daysSince} days ago
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">Not yet done</div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${
            isOverdue()
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-gray-50 dark:bg-gray-800/50'
          }`}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next Review</div>
            {data.nextReviewDate ? (
              <>
                <div className={`font-medium ${isOverdue() ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {formatDate(data.nextReviewDate)}
                </div>
                {isOverdue() && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">Overdue!</div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">Not scheduled</div>
            )}
          </div>
        </div>

        {/* Review History */}
        {data.entries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Review History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...data.entries].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">{entry.conductedBy}</span>
                      <span className="text-gray-500">•</span>
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">{formatDate(entry.reviewDate)}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Review Form */}
        {showAddEntry ? (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Record Client Review</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Reviewed By"
                placeholder="Your name"
                value={newEntry.conductedBy}
                onChange={(e) => setNewEntry({ ...newEntry, conductedBy: e.target.value })}
              />
              <Input
                label="Review Date"
                type="date"
                value={newEntry.reviewDate}
                onChange={(e) => setNewEntry({ ...newEntry, reviewDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                rows={2}
                placeholder="Key updates from the review..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddReview} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Save Review
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddEntry(false)} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : showSchedule ? (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule Next Review</h4>
            <Input
              label="Next Review Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500">A task will be created to remind you of this review.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleScheduleNext} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <CalendarClock className="w-4 h-4 mr-1" />
                )}
                Schedule
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSchedule(false)} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowAddEntry(true)} className="flex-1">
              <Plus className="w-4 h-4 mr-1" />
              Record Review
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSchedule(true)} className="flex-1">
              <CalendarClock className="w-4 h-4 mr-1" />
              Schedule Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

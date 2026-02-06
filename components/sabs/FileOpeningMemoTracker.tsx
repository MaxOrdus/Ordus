'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Check, Clock, Calendar, User, Plus, Loader2 } from 'lucide-react'
import { PICase } from '@/types/pi-case'
import { getCaseTracking, addOpeningMemoEntry, MemoEntry } from '@/lib/db/case-tracking'

interface FileOpeningMemoTrackerProps {
  caseData: PICase
  onSave?: (data: MemoTrackerData) => void
}

interface MemoTrackerData {
  isCompleted: boolean
  entries: MemoEntry[]
}

/**
 * File Opening Memo Tracker Component
 * Tracks completion status of the client opening memo
 */
export function FileOpeningMemoTracker({ caseData, onSave }: FileOpeningMemoTrackerProps) {
  const [data, setData] = React.useState<MemoTrackerData>({
    isCompleted: false,
    entries: []
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const [showAddEntry, setShowAddEntry] = React.useState(false)
  const [newEntry, setNewEntry] = React.useState({
    completedDate: new Date().toISOString().split('T')[0],
    completedBy: '',
    notes: ''
  })

  // Load data from database on mount
  React.useEffect(() => {
    async function loadTracking() {
      try {
        const tracking = await getCaseTracking(caseData.id)
        setData({
          isCompleted: tracking.openingMemoCompleted,
          entries: tracking.openingMemoEntries
        })
      } catch (err) {
        console.error('Failed to load case tracking:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadTracking()
  }, [caseData.id])

  const handleMarkComplete = async () => {
    if (!newEntry.completedBy.trim()) {
      alert('Please enter who completed the memo')
      return
    }

    setIsSaving(true)
    try {
      const tracking = await addOpeningMemoEntry(caseData.id, {
        completedDate: newEntry.completedDate,
        completedBy: newEntry.completedBy.trim(),
        notes: newEntry.notes.trim() || undefined
      })

      const updatedData = {
        isCompleted: tracking.openingMemoCompleted,
        entries: tracking.openingMemoEntries
      }

      setData(updatedData)
      setShowAddEntry(false)
      setNewEntry({
        completedDate: new Date().toISOString().split('T')[0],
        completedBy: '',
        notes: ''
      })

      if (onSave) {
        onSave(updatedData)
      }
    } catch (err) {
      console.error('Failed to save opening memo entry:', err)
      alert('Failed to save. Please try again.')
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
            <FileText className="w-5 h-5 text-electric-teal" />
            <CardTitle>Client Opening Memo</CardTitle>
          </div>
          {data.isCompleted ? (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
              <Check className="w-4 h-4" />
              Completed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
              <Clock className="w-4 h-4" />
              Pending
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Track completion of the initial client meeting and opening memo
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* History of completions */}
        {data.entries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion History</h4>
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">{entry.completedBy}</span>
                      <span className="text-gray-500">•</span>
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">{formatDate(entry.completedDate)}</span>
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

        {/* Mark as complete form */}
        {showAddEntry ? (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as Completed</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Completed By"
                placeholder="Your name"
                value={newEntry.completedBy}
                onChange={(e) => setNewEntry({ ...newEntry, completedBy: e.target.value })}
              />
              <Input
                label="Date Completed"
                type="date"
                value={newEntry.completedDate}
                onChange={(e) => setNewEntry({ ...newEntry, completedDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                rows={2}
                placeholder="Any notes about the meeting..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleMarkComplete} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Confirm Complete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddEntry(false)} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant={data.isCompleted ? "ghost" : "primary"}
            size="sm"
            onClick={() => setShowAddEntry(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            {data.isCompleted ? 'Record Another Entry' : 'Mark as Completed'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

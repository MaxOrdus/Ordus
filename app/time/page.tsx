'use client'

import * as React from 'react'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BillableStreak } from '@/components/dashboard/BillableStreak'
import { Clock, Play, Pause, Square, Save, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  getTimeEntries,
  createTimeEntry,
  getWeeklyTimeStats,
  TimeEntry
} from '@/lib/db/time-entries'
import { getCases } from '@/lib/db/cases'
import { PICase } from '@/types/pi-case'

export default function TimePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const [isTimerRunning, setIsTimerRunning] = React.useState(false)
  const [elapsedTime, setElapsedTime] = React.useState(0)
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([])
  const [cases, setCases] = React.useState<PICase[]>([])
  const [selectedCaseId, setSelectedCaseId] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [rate, setRate] = React.useState(300)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [weeklyStats, setWeeklyStats] = React.useState({ weeklyTotal: 0, streakDays: 0 })

  // Load initial data
  React.useEffect(() => {
    async function loadData() {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const [entriesData, casesData, stats] = await Promise.all([
          getTimeEntries({ userId: user.id, limit: 10 }),
          getCases(),
          getWeeklyTimeStats(user.id)
        ])
        setTimeEntries(entriesData)
        setCases(casesData)
        setWeeklyStats(stats)
      } catch (error) {
        console.error('Failed to load time data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const hours = elapsedTime / 3600

  const handleSaveEntry = async () => {
    if (!user?.firmId || !user?.id || !description || hours <= 0) {
      return
    }

    setIsSaving(true)
    try {
      const newEntry = await createTimeEntry({
        firmId: user.firmId,
        caseId: selectedCaseId || null,
        userId: user.id,
        description,
        hours: parseFloat(hours.toFixed(2)),
        date: new Date().toISOString().split('T')[0],
        billable: true,
        rate,
      })

      // Update local state
      setTimeEntries([newEntry, ...timeEntries])
      setElapsedTime(0)
      setSelectedCaseId('')
      setDescription('')

      // Refresh weekly stats
      const stats = await getWeeklyTimeStats(user.id)
      setWeeklyStats(stats)
    } catch (error) {
      console.error('Failed to save time entry:', error)
      alert('Failed to save time entry. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const formatEntryDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail activeItem="time" onItemClick={(id) => {
        if (id === 'time') return
        router.push(id === 'dashboard' ? '/' : `/${id}`)
      }} />

      <main className="flex-1 ml-20 overflow-y-auto">
        <div className="container mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
                Time Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track billable hours and maintain your streak
              </p>
            </div>
            <Button variant="ghost" onClick={() => router.push('/cases')}>
              View Cases →
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-electric-teal" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Timer Card */}
              <div className="lg:col-span-2 space-y-6">
                <Card variant="glass" className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-4">
                      Active Timer
                    </h2>
                    <div className="text-6xl font-mono font-bold text-electric-teal mb-6">
                      {formatTime(elapsedTime)}
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      {!isTimerRunning ? (
                        <Button
                          size="lg"
                          onClick={() => setIsTimerRunning(true)}
                          className="flex items-center gap-2"
                        >
                          <Play className="w-5 h-5" />
                          Start Timer
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="lg"
                            variant="secondary"
                            onClick={() => setIsTimerRunning(false)}
                            className="flex items-center gap-2"
                          >
                            <Pause className="w-5 h-5" />
                            Pause
                          </Button>
                          <Button
                            size="lg"
                            variant="accent"
                            onClick={() => {
                              setIsTimerRunning(false)
                              setElapsedTime(0)
                            }}
                            className="flex items-center gap-2"
                          >
                            <Square className="w-5 h-5" />
                            Stop
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="font-semibold mb-4">Log Time Entry</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Case (Optional)
                        </label>
                        <select
                          value={selectedCaseId}
                          onChange={(e) => setSelectedCaseId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-deep-indigo dark:text-vapor"
                        >
                          <option value="">No case selected</option>
                          {cases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Description"
                        placeholder="Brief description of work..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Hours"
                          type="number"
                          step="0.25"
                          value={hours.toFixed(2)}
                          onChange={(e) => setElapsedTime(parseFloat(e.target.value) * 3600)}
                        />
                        <Input
                          label="Rate ($)"
                          type="number"
                          value={rate}
                          onChange={(e) => setRate(parseFloat(e.target.value))}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleSaveEntry}
                        disabled={isSaving || !description || hours <= 0}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Time Entry'}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Recent Entries */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Recent Time Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timeEntries.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No time entries yet. Start the timer to track your work!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {timeEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-deep-indigo/30"
                          >
                            <div>
                              <p className="font-medium text-deep-indigo dark:text-vapor">
                                {entry.caseName || 'No case assigned'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {entry.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-electric-teal">{entry.hours}h</p>
                              <p className="text-xs text-gray-500">{formatEntryDate(entry.date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Streak Widget */}
              <div>
                <BillableStreak
                  currentStreak={weeklyStats.streakDays}
                  dailyTarget={8}
                  currentHours={hours}
                  weeklyTotal={weeklyStats.weeklyTotal}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  )
}

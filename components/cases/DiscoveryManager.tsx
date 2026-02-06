'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSearch,
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Users,
  MapPin,
  Edit2,
  X
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TortClaim, DiscoveryAttempt } from '@/types/pi-case'
import { cn } from '@/lib/utils'

interface DiscoveryManagerProps {
  caseId: string
  tort: TortClaim
  onUpdateTort: (updates: Partial<TortClaim>) => Promise<void>
  className?: string
}

const ATTEMPT_STATUSES: DiscoveryAttempt['status'][] = [
  'Scheduled',
  'Completed',
  'Cancelled',
  'Adjourned',
  'Refused'
]

const ATTEMPT_TYPES: DiscoveryAttempt['type'][] = ['Plaintiff', 'Defendant']

export function DiscoveryManager({
  caseId,
  tort,
  onUpdateTort,
  className,
}: DiscoveryManagerProps) {
  const [isAddingAttempt, setIsAddingAttempt] = React.useState(false)
  const [editingAttemptId, setEditingAttemptId] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form state for new attempt
  const [newAttempt, setNewAttempt] = React.useState<Omit<DiscoveryAttempt, 'id' | 'createdAt'>>({
    type: 'Plaintiff',
    scheduledDate: '',
    status: 'Scheduled',
    location: '',
    reporter: '',
    reason: '',
    notes: '',
  })

  const resetForm = () => {
    setNewAttempt({
      type: 'Plaintiff',
      scheduledDate: '',
      status: 'Scheduled',
      location: '',
      reporter: '',
      reason: '',
      notes: '',
    })
    setIsAddingAttempt(false)
    setEditingAttemptId(null)
  }

  const handleAddAttempt = async () => {
    if (!newAttempt.scheduledDate) return

    setIsSubmitting(true)
    try {
      const attempt: DiscoveryAttempt = {
        id: crypto.randomUUID(),
        ...newAttempt,
        createdAt: new Date().toISOString(),
      }

      const existingAttempts = tort.discoveryAttempts || []
      await onUpdateTort({
        discoveryAttempts: [...existingAttempts, attempt],
      })
      resetForm()
    } catch (err) {
      console.error('Failed to add discovery attempt:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAttemptStatus = async (attemptId: string, status: DiscoveryAttempt['status']) => {
    const existingAttempts = tort.discoveryAttempts || []
    const updatedAttempts = existingAttempts.map(a =>
      a.id === attemptId ? { ...a, status } : a
    )

    // If marking as completed, update the corresponding exam date
    const attempt = existingAttempts.find(a => a.id === attemptId)
    if (attempt && status === 'Completed') {
      const updates: Partial<TortClaim> = {
        discoveryAttempts: updatedAttempts,
      }
      if (attempt.type === 'Plaintiff') {
        updates.plaintiffExamDate = attempt.scheduledDate
        updates.plaintiffExamCompleted = true
      } else {
        updates.defendantExamDate = attempt.scheduledDate
        updates.defendantExamCompleted = true
      }
      await onUpdateTort(updates)
    } else {
      await onUpdateTort({ discoveryAttempts: updatedAttempts })
    }
  }

  const handleDeleteAttempt = async (attemptId: string) => {
    const existingAttempts = tort.discoveryAttempts || []
    await onUpdateTort({
      discoveryAttempts: existingAttempts.filter(a => a.id !== attemptId),
    })
  }

  const getStatusIcon = (status: DiscoveryAttempt['status']) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'Scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'Cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />
      case 'Adjourned':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'Refused':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: DiscoveryAttempt['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500'
      case 'Scheduled':
        return 'bg-blue-500'
      case 'Cancelled':
        return 'bg-gray-500'
      case 'Adjourned':
        return 'bg-yellow-500'
      case 'Refused':
        return 'bg-red-500'
    }
  }

  const attempts = tort.discoveryAttempts || []
  const plaintiffAttempts = attempts.filter(a => a.type === 'Plaintiff')
  const defendantAttempts = attempts.filter(a => a.type === 'Defendant')

  const plaintiffCompleted = plaintiffAttempts.some(a => a.status === 'Completed')
  const defendantCompleted = defendantAttempts.some(a => a.status === 'Completed')

  return (
    <Card variant="glass" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-purple-500" />
            Discovery & Examinations
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsAddingAttempt(true)}
            disabled={isAddingAttempt}
          >
            <Plus className="w-4 h-4 mr-1" />
            Schedule Exam
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={cn(
            'p-4 rounded-lg border-2 transition-all',
            plaintiffCompleted
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-deep-indigo dark:text-vapor">Plaintiff Examination</span>
              {plaintiffCompleted && (
                <Badge className="bg-green-500 ml-auto">Completed</Badge>
              )}
            </div>
            {tort.plaintiffExamDate ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {plaintiffCompleted ? 'Completed' : 'Scheduled'}: {new Date(tort.plaintiffExamDate).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Not scheduled</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {plaintiffAttempts.length} attempt{plaintiffAttempts.length !== 1 ? 's' : ''} recorded
            </p>
          </div>

          <div className={cn(
            'p-4 rounded-lg border-2 transition-all',
            defendantCompleted
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="font-semibold text-deep-indigo dark:text-vapor">Defendant Examination</span>
              {defendantCompleted && (
                <Badge className="bg-green-500 ml-auto">Completed</Badge>
              )}
            </div>
            {tort.defendantExamDate ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {defendantCompleted ? 'Completed' : 'Scheduled'}: {new Date(tort.defendantExamDate).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Not scheduled</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {defendantAttempts.length} attempt{defendantAttempts.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>

        {/* Add New Attempt Form */}
        <AnimatePresence>
          {isAddingAttempt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-deep-indigo dark:text-vapor">Schedule Examination</h4>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Examination Type"
                  value={newAttempt.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAttempt(prev => ({ ...prev, type: e.target.value as DiscoveryAttempt['type'] }))}
                  options={ATTEMPT_TYPES.map(t => ({ value: t, label: `${t} Examination` }))}
                />
                <Input
                  label="Scheduled Date"
                  type="date"
                  value={newAttempt.scheduledDate}
                  onChange={(e) => setNewAttempt(prev => ({ ...prev, scheduledDate: e.target.value }))}
                />
                <Input
                  label="Location"
                  placeholder="e.g., Our office, Defense counsel office"
                  value={newAttempt.location || ''}
                  onChange={(e) => setNewAttempt(prev => ({ ...prev, location: e.target.value }))}
                />
                <Input
                  label="Court Reporter"
                  placeholder="Reporter name"
                  value={newAttempt.reporter || ''}
                  onChange={(e) => setNewAttempt(prev => ({ ...prev, reporter: e.target.value }))}
                />
                <div className="col-span-2">
                  <Input
                    label="Notes"
                    placeholder="Any additional notes..."
                    value={newAttempt.notes || ''}
                    onChange={(e) => setNewAttempt(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAttempt}
                  disabled={!newAttempt.scheduledDate || isSubmitting}
                >
                  {isSubmitting ? 'Scheduling...' : 'Schedule Examination'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attempts History */}
        {attempts.length === 0 && !isAddingAttempt ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No examination attempts recorded</p>
            <p className="text-sm">Schedule examinations to track discovery progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-semibold text-deep-indigo dark:text-vapor mb-2">
              Examination History
            </h4>
            {attempts.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map((attempt) => (
              <motion.div
                key={attempt.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  attempt.status === 'Completed'
                    ? 'bg-green-500/10 border-green-500/30'
                    : attempt.status === 'Scheduled'
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : attempt.status === 'Refused'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {attempt.type === 'Plaintiff' ? (
                        <User className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Users className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="font-semibold text-deep-indigo dark:text-vapor">
                        {attempt.type} Examination
                      </span>
                      <Badge className={cn('text-xs text-white', getStatusColor(attempt.status))}>
                        {getStatusIcon(attempt.status)}
                        <span className="ml-1">{attempt.status}</span>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(attempt.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      {attempt.location && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{attempt.location}</span>
                        </div>
                      )}
                    </div>

                    {attempt.reporter && (
                      <p className="text-xs text-gray-500 mt-1">
                        Reporter: {attempt.reporter}
                      </p>
                    )}

                    {attempt.reason && (
                      <p className="text-xs text-living-coral mt-1">
                        Reason: {attempt.reason}
                      </p>
                    )}

                    {attempt.notes && (
                      <p className="text-xs text-gray-500 mt-1">
                        Notes: {attempt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {attempt.status === 'Scheduled' && (
                      <>
                        <Select
                          value={attempt.status}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateAttemptStatus(attempt.id, e.target.value as DiscoveryAttempt['status'])}
                          options={ATTEMPT_STATUSES.map(s => ({ value: s, label: s }))}
                          className="w-32"
                        />
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAttempt(attempt.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Discovery Status Summary */}
        {(plaintiffCompleted || defendantCompleted) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Discovery Progress
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((plaintiffCompleted ? 1 : 0) + (defendantCompleted ? 1 : 0)) * 50}%`
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="font-semibold text-green-500">
                  {((plaintiffCompleted ? 1 : 0) + (defendantCompleted ? 1 : 0))}/2
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

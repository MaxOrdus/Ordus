'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Calendar, FileText, CheckCircle, AlertCircle, Clock, Gavel, Scale, Trophy, XCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TortClaim, TrialOutcome } from '@/types/pi-case'
import { generatePreTrialBriefDeadline } from '@/lib/timeline-calculator'
import { cn } from '@/lib/utils'

interface PreTrialManagerProps {
  caseId: string
  tort: TortClaim
  onUpdateTort?: (updates: Partial<TortClaim>) => void
  className?: string
}

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  category: 'Pleadings' | 'Discovery' | 'Experts' | 'Evidence' | 'Settlement' | 'Other'
}

const TRIAL_OUTCOMES: TrialOutcome['result'][] = [
  'Plaintiff Verdict',
  'Defense Verdict',
  'Settled at Trial',
  'Mistrial',
  'Dismissed',
]

const APPEAL_STATUSES: NonNullable<TrialOutcome['appealStatus']>[] = [
  'Pending',
  'Allowed',
  'Dismissed',
  'Settled',
]

export function PreTrialManager({ caseId, tort, onUpdateTort, className }: PreTrialManagerProps) {
  // Initialize checklist from persisted progress or defaults
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>(() => {
    const progress = tort.preTrialChecklistProgress || {}
    return [
      { id: 'stmt-claim-served', label: 'Statement of Claim served', completed: progress['stmt-claim-served'] ?? !!tort.statementOfClaimServed, category: 'Pleadings' },
      { id: 'stmt-defense-received', label: 'Statement of Defense received', completed: progress['stmt-defense-received'] ?? !!tort.statementOfDefenseReceived, category: 'Pleadings' },
      { id: 'discovery-completed', label: 'Discovery completed', completed: progress['discovery-completed'] ?? tort.discoveryCompleted, category: 'Discovery' },
      { id: 'undertakings-answered', label: 'All undertakings answered', completed: progress['undertakings-answered'] ?? false, category: 'Discovery' },
      { id: 'aod-served', label: 'Affidavit of Documents served', completed: progress['aod-served'] ?? !!tort.aodServed, category: 'Evidence' },
      { id: 'expert-reports-served', label: 'Expert reports served (90 days)', completed: progress['expert-reports-served'] ?? false, category: 'Experts' },
      { id: 'pretrial-brief-filed', label: 'Pre-Trial brief filed', completed: progress['pretrial-brief-filed'] ?? (tort.preTrialBriefFiled || false), category: 'Other' },
      { id: 'trial-record-served', label: 'Trial Record served', completed: progress['trial-record-served'] ?? !!tort.trialRecordServed, category: 'Other' },
    ]
  })

  // Trial outcome state
  const [showOutcomeForm, setShowOutcomeForm] = React.useState(false)
  const [trialOutcome, setTrialOutcome] = React.useState<TrialOutcome>(
    tort.trialOutcome || {
      result: 'Plaintiff Verdict',
      judgmentAmount: 0,
      costsAwarded: 0,
      interestAwarded: 0,
    }
  )

  const preTrialBriefDeadline = React.useMemo(() => {
    if (tort.preTrialDate) {
      return generatePreTrialBriefDeadline(tort.preTrialDate, caseId)
    }
    return null
  }, [tort.preTrialDate, caseId])

  const completionPercentage = React.useMemo(() => {
    const completed = checklist.filter((item) => item.completed).length
    return (completed / checklist.length) * 100
  }, [checklist])

  // Persist checklist changes to database
  const toggleChecklistItem = React.useCallback((id: string) => {
    setChecklist((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))

      // Create progress map and persist
      const progress: Record<string, boolean> = {}
      updated.forEach(item => {
        progress[item.id] = item.completed
      })

      // Persist to database
      if (onUpdateTort) {
        onUpdateTort({ preTrialChecklistProgress: progress })
      }

      return updated
    })
  }, [onUpdateTort])

  const getCategoryColor = (category: ChecklistItem['category']) => {
    switch (category) {
      case 'Pleadings':
        return 'bg-violet-500/20 text-violet-500'
      case 'Discovery':
        return 'bg-electric-teal/20 text-electric-teal'
      case 'Experts':
        return 'bg-blue-500/20 text-blue-500'
      case 'Evidence':
        return 'bg-green-500/20 text-green-500'
      case 'Settlement':
        return 'bg-yellow-500/20 text-yellow-500'
      default:
        return 'bg-gray-500/20 text-gray-500'
    }
  }

  const handleSaveOutcome = () => {
    if (onUpdateTort) {
      // Calculate total judgment
      const total = (trialOutcome.judgmentAmount || 0) +
                   (trialOutcome.costsAwarded || 0) +
                   (trialOutcome.interestAwarded || 0)

      onUpdateTort({
        trialOutcome: {
          ...trialOutcome,
          totalJudgment: total,
        }
      })
      setShowOutcomeForm(false)
    }
  }

  const getOutcomeIcon = (result: TrialOutcome['result']) => {
    switch (result) {
      case 'Plaintiff Verdict':
        return <Trophy className="w-5 h-5 text-green-500" />
      case 'Defense Verdict':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'Settled at Trial':
        return <Scale className="w-5 h-5 text-blue-500" />
      case 'Mistrial':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'Dismissed':
        return <XCircle className="w-5 h-5 text-gray-500" />
      default:
        return <Gavel className="w-5 h-5" />
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Pre-Trial Status */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-electric-teal" />
            Pre-Trial & Trial Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Dates */}
          <div className="grid grid-cols-2 gap-4">
            {tort.preTrialDate && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-deep-indigo dark:text-vapor">Pre-Trial Date</span>
                </div>
                <p className="text-xl font-bold text-blue-500">
                  {new Date(tort.preTrialDate).toLocaleDateString()}
                </p>
                {preTrialBriefDeadline && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Brief due: {new Date(preTrialBriefDeadline.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            {tort.trialDate && (
              <div className="p-4 bg-living-coral/10 border border-living-coral/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Gavel className="w-4 h-4 text-living-coral" />
                  <span className="font-semibold text-deep-indigo dark:text-vapor">Trial Date</span>
                </div>
                <p className="text-xl font-bold text-living-coral">
                  {new Date(tort.trialDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {tort.trialRecordServed && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-deep-indigo dark:text-vapor">Set Down</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(tort.trialRecordServed).toLocaleDateString()}
                </p>
              </div>
            )}
            {tort.rule48DismissalDate && (
              <div className="p-4 bg-living-coral/10 border border-living-coral/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-living-coral" />
                  <span className="font-semibold text-deep-indigo dark:text-vapor">Rule 48 Deadline</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(tort.rule48DismissalDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Jury Notice Status */}
          <div className="p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-violet-500" />
                <span className="font-semibold text-deep-indigo dark:text-vapor">Jury Notice</span>
              </div>
              {tort.juryNoticeFiled ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">Filed</Badge>
                  {tort.juryNoticeDate && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      on {new Date(tort.juryNoticeDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Not Filed</Badge>
                  {onUpdateTort && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUpdateTort({
                        juryNoticeFiled: true,
                        juryNoticeDate: new Date().toISOString()
                      })}
                    >
                      Mark Filed
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pre-Trial Brief Status */}
          {tort.preTrialDate && (
            <div className="p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-electric-teal" />
                  <span className="font-semibold text-deep-indigo dark:text-vapor">Pre-Trial Brief</span>
                </div>
                {tort.preTrialBriefFiled ? (
                  <Badge className="bg-green-500">Filed</Badge>
                ) : (
                  <Badge variant="warning">Not Filed</Badge>
                )}
              </div>
              {preTrialBriefDeadline && !tort.preTrialBriefFiled && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Due: {new Date(preTrialBriefDeadline.dueDate).toLocaleDateString()}
                  </p>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      preTrialBriefDeadline.daysRemaining <= 7
                        ? 'text-living-coral'
                        : preTrialBriefDeadline.daysRemaining <= 14
                        ? 'text-orange-500'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {preTrialBriefDeadline.daysRemaining} days remaining
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trial Outcome (if trial date has passed or outcome exists) */}
      {(tort.trialOutcome || (tort.trialDate && new Date(tort.trialDate) <= new Date())) && (
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Trial Outcome
              </CardTitle>
              {!tort.trialOutcome && onUpdateTort && (
                <Button size="sm" onClick={() => setShowOutcomeForm(true)}>
                  Record Outcome
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {tort.trialOutcome ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg">
                  {getOutcomeIcon(tort.trialOutcome.result)}
                  <div>
                    <p className="font-bold text-lg text-deep-indigo dark:text-vapor">
                      {tort.trialOutcome.result}
                    </p>
                    {tort.trialOutcome.judgmentDate && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(tort.trialOutcome.judgmentDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {(tort.trialOutcome.result === 'Plaintiff Verdict' || tort.trialOutcome.result === 'Settled at Trial') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Judgment Amount</p>
                      <p className="text-xl font-bold text-green-500">
                        ${(tort.trialOutcome.judgmentAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Costs Awarded</p>
                      <p className="text-xl font-bold text-blue-500">
                        ${(tort.trialOutcome.costsAwarded || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-violet-500/10 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Interest</p>
                      <p className="text-xl font-bold text-violet-500">
                        ${(tort.trialOutcome.interestAwarded || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-electric-teal/10 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Judgment</p>
                      <p className="text-xl font-bold text-electric-teal">
                        ${(tort.trialOutcome.totalJudgment || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {tort.trialOutcome.appealFiled && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold text-deep-indigo dark:text-vapor">Appeal Filed</span>
                      {tort.trialOutcome.appealStatus && (
                        <Badge variant="outline">{tort.trialOutcome.appealStatus}</Badge>
                      )}
                    </div>
                    {tort.trialOutcome.appealDate && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Filed: {new Date(tort.trialOutcome.appealDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {tort.trialOutcome.notes && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{tort.trialOutcome.notes}</p>
                  </div>
                )}
              </div>
            ) : showOutcomeForm ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Outcome"
                    value={trialOutcome.result}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTrialOutcome(prev => ({ ...prev, result: e.target.value as TrialOutcome['result'] }))}
                    options={TRIAL_OUTCOMES.map(o => ({ value: o, label: o }))}
                  />
                  <Input
                    label="Judgment Date"
                    type="date"
                    value={trialOutcome.judgmentDate?.split('T')[0] || ''}
                    onChange={(e) => setTrialOutcome(prev => ({ ...prev, judgmentDate: e.target.value }))}
                  />
                </div>

                {(trialOutcome.result === 'Plaintiff Verdict' || trialOutcome.result === 'Settled at Trial') && (
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Judgment Amount"
                      type="number"
                      value={trialOutcome.judgmentAmount || ''}
                      onChange={(e) => setTrialOutcome(prev => ({ ...prev, judgmentAmount: parseFloat(e.target.value) || 0 }))}
                    />
                    <Input
                      label="Costs Awarded"
                      type="number"
                      value={trialOutcome.costsAwarded || ''}
                      onChange={(e) => setTrialOutcome(prev => ({ ...prev, costsAwarded: parseFloat(e.target.value) || 0 }))}
                    />
                    <Input
                      label="Interest Awarded"
                      type="number"
                      value={trialOutcome.interestAwarded || ''}
                      onChange={(e) => setTrialOutcome(prev => ({ ...prev, interestAwarded: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={trialOutcome.appealFiled || false}
                      onChange={(e) => setTrialOutcome(prev => ({ ...prev, appealFiled: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-deep-indigo dark:text-vapor">Appeal Filed</span>
                  </label>
                </div>

                {trialOutcome.appealFiled && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Appeal Date"
                      type="date"
                      value={trialOutcome.appealDate?.split('T')[0] || ''}
                      onChange={(e) => setTrialOutcome(prev => ({ ...prev, appealDate: e.target.value }))}
                    />
                    <Select
                      label="Appeal Status"
                      value={trialOutcome.appealStatus || 'Pending'}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTrialOutcome(prev => ({ ...prev, appealStatus: e.target.value as TrialOutcome['appealStatus'] }))}
                      options={APPEAL_STATUSES.map(s => ({ value: s, label: s }))}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowOutcomeForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveOutcome}>
                    Save Outcome
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Gavel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No trial outcome recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trial Prep Checklist */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trial Preparation Checklist</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-electric-teal"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-sm font-semibold text-electric-teal">
                {Math.round(completionPercentage)}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'p-3 rounded-lg border-2 flex items-center gap-3 cursor-pointer transition-all',
                  item.completed
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700 hover:border-electric-teal/50'
                )}
                onClick={() => toggleChecklistItem(item.id)}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="w-5 h-5 rounded border-gray-300 text-electric-teal focus:ring-electric-teal"
                />
                <span
                  className={cn(
                    'flex-1 text-sm',
                    item.completed
                      ? 'line-through text-gray-500'
                      : 'text-deep-indigo dark:text-vapor font-medium'
                  )}
                >
                  {item.label}
                </span>
                <Badge variant="outline" className={cn('text-xs', getCategoryColor(item.category))}>
                  {item.category}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {onUpdateTort && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {!tort.preTrialDate && (
                <div>
                  <Input
                    label="Set Pre-Trial Date"
                    type="date"
                    onChange={(e) => {
                      if (e.target.value && onUpdateTort) {
                        onUpdateTort({ preTrialDate: e.target.value })
                      }
                    }}
                  />
                </div>
              )}
              {!tort.trialDate && (
                <div>
                  <Input
                    label="Set Trial Date"
                    type="date"
                    onChange={(e) => {
                      if (e.target.value && onUpdateTort) {
                        onUpdateTort({ trialDate: e.target.value })
                      }
                    }}
                  />
                </div>
              )}
              {!tort.trialRecordServed && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (onUpdateTort) {
                      onUpdateTort({ trialRecordServed: new Date().toISOString() })
                    }
                  }}
                >
                  Mark Trial Record Served
                </Button>
              )}
              {!tort.preTrialBriefFiled && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (onUpdateTort) {
                      onUpdateTort({ preTrialBriefFiled: true })
                    }
                  }}
                >
                  Mark Brief Filed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { FileText, CheckCircle, Clock, AlertCircle, User, Calendar, Send, Plus, XCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ExpertReport } from '@/types/pi-case'
import { generateExpertReportDeadline } from '@/lib/timeline-calculator'
import { cn } from '@/lib/utils'

interface ExpertReportsManagerProps {
  caseId: string
  expertReports: ExpertReport[]
  preTrialDate?: string
  onAddExpert?: (expert: Omit<ExpertReport, 'id' | 'preTrialDeadline'>) => void
  onUpdateExpert?: (id: string, updates: Partial<ExpertReport>) => void
  className?: string
}

export function ExpertReportsManager({
  caseId,
  expertReports,
  preTrialDate,
  onAddExpert,
  onUpdateExpert,
  className,
}: ExpertReportsManagerProps) {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newExpert, setNewExpert] = React.useState({
    expertName: '',
    expertType: 'Orthopedic' as ExpertReport['expertType'],
    retainedDate: new Date().toISOString().split('T')[0],
  })

  const getStatusColor = (status: ExpertReport['status']) => {
    switch (status) {
      case 'Final Served':
        return 'text-green-500'
      case 'Draft Received':
        return 'text-blue-500'
      case 'Assessment Scheduled':
        return 'text-yellow-500'
      case 'Records Sent':
        return 'text-violet-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: ExpertReport['status']) => {
    switch (status) {
      case 'Final Served':
        return CheckCircle
      case 'Draft Received':
        return FileText
      case 'Assessment Scheduled':
        return Calendar
      case 'Records Sent':
        return Send
      default:
        return Clock
    }
  }

  const getStatusBadge = (status: ExpertReport['status']) => {
    switch (status) {
      case 'Final Served':
        return <Badge className="bg-green-500">Served</Badge>
      case 'Draft Received':
        return <Badge variant="default" className="bg-blue-500">Draft</Badge>
      case 'Assessment Scheduled':
        return <Badge variant="warning">Scheduled</Badge>
      case 'Records Sent':
        return <Badge variant="outline">Records Sent</Badge>
      default:
        return <Badge variant="outline">Retained</Badge>
    }
  }

  const checkRule53Compliance = (report: ExpertReport): { compliant: boolean; issues: string[] } => {
    const issues: string[] = []
    
    if (!report.rule53Compliant) {
      issues.push('Missing Rule 53.03 acknowledgment')
    }
    if (report.status === 'Final Served' && !report.finalServedDate) {
      issues.push('Final served date missing')
    }
    if (preTrialDate && report.status !== 'Final Served') {
      const deadline = generateExpertReportDeadline(preTrialDate, caseId, report.id)
      const daysRemaining = Math.ceil(
        (new Date(deadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysRemaining < 0) {
        issues.push('Deadline passed - report not served')
      }
    }
    
    return {
      compliant: issues.length === 0,
      issues,
    }
  }

  const handleAddExpert = () => {
    if (newExpert.expertName && onAddExpert) {
      const deadline = preTrialDate
        ? generateExpertReportDeadline(preTrialDate, caseId, Date.now().toString())
        : { dueDate: '' }
      
      onAddExpert({
        caseId,
        expertName: newExpert.expertName,
        expertType: newExpert.expertType,
        retainedDate: newExpert.retainedDate,
        status: 'Retained',
        rule53Compliant: false,
      })
      setNewExpert({ expertName: '', expertType: 'Orthopedic', retainedDate: new Date().toISOString().split('T')[0] })
      setShowAddForm(false)
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Add New Expert */}
      {onAddExpert && (
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expert Reports</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-4 h-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Expert'}
              </Button>
            </div>
          </CardHeader>
          {showAddForm && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Expert Name"
                  placeholder="e.g., Dr. Johnson"
                  value={newExpert.expertName}
                  onChange={(e) => setNewExpert({ ...newExpert, expertName: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
                    Expert Type
                  </label>
                  <select
                    value={newExpert.expertType}
                    onChange={(e) =>
                      setNewExpert({ ...newExpert, expertType: e.target.value as ExpertReport['expertType'] })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50"
                  >
                    <option value="Orthopedic">Orthopedic</option>
                    <option value="Neurological">Neurological</option>
                    <option value="Psychological">Psychological</option>
                    <option value="Vocational">Vocational</option>
                    <option value="Actuarial">Actuarial</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input
                  label="Retained Date"
                  type="date"
                  value={newExpert.retainedDate}
                  onChange={(e) => setNewExpert({ ...newExpert, retainedDate: e.target.value })}
                />
              </div>
              {preTrialDate && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Deadline:</strong> Expert report must be served 90 days before Pre-Trial (
                    {new Date(
                      generateExpertReportDeadline(preTrialDate, caseId, Date.now().toString()).dueDate
                    ).toLocaleDateString()}
                    )
                  </p>
                </div>
              )}
              <Button onClick={handleAddExpert} className="w-full">
                Add Expert
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Expert Reports List */}
      <div className="space-y-4">
        {expertReports.length === 0 ? (
          <Card variant="glass" className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No expert reports tracked</p>
            <p className="text-sm text-gray-500 mt-2">
              Add experts to track reports and ensure Rule 53.03 compliance
            </p>
          </Card>
        ) : (
          expertReports.map((report) => {
            const compliance = checkRule53Compliance(report)
            const deadline = preTrialDate
              ? generateExpertReportDeadline(preTrialDate, caseId, report.id)
              : null
            const daysRemaining = deadline
              ? Math.ceil((new Date(deadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-lg border-2',
                  report.status === 'Final Served'
                    ? 'bg-green-500/10 border-green-500/30'
                    : compliance.compliant === false
                    ? 'bg-living-coral/10 border-living-coral'
                    : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-deep-indigo dark:text-vapor">
                        {report.expertName}
                      </h4>
                      {getStatusBadge(report.status)}
                      <Badge variant="outline" className="text-xs">
                        {report.expertType}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Retained: {new Date(report.retainedDate).toLocaleDateString()}
                    </p>
                  </div>
                  {!compliance.compliant && (
                    <AlertCircle className="w-5 h-5 text-living-coral flex-shrink-0" />
                  )}
                </div>

                {/* Status Timeline */}
                <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        report.retainedDate ? 'bg-green-500' : 'bg-gray-300'
                      )}
                    />
                    <span className="text-gray-600 dark:text-gray-400">Retained</span>
                    {report.retainedDate && (
                      <span className="text-xs text-gray-500">
                        {new Date(report.retainedDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {report.recordsSentDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="text-gray-600 dark:text-gray-400">Records Sent</span>
                      <span className="text-xs text-gray-500">
                        {new Date(report.recordsSentDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {report.assessmentDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-gray-600 dark:text-gray-400">Assessment Scheduled</span>
                      <span className="text-xs text-gray-500">
                        {new Date(report.assessmentDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {report.draftReceivedDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">Draft Received</span>
                      <span className="text-xs text-gray-500">
                        {new Date(report.draftReceivedDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {report.finalServedDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-600 dark:text-gray-400">Final Served</span>
                      <span className="text-xs text-gray-500">
                        {new Date(report.finalServedDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rule 53.03 Compliance */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {report.rule53Compliant ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-living-coral" />
                      )}
                      <span className="text-sm font-medium">
                        Rule 53.03: {report.rule53Compliant ? 'Compliant' : 'Non-Compliant'}
                      </span>
                    </div>
                    {deadline && daysRemaining !== null && report.status !== 'Final Served' && (
                      <span
                        className={cn(
                          'text-sm font-medium',
                          daysRemaining <= 30 ? 'text-living-coral' : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {daysRemaining} days to deadline
                      </span>
                    )}
                  </div>
                  {!compliance.compliant && (
                    <div className="mt-2 p-2 bg-living-coral/10 border border-living-coral/30 rounded">
                      <p className="text-xs text-living-coral font-medium mb-1">Issues:</p>
                      <ul className="text-xs text-gray-700 dark:text-gray-300 list-disc list-inside">
                        {compliance.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                {onUpdateExpert && report.status !== 'Final Served' && (
                  <div className="flex gap-2 mt-4">
                    {report.status === 'Retained' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onUpdateExpert(report.id, {
                            status: 'Records Sent',
                            recordsSentDate: new Date().toISOString(),
                          })
                        }
                      >
                        Mark Records Sent
                      </Button>
                    )}
                    {report.status === 'Records Sent' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onUpdateExpert(report.id, {
                            status: 'Assessment Scheduled',
                            assessmentDate: new Date().toISOString(),
                          })
                        }
                      >
                        Schedule Assessment
                      </Button>
                    )}
                    {report.status === 'Assessment Scheduled' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onUpdateExpert(report.id, {
                            status: 'Draft Received',
                            draftReceivedDate: new Date().toISOString(),
                          })
                        }
                      >
                        Mark Draft Received
                      </Button>
                    )}
                    {report.status === 'Draft Received' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          onUpdateExpert(report.id, {
                            status: 'Final Served',
                            finalServedDate: new Date().toISOString(),
                            rule53Compliant: true,
                          })
                        }
                      >
                        Mark Final Served
                      </Button>
                    )}
                    {!report.rule53Compliant && (
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => onUpdateExpert(report.id, { rule53Compliant: true })}
                      >
                        Mark Rule 53 Compliant
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}


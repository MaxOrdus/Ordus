'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { FileText, CheckCircle, Clock, AlertTriangle, Send, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { OCF18Submission, SABSClaim } from '@/types/pi-case'
import { generateOCF18DeemedApproval, generateOCF1Deadline, generateOCF3RenewalAlert } from '@/lib/timeline-calculator'
import { cn } from '@/lib/utils'

interface OCFFormTrackerProps {
  caseId: string
  sabs: SABSClaim
  dateOfLoss: string
  onUpdateOCF1?: (receivedDate: string) => void
  onUpdateOCF3?: (expiryDate: string) => void
  onAddOCF18?: (submission: Omit<OCF18Submission, 'id'>) => void
  onUpdateOCF18Status?: (id: string, status: OCF18Submission['status']) => void
  onUpdateCategory?: (category: 'MIG' | 'Non-MIG' | 'CAT') => void
}

export function OCFFormTracker({
  caseId,
  sabs,
  dateOfLoss,
  onUpdateOCF1,
  onUpdateOCF3,
  onAddOCF18,
  onUpdateOCF18Status,
  onUpdateCategory,
}: OCFFormTrackerProps) {
  const [newOCF18, setNewOCF18] = React.useState({
    treatmentType: '',
    amount: 0,
    submissionDate: new Date().toISOString().split('T')[0],
  })

  // Calculate OCF-1 deadline if received
  const ocf1Deadline = React.useMemo(() => {
    if (sabs.ocf1ReceivedDate) {
      return generateOCF1Deadline(sabs.ocf1ReceivedDate, caseId)
    }
    return null
  }, [sabs.ocf1ReceivedDate, caseId])

  // Calculate OCF-3 renewal alert
  const ocf3Alert = React.useMemo(() => {
    if (sabs.ocf3ExpiryDate) {
      return generateOCF3RenewalAlert(sabs.ocf3ExpiryDate, caseId)
    }
    return null
  }, [sabs.ocf3ExpiryDate, caseId])

  // Calculate OCF-18 deemed approvals
  const ocf18Deadlines = React.useMemo(() => {
    return sabs.ocf18Submissions
      .filter((s) => s.status === 'Pending')
      .map((submission) => generateOCF18DeemedApproval(submission.submissionDate, caseId, submission.id))
  }, [sabs.ocf18Submissions, caseId])

  const getOCF18StatusColor = (status: OCF18Submission['status']) => {
    switch (status) {
      case 'Approved':
      case 'Deemed Approved':
        return 'text-green-500'
      case 'Partially Approved':
        return 'text-yellow-500'
      case 'Denied':
        return 'text-living-coral'
      default:
        return 'text-gray-500'
    }
  }

  const getOCF18StatusBadge = (status: OCF18Submission['status']) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'Deemed Approved':
        return <Badge className="bg-green-500">Deemed Approved</Badge>
      case 'Partially Approved':
        return <Badge variant="warning">Partial</Badge>
      case 'Denied':
        return <Badge variant="destructive">Denied</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* OCF-1 Application */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-electric-teal" />
            <CardTitle>OCF-1: Application for Accident Benefits</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sabs.ocf1ReceivedDate ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                OCF-1 package not yet received. Once received, the 30-day deadline will begin.
              </p>
              <Input
                label="Package Received Date"
                type="date"
                onChange={(e) => {
                  if (e.target.value && onUpdateOCF1) {
                    onUpdateOCF1(e.target.value)
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-deep-indigo/30 rounded-lg">
                <div>
                  <p className="font-medium text-deep-indigo dark:text-vapor">Package Received</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(sabs.ocf1ReceivedDate).toLocaleDateString()}
                  </p>
                </div>
                {sabs.ocf1SubmittedDate ? (
                  <Badge className="bg-green-500">Submitted</Badge>
                ) : (
                  <Badge variant="outline">Not Submitted</Badge>
                )}
              </div>
              {ocf1Deadline && (
                <div
                  className={cn(
                    'p-4 rounded-lg border-2',
                    ocf1Deadline.daysRemaining <= 7
                      ? 'bg-living-coral/10 border-living-coral'
                      : ocf1Deadline.daysRemaining <= 14
                      ? 'bg-orange-500/10 border-orange-500'
                      : 'bg-yellow-500/10 border-yellow-500'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">Deadline: {new Date(ocf1Deadline.dueDate).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ocf1Deadline.daysRemaining} days remaining
                        </p>
                      </div>
                    </div>
                    {ocf1Deadline.daysRemaining <= 7 && (
                      <AlertTriangle className="w-6 h-6 text-living-coral animate-pulse-slow" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCF-3 Disability Certificate */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-electric-teal" />
            <CardTitle>OCF-3: Disability Certificate</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sabs.ocf3ExpiryDate ? (
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                No OCF-3 on file. Add expiry date to track renewal.
              </p>
              <Input
                label="OCF-3 Expiry Date"
                type="date"
                onChange={(e) => {
                  if (e.target.value && onUpdateOCF3) {
                    onUpdateOCF3(e.target.value)
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-deep-indigo/30 rounded-lg">
                <div>
                  <p className="font-medium text-deep-indigo dark:text-vapor">Expires</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(sabs.ocf3ExpiryDate).toLocaleDateString()}
                  </p>
                </div>
                {ocf3Alert && ocf3Alert.daysRemaining <= 0 ? (
                  <Badge variant="destructive">Expired</Badge>
                ) : ocf3Alert && ocf3Alert.daysRemaining <= 30 ? (
                  <Badge variant="warning">Renewal Due</Badge>
                ) : (
                  <Badge variant="outline">Active</Badge>
                )}
              </div>
              {ocf3Alert && ocf3Alert.daysRemaining <= 30 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Renewal Alert</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        OCF-3 expires in {ocf3Alert.daysRemaining} days. Send client to doctor for renewal.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCF-18 Treatment Plans */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-electric-teal" />
              <CardTitle>OCF-18: Treatment Plans</CardTitle>
            </div>
            <Badge variant="outline">{sabs.ocf18Submissions.length} submissions</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New OCF-18 */}
          {onAddOCF18 && (
            <div className="p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg space-y-3">
              <h3 className="font-semibold text-deep-indigo dark:text-vapor">Add New OCF-18</h3>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Treatment Type"
                  placeholder="e.g., Physiotherapy"
                  value={newOCF18.treatmentType}
                  onChange={(e) => setNewOCF18({ ...newOCF18, treatmentType: e.target.value })}
                />
                <Input
                  label="Amount ($)"
                  type="number"
                  value={newOCF18.amount}
                  onChange={(e) => setNewOCF18({ ...newOCF18, amount: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Submission Date"
                  type="date"
                  value={newOCF18.submissionDate}
                  onChange={(e) => setNewOCF18({ ...newOCF18, submissionDate: e.target.value })}
                />
              </div>
              <Button
                onClick={() => {
                  if (newOCF18.treatmentType && newOCF18.amount > 0) {
                    const deadline = generateOCF18DeemedApproval(newOCF18.submissionDate, caseId, Date.now().toString())
                    onAddOCF18({
                      caseId,
                      submissionDate: newOCF18.submissionDate,
                      treatmentType: newOCF18.treatmentType,
                      amount: newOCF18.amount,
                      status: 'Pending',
                      responseDeadline: deadline.dueDate,
                    })
                    setNewOCF18({ treatmentType: '', amount: 0, submissionDate: new Date().toISOString().split('T')[0] })
                  }
                }}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit OCF-18
              </Button>
            </div>
          )}

          {/* OCF-18 List */}
          <div className="space-y-3">
            {sabs.ocf18Submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No OCF-18 submissions</div>
            ) : (
              sabs.ocf18Submissions.map((submission) => {
                const deadline = ocf18Deadlines.find((d) => d.id.includes(submission.id))
                const isDeemedApproval = deadline && deadline.daysRemaining <= 0 && submission.status === 'Pending'

                return (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-4 rounded-lg border-2',
                      submission.status === 'Approved' || submission.status === 'Deemed Approved'
                        ? 'bg-green-500/10 border-green-500/30'
                        : submission.status === 'Denied'
                        ? 'bg-living-coral/10 border-living-coral/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-deep-indigo dark:text-vapor">
                          {submission.treatmentType}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ${submission.amount.toLocaleString()} • Submitted{' '}
                          {new Date(submission.submissionDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4">{getOCF18StatusBadge(submission.status)}</div>
                    </div>
                    {deadline && submission.status === 'Pending' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Deemed Approval Deadline: {new Date(deadline.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={cn('text-sm font-medium', getOCF18StatusColor(submission.status))}>
                            {deadline.daysRemaining} business days remaining
                          </span>
                        </div>
                        {isDeemedApproval && (
                          <div className="mt-2 p-2 bg-green-500/20 border border-green-500 rounded">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                              ✓ Deemed Approved! Treatment can proceed.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {onUpdateOCF18Status && submission.status === 'Pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onUpdateOCF18Status(submission.id, 'Approved')}
                        >
                          Mark Approved
                        </Button>
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => onUpdateOCF18Status(submission.id, 'Denied')}
                        >
                          Mark Denied
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {/* MIG Button */}
            <motion.button
              onClick={() => {
                if (onUpdateCategory) {
                  onUpdateCategory('MIG')
                } else {
                  console.log('Category selected: MIG')
                }
              }}
              className={cn(
                'p-3 rounded-lg border-2 transition-all duration-200',
                sabs.migStatus === 'MIG'
                  ? 'bg-yellow-500/20 border-yellow-500 shadow-md'
                  : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700 hover:border-yellow-500/50'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    sabs.migStatus === 'MIG'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  )}
                >
                  <span className="text-sm font-bold">M</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="font-semibold text-sm text-deep-indigo dark:text-vapor">MIG</h3>
                  <p className="text-xs text-gray-500">$3,500</p>
                </div>
              </div>
            </motion.button>

            {/* NON-MIG Button */}
            <motion.button
              onClick={() => {
                if (onUpdateCategory) {
                  onUpdateCategory('Non-MIG')
                } else {
                  console.log('Category selected: NON-MIG')
                }
              }}
              className={cn(
                'p-3 rounded-lg border-2 transition-all duration-200',
                sabs.migStatus === 'Non-MIG'
                  ? 'bg-electric-teal/20 border-electric-teal shadow-md'
                  : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700 hover:border-electric-teal/50'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    sabs.migStatus === 'Non-MIG'
                      ? 'bg-electric-teal text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  )}
                >
                  <span className="text-sm font-bold">N</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="font-semibold text-sm text-deep-indigo dark:text-vapor">NON-MIG</h3>
                  <p className="text-xs text-gray-500">$65,000</p>
                </div>
              </div>
            </motion.button>

            {/* CAT Button */}
            <motion.button
              onClick={() => {
                if (onUpdateCategory) {
                  onUpdateCategory('CAT')
                } else {
                  console.log('Category selected: CAT')
                }
              }}
              className={cn(
                'p-3 rounded-lg border-2 transition-all duration-200',
                sabs.migStatus === 'CAT'
                  ? 'bg-living-coral/20 border-living-coral shadow-md'
                  : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700 hover:border-living-coral/50'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    sabs.migStatus === 'CAT'
                      ? 'bg-living-coral text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  )}
                >
                  <span className="text-sm font-bold">C</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="font-semibold text-sm text-deep-indigo dark:text-vapor">CAT</h3>
                  <p className="text-xs text-gray-500">$1M</p>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Additional Info */}
          {sabs.migStatus === 'MIG' && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-deep-indigo dark:text-vapor mb-1">
                    MIG Status Active
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Medical/Rehab benefits are capped at $3,500. Consider gathering evidence for MIG removal
                    if the client has pre-existing conditions or injuries outside the MIG definition.
                  </p>
                  <Button variant="accent" size="sm" className="mt-3">
                    Request MIG Removal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { FileText, Calendar, DollarSign, AlertCircle, CheckCircle, Clock, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LATApplication } from '@/types/pi-case'
import { generateLATLimitation } from '@/lib/timeline-calculator'
import { cn } from '@/lib/utils'

interface LATApplicationManagerProps {
  caseId: string
  applications: LATApplication[]
  onAddApplication?: (application: Omit<LATApplication, 'id' | 'limitationDate'>) => void
  onUpdateApplication?: (id: string, updates: Partial<LATApplication>) => void
  className?: string
}

export function LATApplicationManager({
  caseId,
  applications,
  onAddApplication,
  onUpdateApplication,
  className,
}: LATApplicationManagerProps) {
  const [newApplication, setNewApplication] = React.useState({
    denialDate: '',
    denialType: '',
    deniedBenefitValue: 0,
  })
  const [showAddForm, setShowAddForm] = React.useState(false)

  // Calculate total denied benefit value
  const totalDeniedValue = React.useMemo(() => {
    return applications.reduce((sum, app) => sum + app.deniedBenefitValue, 0)
  }, [applications])

  // Get applications by status
  const applicationsByStatus = React.useMemo(() => {
    const grouped: Record<LATApplication['status'], LATApplication[]> = {
      Pending: [],
      Filed: [],
      Settled: [],
      'Hearing Scheduled': [],
      Completed: [],
    }
    applications.forEach((app) => {
      grouped[app.status].push(app)
    })
    return grouped
  }, [applications])

  const getStatusColor = (status: LATApplication['status']) => {
    switch (status) {
      case 'Completed':
      case 'Settled':
        return 'text-green-500'
      case 'Hearing Scheduled':
        return 'text-blue-500'
      case 'Filed':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBadge = (status: LATApplication['status']) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'Settled':
        return <Badge className="bg-green-500">Settled</Badge>
      case 'Hearing Scheduled':
        return <Badge variant="default" className="bg-blue-500">Hearing Scheduled</Badge>
      case 'Filed':
        return <Badge variant="warning">Filed</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const handleAddApplication = () => {
    if (newApplication.denialDate && newApplication.denialType && onAddApplication) {
      onAddApplication({
        caseId,
        denialDate: newApplication.denialDate,
        denialType: newApplication.denialType,
        deniedBenefitValue: newApplication.deniedBenefitValue,
        status: 'Pending',
      })
      setNewApplication({ denialDate: '', denialType: '', deniedBenefitValue: 0 })
      setShowAddForm(false)
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Denials</p>
                <p className="text-2xl font-bold text-deep-indigo dark:text-vapor">
                  {applications.length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Denied Value</p>
                <p className="text-2xl font-bold text-living-coral">
                  ${totalDeniedValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-living-coral" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Filing</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {applicationsByStatus.Pending.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Applications</p>
                <p className="text-2xl font-bold text-electric-teal">
                  {applicationsByStatus.Filed.length + applicationsByStatus['Hearing Scheduled'].length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-electric-teal" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Application */}
      {onAddApplication && (
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Track LAT Denial</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Denial'}
              </Button>
            </div>
          </CardHeader>
          {showAddForm && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Denial Date"
                  type="date"
                  value={newApplication.denialDate}
                  onChange={(e) =>
                    setNewApplication({ ...newApplication, denialDate: e.target.value })
                  }
                />
                <Input
                  label="Denial Type"
                  placeholder="e.g., IRB Denial, Medical Denial"
                  value={newApplication.denialType}
                  onChange={(e) =>
                    setNewApplication({ ...newApplication, denialType: e.target.value })
                  }
                />
                <Input
                  label="Denied Benefit Value ($)"
                  type="number"
                  value={newApplication.deniedBenefitValue}
                  onChange={(e) =>
                    setNewApplication({
                      ...newApplication,
                      deniedBenefitValue: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Note:</strong> LAT applications must be filed within 2 years of the denial date.
                  This deadline will be automatically calculated.
                </p>
              </div>
              <Button onClick={handleAddApplication} className="w-full">
                Track Denial
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Applications List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-deep-indigo dark:text-vapor">LAT Applications</h3>
        
        {applications.length === 0 ? (
          <Card variant="glass" className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No LAT applications tracked</p>
            <p className="text-sm text-gray-500 mt-2">
              Add denials to track and decide when to file comprehensive LAT applications
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const limitation = generateLATLimitation(app.denialDate, caseId, app.id)
              const daysRemaining = Math.ceil(
                (new Date(limitation.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
              const isUrgent = daysRemaining <= 90 && app.status === 'Pending'

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-4 rounded-lg border-2',
                    app.status === 'Pending' && isUrgent
                      ? 'bg-living-coral/10 border-living-coral'
                      : app.status === 'Settled' || app.status === 'Completed'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-deep-indigo dark:text-vapor">
                          {app.denialType}
                        </h4>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Denied: {new Date(app.denialDate).toLocaleDateString()}
                      </p>
                      <p className="text-lg font-bold text-electric-teal mt-1">
                        ${app.deniedBenefitValue.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {app.status === 'Pending' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Filing Deadline:
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            daysRemaining <= 90 ? 'text-living-coral' : 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {new Date(limitation.dueDate).toLocaleDateString()} ({daysRemaining} days)
                        </span>
                      </div>
                    )}
                    {app.applicationFiled && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Filed:</span>
                        </div>
                        <span className="text-sm font-medium">
                          {new Date(app.applicationFiled).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {app.caseConferenceDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Case Conference:
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {new Date(app.caseConferenceDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {app.hearingDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-living-coral" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Hearing:</span>
                        </div>
                        <span className="text-sm font-medium text-living-coral">
                          {new Date(app.hearingDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {onUpdateApplication && app.status === 'Pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onUpdateApplication(app.id, {
                            status: 'Filed',
                            applicationFiled: new Date().toISOString(),
                          })
                        }
                      >
                        Mark as Filed
                      </Button>
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => onUpdateApplication(app.id, { status: 'Settled' })}
                      >
                        Mark as Settled
                      </Button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bucket Strategy Info */}
      {totalDeniedValue > 0 && applicationsByStatus.Pending.length > 0 && (
        <Card variant="glass" className="p-4 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-deep-indigo dark:text-vapor mb-2">
                Bucket Strategy Recommendation
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                You have {applicationsByStatus.Pending.length} pending denials totaling $
                {totalDeniedValue.toLocaleString()}. Consider filing a comprehensive LAT application
                when the cumulative value reaches $5,000+ or when a major benefit (IRB) is denied.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}


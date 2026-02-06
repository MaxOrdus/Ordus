'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Disbursement } from '@/types/pi-case'
import { cn } from '@/lib/utils'

interface DisbursementManagerProps {
  caseId: string
  disbursements: Disbursement[]
  caseValue: number
  onAddDisbursement?: (disb: Omit<Disbursement, 'id'>) => void
  onUpdateDisbursement?: (id: string, updates: Partial<Disbursement>) => void
  className?: string
}

export function DisbursementManager({
  caseId,
  disbursements,
  caseValue,
  onAddDisbursement,
  onUpdateDisbursement,
  className,
}: DisbursementManagerProps) {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newDisb, setNewDisb] = React.useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    category: 'Expert' as Disbursement['category'],
    assessable: true,
  })

  const totalDisbursements = React.useMemo(() => {
    return disbursements.reduce((sum, d) => sum + d.amount, 0)
  }, [disbursements])

  const assessableDisbursements = React.useMemo(() => {
    return disbursements.filter((d) => d.assessable).reduce((sum, d) => sum + d.amount, 0)
  }, [disbursements])

  const burnRate = React.useMemo(() => {
    if (caseValue === 0) return 0
    return (totalDisbursements / caseValue) * 100
  }, [totalDisbursements, caseValue])

  const isToxicAsset = burnRate > 50

  const getCategoryColor = (category: Disbursement['category']) => {
    switch (category) {
      case 'Expert':
        return 'bg-electric-teal/20 text-electric-teal border-electric-teal/30'
      case 'Court Fees':
        return 'bg-violet-500/20 text-violet-500 border-violet-500/30'
      case 'Transcripts':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      case 'Medical Records':
        return 'bg-green-500/20 text-green-500 border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
    }
  }

  const handleAddDisbursement = () => {
    if (newDisb.description && newDisb.amount > 0 && onAddDisbursement) {
      onAddDisbursement({
        caseId,
        date: newDisb.date,
        description: newDisb.description,
        amount: newDisb.amount,
        category: newDisb.category,
        assessable: newDisb.assessable,
        paid: false,
      })
      setNewDisb({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        category: 'Expert',
        assessable: true,
      })
      setShowAddForm(false)
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Disbursements</p>
                <p className="text-2xl font-bold text-deep-indigo dark:text-vapor">
                  ${totalDisbursements.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Assessable</p>
                <p className="text-2xl font-bold text-electric-teal">
                  ${assessableDisbursements.toLocaleString()}
                </p>
              </div>
              <FileText className="w-8 h-8 text-electric-teal" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Burn Rate</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    isToxicAsset ? 'text-living-coral' : 'text-orange-500'
                  )}
                >
                  {burnRate.toFixed(1)}%
                </p>
              </div>
              {isToxicAsset ? (
                <TrendingDown className="w-8 h-8 text-living-coral" />
              ) : (
                <TrendingUp className="w-8 h-8 text-orange-500" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Case Value</p>
                <p className="text-2xl font-bold text-violet-500">
                  ${caseValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toxic Asset Warning */}
      {isToxicAsset && (
        <Card variant="glass" className="p-4 bg-living-coral/10 border-2 border-living-coral">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-living-coral flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-living-coral mb-1">Toxic Asset Warning</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Disbursements ({burnRate.toFixed(1)}%) exceed 50% of case value. This file requires
                immediate review. Consider settlement or cost reduction strategies.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Add Disbursement */}
      {onAddDisbursement && (
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Disbursements</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-4 h-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Disbursement'}
              </Button>
            </div>
          </CardHeader>
          {showAddForm && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={newDisb.date}
                  onChange={(e) => setNewDisb({ ...newDisb, date: e.target.value })}
                />
                <Input
                  label="Description"
                  placeholder="e.g., Expert Report - Dr. Johnson"
                  value={newDisb.description}
                  onChange={(e) => setNewDisb({ ...newDisb, description: e.target.value })}
                  className="col-span-2"
                />
                <Input
                  label="Amount ($)"
                  type="number"
                  value={newDisb.amount}
                  onChange={(e) => setNewDisb({ ...newDisb, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
                    Category
                  </label>
                  <select
                    value={newDisb.category}
                    onChange={(e) =>
                      setNewDisb({ ...newDisb, category: e.target.value as Disbursement['category'] })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50"
                  >
                    <option value="Expert">Expert</option>
                    <option value="Court Fees">Court Fees</option>
                    <option value="Transcripts">Transcripts</option>
                    <option value="Medical Records">Medical Records</option>
                    <option value="Process Serving">Process Serving</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex items-center pt-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDisb.assessable}
                      onChange={(e) => setNewDisb({ ...newDisb, assessable: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Assessable (recoverable)</span>
                  </label>
                </div>
              </div>
              <Button onClick={handleAddDisbursement} className="w-full">
                Add Disbursement
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Disbursements List */}
      <div className="space-y-3">
        {disbursements.length === 0 ? (
          <Card variant="glass" className="p-8 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No disbursements tracked</p>
          </Card>
        ) : (
          disbursements.map((disb, index) => (
            <motion.div
              key={disb.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'p-4 rounded-lg border-2 flex items-center justify-between',
                getCategoryColor(disb.category)
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-deep-indigo dark:text-vapor">
                    {disb.description}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {disb.category}
                  </Badge>
                  {disb.assessable && (
                    <Badge variant="default" className="bg-green-500 text-xs">
                      Assessable
                    </Badge>
                  )}
                  {disb.paid && (
                    <Badge variant="default" className="bg-blue-500 text-xs">
                      Paid
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(disb.date).toLocaleDateString()}
                  {disb.invoiceNumber && ` • Invoice: ${disb.invoiceNumber}`}
                </p>
              </div>
              <p className="text-xl font-bold text-deep-indigo dark:text-vapor">
                ${disb.amount.toLocaleString()}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}


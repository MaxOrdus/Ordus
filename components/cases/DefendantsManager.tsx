'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Building2, Shield, CheckCircle, Clock, X, Edit2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Defendant } from '@/types/pi-case'
import { cn } from '@/lib/utils'

interface DefendantsManagerProps {
  caseId: string
  defendants: Defendant[]
  onAddDefendant: (defendant: Omit<Defendant, 'id'>) => Promise<void>
  onUpdateDefendant: (id: string, updates: Partial<Defendant>) => Promise<void>
  onDeleteDefendant?: (id: string) => Promise<void>
  className?: string
}

const DEFENDANT_ROLES: Defendant['role'][] = ['Driver', 'Owner', 'Lessee']

export function DefendantsManager({
  caseId,
  defendants,
  onAddDefendant,
  onUpdateDefendant,
  onDeleteDefendant,
  className,
}: DefendantsManagerProps) {
  const [isAddingNew, setIsAddingNew] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form state for new defendant
  const [newDefendant, setNewDefendant] = React.useState<Omit<Defendant, 'id'>>({
    name: '',
    role: 'Driver',
    insuranceCompany: '',
    policyNumber: '',
    served: false,
    servedDate: undefined,
  })

  const resetForm = () => {
    setNewDefendant({
      name: '',
      role: 'Driver',
      insuranceCompany: '',
      policyNumber: '',
      served: false,
      servedDate: undefined,
    })
    setIsAddingNew(false)
    setEditingId(null)
  }

  const handleAddDefendant = async () => {
    if (!newDefendant.name.trim() || !newDefendant.insuranceCompany.trim()) return

    setIsSubmitting(true)
    try {
      await onAddDefendant(newDefendant)
      resetForm()
    } catch (err) {
      console.error('Failed to add defendant:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkServed = async (defendant: Defendant) => {
    await onUpdateDefendant(defendant.id, {
      served: true,
      servedDate: new Date().toISOString(),
    })
  }

  const servedCount = defendants.filter(d => d.served).length
  const totalCount = defendants.length

  return (
    <Card variant="glass" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-500" />
            Defendants
            {totalCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {servedCount}/{totalCount} Served
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Defendant
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add New Form */}
        <AnimatePresence>
          {isAddingNew && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-electric-teal/10 border border-electric-teal/30 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-deep-indigo dark:text-vapor">Add New Defendant</h4>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Name"
                  placeholder="John Doe"
                  value={newDefendant.name}
                  onChange={(e) => setNewDefendant(prev => ({ ...prev, name: e.target.value }))}
                />
                <Select
                  label="Role"
                  value={newDefendant.role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewDefendant(prev => ({ ...prev, role: e.target.value as Defendant['role'] }))}
                  options={DEFENDANT_ROLES.map(role => ({ value: role, label: role }))}
                />
                <Input
                  label="Insurance Company"
                  placeholder="Intact Insurance"
                  value={newDefendant.insuranceCompany}
                  onChange={(e) => setNewDefendant(prev => ({ ...prev, insuranceCompany: e.target.value }))}
                />
                <Input
                  label="Policy Number (optional)"
                  placeholder="POL-123456"
                  value={newDefendant.policyNumber || ''}
                  onChange={(e) => setNewDefendant(prev => ({ ...prev, policyNumber: e.target.value || undefined }))}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDefendant}
                  disabled={!newDefendant.name.trim() || !newDefendant.insuranceCompany.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Defendant'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Defendants List */}
        {defendants.length === 0 && !isAddingNew ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No defendants added yet</p>
            <p className="text-sm">Add defendants to track service and insurance details</p>
          </div>
        ) : (
          <div className="space-y-3">
            {defendants.map((defendant) => (
              <motion.div
                key={defendant.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  defendant.served
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-deep-indigo dark:text-vapor">
                        {defendant.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {defendant.role}
                      </Badge>
                      {defendant.served && (
                        <Badge className="bg-green-500 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Served
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Building2 className="w-4 h-4" />
                        <span>{defendant.insuranceCompany}</span>
                      </div>
                      {defendant.policyNumber && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Shield className="w-4 h-4" />
                          <span>{defendant.policyNumber}</span>
                        </div>
                      )}
                    </div>

                    {defendant.served && defendant.servedDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Served on {new Date(defendant.servedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!defendant.served && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkServed(defendant)}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Mark Served
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Summary */}
        {defendants.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Service Status
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(servedCount / totalCount) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="font-semibold text-green-500">
                  {Math.round((servedCount / totalCount) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

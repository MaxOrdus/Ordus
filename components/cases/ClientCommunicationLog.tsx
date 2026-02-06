'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Phone, Mail, Calendar, User, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Communication {
  id: string
  caseId: string
  date: string
  type: 'Phone' | 'Email' | 'Meeting' | 'Letter'
  subject: string
  notes: string
  initiatedBy: 'Client' | 'Firm'
  followUpRequired: boolean
  followUpDate?: string
}

interface ClientCommunicationLogProps {
  caseId: string
  communications: Communication[]
  onAddCommunication?: (comm: Omit<Communication, 'id'>) => void
  onUpdateCommunication?: (id: string, updates: Partial<Communication>) => void
  className?: string
}

export function ClientCommunicationLog({
  caseId,
  communications,
  onAddCommunication,
  onUpdateCommunication,
  className,
}: ClientCommunicationLogProps) {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newComm, setNewComm] = React.useState({
    type: 'Phone' as Communication['type'],
    subject: '',
    notes: '',
    initiatedBy: 'Firm' as 'Client' | 'Firm',
    followUpRequired: false,
    followUpDate: '',
  })

  const sortedCommunications = React.useMemo(() => {
    return [...communications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [communications])

  const getTypeIcon = (type: Communication['type']) => {
    switch (type) {
      case 'Phone':
        return Phone
      case 'Email':
        return Mail
      case 'Meeting':
        return Calendar
      case 'Letter':
        return MessageSquare
    }
  }

  const getTypeColor = (type: Communication['type']) => {
    switch (type) {
      case 'Phone':
        return 'bg-electric-teal/20 text-electric-teal border-electric-teal/30'
      case 'Email':
        return 'bg-violet-500/20 text-violet-500 border-violet-500/30'
      case 'Meeting':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      case 'Letter':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
    }
  }

  const handleAddCommunication = () => {
    if (newComm.subject && newComm.notes && onAddCommunication) {
      onAddCommunication({
        caseId,
        date: new Date().toISOString(),
        type: newComm.type,
        subject: newComm.subject,
        notes: newComm.notes,
        initiatedBy: newComm.initiatedBy,
        followUpRequired: newComm.followUpRequired,
        followUpDate: newComm.followUpDate || undefined,
      })
      setNewComm({
        type: 'Phone',
        subject: '',
        notes: '',
        initiatedBy: 'Firm',
        followUpRequired: false,
        followUpDate: '',
      })
      setShowAddForm(false)
    }
  }

  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-electric-teal" />
            Client Communication
          </CardTitle>
          {onAddCommunication && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              {showAddForm ? 'Cancel' : 'Log Communication'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Communication Form */}
        {showAddForm && onAddCommunication && (
          <div className="p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
                  Type
                </label>
                <select
                  value={newComm.type}
                  onChange={(e) =>
                    setNewComm({ ...newComm, type: e.target.value as Communication['type'] })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50"
                >
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
                  Initiated By
                </label>
                <select
                  value={newComm.initiatedBy}
                  onChange={(e) =>
                    setNewComm({ ...newComm, initiatedBy: e.target.value as 'Client' | 'Firm' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50"
                >
                  <option value="Firm">Firm</option>
                  <option value="Client">Client</option>
                </select>
              </div>
            </div>
            <Input
              label="Subject"
              placeholder="Brief subject line..."
              value={newComm.subject}
              onChange={(e) => setNewComm({ ...newComm, subject: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
                Notes
              </label>
              <textarea
                value={newComm.notes}
                onChange={(e) => setNewComm({ ...newComm, notes: e.target.value })}
                placeholder="Details of the communication..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50 min-h-[100px]"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newComm.followUpRequired}
                  onChange={(e) => setNewComm({ ...newComm, followUpRequired: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Follow-up required</span>
              </label>
              {newComm.followUpRequired && (
                <Input
                  type="date"
                  value={newComm.followUpDate}
                  onChange={(e) => setNewComm({ ...newComm, followUpDate: e.target.value })}
                  className="flex-1"
                />
              )}
            </div>
            <Button onClick={handleAddCommunication} className="w-full">
              Log Communication
            </Button>
          </div>
        )}

        {/* Communications List */}
        {sortedCommunications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No communications logged</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCommunications.map((comm, index) => {
              const Icon = getTypeIcon(comm.type)

              return (
                <motion.div
                  key={comm.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-4 rounded-lg border-2',
                    comm.followUpRequired
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg', getTypeColor(comm.type))}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-deep-indigo dark:text-vapor">
                          {comm.subject}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(comm.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {comm.initiatedBy}
                      </Badge>
                      {comm.followUpRequired && (
                        <Badge variant="warning" className="text-xs">
                          Follow-up
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 ml-12">{comm.notes}</p>
                  {comm.followUpDate && (
                    <div className="mt-2 ml-12 flex items-center gap-2 text-xs text-yellow-600">
                      <Calendar className="w-3 h-3" />
                      <span>Follow-up due: {new Date(comm.followUpDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


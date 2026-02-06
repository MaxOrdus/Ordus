'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Undertaking } from '@/types/pi-case'
import { cn } from '@/lib/utils'

interface UndertakingsModuleProps {
  caseId: string
  plaintiffUndertakings: Undertaking[]
  defenseUndertakings: Undertaking[]
  onAddUndertaking?: (undertaking: Omit<Undertaking, 'id'>) => void
  onUpdateStatus?: (id: string, status: Undertaking['status']) => void
}

export function UndertakingsModule({
  caseId,
  plaintiffUndertakings,
  defenseUndertakings,
  onAddUndertaking,
  onUpdateStatus,
}: UndertakingsModuleProps) {
  const [newUndertaking, setNewUndertaking] = React.useState({
    description: '',
    type: 'Plaintiff' as 'Plaintiff' | 'Defense',
  })

  const getStatusIcon = (status: Undertaking['status']) => {
    switch (status) {
      case 'Answered':
      case 'Served':
        return CheckCircle
      case 'Refused':
        return XCircle
      default:
        return Clock
    }
  }

  const getStatusColor = (status: Undertaking['status']) => {
    switch (status) {
      case 'Answered':
      case 'Served':
        return 'text-green-500'
      case 'Refused':
        return 'text-living-coral'
      default:
        return 'text-yellow-500'
    }
  }

  const getStatusBadge = (status: Undertaking['status']) => {
    switch (status) {
      case 'Answered':
        return <Badge variant="default" className="bg-green-500 text-white">Answered</Badge>
      case 'Served':
        return <Badge variant="default" className="bg-green-500 text-white">Served</Badge>
      case 'Refused':
        return <Badge variant="destructive">Refused</Badge>
      case 'Under Advisement':
        return <Badge variant="warning">Under Advisement</Badge>
      default:
        return <Badge variant="outline">Requested</Badge>
    }
  }

  const renderUndertakingList = (undertakings: Undertaking[], type: 'Plaintiff' | 'Defense') => {
    return (
      <div className="space-y-3">
        {undertakings.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No {type.toLowerCase()} undertakings
          </div>
        ) : (
          undertakings.map((undertaking) => {
            const Icon = getStatusIcon(undertaking.status)
            const color = getStatusColor(undertaking.status)

            return (
              <motion.div
                key={undertaking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  undertaking.status === 'Requested'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : undertaking.status === 'Refused'
                    ? 'bg-living-coral/10 border-living-coral/30'
                    : 'bg-green-500/10 border-green-500/30'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={cn('w-5 h-5 mt-0.5', color)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-deep-indigo dark:text-vapor">
                        {undertaking.description}
                      </p>
                      {undertaking.assignedTo && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Assigned to: {undertaking.assignedTo}
                        </p>
                      )}
                      {undertaking.dueDate && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Due: {new Date(undertaking.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">{getStatusBadge(undertaking.status)}</div>
                </div>
                {onUpdateStatus && undertaking.status === 'Requested' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUpdateStatus(undertaking.id, 'Answered')}
                    >
                      Mark Answered
                    </Button>
                    <Button
                      size="sm"
                      variant="accent"
                      onClick={() => onUpdateStatus(undertaking.id, 'Refused')}
                    >
                      Mark Refused
                    </Button>
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <Card variant="glass" className="p-6">
      <CardHeader>
        <CardTitle>Undertakings</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Track post-discovery undertakings and refusals
        </p>
      </CardHeader>
      <CardContent>
        {/* Add New Undertaking */}
        {onAddUndertaking && (
          <div className="mb-6 p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg">
            <h3 className="font-semibold mb-3 text-deep-indigo dark:text-vapor">Add Undertaking</h3>
            <div className="space-y-3">
              <Input
                label="Description"
                placeholder="e.g., Provide 2023 Notice of Assessment"
                value={newUndertaking.description}
                onChange={(e) =>
                  setNewUndertaking({ ...newUndertaking, description: e.target.value })
                }
              />
              <div className="flex gap-2">
                <Button
                  variant={newUndertaking.type === 'Plaintiff' ? 'primary' : 'ghost'}
                  onClick={() => setNewUndertaking({ ...newUndertaking, type: 'Plaintiff' })}
                  className="flex-1"
                >
                  Plaintiff
                </Button>
                <Button
                  variant={newUndertaking.type === 'Defense' ? 'primary' : 'ghost'}
                  onClick={() => setNewUndertaking({ ...newUndertaking, type: 'Defense' })}
                  className="flex-1"
                >
                  Defense
                </Button>
              </div>
              <Button
                onClick={() => {
                  if (newUndertaking.description) {
                    onAddUndertaking({
                      caseId,
                      type: newUndertaking.type,
                      description: newUndertaking.description,
                      requestedDate: new Date().toISOString(),
                      status: 'Requested',
                    })
                    setNewUndertaking({ description: '', type: 'Plaintiff' })
                  }
                }}
                className="w-full"
              >
                Add Undertaking
              </Button>
            </div>
          </div>
        )}

        {/* Ping-Pong Table */}
        <div className="grid grid-cols-2 gap-6">
          {/* Plaintiff Undertakings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-electric-teal" />
              <h3 className="font-semibold text-deep-indigo dark:text-vapor">
                We Owe Them ({plaintiffUndertakings.length})
              </h3>
            </div>
            {renderUndertakingList(plaintiffUndertakings, 'Plaintiff')}
          </div>

          {/* Defense Undertakings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-living-coral" />
              <h3 className="font-semibold text-deep-indigo dark:text-vapor">
                They Owe Us ({defenseUndertakings.length})
              </h3>
            </div>
            {renderUndertakingList(defenseUndertakings, 'Defense')}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">
              {plaintiffUndertakings.filter((u) => u.status === 'Requested').length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Outstanding (Plaintiff)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">
              {defenseUndertakings.filter((u) => u.status === 'Requested').length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Outstanding (Defense)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


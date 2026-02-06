'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SettlementOffer } from '@/types/pi-case'
import { calculateNetSettlement } from '@/lib/settlement-calculator'
import { cn } from '@/lib/utils'

interface SettlementNegotiationTrackerProps {
  caseId: string
  offers: SettlementOffer[]
  currentDisbursements: number
  legalFeePercent?: number
  onAddOffer?: (offer: Omit<SettlementOffer, 'id'>) => void
  onUpdateOffer?: (id: string, updates: Partial<SettlementOffer>) => void
  className?: string
}

export function SettlementNegotiationTracker({
  caseId,
  offers,
  currentDisbursements,
  legalFeePercent = 0.30,
  onAddOffer,
  onUpdateOffer,
  className,
}: SettlementNegotiationTrackerProps) {
  const [newOffer, setNewOffer] = React.useState({
    amount: 0,
    type: 'Defendant' as 'Plaintiff' | 'Defendant',
    expiresDate: '',
  })
  const [showAddForm, setShowAddForm] = React.useState(false)

  // Sort offers by date
  const sortedOffers = React.useMemo(() => {
    return [...offers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [offers])

  // Calculate net for each offer
  const offersWithNet = React.useMemo(() => {
    return sortedOffers.map((offer) => {
      const calculation = calculateNetSettlement(
        offer.amount,
        legalFeePercent,
        currentDisbursements,
        0, // subrogation
        0, // sabs paid (would come from case data)
        true, // pain and suffering
        false // over threshold
      )
      return {
        ...offer,
        netAmount: calculation.netToClient,
      }
    })
  }, [sortedOffers, currentDisbursements, legalFeePercent])

  const handleAddOffer = () => {
    if (newOffer.amount > 0 && onAddOffer) {
      const calculation = calculateNetSettlement(
        newOffer.amount,
        legalFeePercent,
        currentDisbursements
      )
      onAddOffer({
        caseId,
        date: new Date().toISOString(),
        amount: newOffer.amount,
        type: newOffer.type,
        grossAmount: newOffer.amount,
        netAmount: calculation.netToClient,
        status: 'Open',
        expiresDate: newOffer.expiresDate || undefined,
      })
      setNewOffer({ amount: 0, type: 'Defendant', expiresDate: '' })
      setShowAddForm(false)
    }
  }

  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-electric-teal" />
            Settlement Negotiations
          </CardTitle>
          {onAddOffer && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Offer'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Offer Form */}
        {showAddForm && onAddOffer && (
          <div className="p-4 bg-white/50 dark:bg-deep-indigo/30 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Offer Amount ($)"
                type="number"
                value={newOffer.amount}
                onChange={(e) => setNewOffer({ ...newOffer, amount: parseFloat(e.target.value) || 0 })}
              />
              <div>
                <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
                  Offer Type
                </label>
                <select
                  value={newOffer.type}
                  onChange={(e) =>
                    setNewOffer({ ...newOffer, type: e.target.value as 'Plaintiff' | 'Defendant' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-deep-indigo/50"
                >
                  <option value="Defendant">Defendant Offer</option>
                  <option value="Plaintiff">Plaintiff Demand</option>
                </select>
              </div>
              <Input
                label="Expires Date (Optional)"
                type="date"
                value={newOffer.expiresDate}
                onChange={(e) => setNewOffer({ ...newOffer, expiresDate: e.target.value })}
              />
            </div>
            {newOffer.amount > 0 && (
              <div className="p-3 bg-electric-teal/10 border border-electric-teal/30 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Net to Client:</strong>{' '}
                  {calculateNetSettlement(
                    newOffer.amount,
                    legalFeePercent,
                    currentDisbursements
                  ).netToClient.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </p>
              </div>
            )}
            <Button onClick={handleAddOffer} className="w-full">
              Add Offer
            </Button>
          </div>
        )}

        {/* Negotiation Timeline */}
        {offersWithNet.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No settlement offers tracked</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Offer Highlight */}
            {offersWithNet.find((o) => o.status === 'Open') && (
              <div className="p-4 bg-electric-teal/10 border-2 border-electric-teal rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Open Offer</p>
                    <p className="text-2xl font-bold text-electric-teal">
                      {offersWithNet
                        .find((o) => o.status === 'Open')
                        ?.grossAmount.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Net to Client:{' '}
                      {offersWithNet
                        .find((o) => o.status === 'Open')
                        ?.netAmount?.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-electric-teal text-white">
                    Open
                  </Badge>
                </div>
              </div>
            )}

            {/* Offer History */}
            <div className="space-y-3">
              <h3 className="font-semibold text-deep-indigo dark:text-vapor">Offer History</h3>
              {offersWithNet.map((offer, index) => {
                const isDefendant = offer.type === 'Defendant'
                const trend = index > 0 && offersWithNet[index - 1]
                  ? offer.amount > offersWithNet[index - 1].amount
                    ? 'up'
                    : offer.amount < offersWithNet[index - 1].amount
                    ? 'down'
                    : 'same'
                  : 'same'

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'p-4 rounded-lg border-2',
                      offer.status === 'Open'
                        ? 'bg-electric-teal/10 border-electric-teal'
                        : offer.status === 'Accepted'
                        ? 'bg-green-500/10 border-green-500'
                        : 'bg-white/50 dark:bg-deep-indigo/30 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isDefendant ? (
                          <TrendingDown className="w-4 h-4 text-living-coral" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-electric-teal" />
                        )}
                        <span className="font-semibold text-deep-indigo dark:text-vapor">
                          {isDefendant ? 'Defendant Offer' : 'Plaintiff Demand'}
                        </span>
                        {trend !== 'same' && index > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {trend === 'up' ? '↑ Increased' : '↓ Decreased'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-electric-teal">
                          ${offer.grossAmount.toLocaleString()}
                        </p>
                        {offer.netAmount && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Net: ${offer.netAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(offer.date).toLocaleDateString()}
                        </span>
                        {offer.expiresDate && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                            Expires: {new Date(offer.expiresDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={
                          offer.status === 'Accepted'
                            ? 'default'
                            : offer.status === 'Rejected'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {offer.status}
                      </Badge>
                    </div>
                    {onUpdateOffer && offer.status === 'Open' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onUpdateOffer(offer.id, { status: 'Accepted' })}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => onUpdateOffer(offer.id, { status: 'Rejected' })}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            // Create counter-offer
                            if (onAddOffer) {
                              const counterAmount = offer.amount * 1.1 // 10% increase
                              handleAddOffer()
                            }
                          }}
                        >
                          Counter
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


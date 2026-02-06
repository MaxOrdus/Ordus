'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Scale, TrendingDown, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { calculateSABSTortInteraction } from '@/lib/settlement-calculator'
import { cn } from '@/lib/utils'

interface SABSTortHydraulicProps {
  tortIncomeLoss: number
  tortFutureLoss: number
  sabsIRBPaid: number
  sabsFutureIRB: number
  sabsMedicalPaid: number
  tortFutureCare: number
  sabsMedicalLimit: number
}

export function SABSTortHydraulic({
  tortIncomeLoss,
  tortFutureLoss,
  sabsIRBPaid,
  sabsFutureIRB,
  sabsMedicalPaid,
  tortFutureCare,
  sabsMedicalLimit,
}: SABSTortHydraulicProps) {
  const interaction = React.useMemo(
    () => calculateSABSTortInteraction(tortIncomeLoss, sabsIRBPaid, tortFutureLoss, sabsFutureIRB),
    [tortIncomeLoss, sabsIRBPaid, tortFutureLoss, sabsFutureIRB]
  )

  const medicalInteraction = React.useMemo(() => {
    const unspentSABS = Math.max(0, sabsMedicalLimit - sabsMedicalPaid)
    const futureCareValue = Math.max(0, tortFutureCare - unspentSABS)
    return {
      unspentSABS,
      futureCareValue,
      hasValue: futureCareValue > 0,
    }
  }, [sabsMedicalPaid, sabsMedicalLimit, tortFutureCare])

  const totalEconomicValue = interaction.pastLossValue + interaction.futureLossValue + medicalInteraction.futureCareValue

  return (
    <Card variant="glass" className="p-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6 text-electric-teal" />
          <CardTitle>SABS/Tort Interaction Calculator</CardTitle>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Visualize how SABS benefits affect Tort claim value
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Alert */}
        {interaction.warning && (
          <div className="p-4 bg-living-coral/10 border-2 border-living-coral rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-living-coral flex-shrink-0" />
              <div>
                <p className="font-semibold text-living-coral mb-1">Economic Value Warning</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{interaction.warning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Visual Balance Scale */}
        <div className="flex items-center justify-center py-8">
          <div className="relative w-full max-w-2xl">
            {/* Scale Base */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-32 bg-gray-400" />
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-64 h-1 bg-gray-400" />

            {/* SABS Side */}
            <div className="absolute bottom-40 left-0 w-32">
              <div className="text-center mb-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">SABS Paid</p>
                <p className="text-lg font-bold text-living-coral">
                  ${(sabsIRBPaid + sabsMedicalPaid).toLocaleString()}
                </p>
              </div>
              <motion.div
                className="bg-living-coral rounded-lg p-4 text-white"
                animate={{
                  scaleY: Math.min(1, (sabsIRBPaid + sabsMedicalPaid) / Math.max(tortIncomeLoss + tortFutureCare, 1)),
                }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className="text-center">
                  <p className="text-xs opacity-90">IRB</p>
                  <p className="font-bold">${sabsIRBPaid.toLocaleString()}</p>
                  <p className="text-xs opacity-90 mt-2">Medical</p>
                  <p className="font-bold">${sabsMedicalPaid.toLocaleString()}</p>
                </div>
              </motion.div>
            </div>

            {/* Tort Side */}
            <div className="absolute bottom-40 right-0 w-32">
              <div className="text-center mb-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Tort Claim</p>
                <p className="text-lg font-bold text-electric-teal">
                  ${(tortIncomeLoss + tortFutureLoss + tortFutureCare).toLocaleString()}
                </p>
              </div>
              <motion.div
                className="bg-electric-teal rounded-lg p-4 text-white"
                animate={{
                  scaleY: Math.min(
                    1,
                    (tortIncomeLoss + tortFutureLoss + tortFutureCare) /
                      Math.max(sabsIRBPaid + sabsMedicalPaid, 1)
                  ),
                }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className="text-center">
                  <p className="text-xs opacity-90">Past Loss</p>
                  <p className="font-bold">${tortIncomeLoss.toLocaleString()}</p>
                  <p className="text-xs opacity-90 mt-2">Future</p>
                  <p className="font-bold">${(tortFutureLoss + tortFutureCare).toLocaleString()}</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <h3 className="font-semibold text-deep-indigo dark:text-vapor">Income Loss</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tort Past Loss:</span>
                <span className="font-medium">${tortIncomeLoss.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">SABS IRB Paid:</span>
                <span className="font-medium text-living-coral">-${sabsIRBPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-deep-indigo dark:text-vapor">Net Past Loss:</span>
                <span
                  className={cn(
                    'font-bold',
                    interaction.pastLossValue > 0 ? 'text-electric-teal' : 'text-living-coral'
                  )}
                >
                  ${interaction.pastLossValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-3">
                <span className="text-gray-600 dark:text-gray-400">Tort Future Loss:</span>
                <span className="font-medium">${tortFutureLoss.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Future SABS IRB:</span>
                <span className="font-medium text-living-coral">-${sabsFutureIRB.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-deep-indigo dark:text-vapor">Net Future Loss:</span>
                <span
                  className={cn(
                    'font-bold',
                    interaction.futureLossValue > 0 ? 'text-electric-teal' : 'text-living-coral'
                  )}
                >
                  ${interaction.futureLossValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-deep-indigo dark:text-vapor">Future Care</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tort Future Care:</span>
                <span className="font-medium">${tortFutureCare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Unspent SABS Medical:</span>
                <span className="font-medium text-living-coral">-${medicalInteraction.unspentSABS.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-deep-indigo dark:text-vapor">Net Future Care:</span>
                <span
                  className={cn(
                    'font-bold',
                    medicalInteraction.futureCareValue > 0 ? 'text-electric-teal' : 'text-living-coral'
                  )}
                >
                  ${medicalInteraction.futureCareValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Economic Value */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="p-4 rounded-lg bg-gradient-teal-violet text-white text-center">
            <p className="text-sm opacity-90 mb-1">Total Economic Value (Tort)</p>
            <p className="text-3xl font-bold">
              ${totalEconomicValue.toLocaleString()}
            </p>
            <Badge
              variant={totalEconomicValue > 0 ? 'default' : 'destructive'}
              className="mt-2 bg-white/20 text-white border-white/30"
            >
              {totalEconomicValue > 0 ? 'Has Economic Value' : 'No Economic Value'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


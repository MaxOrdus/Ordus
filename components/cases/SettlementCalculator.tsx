'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Calculator, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { calculateNetSettlement, calculateSABSTortInteraction } from '@/lib/settlement-calculator'
import { cn } from '@/lib/utils'

export function SettlementCalculator() {
  const [grossSettlement, setGrossSettlement] = React.useState(100000)
  const [legalFeePercent, setLegalFeePercent] = React.useState(30)
  const [disbursements, setDisbursements] = React.useState(5000)
  const [subrogation, setSubrogation] = React.useState(0)
  const [sabsPaid, setSabsPaid] = React.useState(0)
  const [isPainAndSuffering, setIsPainAndSuffering] = React.useState(true)
  const [isOverThreshold, setIsOverThreshold] = React.useState(false)

  const calculation = React.useMemo(
    () =>
      calculateNetSettlement(
        grossSettlement,
        legalFeePercent / 100,
        disbursements,
        subrogation,
        sabsPaid,
        isPainAndSuffering,
        isOverThreshold
      ),
    [grossSettlement, legalFeePercent, disbursements, subrogation, sabsPaid, isPainAndSuffering, isOverThreshold]
  )

  return (
    <Card variant="glass" className="p-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-electric-teal" />
          <CardTitle>Settlement Calculator</CardTitle>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Calculate net settlement after all deductions
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Gross Settlement ($)"
            type="number"
            value={grossSettlement}
            onChange={(e) => setGrossSettlement(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Legal Fee (%)"
            type="number"
            value={legalFeePercent}
            onChange={(e) => setLegalFeePercent(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Disbursements ($)"
            type="number"
            value={disbursements}
            onChange={(e) => setDisbursements(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Subrogation ($)"
            type="number"
            value={subrogation}
            onChange={(e) => setSubrogation(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="SABS Paid ($)"
            type="number"
            value={sabsPaid}
            onChange={(e) => setSabsPaid(parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPainAndSuffering}
              onChange={(e) => setIsPainAndSuffering(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Pain & Suffering (Tort Deductible applies)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOverThreshold}
              onChange={(e) => setIsOverThreshold(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Over Threshold</span>
          </label>
        </div>

        {/* Breakdown */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="font-semibold mb-4 text-deep-indigo dark:text-vapor">Settlement Breakdown</h3>
          <div className="space-y-2">
            {calculation.breakdown.map((item, index) => {
              const isNet = item.label === 'Net to Client'
              const isGross = item.label === 'Gross Settlement'
              
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    isNet
                      ? 'bg-electric-teal/10 border-2 border-electric-teal'
                      : isGross
                      ? 'bg-violet-500/10 border border-violet-500/30'
                      : 'bg-white/50 dark:bg-deep-indigo/30'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm',
                      isNet ? 'font-bold text-electric-teal' : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      'font-semibold',
                      item.type === 'deduction' ? 'text-living-coral' : 'text-electric-teal',
                      isNet && 'text-2xl'
                    )}
                  >
                    {item.type === 'deduction' ? '-' : ''}${Math.abs(item.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Net Amount Highlight */}
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="p-6 rounded-xl bg-gradient-teal-violet text-white text-center"
        >
          <p className="text-sm opacity-90 mb-2">Client Receives</p>
          <p className="text-4xl font-bold">
            ${calculation.netToClient.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-sm opacity-75 mt-2">
            {((calculation.netToClient / calculation.grossSettlement) * 100).toFixed(1)}% of gross settlement
          </p>
        </motion.div>
      </CardContent>
    </Card>
  )
}


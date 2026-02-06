'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CaseStageData {
  month: string
  intake: number
  discovery: number
  negotiation: number
  settlement: number
  trial: number
}

interface CaseVelocityStreamProps {
  data: CaseStageData[]
  className?: string
}

const stageColors = {
  intake: '#667EEA', // Violet
  discovery: '#00D2D3', // Electric Teal
  negotiation: '#FF6B6B', // Living Coral
  settlement: '#10B981', // Green
  trial: '#F59E0B', // Amber
}

export function CaseVelocityStream({ data, className }: CaseVelocityStreamProps) {
  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-2">
          Case Velocity Stream
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Visualize case flow through different stages over time
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        {Object.entries(stageColors).map(([stage, color]) => (
          <div key={stage} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {stage}
            </span>
          </div>
        ))}
      </div>

      {/* Stream Graph */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              {Object.entries(stageColors).map(([stage, color]) => (
                <linearGradient key={stage} id={`gradient-${stage}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="intake"
              stackId="1"
              stroke={stageColors.intake}
              fill={`url(#gradient-intake)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="discovery"
              stackId="1"
              stroke={stageColors.discovery}
              fill={`url(#gradient-discovery)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="negotiation"
              stackId="1"
              stroke={stageColors.negotiation}
              fill={`url(#gradient-negotiation)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="settlement"
              stackId="1"
              stroke={stageColors.settlement}
              fill={`url(#gradient-settlement)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="trial"
              stackId="1"
              stroke={stageColors.trial}
              fill={`url(#gradient-trial)`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        {Object.entries(stageColors).map(([stage, color]) => {
          const total = data.reduce((sum, d) => sum + (d[stage as keyof CaseStageData] as number), 0)
          return (
            <div key={stage} className="text-center">
              <div
                className="text-2xl font-bold mb-1"
                style={{ color }}
              >
                {total}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {stage}
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}


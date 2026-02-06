'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Clock, Flame, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface BillableStreakProps {
  currentStreak: number
  dailyTarget: number
  currentHours: number
  weeklyTotal: number
  className?: string
}

export function BillableStreak({
  currentStreak,
  dailyTarget,
  currentHours,
  weeklyTotal,
  className,
}: BillableStreakProps) {
  const progress = Math.min((currentHours / dailyTarget) * 100, 100)
  const isComplete = currentHours >= dailyTarget

  return (
    <Card variant="glass" className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-1">
            Billable Streak
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Keep your momentum going
          </p>
        </div>
        {currentStreak > 0 && (
          <div className="flex items-center gap-2 text-living-coral">
            <Flame className="w-6 h-6" />
            <span className="text-2xl font-bold">{currentStreak}</span>
            <span className="text-sm">days</span>
          </div>
        )}
      </div>

      {/* Activity Ring */}
      <div className="relative w-48 h-48 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx="96"
            cy="96"
            r="88"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="96"
            cy="96"
            r="88"
            stroke="url(#gradient)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 88}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
            animate={{
              strokeDashoffset: 2 * Math.PI * 88 * (1 - progress / 100),
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D2D3" />
              <stop offset="100%" stopColor="#667EEA" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock className="w-8 h-8 text-electric-teal mb-2" />
          <motion.div
            key={currentHours}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold text-deep-indigo dark:text-vapor"
          >
            {currentHours.toFixed(1)}
          </motion.div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            / {dailyTarget}h
          </div>
        </div>

        {/* Completion Animation */}
        {isComplete && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <div className="w-24 h-24 rounded-full bg-electric-teal/20 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-electric-teal" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-deep-indigo dark:text-vapor">
            {weeklyTotal.toFixed(1)}h
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">This Week</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-electric-teal">
            {Math.round(progress)}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Today&apos;s Progress</p>
        </div>
      </div>

      {/* Motivational Message */}
      {isComplete ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-lg bg-electric-teal/10 text-center"
        >
          <p className="text-sm font-semibold text-electric-teal">
            🎉 Ring Complete! Keep the streak alive!
          </p>
        </motion.div>
      ) : (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dailyTarget - currentHours > 0
              ? `${(dailyTarget - currentHours).toFixed(1)} more hours to close the ring`
              : 'Almost there!'}
          </p>
        </div>
      )}
    </Card>
  )
}


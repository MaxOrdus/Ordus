'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-electric-teal/20 text-electric-teal border-electric-teal/30',
      secondary: 'bg-violet-500/20 text-violet-500 border-violet-500/30',
      destructive: 'bg-living-coral/20 text-living-coral border-living-coral/30',
      outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
      warning: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }


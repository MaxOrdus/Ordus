'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-deep-indigo/50 px-3 py-2 text-sm text-deep-indigo dark:text-vapor placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-teal focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
            error && 'border-living-coral focus:ring-living-coral',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-living-coral">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }


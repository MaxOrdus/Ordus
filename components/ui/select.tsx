'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  error?: string
  label?: string
  options: SelectOption[]
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-deep-indigo dark:text-vapor mb-2">
            {label}
          </label>
        )}
        <select
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-deep-indigo/50 px-3 py-2 text-sm text-deep-indigo dark:text-vapor focus:outline-none focus:ring-2 focus:ring-electric-teal focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
            error && 'border-living-coral focus:ring-living-coral',
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-living-coral">{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }

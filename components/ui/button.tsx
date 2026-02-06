'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
    
    const variants = {
      primary: 'bg-electric-teal text-white hover:bg-electric-teal/90 focus:ring-electric-teal shadow-lg shadow-electric-teal/30',
      secondary: 'bg-gradient-violet-cyan text-white hover:opacity-90 focus:ring-violet-500',
      accent: 'bg-living-coral text-white hover:bg-living-coral/90 focus:ring-living-coral shadow-lg shadow-living-coral/30',
      ghost: 'bg-transparent hover:bg-white/10 text-deep-indigo dark:text-vapor',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...(props as any)}
      >
        {isLoading ? (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          children
        )}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

export { Button }


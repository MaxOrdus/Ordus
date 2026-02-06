'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { CommandPalette } from '@/components/command-palette/CommandPalette'

interface DashboardLayoutProps {
  children: React.ReactNode
  activeNavId: string
}

/**
 * Centralized layout wrapper for all dashboard pages.
 * Handles:
 * - Global navigation rail
 * - Command palette (⌘K)
 * - Consistent background and spacing
 */
export function DashboardLayout({ children, activeNavId }: DashboardLayoutProps) {
  const router = useRouter()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)

  // Command palette keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNavItemClick = (itemId: string) => {
    if (itemId === activeNavId) return
    router.push(itemId === 'dashboard' ? '/' : `/${itemId}`)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail 
        activeItem={activeNavId} 
        onItemClick={handleNavItemClick} 
      />

      <main className="flex-1 ml-20 overflow-y-auto">
        {children}
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  )
}

/**
 * Standard page header component for consistency across pages
 */
interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="px-8 py-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-deep-indigo/30 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo dark:text-vapor">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Standard page content container with consistent padding
 */
interface PageContentProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function PageContent({ children, className = '', noPadding = false }: PageContentProps) {
  return (
    <div className={`${noPadding ? '' : 'px-8 py-6'} ${className}`}>
      {children}
    </div>
  )
}


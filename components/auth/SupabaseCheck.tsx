'use client'

import * as React from 'react'
import { isSupabaseConfigured } from '@/lib/supabase/singleton'

interface SupabaseCheckProps {
  children: React.ReactNode
}

export function SupabaseCheck({ children }: SupabaseCheckProps) {
  const [isConfigured, setIsConfigured] = React.useState<boolean | null>(null)
  const [demoMode, setDemoMode] = React.useState(false)

  React.useEffect(() => {
    const isDemo = localStorage.getItem('ordus-demo-mode') === 'true'
    setDemoMode(isDemo)
    setIsConfigured(isSupabaseConfigured() || isDemo)
  }, [])

  const enableDemoMode = () => {
    localStorage.setItem('ordus-demo-mode', 'true')
    setDemoMode(true)
    setIsConfigured(true)
    window.location.reload()
  }

  const disableDemoMode = () => {
    localStorage.removeItem('ordus-demo-mode')
    setDemoMode(false)
    setIsConfigured(false)
    window.location.reload()
  }

  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-vapor dark:bg-deep-indigo">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-teal mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking configuration...</p>
        </div>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-vapor dark:bg-deep-indigo p-4">
        <div className="max-w-md w-full bg-white dark:bg-deep-indigo/50 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-deep-indigo dark:text-vapor mb-4">
            ⚠️ Supabase Not Configured
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ordus requires Supabase for authentication and data storage.
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Quick Start:</strong>
            </p>
            <ol className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 ml-4 list-decimal space-y-1">
              <li>Go to <a href="https://supabase.com" className="underline" target="_blank">supabase.com</a></li>
              <li>Create a new project</li>
              <li>Copy Project URL and Anon Key</li>
              <li>Paste in <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code></li>
              <li>Run database migrations</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <a 
              href="https://github.com/MaxOrdus/Ordus/blob/main/SETUP_GUIDE.md"
              target="_blank"
              className="flex-1 bg-electric-teal text-white text-center py-2 rounded-lg font-medium hover:bg-electric-teal/90"
            >
              View Setup Guide
            </a>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">
            Or use Demo Mode below to explore the UI
          </p>

          <button
            onClick={enableDemoMode}
            className="w-full mt-3 bg-living-coral text-white py-2 rounded-lg font-medium hover:bg-living-coral/90"
          >
            🎮 Enter Demo Mode
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
            Demo mode uses mock data - perfect for testing UI!
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {demoMode && (
        <div className="fixed top-0 left-0 right-0 bg-living-coral text-white text-center py-1 z-50 text-sm font-medium">
          🎮 DEMO MODE - Mock Data Only
          <button onClick={disableDemoMode} className="ml-3 underline text-xs">
            Exit Demo
          </button>
        </div>
      )}
      {children}
    </>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

// Skeleton that shows immediately while auth loads
function LoadingSkeleton() {
  return (
    <div className="flex h-screen bg-vapor dark:bg-deep-indigo">
      {/* Nav skeleton */}
      <div className="w-20 h-full bg-white/50 dark:bg-white/5 animate-pulse" />
      
      {/* Main content skeleton */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          
          {/* Cards skeleton */}
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-white/50 dark:bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
          
          {/* Main content skeleton */}
          <div className="h-96 bg-white/50 dark:bg-white/5 rounded-xl animate-pulse" />
        </div>
      </main>
    </div>
  )
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [showContent, setShowContent] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (!isLoading && user) {
      setShowContent(true)
    }
  }, [user, isLoading, router])

  // Show skeleton immediately - much better UX than blank spinner
  if (isLoading || !showContent) {
    return <LoadingSkeleton />
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

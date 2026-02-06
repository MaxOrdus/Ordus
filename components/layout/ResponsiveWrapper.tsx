'use client'

import * as React from 'react'

/**
 * Responsive Wrapper Component
 * Provides mobile-responsive layout adjustments
 */
export function ResponsiveWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      {children}
    </div>
  )
}

/**
 * Hook to detect mobile viewport
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}


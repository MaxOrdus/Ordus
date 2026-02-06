'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Clock,
  Settings,
  Search,
  CheckSquare,
  Shield,
  Crown,
  LogOut,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  adminOnly?: boolean      // Show for Admin and SuperAdmin
  superAdminOnly?: boolean // Show only for SuperAdmin
  hideForRoles?: string[]  // Hide for specific roles
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'cases', label: 'Cases', icon: Briefcase, href: '/cases', hideForRoles: ['LawClerk', 'LegalAssistant'] },
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  { id: 'time', label: 'Time', icon: Clock, href: '/time' },
  { id: 'team', label: 'Team', icon: Users, href: '/team' },
  { id: 'super-admin', label: 'Platform', icon: Crown, href: '/super-admin', superAdminOnly: true },
  { id: 'admin', label: 'Firm Admin', icon: Shield, href: '/admin', adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
]

interface GlobalNavRailProps {
  activeItem?: string
  onItemClick?: (itemId: string) => void
}

export function GlobalNavRail({ activeItem, onItemClick }: GlobalNavRailProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  
  const isSuperAdmin = user?.role === 'SuperAdmin'
  const isAdmin = user?.role === 'Admin' || isSuperAdmin
  
  // Filter items based on role
  const visibleItems = navItems.filter(item => {
    // SuperAdmin-only items
    if (item.superAdminOnly) return isSuperAdmin
    // Admin-only items (visible to both Admin and SuperAdmin)
    if (item.adminOnly) return isAdmin
    // Hide for specific roles
    if (item.hideForRoles && user?.role && item.hideForRoles.includes(user.role)) {
      return false
    }
    // Regular items visible to all
    return true
  })

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }
  
  return (
    <motion.nav
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-full w-20 bg-deep-indigo flex flex-col items-center py-6 z-50 shadow-2xl"
    >
      {/* Logo/Brand */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-teal-violet flex items-center justify-center text-white font-bold text-xl">
          O
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-4 flex-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={cn(
                'relative w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'bg-electric-teal/90 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <motion.div
                  className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-electric-teal rounded-l-full"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* User Section */}
      <div className="flex flex-col items-center gap-2 mb-4">
        {/* User Avatar */}
        {user && (
          <motion.div
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
            whileHover={{ scale: 1.05 }}
            title={`${user.name} (${user.role})`}
          >
            <span className="text-gray-300 font-medium text-sm">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </motion.div>
        )}

        {/* Logout Button */}
        <motion.button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-9 h-9 rounded-lg text-gray-500 hover:bg-white/5 hover:text-red-400 flex items-center justify-center transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          title="Sign Out"
        >
          {isLoggingOut ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      {/* Command Palette Trigger */}
      <motion.button
        className="w-12 h-12 rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white flex items-center justify-center transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        title="Command Palette (⌘K)"
        onClick={() => {
          // Trigger command palette
          const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
          })
          document.dispatchEvent(event)
        }}
      >
        <Search className="w-5 h-5" />
      </motion.button>
    </motion.nav>
  )
}


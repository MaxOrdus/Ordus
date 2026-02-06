'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface ListItem {
  id: string
  title: string
  subtitle?: string
  status?: 'active' | 'stalled' | 'fresh' | 'critical'
  metadata?: Record<string, any>
}

interface SplitViewNavigatorProps<T extends ListItem> {
  items: T[]
  selectedId?: string
  onSelect?: (item: T) => void
  onFilter?: (query: string) => void
  renderDetail?: (item: T) => React.ReactNode
  renderListItem?: (item: T, isSelected: boolean) => React.ReactNode
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export function SplitViewNavigator<T extends ListItem>({
  items,
  selectedId,
  onSelect,
  onFilter,
  renderDetail,
  renderListItem,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found',
  className,
}: SplitViewNavigatorProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [dividerPosition, setDividerPosition] = React.useState(40) // Percentage
  const [isDragging, setIsDragging] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // Find selected item - check both in items and ensure it exists
  const selectedItem = React.useMemo(() => {
    return items.find((item) => item.id === selectedId)
  }, [items, selectedId])

  // When search changes, notify parent if onFilter is provided
  React.useEffect(() => {
    if (onFilter) {
      onFilter(searchQuery)
    }
  }, [searchQuery, onFilter])
  
  // Filter items locally if no onFilter callback (internal filtering)
  const displayItems = React.useMemo(() => {
    if (!onFilter && searchQuery) {
      const query = searchQuery.toLowerCase()
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query)
      )
    }
    return items
  }, [items, searchQuery, onFilter])

  const handleDividerDrag = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100
    
    // Constrain between 25% and 75%
    const constrainedPosition = Math.max(25, Math.min(75, newPosition))
    setDividerPosition(constrainedPosition)
  }, [isDragging])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDividerDrag)
      document.addEventListener('mouseup', () => setIsDragging(false))
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleDividerDrag)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, handleDividerDrag])

  const defaultRenderListItem = (item: T, isSelected: boolean) => {
    const statusColors = {
      active: 'bg-electric-teal/20 border-electric-teal',
      stalled: 'bg-living-coral/20 border-living-coral',
      fresh: 'bg-green-500/20 border-green-500',
      critical: 'bg-red-500/20 border-red-500',
    }

    return (
      <motion.div
        key={item.id}
        onClick={() => onSelect?.(item)}
        className={cn(
          'p-4 rounded-lg cursor-pointer transition-all duration-200',
          isSelected
            ? 'bg-electric-teal/10 border-2 border-electric-teal shadow-lg'
            : 'bg-white/50 dark:bg-deep-indigo/30 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600',
          item.status && statusColors[item.status]
        )}
        whileHover={{ x: 4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        layout
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-deep-indigo dark:text-vapor truncate">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                {item.subtitle}
              </p>
            )}
          </div>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-2"
            >
              <ChevronRight className="w-5 h-5 text-electric-teal" />
            </motion.div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div ref={containerRef} className={cn('flex h-full w-full', className)}>
      {/* Navigator Pane */}
      <motion.div
        className="flex flex-col h-full overflow-hidden"
        style={{ width: `${dividerPosition}%` }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/50 dark:bg-deep-indigo/50 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-electric-teal focus:border-transparent text-deep-indigo dark:text-vapor"
            />
          </div>
        </div>

        {/* List Container with Immersive Scrolling */}
        <div className="flex-1 overflow-y-auto immersive-scroll p-4 space-y-2">
          <AnimatePresence mode="popLayout">
            {displayItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-gray-500"
              >
                {emptyMessage}
              </motion.div>
            ) : (
              displayItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderListItem
                    ? renderListItem(item, item.id === selectedId)
                    : defaultRenderListItem(item, item.id === selectedId)}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Divider */}
      <div
        className="w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-electric-teal transition-colors relative group"
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-electric-teal opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
      </div>

      {/* Detail Pane */}
      <motion.div
        className="flex-1 h-full overflow-hidden bg-vapor dark:bg-deep-indigo/30"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <AnimatePresence mode="wait">
          {selectedItem && renderDetail ? (
            <motion.div
              key={selectedItem.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto p-6"
            >
              {renderDetail(selectedItem)}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center text-gray-500"
            >
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Select an item to view details</p>
                <p className="text-sm">Choose from the list to see full information</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}


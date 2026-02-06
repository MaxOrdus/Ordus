'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Briefcase, FileText, Clock, Users, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Command {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action: () => void
  category?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands?: Command[]
}

const defaultCommands: Command[] = [
  {
    id: 'new-case',
    label: 'New Case',
    description: 'Create a new case file',
    icon: Briefcase,
    action: () => console.log('New case'),
    category: 'Cases',
  },
  {
    id: 'new-document',
    label: 'New Document',
    description: 'Upload or create a document',
    icon: FileText,
    action: () => console.log('New document'),
    category: 'Documents',
  },
  {
    id: 'log-time',
    label: 'Log Time Entry',
    description: 'Record billable hours',
    icon: Clock,
    action: () => console.log('Log time'),
    category: 'Time',
  },
  {
    id: 'new-client',
    label: 'New Client',
    description: 'Add a new client',
    icon: Users,
    action: () => console.log('New client'),
    category: 'Clients',
  },
]

export function CommandPalette({ isOpen, onClose, commands = defaultCommands }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filteredCommands = React.useMemo(() => {
    if (!searchQuery) return commands
    
    const query = searchQuery.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query) ||
        cmd.category?.toLowerCase().includes(query)
    )
  }, [searchQuery, commands])

  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault()
        filteredCommands[selectedIndex].action()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onClose])

  React.useEffect(() => {
    const handleMetaK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // Toggle handled by parent
      }
    }

    document.addEventListener('keydown', handleMetaK)
    return () => document.removeEventListener('keydown', handleMetaK)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 flex items-start justify-center pt-[20vh] z-50 pointer-events-none"
          >
            <div className="w-full max-w-2xl mx-4 pointer-events-auto">
              <div className="glass-strong rounded-2xl shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="p-4 border-b border-white/20">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setSelectedIndex(0)
                      }}
                      placeholder="Type a command or search..."
                      className="w-full pl-12 pr-4 py-3 bg-transparent text-deep-indigo dark:text-vapor placeholder-gray-400 focus:outline-none text-lg"
                    />
                  </div>
                </div>

                {/* Command List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredCommands.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-sm">No commands found</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredCommands.map((command, index) => {
                        const Icon = command.icon || Search
                        const isSelected = index === selectedIndex

                        return (
                          <motion.button
                            key={command.id}
                            onClick={() => {
                              command.action()
                              onClose()
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150',
                              isSelected
                                ? 'bg-electric-teal/20 text-electric-teal'
                                : 'hover:bg-white/10 text-gray-700 dark:text-gray-300'
                            )}
                            whileHover={{ x: 4 }}
                          >
                            <Icon className={cn('w-5 h-5', isSelected ? 'text-electric-teal' : 'text-gray-400')} />
                            <div className="flex-1 text-left">
                              <div className="font-medium">{command.label}</div>
                              {command.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {command.description}
                                </div>
                              )}
                            </div>
                            {command.category && (
                              <span className="text-xs px-2 py-1 rounded bg-white/20 text-gray-600 dark:text-gray-400">
                                {command.category}
                              </span>
                            )}
                            {isSelected && (
                              <motion.div
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                              >
                                <ArrowRight className="w-4 h-4 text-electric-teal" />
                              </motion.div>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/20 bg-white/5 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-2 py-1 rounded bg-white/20">↑</kbd>
                      <kbd className="px-2 py-1 rounded bg-white/20">↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-2 py-1 rounded bg-white/20">Enter</kbd>
                      Select
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-white/20">Esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}


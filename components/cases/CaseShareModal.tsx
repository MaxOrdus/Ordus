'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Trash2, ChevronDown, Users, Shield, Eye, Edit, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/auth/AuthProvider'
import { CaseAccess, CaseAccessLevel } from '@/types'

interface TeamMember {
  id: string
  name: string
  email?: string
  role: string
}

interface CaseShareModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  caseTitle: string
}

const ACCESS_LEVELS: { value: CaseAccessLevel; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'view', label: 'View', description: 'Can view case details and documents', icon: Eye },
  { value: 'edit', label: 'Edit', description: 'Can modify case, add documents and tasks', icon: Edit },
  { value: 'full', label: 'Full Access', description: 'Can share with others and manage access', icon: Shield },
]

export function CaseShareModal({ isOpen, onClose, caseId, caseTitle }: CaseShareModalProps) {
  const { user } = useAuth()
  const [accessList, setAccessList] = React.useState<CaseAccess[]>([])
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [selectedAccessLevel, setSelectedAccessLevel] = React.useState<CaseAccessLevel>('view')
  const [showUserDropdown, setShowUserDropdown] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  // Fetch access list and team members
  React.useEffect(() => {
    if (!isOpen || !caseId || !user?.firmId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch current access list
        const accessRes = await fetch(`/api/cases/access?caseId=${caseId}`)
        if (accessRes.ok) {
          const { data } = await accessRes.json()
          setAccessList(data || [])
        }

        // Fetch team members from the firm
        const teamRes = await fetch(`/api/admin/team?firmId=${user.firmId}`)
        if (teamRes.ok) {
          const { data } = await teamRes.json()
          setTeamMembers(data || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, caseId, user?.firmId])

  // Filter team members who don't have access yet
  const availableMembers = React.useMemo(() => {
    const accessUserIds = new Set(accessList.map(a => a.userId))
    return teamMembers.filter(m =>
      !accessUserIds.has(m.id) &&
      m.id !== user?.id &&
      (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       m.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [teamMembers, accessList, searchQuery, user?.id])

  const handleGrantAccess = async () => {
    if (!selectedUserId || !user) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/cases/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          userId: selectedUserId,
          accessLevel: selectedAccessLevel,
          grantedBy: user.id
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to grant access')
      }

      // Refresh access list
      const accessRes = await fetch(`/api/cases/access?caseId=${caseId}`)
      if (accessRes.ok) {
        const { data } = await accessRes.json()
        setAccessList(data || [])
      }

      setSelectedUserId(null)
      setSearchQuery('')
      setShowUserDropdown(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateAccess = async (accessId: string, newLevel: CaseAccessLevel) => {
    if (!user) return

    try {
      const res = await fetch('/api/cases/access', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessId,
          accessLevel: newLevel,
          requestedBy: user.id
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update access')
      }

      // Update local state
      setAccessList(prev => prev.map(a =>
        a.id === accessId ? { ...a, accessLevel: newLevel } : a
      ))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRevokeAccess = async (accessId: string) => {
    if (!user) return

    try {
      const res = await fetch(`/api/cases/access?accessId=${accessId}&requestedBy=${user.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke access')
      }

      // Update local state
      setAccessList(prev => prev.filter(a => a.id !== accessId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const selectedMember = teamMembers.find(m => m.id === selectedUserId)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-electric-teal/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-electric-teal" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-deep-indigo dark:text-vapor">Share Case</h2>
                  <p className="text-sm text-gray-500 truncate max-w-[280px]">{caseTitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Add People Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add people
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Search team members..."
                    value={selectedMember ? selectedMember.name : searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setSelectedUserId(null)
                      setShowUserDropdown(true)
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                  />

                  {/* User Dropdown */}
                  {showUserDropdown && availableMembers.length > 0 && !selectedUserId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto z-10">
                      {availableMembers.map(member => (
                        <button
                          key={member.id}
                          onClick={() => {
                            setSelectedUserId(member.id)
                            setShowUserDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric-teal to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-deep-indigo dark:text-vapor text-sm">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Access Level Selector */}
                <div className="relative">
                  <select
                    value={selectedAccessLevel}
                    onChange={(e) => setSelectedAccessLevel(e.target.value as CaseAccessLevel)}
                    className="h-10 px-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  >
                    {ACCESS_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleGrantAccess}
                  disabled={!selectedUserId || saving}
                  className="shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Current Access List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                People with access
              </label>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : accessList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No one has been granted access yet.</p>
                  <p className="text-sm">The creator and firm admins always have access.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessList.map(access => (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          access.isCreator ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-electric-teal to-blue-500'
                        }`}>
                          {access.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-deep-indigo dark:text-vapor text-sm">
                              {access.user?.name || 'Unknown'}
                            </p>
                            {access.isCreator && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                <Crown className="w-3 h-3" />
                                Creator
                              </span>
                            )}
                            {access.userId === user?.id && (
                              <span className="px-1.5 py-0.5 rounded bg-electric-teal/10 text-electric-teal text-[10px] font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{access.user?.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {access.isCreator ? (
                          <span className="text-xs text-gray-500 px-2">Full Access</span>
                        ) : (
                          <>
                            <select
                              value={access.accessLevel}
                              onChange={(e) => handleUpdateAccess(access.id, e.target.value as CaseAccessLevel)}
                              className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              disabled={access.userId === user?.id}
                            >
                              {ACCESS_LEVELS.map(level => (
                                <option key={level.value} value={level.value}>{level.label}</option>
                              ))}
                            </select>
                            {access.userId !== user?.id && (
                              <button
                                onClick={() => handleRevokeAccess(access.id)}
                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
              <p className="font-medium mb-1">Access Levels:</p>
              <ul className="space-y-1">
                <li><strong>View:</strong> Can see case details and documents</li>
                <li><strong>Edit:</strong> Can modify the case, add documents and tasks</li>
                <li><strong>Full:</strong> Can share with others and manage all access</li>
              </ul>
              <p className="mt-2 text-blue-600 dark:text-blue-400">
                Note: Firm administrators always have full access to all cases.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

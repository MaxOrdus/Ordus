'use client'

import * as React from 'react'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, User, Palette, Shield, Database, Upload, Loader2, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MigrationWizard } from '@/components/onboarding/MigrationWizard'
import { useAuth } from '@/components/auth/AuthProvider'
import { getSupabase } from '@/lib/supabase/singleton'

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const [darkMode, setDarkMode] = React.useState(false)
  const [showImportWizard, setShowImportWizard] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  // Form state
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')

  // Load user data
  React.useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
    }
  }, [user])

  // Check for dark mode on mount
  React.useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  const handleSaveProfile = async () => {
    if (!user?.id) return

    setSaving(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('users_metadata')
        .update({ name, phone })
        .eq('id', user.id)

      if (error) throw error

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail activeItem="settings" onItemClick={(id) => {
        if (id === 'settings') return
        router.push(id === 'dashboard' ? '/' : `/${id}`)
      }} />
      
      <main className="flex-1 ml-20 overflow-y-auto">
        <div className="container mx-auto px-8 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-deep-indigo dark:text-vapor mb-2">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account and application preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Settings */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-electric-teal" />
                  <div>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  disabled
                  className="opacity-60"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(416) 555-0123"
                />
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved!
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-electric-teal" />
                  <div>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Switch to dark theme
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDarkMode(!darkMode)
                      document.documentElement.classList.toggle('dark')
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      darkMode ? 'bg-electric-teal' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-electric-teal" />
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Manage how you receive updates</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive email updates for case activity
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Deadline Reminders</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get notified about upcoming deadlines
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-electric-teal" />
                  <div>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage your account security</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input label="Current Password" type="password" />
                <Input label="New Password" type="password" />
                <Input label="Confirm New Password" type="password" />
                <Button variant="accent">Update Password</Button>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-electric-teal" />
                  <div>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Import, export, or backup your data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="secondary" className="w-full">
                  Export All Data
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => setShowImportWizard(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Cases from CSV
                </Button>
                <Button variant="accent" className="w-full">
                  Backup Database
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {showImportWizard && (
        <MigrationWizard
          onComplete={() => {
            setShowImportWizard(false)
            router.push('/cases')
          }}
          onCancel={() => setShowImportWizard(false)}
        />
      )}
    </div>
  )
}


'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scale } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout. Please check your internet connection and try again.')), 10000)
    })

    try {
      // Race between login and timeout
      await Promise.race([
        login(email, password),
        timeoutPromise
      ])
      router.push('/')
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please try again.'
      // Make error messages user-friendly
      if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.')
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        setError('Connection problem. Please check your internet and try again.')
      } else if (errorMessage.includes('Failed to load user profile')) {
        setError('Account setup incomplete. Please contact support.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-deep-indigo via-indigo-900 to-deep-indigo p-4">
      <Card variant="glass" className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-teal to-cyan-500 flex items-center justify-center">
              <Scale className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-deep-indigo dark:text-vapor">
            Ordus
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Legal Practice Management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                <p>{error}</p>
                {error.includes('Connection') && (
                  <button
                    type="button"
                    onClick={() => { setError(''); setRetryCount(r => r + 1) }}
                    className="mt-2 text-xs underline hover:no-underline"
                  >
                    Dismiss and try again
                  </button>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lawyer@firm.com"
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-electric-teal to-cyan-500 hover:from-electric-teal/90 hover:to-cyan-500/90 text-white"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>Demo accounts:</p>
              <p className="mt-1">
                <span className="font-mono">lawyer@firm.com</span> (Lawyer)
              </p>
              <p>
                <span className="font-mono">clerk@firm.com</span> (Law Clerk)
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


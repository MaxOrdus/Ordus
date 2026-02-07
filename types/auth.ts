/**
 * Authentication and User Management Types
 */

import { UserRole } from './tasks'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: UserRole
  avatar?: string
  firmId?: string // Multi-tenant support
  createdAt: string
  lastLoginAt?: string
  isActive: boolean
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: NotificationPreferences
  dashboard: DashboardPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  criticalDeadlines: boolean
  treatmentGaps: boolean
  taskAssignments: boolean
  settlementOffers: boolean
}

export interface DashboardPreferences {
  showBillableStreak: boolean
  showCaseVelocity: boolean
  showRedZone: boolean
  showStalledCases: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  email: string
  password: string
  name: string
  role: UserRole
  firmId?: string // Optional: for joining existing firm
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: ActivityAction
  entityType: 'Case' | 'Task' | 'Document' | 'Client' | 'User'
  entityId: string
  entityTitle: string
  timestamp: string
  metadata?: Record<string, any>
}

export type ActivityAction =
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Viewed'
  | 'Assigned'
  | 'Completed'
  | 'Commented'
  | 'Logged Time'
  | 'Uploaded Document'
  | 'Sent Email'
  | 'Generated Report'


/**
 * Core type definitions for Ordus Legal Practice Management
 * 
 * This file serves as the barrel export for all types.
 * Import types from '@/types' for convenience.
 */

// Re-export all types from other modules
export * from './auth'
export * from './tasks'
export * from './pi-case'

// ============================================
// LEGACY TYPES (kept for backwards compatibility)
// ============================================

export interface Case {
  id: string
  title: string
  subtitle?: string
  clientName: string
  caseValue: number
  lastActivity: string
  nextDeadline?: string
  status: 'active' | 'stalled' | 'fresh' | 'critical'
  stage: CaseStage
  type: CaseType
  metadata?: Record<string, any>
}

export type CaseStage = 'Intake' | 'Discovery' | 'Negotiation' | 'Settlement' | 'Trial' | 'Appeal'
export type CaseType = 'Tort' | 'SABS' | 'Hybrid'

export interface Document {
  id: string
  caseId: string
  title: string
  type: DocumentType
  uploadedAt: string
  size: number
  url: string
  tags?: string[]
}

export type DocumentType = 'Pleading' | 'Medical' | 'Evidence' | 'Correspondence' | 'Other'

export interface TimeEntry {
  id: string
  caseId: string
  description: string
  hours: number
  date: string
  billable: boolean
  rate?: number
}

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  cases: string[] // Case IDs
}

export interface SABSClaim {
  caseId: string
  benefitType: SABSBenefitType
  weeklyAmount?: number
  electionDate?: string
  terminationDate?: string
  totalPaid: number
  policyLimit: number
}

export type SABSBenefitType = 'IRB' | 'Medical' | 'Rehab' | 'AttendantCare' | 'NonEarner'

export interface TortClaim {
  caseId: string
  pastLossOfIncome: number
  futureLossOfIncome: number
  pastCareCost: number
  futureCareCost: number
  generalDamages: number
  specialDamages: number
  liabilityPercentage: number
}

export interface TreatmentGap {
  caseId: string
  startDate: string
  endDate: string
  durationDays: number
  treatmentType?: string
}

// Case Access Control Types
export type CaseAccessLevel = 'view' | 'edit' | 'full'

export interface CaseAccess {
  id: string
  caseId: string
  userId: string
  grantedBy: string
  accessLevel: CaseAccessLevel
  isCreator: boolean
  createdAt: string
  updatedAt: string
  // Joined fields (populated when fetching)
  user?: {
    id: string
    name: string
    email?: string
    role: string
  }
  grantedByUser?: {
    id: string
    name: string
  }
}

export interface CaseAccessGrant {
  caseId: string
  userId: string
  accessLevel: CaseAccessLevel
}


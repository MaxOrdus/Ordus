/**
 * Application constants and configuration
 */

export const APP_NAME = 'Ordus'
export const APP_DESCRIPTION = 'Functional Vibrancy Legal Practice Management'

// Color system (matching Tailwind config)
export const COLORS = {
  DEEP_INDIGO: '#2A2F4F',
  ELECTRIC_TEAL: '#00D2D3',
  LIVING_CORAL: '#FF6B6B',
  VAPOR: '#F4F6F8',
  FADE_GREY: '#9CA3AF',
} as const

// Case status thresholds (in days)
export const CASE_STATUS_THRESHOLDS = {
  FRESH: 60,
  WARNING: 90,
  STALLED: 120,
  CRITICAL: 120,
} as const

// Treatment gap thresholds
export const TREATMENT_GAP_THRESHOLD_DAYS = 14

// Billable hour defaults
export const DEFAULT_DAILY_BILLABLE_TARGET = 8
export const DEFAULT_HOURLY_RATE = 300

// SABS Policy Limits (Ontario)
export const SABS_POLICY_LIMITS = {
  STANDARD_MEDICAL_REHAB: 65000,
  CAT_MEDICAL_REHAB: 1000000,
  STANDARD_ATTENDANT_CARE: 0, // Varies
  CAT_ATTENDANT_CARE: 1000000,
} as const

// Navigation items
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'cases', label: 'Cases', href: '/cases' },
  { id: 'documents', label: 'Documents', href: '/documents' },
  { id: 'time', label: 'Time', href: '/time' },
  { id: 'clients', label: 'Clients', href: '/clients' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const

// Command palette shortcuts
export const COMMAND_PALETTE_SHORTCUT = 'meta+k' // ⌘K on Mac, Ctrl+K on Windows


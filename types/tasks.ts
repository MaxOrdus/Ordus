/**
 * Task and Role Management Types
 * Based on PI practice workflow requirements
 */

// SuperAdmin = Platform owner (G. Laloshi Legal) - manages ALL firms
// Admin = Firm Admin/Owner - manages their own firm only
export type UserRole = 'SuperAdmin' | 'Admin' | 'Lawyer' | 'LawClerk' | 'Paralegal' | 'LegalAssistant' | 'AccidentBenefitsCoordinator'

export interface Task {
  id: string
  caseId: string
  title: string
  description?: string
  assignedTo?: UserRole
  assignedToUserId?: string
  createdBy: string
  createdAt: string
  updatedAt?: string
  dueDate?: string
  completedAt?: string
  completed?: boolean
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory
  metadata?: Record<string, any>
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Blocked' | 'Cancelled'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TaskCategory =
  | 'OCF Forms'
  | 'Discovery'
  | 'Pleadings'
  | 'Medical Records'
  | 'Undertakings'
  | 'Settlement'
  | 'LAT'
  | 'Court'
  | 'Client Communication'
  | 'Administrative'
  | 'Other'

export interface TaskTemplate {
  id: string
  name: string
  description: string
  category: TaskCategory
  defaultAssignee: UserRole
  defaultPriority: TaskPriority
  estimatedHours?: number
  trigger: TaskTrigger
  metadata?: Record<string, any>
}

export type TaskTrigger =
  | { type: 'OnCaseOpen' }
  | { type: 'OnDeadline'; deadlineType: string; daysBefore: number }
  | { type: 'OnFormSubmission'; formType: string }
  | { type: 'OnStatusChange'; fromStatus: string; toStatus: string }
  | { type: 'Manual' }

export interface RolePermissions {
  role: UserRole
  canViewCases: boolean
  canEditCases: boolean
  canCreateCases: boolean
  canDeleteCases: boolean
  canViewFinancials: boolean
  canEditFinancials: boolean
  canViewAllTasks: boolean
  canAssignTasks: boolean
  allowedTaskCategories: TaskCategory[]
  restrictedTaskCategories: TaskCategory[]
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  SuperAdmin: {
    role: 'SuperAdmin',
    canViewCases: true,
    canEditCases: true,
    canCreateCases: true,
    canDeleteCases: true,
    canViewFinancials: true,
    canEditFinancials: true,
    canViewAllTasks: true,
    canAssignTasks: true,
    allowedTaskCategories: ['OCF Forms', 'Discovery', 'Pleadings', 'Medical Records', 'Undertakings', 'Settlement', 'LAT', 'Court', 'Client Communication', 'Administrative', 'Other'],
    restrictedTaskCategories: [],
  },
  Admin: {
    role: 'Admin',
    canViewCases: true,
    canEditCases: true,
    canCreateCases: true,
    canDeleteCases: true,
    canViewFinancials: true,
    canEditFinancials: true,
    canViewAllTasks: true,
    canAssignTasks: true,
    allowedTaskCategories: ['OCF Forms', 'Discovery', 'Pleadings', 'Medical Records', 'Undertakings', 'Settlement', 'LAT', 'Court', 'Client Communication', 'Administrative', 'Other'],
    restrictedTaskCategories: [],
  },
  Lawyer: {
    role: 'Lawyer',
    canViewCases: true,
    canEditCases: true,
    canCreateCases: true,
    canDeleteCases: true,
    canViewFinancials: true,
    canEditFinancials: true,
    canViewAllTasks: true,
    canAssignTasks: true,
    allowedTaskCategories: ['OCF Forms', 'Discovery', 'Pleadings', 'Medical Records', 'Undertakings', 'Settlement', 'LAT', 'Court', 'Client Communication', 'Administrative', 'Other'],
    restrictedTaskCategories: [],
  },
  LawClerk: {
    role: 'LawClerk',
    canViewCases: true,
    canEditCases: true,
    canCreateCases: false,
    canDeleteCases: false,
    canViewFinancials: true,
    canEditFinancials: false,
    canViewAllTasks: true,
    canAssignTasks: false,
    allowedTaskCategories: ['OCF Forms', 'Discovery', 'Pleadings', 'Medical Records', 'Undertakings', 'LAT', 'Administrative'],
    restrictedTaskCategories: ['Settlement', 'Court'],
  },
  Paralegal: {
    role: 'Paralegal',
    canViewCases: true,
    canEditCases: true,
    canCreateCases: true,
    canDeleteCases: false,
    canViewFinancials: true,
    canEditFinancials: false,
    canViewAllTasks: true,
    canAssignTasks: true,
    allowedTaskCategories: ['OCF Forms', 'Medical Records', 'Client Communication', 'Discovery', 'LAT', 'Administrative'],
    restrictedTaskCategories: ['Settlement', 'Court'],
  },
  LegalAssistant: {
    role: 'LegalAssistant',
    canViewCases: true,
    canEditCases: false,
    canCreateCases: false,
    canDeleteCases: false,
    canViewFinancials: false,
    canEditFinancials: false,
    canViewAllTasks: false,
    canAssignTasks: false,
    allowedTaskCategories: ['Medical Records', 'Client Communication', 'Administrative'],
    restrictedTaskCategories: ['OCF Forms', 'Discovery', 'Pleadings', 'Undertakings', 'Settlement', 'LAT', 'Court'],
  },
  AccidentBenefitsCoordinator: {
    role: 'AccidentBenefitsCoordinator',
    canViewCases: true,
    canEditCases: true,
    canCreateCases: false,
    canDeleteCases: false,
    canViewFinancials: false,
    canEditFinancials: false,
    canViewAllTasks: false,
    canAssignTasks: false,
    allowedTaskCategories: ['OCF Forms', 'Medical Records', 'Client Communication'],
    restrictedTaskCategories: ['Discovery', 'Pleadings', 'Undertakings', 'Settlement', 'LAT', 'Court'],
  },
}


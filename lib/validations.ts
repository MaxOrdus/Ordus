/**
 * Zod Validation Schemas
 * Centralized validation for API inputs
 */

import { z } from 'zod'

// ============================================
// USER SCHEMAS
// ============================================

export const UserRoleSchema = z.enum([
  'SuperAdmin',
  'Admin', 
  'Lawyer',
  'Paralegal',
  'LawClerk',
  'LegalAssistant',
  'AccidentBenefitsCoordinator'
])

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: UserRoleSchema,
  firmId: z.string().uuid('Invalid firm ID').optional().nullable(),
})

export const UpdateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  updates: z.object({
    name: z.string().min(1).max(100).optional(),
    role: UserRoleSchema.optional(),
    firmId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
  }),
})

// ============================================
// FIRM SCHEMAS
// ============================================

export const CreateFirmSchema = z.object({
  name: z.string().min(1, 'Firm name is required').max(200, 'Firm name too long'),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const UpdateFirmSchema = z.object({
  firmId: z.string().uuid('Invalid firm ID'),
  updates: z.object({
    name: z.string().min(1).max(200).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  }),
})

// ============================================
// CASE SCHEMAS
// ============================================

export const CaseStatusSchema = z.enum(['Active', 'Closed', 'Settled', 'Suspended'])

export const CaseStageSchema = z.enum([
  'Intake',
  'Investigation', 
  'Discovery',
  'Negotiation',
  'Litigation',
  'Settlement',
  'Trial',
  'Appeal',
  'Closed'
])

export const CreateCaseSchema = z.object({
  firmId: z.string().uuid('Invalid firm ID'),
  title: z.string().min(1, 'Case title is required').max(200),
  clientId: z.string().uuid().optional(),
  dateOfLoss: z.string().optional(),
  limitationDate: z.string().optional(),
  status: CaseStatusSchema.default('Active'),
  stage: CaseStageSchema.default('Intake'),
  estimatedValue: z.number().min(0).optional(),
  primaryLawyerId: z.string().uuid().optional(),
  assignedParalegalId: z.string().uuid().optional(),
  notes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export const UpdateCaseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  clientId: z.string().uuid().nullable().optional(),
  dateOfLoss: z.string().nullable().optional(),
  limitationDate: z.string().nullable().optional(),
  status: CaseStatusSchema.optional(),
  stage: CaseStageSchema.optional(),
  estimatedValue: z.number().min(0).optional(),
  currentOffer: z.number().min(0).nullable().optional(),
  primaryLawyerId: z.string().uuid().nullable().optional(),
  assignedParalegalId: z.string().uuid().nullable().optional(),
  assignedTeamMembers: z.array(z.string().uuid()).optional(),
  notes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

// ============================================
// CASE ACCESS SCHEMAS
// ============================================

export const AccessLevelSchema = z.enum(['view', 'edit', 'full'])

export const GrantCaseAccessSchema = z.object({
  caseId: z.string().uuid('Invalid case ID'),
  userId: z.string().uuid('Invalid user ID'),
  accessLevel: AccessLevelSchema,
  grantedBy: z.string().uuid('Invalid granter ID'),
})

export const UpdateCaseAccessSchema = z.object({
  accessId: z.string().uuid('Invalid access ID'),
  accessLevel: AccessLevelSchema,
  requestedBy: z.string().uuid('Invalid requester ID'),
})

// ============================================
// TASK SCHEMAS
// ============================================

export const TaskStatusSchema = z.enum(['Pending', 'InProgress', 'Completed', 'Cancelled'])
export const TaskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical'])
export const TaskCategorySchema = z.enum([
  'General',
  'Document',
  'Deadline',
  'Communication',
  'Court',
  'Medical',
  'Settlement',
  'Discovery',
  'Billing'
])

export const CreateTaskSchema = z.object({
  caseId: z.string().uuid().optional(),
  firmId: z.string().uuid('Invalid firm ID'),
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(2000).optional(),
  assignedToUserId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  status: TaskStatusSchema.default('Pending'),
  priority: TaskPrioritySchema.default('Medium'),
  category: TaskCategorySchema.default('General'),
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  category: TaskCategorySchema.optional(),
  completedAt: z.string().nullable().optional(),
})

// ============================================
// CLIENT SCHEMAS
// ============================================

export const CreateClientSchema = z.object({
  firmId: z.string().uuid('Invalid firm ID'),
  name: z.string().min(1, 'Client name is required').max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
})

export const UpdateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

// ============================================
// TIME ENTRY SCHEMAS
// ============================================

export const CreateTimeEntrySchema = z.object({
  firmId: z.string().uuid('Invalid firm ID'),
  caseId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid('Invalid user ID'),
  description: z.string().min(1, 'Description is required').max(500),
  hours: z.number().min(0.1, 'Hours must be at least 0.1').max(24, 'Hours cannot exceed 24'),
  date: z.string(),
  billable: z.boolean().default(true),
  rate: z.number().min(0).optional(),
})

export const UpdateTimeEntrySchema = z.object({
  caseId: z.string().uuid().nullable().optional(),
  description: z.string().min(1).max(500).optional(),
  hours: z.number().min(0.1).max(24).optional(),
  date: z.string().optional(),
  billable: z.boolean().optional(),
  rate: z.number().min(0).optional(),
})

// ============================================
// DOCUMENT SCHEMAS
// ============================================

export const DocumentScheduleSchema = z.enum(['A', 'B', 'C'])

export const CreateDocumentSchema = z.object({
  firmId: z.string().uuid('Invalid firm ID'),
  caseId: z.string().uuid().optional(),
  title: z.string().min(1, 'Document title is required').max(200),
  type: z.string().min(1).max(100),
  filePath: z.string().min(1, 'File path is required'),
  fileSize: z.number().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  schedule: DocumentScheduleSchema.optional(),
  uploadedByUserId: z.string().uuid().optional(),
})

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.string().min(1).max(100).optional(),
  schedule: DocumentScheduleSchema.nullable().optional(),
})

// ============================================
// PAGINATION SCHEMA
// ============================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type CreateFirm = z.infer<typeof CreateFirmSchema>
export type CreateCase = z.infer<typeof CreateCaseSchema>
export type UpdateCase = z.infer<typeof UpdateCaseSchema>
export type GrantCaseAccess = z.infer<typeof GrantCaseAccessSchema>
export type CreateTask = z.infer<typeof CreateTaskSchema>
export type UpdateTask = z.infer<typeof UpdateTaskSchema>
export type CreateClient = z.infer<typeof CreateClientSchema>
export type CreateTimeEntry = z.infer<typeof CreateTimeEntrySchema>
export type CreateDocument = z.infer<typeof CreateDocumentSchema>
export type Pagination = z.infer<typeof PaginationSchema>


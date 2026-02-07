/**
 * Role-Based Access Control (RBAC)
 * Enforces permissions based on user roles
 */

import { UserRole, RolePermissions, DEFAULT_ROLE_PERMISSIONS } from '@/types/tasks'
import { User } from '@/types/auth'
import { getCurrentUser } from './auth-supabase'

/**
 * Check if user has permission to perform action
 */
export function hasPermission(
  user: User | null,
  permission: keyof RolePermissions
): boolean {
  if (!user) return false

  const permissions = DEFAULT_ROLE_PERMISSIONS[user.role]
  return permissions[permission] === true
}

/**
 * Check if user can view cases
 */
export function canViewCases(user: User | null): boolean {
  return hasPermission(user, 'canViewCases')
}

/**
 * Check if user can edit cases
 */
export function canEditCases(user: User | null): boolean {
  return hasPermission(user, 'canEditCases')
}

/**
 * Check if user can create cases
 */
export function canCreateCases(user: User | null): boolean {
  return hasPermission(user, 'canCreateCases')
}

/**
 * Check if user can delete cases
 */
export function canDeleteCases(user: User | null): boolean {
  return hasPermission(user, 'canDeleteCases')
}

/**
 * Check if user can view financials
 */
export function canViewFinancials(user: User | null): boolean {
  return hasPermission(user, 'canViewFinancials')
}

/**
 * Check if user can edit financials
 */
export function canEditFinancials(user: User | null): boolean {
  return hasPermission(user, 'canEditFinancials')
}

/**
 * Check if user can view all tasks
 */
export function canViewAllTasks(user: User | null): boolean {
  return hasPermission(user, 'canViewAllTasks')
}

/**
 * Check if user can assign tasks
 */
export function canAssignTasks(user: User | null): boolean {
  return hasPermission(user, 'canAssignTasks')
}

/**
 * Check if user can work with task category
 */
export function canWorkWithCategory(user: User | null, category: string): boolean {
  if (!user) return false

  const permissions = DEFAULT_ROLE_PERMISSIONS[user.role]

  // Check if category is restricted
  if (permissions.restrictedTaskCategories.includes(category as any)) {
    return false
  }

  // Check if category is allowed
  if (permissions.allowedTaskCategories.length > 0) {
    return permissions.allowedTaskCategories.includes(category as any)
  }

  return true
}

/**
 * Get user's role permissions
 */
export function getUserPermissions(user: User | null): RolePermissions | null {
  if (!user) return null
  return DEFAULT_ROLE_PERMISSIONS[user.role]
}

/**
 * Check if current user has permission (uses current session)
 */
export async function checkPermission(permission: keyof RolePermissions): Promise<boolean> {
  const user = await getCurrentUser()
  return hasPermission(user, permission)
}

/**
 * Require permission or throw error
 */
export async function requirePermission(permission: keyof RolePermissions): Promise<void> {
  if (!(await checkPermission(permission))) {
    throw new Error(`Permission denied: ${permission}`)
  }
}


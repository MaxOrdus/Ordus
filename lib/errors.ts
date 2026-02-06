/**
 * Centralized Error Handling
 * Custom error classes and utilities for consistent error handling
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Validation error (e.g., from Zod)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthError'
  }
}

/**
 * Authorization/Permission error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'DATABASE_ERROR', 500, originalError)
    this.name = 'DatabaseError'
  }
}

/**
 * Handle Supabase/Postgres errors and convert to AppError
 */
export function handleDbError(error: any): never {
  // Supabase error codes
  if (error?.code === 'PGRST116') {
    throw new NotFoundError()
  }
  if (error?.code === '23505') {
    throw new ValidationError('A record with this value already exists')
  }
  if (error?.code === '23503') {
    throw new ValidationError('Referenced record does not exist')
  }
  if (error?.code === '42501') {
    throw new ForbiddenError('Database permission denied')
  }
  
  throw new DatabaseError(error?.message || 'Database operation failed', error)
}

/**
 * Format Zod validation errors into readable messages
 */
export function formatZodError(error: ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
  return issues.join(', ')
}

/**
 * Convert any error to a NextResponse
 * Use this in API route catch blocks
 */
export function errorToResponse(error: unknown): NextResponse {
  // Log the error for debugging
  console.error('[API Error]', error)

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: error.message, 
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && error.details 
          ? { details: error.details } 
          : {})
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      { 
        error: formatZodError(error), 
        code: 'VALIDATION_ERROR',
        ...(process.env.NODE_ENV === 'development' ? { details: error.issues } : {})
      },
      { status: 400 }
    )
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return NextResponse.json(
      { 
        error: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }

  // Handle unknown error types
  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  )
}

/**
 * Wrapper to handle errors in API routes consistently
 * Usage:
 *   export const POST = handleApiErrors(async (request) => {
 *     // Your handler code - errors will be caught and formatted
 *   })
 */
export function handleApiErrors(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request)
    } catch (error) {
      return errorToResponse(error)
    }
  }
}


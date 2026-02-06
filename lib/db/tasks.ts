/**
 * Database Service: Tasks
 * CRUD operations for tasks
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { Task, UserRole } from '@/types/tasks'

// Re-export Task type for convenience
export type { Task } from '@/types/tasks'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

/**
 * Get all tasks for the current user's firm
 */
export async function getTasks(filters?: {
  caseId?: string
  assignedTo?: string
  assignedToRole?: string
  status?: Task['status']
  category?: Task['category']
}): Promise<Task[]> {
  let query = getClient().from('tasks').select('*').order('created_at', { ascending: false })

  if (filters?.caseId) {
    query = query.eq('case_id', filters.caseId)
  }

  // If both assignedTo and assignedToRole are provided, use OR logic
  if (filters?.assignedTo && filters?.assignedToRole) {
    query = query.or(`assigned_to_user_id.eq.${filters.assignedTo},assigned_to_role.eq.${filters.assignedToRole}`)
    console.log(`[getTasks] Filtering by assigned_to_user_id: ${filters.assignedTo} OR assigned_to_role: ${filters.assignedToRole}`)
  } else if (filters?.assignedTo) {
    query = query.eq('assigned_to_user_id', filters.assignedTo)
    console.log(`[getTasks] Filtering by assigned_to_user_id: ${filters.assignedTo}`)
  } else if (filters?.assignedToRole) {
    query = query.eq('assigned_to_role', filters.assignedToRole)
    console.log(`[getTasks] Filtering by assigned_to_role: ${filters.assignedToRole}`)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getTasks] Error fetching tasks:', error)
    throw new Error('Failed to fetch tasks')
  }

  console.log(`[getTasks] Found ${data?.length || 0} tasks${filters?.assignedTo ? ` assigned to user ${filters.assignedTo}` : ''}${filters?.assignedToRole ? ` or role ${filters.assignedToRole}` : ''}`)
  if (data && data.length > 0) {
    console.log(`[getTasks] Task details:`, data.map(t => ({
      id: t.id,
      title: t.title,
      assigned_to_user_id: t.assigned_to_user_id,
      assigned_to_role: t.assigned_to_role,
      due_date: t.due_date,
      status: t.status,
      completed: t.completed_at ? 'Yes' : 'No'
    })))
  }

  return (data || []).map(transformTask)
}

/**
 * Get a single task by ID
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const { data, error } = await getClient()
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching task:', error)
    throw new Error('Failed to fetch task')
  }

  return transformTask(data)
}

/**
 * Create a new task
 */
export async function createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const { data, error } = await getClient()
    .from('tasks')
    .insert({
      case_id: taskData.caseId,
      title: taskData.title,
      description: taskData.description,
      assigned_to_user_id: taskData.assignedToUserId,
      assigned_to_role: taskData.assignedTo,
      created_by_user_id: taskData.createdBy,
      due_date: taskData.dueDate,
      status: taskData.status || 'Pending',
      priority: taskData.priority || 'Medium',
      category: taskData.category,
      metadata: taskData.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    throw new Error('Failed to create task')
  }

  return transformTask(data)
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const updateData: any = {}

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.assignedToUserId !== undefined) updateData.assigned_to_user_id = updates.assignedToUserId
  if (updates.assignedTo !== undefined) updateData.assigned_to_role = updates.assignedTo
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata
  if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt

  const { error } = await getClient().from('tasks').update(updateData).eq('id', taskId)

  if (error) {
    console.error('Error updating task:', error)
    throw new Error('Failed to update task')
  }

  const updatedTask = await getTaskById(taskId)
  if (!updatedTask) {
    throw new Error('Task not found after update')
  }

  return updatedTask
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await getClient().from('tasks').delete().eq('id', taskId)

  if (error) {
    console.error('Error deleting task:', error)
    throw new Error('Failed to delete task')
  }
}

/**
 * Transform database record to Task format
 */
function transformTask(dbTask: any): Task {
  return {
    id: dbTask.id,
    caseId: dbTask.case_id,
    title: dbTask.title,
    description: dbTask.description,
    assignedTo: dbTask.assigned_to_role as UserRole | undefined,
    assignedToUserId: dbTask.assigned_to_user_id,
    createdBy: dbTask.created_by_user_id,
    dueDate: dbTask.due_date,
    completedAt: dbTask.completed_at,
    status: dbTask.status as Task['status'],
    priority: dbTask.priority as Task['priority'],
    category: dbTask.category as Task['category'],
    metadata: dbTask.metadata || {},
    createdAt: dbTask.created_at,
  }
}


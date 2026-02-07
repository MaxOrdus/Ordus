/**
 * React Query Hooks for Data Fetching
 * Centralized hooks for all entity types with caching and automatic refetching
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { PICase } from '@/types/pi-case'
import { Task, TaskStatus } from '@/types/tasks'
import { getCases, getCaseById, getCasesByIds, createCase, updateCase, deleteCase } from '@/lib/db/cases'
import { getClients, getClientById, createClient, updateClient, deleteClient } from '@/lib/db/clients'
import { getTasks, getTaskById, createTask, updateTask, deleteTask } from '@/lib/db/tasks'
import { getDocuments, getDocumentById, deleteDocument } from '@/lib/db/documents'
import { getTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry, getWeeklyTimeStats } from '@/lib/db/time-entries'

// ============================================
// QUERY KEYS - Centralized for consistency
// ============================================

export const queryKeys = {
  // Cases
  cases: ['cases'] as const,
  casesList: (filters?: Record<string, unknown>) => ['cases', 'list', filters] as const,
  casesById: (ids: string[]) => ['cases', 'byIds', ids] as const,
  caseDetail: (id: string) => ['cases', 'detail', id] as const,
  
  // Clients
  clients: ['clients'] as const,
  clientsList: (filters?: Record<string, unknown>) => ['clients', 'list', filters] as const,
  clientDetail: (id: string) => ['clients', 'detail', id] as const,
  
  // Tasks
  tasks: ['tasks'] as const,
  tasksList: (filters?: Record<string, unknown>) => ['tasks', 'list', filters] as const,
  taskDetail: (id: string) => ['tasks', 'detail', id] as const,
  
  // Documents
  documents: ['documents'] as const,
  documentsList: (filters?: Record<string, unknown>) => ['documents', 'list', filters] as const,
  documentDetail: (id: string) => ['documents', 'detail', id] as const,
  
  // Time Entries
  timeEntries: ['timeEntries'] as const,
  timeEntriesList: (filters?: Record<string, unknown>) => ['timeEntries', 'list', filters] as const,
  weeklyTimeStats: (userId: string) => ['timeEntries', 'weeklyStats', userId] as const,
}

// ============================================
// CASES HOOKS
// ============================================

interface UseCasesOptions {
  firmId?: string
  status?: string
  lightweight?: boolean
  enabled?: boolean
}

export function useCases(options: UseCasesOptions = {}) {
  const { firmId, status, lightweight = true, enabled = true } = options
  
  return useQuery({
    queryKey: queryKeys.casesList({ firmId, status, lightweight }),
    queryFn: () => getCases({ firmId, status, lightweight }),
    staleTime: 30 * 1000, // 30 seconds
    enabled,
  })
}

export function useCasesByIds(caseIds: string[], lightweight = true) {
  return useQuery({
    queryKey: queryKeys.casesById(caseIds),
    queryFn: () => getCasesByIds(caseIds, { lightweight }),
    staleTime: 30 * 1000,
    enabled: caseIds.length > 0,
  })
}

export function useCase(caseId: string, lightweight = false) {
  return useQuery({
    queryKey: queryKeys.caseDetail(caseId),
    queryFn: () => getCaseById(caseId, lightweight),
    staleTime: 60 * 1000, // 1 minute for detail views
    enabled: !!caseId,
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Parameters<typeof createCase>[0]) => createCase(data),
    onSuccess: () => {
      // Invalidate all case lists
      queryClient.invalidateQueries({ queryKey: queryKeys.cases })
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ caseId, updates }: { caseId: string; updates: Parameters<typeof updateCase>[1] }) => 
      updateCase(caseId, updates),
    onSuccess: (_, variables) => {
      // Invalidate the specific case and all lists
      queryClient.invalidateQueries({ queryKey: queryKeys.caseDetail(variables.caseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.cases })
    },
  })
}

export function useDeleteCase() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (caseId: string) => deleteCase(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases })
    },
  })
}

// ============================================
// CLIENTS HOOKS
// ============================================

interface UseClientsOptions {
  firmId?: string
  enabled?: boolean
}

export function useClients(options: UseClientsOptions = {}) {
  const { firmId, enabled = true } = options
  
  return useQuery({
    queryKey: queryKeys.clientsList({ firmId }),
    queryFn: () => getClients(),
    staleTime: 60 * 1000,
    enabled,
  })
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: queryKeys.clientDetail(clientId),
    queryFn: () => getClientById(clientId),
    staleTime: 60 * 1000,
    enabled: !!clientId,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Parameters<typeof createClient>[0]) => createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ clientId, updates }: { clientId: string; updates: Parameters<typeof updateClient>[1] }) => 
      updateClient(clientId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientDetail(variables.clientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (clientId: string) => deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
    },
  })
}

// ============================================
// TASKS HOOKS
// ============================================

interface UseTasksOptions {
  caseId?: string
  assignedTo?: string
  status?: TaskStatus
  enabled?: boolean
}

export function useTasks(options: UseTasksOptions = {}) {
  const { caseId, assignedTo, status, enabled = true } = options
  
  return useQuery({
    queryKey: queryKeys.tasksList({ caseId, assignedTo, status }),
    queryFn: () => getTasks({ caseId, assignedTo, status }),
    staleTime: 30 * 1000,
    enabled,
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.taskDetail(taskId),
    queryFn: () => getTaskById(taskId),
    staleTime: 60 * 1000,
    enabled: !!taskId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Parameters<typeof createTask>[0]) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Parameters<typeof updateTask>[1] }) => 
      updateTask(taskId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) => 
      updateTask(taskId, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

// ============================================
// DOCUMENTS HOOKS
// ============================================

interface UseDocumentsOptions {
  caseId?: string
  enabled?: boolean
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const { caseId, enabled = true } = options
  
  return useQuery({
    queryKey: queryKeys.documentsList({ caseId }),
    queryFn: () => getDocuments({ caseId }),
    staleTime: 60 * 1000,
    enabled,
  })
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: queryKeys.documentDetail(documentId),
    queryFn: () => getDocumentById(documentId),
    staleTime: 60 * 1000,
    enabled: !!documentId,
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents })
    },
  })
}

// ============================================
// TIME ENTRIES HOOKS
// ============================================

interface UseTimeEntriesOptions {
  caseId?: string
  userId?: string
  startDate?: string
  endDate?: string
  enabled?: boolean
}

export function useTimeEntries(options: UseTimeEntriesOptions = {}) {
  const { caseId, userId, startDate, endDate, enabled = true } = options
  
  return useQuery({
    queryKey: queryKeys.timeEntriesList({ caseId, userId, startDate, endDate }),
    queryFn: () => getTimeEntries({ caseId, userId, startDate, endDate }),
    staleTime: 30 * 1000,
    enabled,
  })
}

export function useWeeklyTimeStats(userId: string) {
  return useQuery({
    queryKey: queryKeys.weeklyTimeStats(userId),
    queryFn: () => getWeeklyTimeStats(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes for stats
    enabled: !!userId,
  })
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Parameters<typeof createTimeEntry>[0]) => createTimeEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries })
    },
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: string; updates: Parameters<typeof updateTimeEntry>[1] }) => 
      updateTimeEntry(entryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries })
    },
  })
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (entryId: string) => deleteTimeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries })
    },
  })
}

// ============================================
// FIRM & TEAM HOOKS
// ============================================

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  firmId: string
  createdAt?: string
  isActive?: boolean
}

export interface Firm {
  id: string
  name: string
  createdAt?: string
}

export interface FirmStats {
  totalCases: number
  activeCases: number
  totalClients: number
  totalTeamMembers: number
  casesThisMonth: number
  settledThisMonth: number
}

export function useFirm(firmId: string | undefined) {
  return useQuery({
    queryKey: ['firm', firmId],
    queryFn: async () => {
      if (!firmId) return null
      const { getSupabase } = await import('@/lib/supabase/singleton')
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .eq('id', firmId)
        .single()
      
      if (error) {
        console.error('Error fetching firm:', error)
        return null
      }
      return data as Firm
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!firmId,
  })
}

export function useFirmStats(firmId: string | undefined) {
  return useQuery({
    queryKey: ['firmStats', firmId],
    queryFn: async (): Promise<FirmStats | null> => {
      if (!firmId) return null
      const { getSupabase } = await import('@/lib/supabase/singleton')
      const supabase = getSupabase()
      
      // Get counts in parallel
      const [casesResult, clientsResult, teamResult] = await Promise.all([
        supabase.from('cases').select('id, status, created_at', { count: 'exact' }).eq('firm_id', firmId),
        supabase.from('clients').select('id', { count: 'exact' }).eq('firm_id', firmId),
        supabase.from('users_metadata').select('id', { count: 'exact' }).eq('firm_id', firmId),
      ])
      
      const cases = casesResult.data || []
      const activeCases = cases.filter(c => c.status === 'Active').length
      
      // Cases this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const casesThisMonth = cases.filter(c => new Date(c.created_at) >= startOfMonth).length
      const settledThisMonth = cases.filter(c => c.status === 'Settled' && new Date(c.created_at) >= startOfMonth).length
      
      return {
        totalCases: casesResult.count || 0,
        activeCases,
        totalClients: clientsResult.count || 0,
        totalTeamMembers: teamResult.count || 0,
        casesThisMonth,
        settledThisMonth,
      }
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: !!firmId,
  })
}

export function useFirmUsers(firmId: string | undefined) {
  return useQuery({
    queryKey: ['firmUsers', firmId],
    queryFn: async () => {
      if (!firmId) return []
      const { getFirmUsers } = await import('@/lib/db/users')
      return getFirmUsers()
    },
    staleTime: 60 * 1000,
    enabled: !!firmId,
  })
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete team member')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmUsers'] })
      queryClient.invalidateQueries({ queryKey: ['firmStats'] })
    },
  })
}

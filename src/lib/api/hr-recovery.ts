/**
 * API Client - Gestion des Récupérations d'Heures
 * Routes backend: /api/hr/recovery/*
 */

import { apiClient } from './client';

// ============================================================
// TYPES - Recovery Periods
// ============================================================

export interface RecoveryPeriod {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_hours_to_recover: number;
  hours_recovered: number;
  hours_remaining: number;
  department_id?: string;
  segment_id?: string;
  centre_id?: string;
  applies_to_all: boolean;
  status: 'active' | 'completed' | 'cancelled';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRecoveryPeriodInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_hours_to_recover: number;
  department_id?: string;
  segment_id?: string;
  centre_id?: string;
  applies_to_all?: boolean;
}

export interface UpdateRecoveryPeriodInput {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  total_hours_to_recover?: number;
  department_id?: string;
  segment_id?: string;
  centre_id?: string;
  applies_to_all?: boolean;
  status?: 'active' | 'completed' | 'cancelled';
}

export interface RecoveryPeriodSummary {
  period: RecoveryPeriod;
  declarations: {
    total_declarations: number;
    days_off_count: number;
    recovery_days_count: number;
    scheduled_recovery_hours: number;
    completed_declarations: number;
  };
  participation: {
    total_employees_affected: number;
    employees_present: number;
    employees_absent: number;
    actual_hours_recovered: number;
    total_deductions: number;
  };
}

// ============================================================
// TYPES - Recovery Declarations
// ============================================================

export interface RecoveryDeclaration {
  id: string;
  recovery_period_id: string;
  recovery_date: string;
  hours_to_recover: number;
  is_day_off: boolean;
  department_id?: string;
  segment_id?: string;
  centre_id?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_by?: string;
  created_at: string;
  updated_at: string;
  period_name?: string;
}

export interface CreateRecoveryDeclarationInput {
  recovery_period_id: string;
  recovery_date: string;
  hours_to_recover: number;
  is_day_off: boolean;
  department_id?: string;
  segment_id?: string;
  centre_id?: string;
  notes?: string;
}

export interface UpdateRecoveryDeclarationInput {
  recovery_date?: string;
  hours_to_recover?: number;
  notes?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
}

export interface VerificationResult {
  success: boolean;
  message: string;
  summary: {
    total_employees: number;
    present: number;
    absent: number;
    total_deductions: string;
  };
}

// ============================================================
// TYPES - Employee Recoveries
// ============================================================

export interface EmployeeRecovery {
  id: string;
  employee_id: string;
  recovery_declaration_id: string;
  recovery_date: string;
  is_day_off: boolean;
  expected_to_work: boolean;
  was_present?: boolean;
  attendance_record_id?: string;
  hours_recovered: number;
  deduction_applied: boolean;
  deduction_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Additional fields from JOINs
  declared_hours?: number;
  period_name?: string;
  period_start?: string;
  period_end?: string;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  salary_gross?: number;
}

// ============================================================
// API FUNCTIONS - Recovery Periods
// ============================================================

export async function getRecoveryPeriods(params?: {
  status?: 'active' | 'completed' | 'cancelled';
  department_id?: string;
  segment_id?: string;
}): Promise<{ success: boolean; periods: RecoveryPeriod[] }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.department_id) queryParams.append('department_id', params.department_id);
  if (params?.segment_id) queryParams.append('segment_id', params.segment_id);

  const url = `/api/hr/recovery/periods${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data as { success: boolean; periods: RecoveryPeriod[] };
}

export async function getRecoveryPeriod(id: string): Promise<{ success: boolean; period: RecoveryPeriod }> {
  const response = await apiClient.get(`/api/hr/recovery/periods/${id}`);
  return response.data as { success: boolean; period: RecoveryPeriod };
}

export async function createRecoveryPeriod(
  input: CreateRecoveryPeriodInput
): Promise<{ success: boolean; period: RecoveryPeriod }> {
  const response = await apiClient.post('/api/hr/recovery/periods', input);
  return response.data as { success: boolean; period: RecoveryPeriod };
}

export async function updateRecoveryPeriod(
  id: string,
  input: UpdateRecoveryPeriodInput
): Promise<{ success: boolean; period: RecoveryPeriod }> {
  const response = await apiClient.put(`/api/hr/recovery/periods/${id}`, input);
  return response.data as { success: boolean; period: RecoveryPeriod };
}

export async function deleteRecoveryPeriod(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete(`/api/hr/recovery/periods/${id}`);
  return response.data as { success: boolean; message: string };
}

export async function getRecoveryPeriodSummary(
  id: string
): Promise<{ success: boolean; summary: RecoveryPeriodSummary }> {
  const response = await apiClient.get(`/api/hr/recovery/periods/${id}/summary`);
  return response.data as { success: boolean; summary: RecoveryPeriodSummary };
}

// ============================================================
// API FUNCTIONS - Recovery Declarations
// ============================================================

export async function getRecoveryDeclarations(params?: {
  period_id?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  is_day_off?: boolean;
  start_date?: string;
  end_date?: string;
}): Promise<{ success: boolean; declarations: RecoveryDeclaration[] }> {
  const queryParams = new URLSearchParams();
  if (params?.period_id) queryParams.append('period_id', params.period_id);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.is_day_off !== undefined) queryParams.append('is_day_off', String(params.is_day_off));
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);

  const url = `/api/hr/recovery/declarations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data as { success: boolean; declarations: RecoveryDeclaration[] };
}

export async function getRecoveryDeclaration(
  id: string
): Promise<{ success: boolean; declaration: RecoveryDeclaration }> {
  const response = await apiClient.get(`/api/hr/recovery/declarations/${id}`);
  return response.data as { success: boolean; declaration: RecoveryDeclaration };
}

export async function createRecoveryDeclaration(
  input: CreateRecoveryDeclarationInput
): Promise<{ success: boolean; declaration: RecoveryDeclaration; employees_affected: number }> {
  const response = await apiClient.post('/api/hr/recovery/declarations', input);
  return response.data as { success: boolean; declaration: RecoveryDeclaration; employees_affected: number };
}

export async function updateRecoveryDeclaration(
  id: string,
  input: UpdateRecoveryDeclarationInput
): Promise<{ success: boolean; declaration: RecoveryDeclaration }> {
  const response = await apiClient.put(`/api/hr/recovery/declarations/${id}`, input);
  return response.data as { success: boolean; declaration: RecoveryDeclaration };
}

export async function deleteRecoveryDeclaration(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete(`/api/hr/recovery/declarations/${id}`);
  return response.data as { success: boolean; message: string };
}

export async function verifyRecoveryDeclaration(id: string): Promise<VerificationResult> {
  const response = await apiClient.post(`/api/hr/recovery/declarations/${id}/verify`);
  return response.data as VerificationResult;
}

// ============================================================
// API FUNCTIONS - Employee Recoveries
// ============================================================

export async function getEmployeeRecoveries(
  employeeId: string
): Promise<{ success: boolean; recoveries: EmployeeRecovery[] }> {
  const response = await apiClient.get(`/api/hr/recovery/employees/${employeeId}`);
  return response.data as { success: boolean; recoveries: EmployeeRecovery[] };
}

export async function getDeclarationEmployees(
  declarationId: string
): Promise<{ success: boolean; employees: EmployeeRecovery[] }> {
  const response = await apiClient.get(`/api/hr/recovery/declarations/${declarationId}/employees`);
  return response.data as { success: boolean; employees: EmployeeRecovery[] };
}

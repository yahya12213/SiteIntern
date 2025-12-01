/**
 * API Client - Gestion des Horaires (Schedule Management)
 */

import { apiClient } from './client';

// ============================================================
// TYPES - Work Schedules
// ============================================================

export interface HoraireJour {
  actif: boolean;
  heureDebut: string;
  heureFin: string;
  pauses: { nom: string; debut: string; fin: string; remuneree: boolean }[];
}

export interface WorkSchedule {
  id: string;
  nom: string;
  description: string;
  actif: boolean;
  horaires: {
    Lundi: HoraireJour;
    Mardi: HoraireJour;
    Mercredi: HoraireJour;
    Jeudi: HoraireJour;
    Vendredi: HoraireJour;
    Samedi: HoraireJour;
    Dimanche: HoraireJour;
  };
  heures_hebdo: number;
  is_default?: boolean;
  tolerance_late?: number;
  tolerance_early?: number;
}

export interface CreateScheduleInput {
  nom: string;
  description?: string;
  horaires: WorkSchedule['horaires'];
  heures_hebdo?: number;
  is_default?: boolean;
  tolerance_late?: number;
  tolerance_early?: number;
  actif?: boolean;
}

// ============================================================
// TYPES - Public Holidays
// ============================================================

export interface PublicHoliday {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  type: 'ferie' | 'collectif' | 'pont';
  recurrent: boolean;
  description?: string;
}

export interface CreateHolidayInput {
  nom: string;
  date_debut: string;
  date_fin?: string;
  type?: 'ferie' | 'collectif' | 'pont';
  recurrent?: boolean;
  description?: string;
}

// ============================================================
// TYPES - Approved Leaves
// ============================================================

export interface ApprovedLeave {
  id: number;
  employe_nom: string;
  type_conge: string;
  type_code: string;
  date_debut: string;
  date_fin: string;
  jours: number;
  statut: 'approved';
  description?: string;
}

// ============================================================
// TYPES - Overtime Declarations
// ============================================================

export interface OvertimeDeclaration {
  id: number;
  employe_nom: string;
  employee_number: string;
  request_date: string;
  start_time?: string;
  end_time?: string;
  heures_demandees: number;
  heures_approuvees?: number;
  motif: string;
  statut: 'pending' | 'approved' | 'rejected';
  is_prior_approved: boolean;
  periode: string;
  n1_comment?: string;
  n2_comment?: string;
}

export interface CreateOvertimeInput {
  employee_id: string;
  request_date: string;
  start_time?: string;
  end_time?: string;
  hours_requested: number;
  reason?: string;
  is_prior_approved?: boolean;
}

// ============================================================
// TYPES - Stats
// ============================================================

export interface ScheduleStats {
  active_schedules: number;
  holidays_this_year: number;
  approved_leaves: number;
  pending_overtime: number;
}

// ============================================================
// API FUNCTIONS
// ============================================================

export const scheduleManagementApi = {
  // === WORK SCHEDULES ===
  getSchedules: async (): Promise<{ success: boolean; schedules: WorkSchedule[] }> => {
    return apiClient.get<{ success: boolean; schedules: WorkSchedule[] }>('/hr/schedule-management/schedules');
  },

  createSchedule: async (data: CreateScheduleInput): Promise<{ success: boolean; schedule: WorkSchedule }> => {
    return apiClient.post<{ success: boolean; schedule: WorkSchedule }>('/hr/schedule-management/schedules', data);
  },

  updateSchedule: async (id: string, data: Partial<CreateScheduleInput>): Promise<{ success: boolean; schedule: WorkSchedule }> => {
    return apiClient.put<{ success: boolean; schedule: WorkSchedule }>(`/hr/schedule-management/schedules/${id}`, data);
  },

  deleteSchedule: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/hr/schedule-management/schedules/${id}`);
  },

  // === PUBLIC HOLIDAYS ===
  getHolidays: async (year?: number): Promise<{ success: boolean; holidays: PublicHoliday[] }> => {
    const params = year ? `?year=${year}` : '';
    return apiClient.get<{ success: boolean; holidays: PublicHoliday[] }>(`/hr/schedule-management/holidays${params}`);
  },

  createHoliday: async (data: CreateHolidayInput): Promise<{ success: boolean; holiday: PublicHoliday }> => {
    return apiClient.post<{ success: boolean; holiday: PublicHoliday }>('/hr/schedule-management/holidays', data);
  },

  updateHoliday: async (id: string, data: Partial<CreateHolidayInput>): Promise<{ success: boolean; holiday: PublicHoliday }> => {
    return apiClient.put<{ success: boolean; holiday: PublicHoliday }>(`/hr/schedule-management/holidays/${id}`, data);
  },

  deleteHoliday: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/hr/schedule-management/holidays/${id}`);
  },

  // === APPROVED LEAVES ===
  getApprovedLeaves: async (year?: number, month?: number): Promise<{ success: boolean; leaves: ApprovedLeave[] }> => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ success: boolean; leaves: ApprovedLeave[] }>(`/hr/schedule-management/approved-leaves${queryString}`);
  },

  // === OVERTIME ===
  getOvertime: async (filters?: { status?: string; year?: number; month?: number }): Promise<{ success: boolean; overtime: OvertimeDeclaration[] }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ success: boolean; overtime: OvertimeDeclaration[] }>(`/hr/schedule-management/overtime${queryString}`);
  },

  createOvertime: async (data: CreateOvertimeInput): Promise<{ success: boolean; overtime: OvertimeDeclaration }> => {
    return apiClient.post<{ success: boolean; overtime: OvertimeDeclaration }>('/hr/schedule-management/overtime', data);
  },

  approveOvertime: async (id: number, data: { hours_approved?: number; comment?: string }): Promise<{ success: boolean; overtime: OvertimeDeclaration }> => {
    return apiClient.put<{ success: boolean; overtime: OvertimeDeclaration }>(`/hr/schedule-management/overtime/${id}/approve`, data);
  },

  rejectOvertime: async (id: number, comment?: string): Promise<{ success: boolean; overtime: OvertimeDeclaration }> => {
    return apiClient.put<{ success: boolean; overtime: OvertimeDeclaration }>(`/hr/schedule-management/overtime/${id}/reject`, { comment });
  },

  deleteOvertime: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/hr/schedule-management/overtime/${id}`);
  },

  // === STATS ===
  getStats: async (): Promise<{ success: boolean; stats: ScheduleStats }> => {
    return apiClient.get<{ success: boolean; stats: ScheduleStats }>('/hr/schedule-management/stats');
  },
};

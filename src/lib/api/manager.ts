/**
 * API Client - Interface Manager (Vue équipe)
 * Routes backend: /api/hr/manager/*
 */

import { apiClient } from './client';

// ============================================================
// TYPES - Team
// ============================================================

export interface TeamMember {
  id: string;
  employee_id: string;
  full_name: string;
  email?: string;
  position?: string;
  department?: string;
  profile_picture?: string;
  hire_date?: string;
  contract_type?: string;
  is_active: boolean;
}

export type TeamAttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'late_early'
  | 'half_day'
  | 'incomplete'
  | 'weekend'
  | 'holiday'
  | 'leave'
  | 'mission'
  | 'partial'
  | 'check_in'
  | 'check_out';

export interface TeamAttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  worked_hours?: number;
  status: TeamAttendanceStatus;
  late_minutes?: number;
  leave_type?: string;
  notes?: string;
}

export interface TeamAttendanceSummary {
  date: string;
  total_team: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  attendance_rate: number;
}

export interface TeamRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email?: string;
  request_type: 'leave' | 'overtime' | 'correction' | 'administrative';
  request_subtype?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  duration_hours?: number;
  reason?: string;
  status: 'pending' | 'approved' | 'approved_n1' | 'approved_n2' | 'approved_n3' | 'approved_n4' | 'approved_n5' | 'rejected' | 'cancelled';
  current_step?: number;
  total_steps?: number;
  created_at: string;
  updated_at?: string;
  attachments?: Array<{ id: string; filename: string; url: string }>;
  delegation_info?: {
    is_delegated: boolean;
    delegator_name?: string;
    delegation_id?: string;
  };
}

export interface TeamStats {
  total_members: number;
  present_today: number;
  on_leave_today: number;
  pending_requests: number;
  overtime_hours_month: number;
  attendance_rate_month: number;
}

// ============================================================
// API FUNCTIONS
// ============================================================

export const managerApi = {
  /**
   * Get team members
   */
  getTeam: async (): Promise<{ success: boolean; members: TeamMember[] }> => {
    return apiClient.get<{ success: boolean; members: TeamMember[] }>('/hr/manager/team');
  },

  /**
   * Get team attendance for a date range
   */
  getTeamAttendance: async (filters?: {
    start_date?: string;
    end_date?: string;
    employee_id?: string;
  }): Promise<{ success: boolean; records: TeamAttendanceRecord[]; summary?: TeamAttendanceSummary }> => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ success: boolean; records: TeamAttendanceRecord[]; summary?: TeamAttendanceSummary }>(
      `/hr/manager/team-attendance${queryString}`
    );
  },

  /**
   * Get team requests pending validation
   */
  getTeamRequests: async (filters?: {
    status?: string;
    type?: string;
    employee_id?: string;
  }): Promise<{ success: boolean; requests: TeamRequest[] }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ success: boolean; requests: TeamRequest[] }>(`/hr/manager/team-requests${queryString}`);
  },

  /**
   * Approve a team request
   */
  approveRequest: async (requestId: string, comment?: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(`/hr/manager/requests/${requestId}/approve`, {
      comment
    });
  },

  /**
   * Reject a team request
   */
  rejectRequest: async (requestId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(`/hr/manager/requests/${requestId}/reject`, {
      reason
    });
  },

  /**
   * Get team statistics
   */
  getTeamStats: async (): Promise<{ success: boolean; stats: TeamStats }> => {
    return apiClient.get<{ success: boolean; stats: TeamStats }>('/hr/manager/stats');
  },

  /**
   * Export team attendance to CSV
   */
  exportTeamAttendance: async (filters?: {
    start_date?: string;
    end_date?: string;
  }): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`/api/hr/manager/team-attendance/export${queryString}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
};

/**
 * API Client - Portail Employé RH
 */

import api from '../api';

// Types
export interface EmployeeProfile {
  id: number;
  first_name: string;
  last_name: string;
  employee_number: string;
  position: string;
  department: string;
  hire_date: string;
  email: string;
  phone: string;
  requires_clocking: boolean;
  segment_id: number;
  leave_balances: LeaveBalance[];
  contract: Contract | null;
}

export interface LeaveBalance {
  code: string;
  name: string;
  current_balance: number;
  taken: number;
  initial_balance: number;
}

export interface Contract {
  contract_type: string;
  start_date: string;
  end_date: string;
  salary_gross: number;
  working_hours_per_week: number;
}

export interface AttendanceRecord {
  date: string;
  check_in: string;
  check_out: string;
  status: 'present' | 'absent' | 'leave' | 'holiday';
}

export interface AttendanceStats {
  total_hours: string;
  present_days: number;
  leave_days: number;
  late_minutes: number;
}

export interface AttendanceResponse {
  success: boolean;
  year: number;
  month: number;
  records: AttendanceRecord[];
  leaves: any[];
  holidays: any[];
  stats: AttendanceStats;
}

export interface HRRequest {
  id: number;
  request_type: 'leave' | 'overtime';
  type_code: string;
  type_name: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  date_soumission: string;
  n1_comment?: string;
  n2_comment?: string;
  hr_comment?: string;
}

export interface TodayClocking {
  success: boolean;
  requires_clocking: boolean;
  employee?: {
    id: number;
    name: string;
  };
  today?: {
    date: string;
    records: any[];
    last_action: any;
    can_check_in: boolean;
    can_check_out: boolean;
    worked_minutes: number;
    is_complete: boolean;
  };
}

export interface CreateRequestInput {
  type: string;
  start_date?: string;
  end_date?: string;
  description: string;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  is_paid: boolean;
  max_days_per_year: number;
}

// API functions
export const employeePortalApi = {
  // Get employee profile
  getProfile: async (): Promise<{ success: boolean; employee: EmployeeProfile }> => {
    const response = await api.get('/hr/employee-portal/profile');
    return response.data;
  },

  // Get attendance records for a month
  getAttendance: async (year?: number, month?: number): Promise<AttendanceResponse> => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const response = await api.get(`/hr/employee-portal/attendance?${params}`);
    return response.data;
  },

  // Get my HR requests
  getRequests: async (): Promise<{ success: boolean; requests: HRRequest[] }> => {
    const response = await api.get('/hr/employee-portal/requests');
    return response.data;
  },

  // Create new request
  createRequest: async (data: CreateRequestInput): Promise<{ success: boolean; message: string; request_id: number }> => {
    const response = await api.post('/hr/employee-portal/requests', data);
    return response.data;
  },

  // Get leave types
  getLeaveTypes: async (): Promise<{ success: boolean; leave_types: LeaveType[] }> => {
    const response = await api.get('/hr/employee-portal/leave-types');
    return response.data;
  },

  // Clocking endpoints (existing)
  getTodayClocking: async (): Promise<TodayClocking> => {
    const response = await api.get('/hr/clocking/my-today');
    return response.data;
  },

  checkIn: async (): Promise<{ success: boolean; message: string; record: any }> => {
    const response = await api.post('/hr/clocking/check-in');
    return response.data;
  },

  checkOut: async (): Promise<{ success: boolean; message: string; record: any; worked_minutes_today: number }> => {
    const response = await api.post('/hr/clocking/check-out');
    return response.data;
  },
};

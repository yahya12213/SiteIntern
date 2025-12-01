/**
 * API Client - Validation des Demandes RH
 */

import api from '../api';

// Types
export interface PendingRequest {
  id: number;
  request_type: 'leave' | 'overtime';
  type_code: string;
  type_name: string;
  employee_id: number;
  employee_name: string;
  employee_department: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  motif: string;
  status: string;
  date_soumission: string;
  etape_actuelle: number;
  etape_totale: number;
}

export interface HistoryItem {
  id: number;
  request_type: 'leave' | 'overtime';
  type_code: string;
  type_name: string;
  employee_name: string;
  decision: string;
  date_soumission: string;
  date_decision: string;
  commentaire: string;
}

export interface DecisionInput {
  request_type: 'leave' | 'overtime';
  comment?: string;
}

// API functions
export const requestsValidationApi = {
  // Get pending requests
  getPending: async (type?: string): Promise<{ success: boolean; requests: PendingRequest[]; count: number }> => {
    const params = type && type !== 'all' ? `?type=${type}` : '';
    const response = await api.get(`/hr/requests-validation/pending${params}`);
    return response.data;
  },

  // Get decision history
  getHistory: async (limit?: number): Promise<{ success: boolean; history: HistoryItem[] }> => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get(`/hr/requests-validation/history${params}`);
    return response.data;
  },

  // Approve a request
  approve: async (id: number, data: DecisionInput): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/hr/requests-validation/${id}/approve`, data);
    return response.data;
  },

  // Reject a request
  reject: async (id: number, data: DecisionInput): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/hr/requests-validation/${id}/reject`, data);
    return response.data;
  },

  // Get request details
  getDetails: async (id: number, type: 'leave' | 'overtime'): Promise<{ success: boolean; request: any }> => {
    const response = await api.get(`/hr/requests-validation/${id}?type=${type}`);
    return response.data;
  },
};

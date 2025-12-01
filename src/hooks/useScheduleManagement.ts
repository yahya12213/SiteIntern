/**
 * Hooks React Query - Gestion des Horaires (Schedule Management)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  scheduleManagementApi,
  type CreateScheduleInput,
  type CreateHolidayInput,
  type CreateOvertimeInput,
} from '../lib/api/schedule-management';

// ============================================================
// WORK SCHEDULES HOOKS
// ============================================================

/**
 * Hook pour récupérer les modèles d'horaires
 */
export const useWorkSchedules = () => {
  return useQuery({
    queryKey: ['schedule-management', 'schedules'],
    queryFn: () => scheduleManagementApi.getSchedules(),
  });
};

/**
 * Hook pour créer un modèle d'horaires
 */
export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleInput) => scheduleManagementApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

/**
 * Hook pour mettre à jour un modèle d'horaires
 */
export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateScheduleInput> }) =>
      scheduleManagementApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'schedules'] });
    },
  });
};

/**
 * Hook pour supprimer un modèle d'horaires
 */
export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduleManagementApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

// ============================================================
// PUBLIC HOLIDAYS HOOKS
// ============================================================

/**
 * Hook pour récupérer les jours fériés
 */
export const usePublicHolidays = (year?: number) => {
  return useQuery({
    queryKey: ['schedule-management', 'holidays', year],
    queryFn: () => scheduleManagementApi.getHolidays(year),
  });
};

/**
 * Hook pour créer un jour férié
 */
export const useCreateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayInput) => scheduleManagementApi.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'holidays'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

/**
 * Hook pour mettre à jour un jour férié
 */
export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateHolidayInput> }) =>
      scheduleManagementApi.updateHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'holidays'] });
    },
  });
};

/**
 * Hook pour supprimer un jour férié
 */
export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduleManagementApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'holidays'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

// ============================================================
// APPROVED LEAVES HOOKS
// ============================================================

/**
 * Hook pour récupérer les congés approuvés
 */
export const useApprovedLeaves = (year?: number, month?: number) => {
  return useQuery({
    queryKey: ['schedule-management', 'approved-leaves', year, month],
    queryFn: () => scheduleManagementApi.getApprovedLeaves(year, month),
  });
};

// ============================================================
// OVERTIME HOOKS
// ============================================================

/**
 * Hook pour récupérer les déclarations d'heures supplémentaires
 */
export const useOvertimeDeclarations = (filters?: { status?: string; year?: number; month?: number }) => {
  return useQuery({
    queryKey: ['schedule-management', 'overtime', filters],
    queryFn: () => scheduleManagementApi.getOvertime(filters),
  });
};

/**
 * Hook pour créer une déclaration d'heures supplémentaires
 */
export const useCreateOvertime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOvertimeInput) => scheduleManagementApi.createOvertime(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'overtime'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

/**
 * Hook pour approuver une déclaration
 */
export const useApproveOvertime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { hours_approved?: number; comment?: string } }) =>
      scheduleManagementApi.approveOvertime(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'overtime'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

/**
 * Hook pour rejeter une déclaration
 */
export const useRejectOvertime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      scheduleManagementApi.rejectOvertime(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'overtime'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

/**
 * Hook pour supprimer une déclaration
 */
export const useDeleteOvertime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => scheduleManagementApi.deleteOvertime(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'overtime'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-management', 'stats'] });
    },
  });
};

// ============================================================
// STATS HOOK
// ============================================================

/**
 * Hook pour récupérer les statistiques
 */
export const useScheduleStats = () => {
  return useQuery({
    queryKey: ['schedule-management', 'stats'],
    queryFn: () => scheduleManagementApi.getStats(),
  });
};

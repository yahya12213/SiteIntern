import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface AdminDeclaration {
  id: string;
  professor_id: string;
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  form_data: string; // JSON
  status: 'brouillon' | 'a_declarer' | 'soumise' | 'en_cours' | 'approuvee' | 'refusee';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;

  // Données jointes
  professor_name?: string;
  segment_name?: string;
  city_name?: string;
  sheet_title?: string;
}

// Hook pour récupérer toutes les déclarations (admin)
export function useAdminDeclarations(status?: string) {
  return useQuery({
    queryKey: ['admin-declarations', status],
    queryFn: async () => {
      let query = supabase
        .from('professor_declarations')
        .select(`
          *,
          profiles:professor_id (full_name),
          segments:segment_id (name),
          cities:city_id (name),
          calculation_sheets:calculation_sheet_id (title)
        `)
        .order('submitted_at', { ascending: false, nullsFirst: false });

      // Filtrer par statut si fourni
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        professor_name: row.profiles?.full_name,
        segment_name: row.segments?.name,
        city_name: row.cities?.name,
        sheet_title: row.calculation_sheets?.title,
      })) as AdminDeclaration[];
    },
  });
}

// Hook pour récupérer une déclaration spécifique (admin)
export function useAdminDeclaration(id: string) {
  return useQuery({
    queryKey: ['admin-declaration', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_declarations')
        .select(`
          *,
          profiles:professor_id (full_name, username),
          segments:segment_id (name, color),
          cities:city_id (name),
          calculation_sheets:calculation_sheet_id (title, template_data)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new Error('Declaration not found');
        throw error;
      }

      if (!data) throw new Error('Declaration not found');

      return {
        ...(data as any),
        professor_name: (data as any).profiles?.full_name,
        professor_username: (data as any).profiles?.username,
        segment_name: (data as any).segments?.name,
        segment_color: (data as any).segments?.color,
        city_name: (data as any).cities?.name,
        sheet_title: (data as any).calculation_sheets?.title,
        template_data: (data as any).calculation_sheets?.template_data,
      } as AdminDeclaration & {
        professor_username: string;
        segment_color: string;
        template_data: string;
      };
    },
    enabled: !!id,
  });
}

// Hook pour approuver une déclaration
export function useApproveDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();

      const updateData: any = {
        status: 'approuvee',
        reviewed_at: now,
        rejection_reason: null,
      };

      const query = supabase
        .from('professor_declarations')
        .update(updateData as never)
        .eq('id', id);
      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-declaration'] });
    },
  });
}

// Hook pour refuser une déclaration
export function useRejectDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const now = new Date().toISOString();

      const updateData: any = {
        status: 'refusee',
        reviewed_at: now,
        rejection_reason: reason,
      };

      const query = supabase
        .from('professor_declarations')
        .update(updateData as never)
        .eq('id', id);
      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-declaration'] });
    },
  });
}

// Hook pour demander une modification
export function useRequestModification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const now = new Date().toISOString();

      const updateData: any = {
        status: 'en_cours',
        reviewed_at: now,
        rejection_reason: reason,
      };

      const query = supabase
        .from('professor_declarations')
        .update(updateData as never)
        .eq('id', id);
      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-declaration'] });
    },
  });
}

// Hook pour obtenir les statistiques des déclarations
export function useDeclarationStats() {
  return useQuery({
    queryKey: ['declaration-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_declarations')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data.length,
        a_declarer: data.filter((d: { status: string }) => d.status === 'a_declarer').length,
        soumise: data.filter((d: { status: string }) => d.status === 'soumise').length,
        en_cours: data.filter((d: { status: string }) => d.status === 'en_cours').length,
        approuvee: data.filter((d: { status: string }) => d.status === 'approuvee').length,
        refusee: data.filter((d: { status: string }) => d.status === 'refusee').length,
        brouillon: data.filter((d: { status: string }) => d.status === 'brouillon').length,
      };

      return stats;
    },
  });
}

// Hook pour supprimer une déclaration (admin)
export function useDeleteAdminDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professor_declarations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-declaration'] });
      queryClient.invalidateQueries({ queryKey: ['declaration-stats'] });
    },
  });
}

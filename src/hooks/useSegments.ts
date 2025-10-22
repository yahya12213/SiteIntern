import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface Segment {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateSegmentInput {
  name: string;
  color: string;
}

export interface UpdateSegmentInput {
  id: string;
  name: string;
  color: string;
}

// Récupérer tous les segments
export const useSegments = () => {
  return useQuery<Segment[]>({
    queryKey: ['segments'],
    queryFn: async () => {
      console.log('🔍 useSegments: Fetching from SUPABASE API...');
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      console.log('✅ Supabase data received:', data);
      return data || [];
    },
  });
};

// Récupérer un segment par ID
export const useSegment = (id: string) => {
  return useQuery<Segment | null>({
    queryKey: ['segments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    },
    enabled: !!id,
  });
};

// Créer un nouveau segment
export const useCreateSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSegmentInput) => {
      const id = uuidv4();
      const insertData: any = {
        id,
        name: data.name,
        color: data.color,
      };

      const { data: segment, error } = await supabase
        .from('segments')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return segment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

// Mettre à jour un segment
export const useUpdateSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSegmentInput) => {
      const updateData: any = {
        name: data.name,
        color: data.color,
      };

      const query = supabase
        .from('segments')
        .update(updateData as never)
        .eq('id', data.id)
        .select()
        .single();
      const { data: segment, error } = await query;

      if (error) throw error;
      return segment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

// Supprimer un segment
export const useDeleteSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('segments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

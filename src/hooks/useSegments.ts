import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { segmentsApi } from '@/lib/api/segments';
import type { Segment, CreateSegmentInput, UpdateSegmentInput } from '@/lib/api/segments';
import { v4 as uuidv4 } from 'uuid';

// Ré-exporter les types pour compatibilité
export type { Segment, CreateSegmentInput, UpdateSegmentInput };

// Récupérer tous les segments
export const useSegments = () => {
  return useQuery<Segment[]>({
    queryKey: ['segments'],
    queryFn: () => segmentsApi.getAll(),
  });
};

// Récupérer un segment par ID
export const useSegment = (id: string) => {
  return useQuery<Segment | null>({
    queryKey: ['segments', id],
    queryFn: () => segmentsApi.getById(id),
    enabled: !!id,
  });
};

// Créer un nouveau segment
export const useCreateSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSegmentInput) => {
      const id = uuidv4();
      return segmentsApi.create(id, data);
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
    mutationFn: (data: UpdateSegmentInput) => segmentsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

// Supprimer un segment
export const useDeleteSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => segmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

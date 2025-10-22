import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { declarationsApi } from '@/lib/api/declarations';
import type { Declaration } from '@/lib/api/declarations';

export type AdminDeclaration = Declaration;

// Hook pour récupérer toutes les déclarations (admin)
export function useAdminDeclarations(status?: string) {
  return useQuery({
    queryKey: ['admin-declarations', status],
    queryFn: async () => {
      const declarations = await declarationsApi.getAll();

      // Filtrer par statut si fourni
      if (status && status !== 'all') {
        return declarations.filter(d => d.status === status);
      }

      return declarations;
    },
  });
}

// Hook pour approuver une déclaration
export function useApproveDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return declarationsApi.update({
        id,
        status: 'approuvee',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-declaration'] });
    },
  });
}

// Hook pour rejeter une déclaration
export function useRejectDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return declarationsApi.update({
        id,
        status: 'refusee',
        rejection_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-declaration'] });
    },
  });
}

// Hook pour demander des modifications
export function useRequestModifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return declarationsApi.update({
        id,
        status: 'en_cours',
        rejection_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-declaration'] });
    },
  });
}

// Hook pour récupérer une déclaration par ID
export function useAdminDeclaration(id: string) {
  return useQuery({
    queryKey: ['admin-declaration', id],
    queryFn: () => declarationsApi.getById(id),
    enabled: !!id,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { declarationsApi } from '@/lib/api/declarations';
import type { Declaration } from '@/lib/api/declarations';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export type ProfessorDeclaration = Declaration;

export interface CreateDeclarationInput {
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  form_data?: Record<string, unknown>;
}

export interface UpdateDeclarationInput {
  id: string;
  form_data: Record<string, unknown>;
}

// Hook pour récupérer les déclarations du professeur connecté
export function useProfessorDeclarations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-declarations', user?.id],
    queryFn: () => declarationsApi.getAll(user?.id),
    enabled: !!user?.id,
  });
}

// Hook pour récupérer une déclaration par ID
export function useProfessorDeclaration(id: string) {
  return useQuery({
    queryKey: ['professor-declaration', id],
    queryFn: () => declarationsApi.getById(id),
    enabled: !!id,
  });
}

// Hook pour créer une déclaration
export function useCreateDeclaration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDeclarationInput) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');

      const id = uuidv4();
      return declarationsApi.create({
        id,
        professor_id: user.id,
        ...input,
        form_data: JSON.stringify(input.form_data || {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor-declarations'] });
    },
  });
}

// Hook pour mettre à jour une déclaration
export function useUpdateDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDeclarationInput) => {
      return declarationsApi.update({
        id: input.id,
        form_data: JSON.stringify(input.form_data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['professor-declaration'] });
    },
  });
}

// Hook pour soumettre une déclaration
export function useSubmitDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return declarationsApi.update({
        id,
        status: 'soumise',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['professor-declaration'] });
    },
  });
}

// Hook pour supprimer une déclaration
export function useDeleteDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => declarationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor-declarations'] });
    },
  });
}

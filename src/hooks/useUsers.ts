import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/lib/api/profiles';
import type { Profile } from '@/lib/api/profiles';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: 'admin' | 'professor' | 'gerant';
  created_at: string;
}

export interface Segment {
  id: string;
  name: string;
  color: string;
}

export interface City {
  id: string;
  name: string;
  segment_id: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  full_name: string;
  role: 'admin' | 'professor' | 'gerant';
}

export interface UpdateUserInput {
  id: string;
  username?: string;
  password?: string;
  full_name?: string;
  role?: 'admin' | 'professor' | 'gerant';
}

export interface AssignSegmentsInput {
  user_id: string;
  segment_ids: string[];
  role: 'professor' | 'gerant';
}

export interface AssignCitiesInput {
  user_id: string;
  city_ids: string[];
  role: 'professor' | 'gerant';
}

// Hook pour récupérer tous les utilisateurs
export function useUsers(roleFilter?: 'admin' | 'professor' | 'gerant' | 'all') {
  return useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const profiles = await profilesApi.getAll();
      if (!roleFilter || roleFilter === 'all') {
        return profiles as User[];
      }
      return profiles.filter(p => p.role === roleFilter) as User[];
    },
  });
}

// Hook pour récupérer un utilisateur spécifique
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => profilesApi.getById(id),
    enabled: !!id,
  });
}

// Hook pour créer un utilisateur
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const id = uuidv4();
      return profilesApi.create({
        id,
        ...input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Hook pour mettre à jour un utilisateur
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserInput) => profilesApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

// Hook pour supprimer un utilisateur
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => profilesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Hook pour assigner des segments à un utilisateur (professeur ou gérant)
export function useAssignSegments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignSegmentsInput) => {
      return profilesApi.update({
        id: input.user_id,
        segment_ids: input.segment_ids,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Hook pour assigner des villes à un utilisateur (professeur ou gérant)
export function useAssignCities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignCitiesInput) => {
      return profilesApi.update({
        id: input.user_id,
        city_ids: input.city_ids,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

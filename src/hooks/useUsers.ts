import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
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
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as User[];
    },
  });
}

// Hook pour récupérer un utilisateur spécifique
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as User;
    },
    enabled: !!id,
  });
}

// Hook pour créer un utilisateur
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const newUser = {
        id: uuidv4(),
        username: input.username,
        password: input.password,
        full_name: input.full_name,
        role: input.role,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(newUser)
        .select()
        .single();

      if (error) throw error;

      return data as User;
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
    mutationFn: async (input: UpdateUserInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as User;
    },
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Hook pour récupérer les segments d'un utilisateur (professeur ou gérant)
export function useUserSegments(userId: string, role: 'professor' | 'gerant') {
  return useQuery({
    queryKey: ['user-segments', userId, role],
    queryFn: async () => {
      const tableName = role === 'professor' ? 'professor_segments' : 'gerant_segments';

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          segment_id,
          segments:segment_id (id, name, color)
        `)
        .eq(`${role}_id`, userId);

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.segments)
        .filter(Boolean) as Segment[];
    },
    enabled: !!userId && (role === 'professor' || role === 'gerant'),
  });
}

// Hook pour récupérer les villes d'un utilisateur (professeur ou gérant)
export function useUserCities(userId: string, role: 'professor' | 'gerant') {
  return useQuery({
    queryKey: ['user-cities', userId, role],
    queryFn: async () => {
      const tableName = role === 'professor' ? 'professor_cities' : 'gerant_cities';

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          city_id,
          cities:city_id (id, name, segment_id)
        `)
        .eq(`${role}_id`, userId);

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.cities)
        .filter(Boolean) as City[];
    },
    enabled: !!userId && (role === 'professor' || role === 'gerant'),
  });
}

// Hook pour assigner des segments à un utilisateur
export function useAssignSegments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignSegmentsInput) => {
      const { user_id, segment_ids, role } = input;
      const tableName = role === 'professor' ? 'professor_segments' : 'gerant_segments';
      const columnName = role === 'professor' ? 'professor_id' : 'gerant_id';

      // Supprimer les anciens segments
      await supabase
        .from(tableName)
        .delete()
        .eq(columnName, user_id);

      // Ajouter les nouveaux segments
      if (segment_ids.length > 0) {
        const assignments = segment_ids.map((segment_id) => ({
          [columnName]: user_id,
          segment_id,
        }));

        const { error } = await supabase
          .from(tableName)
          .insert(assignments);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-segments'] });
    },
  });
}

// Hook pour assigner des villes à un utilisateur
export function useAssignCities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignCitiesInput) => {
      const { user_id, city_ids, role } = input;
      const tableName = role === 'professor' ? 'professor_cities' : 'gerant_cities';
      const columnName = role === 'professor' ? 'professor_id' : 'gerant_id';

      // Supprimer les anciennes villes
      await supabase
        .from(tableName)
        .delete()
        .eq(columnName, user_id);

      // Ajouter les nouvelles villes
      if (city_ids.length > 0) {
        const assignments = city_ids.map((city_id) => ({
          [columnName]: user_id,
          city_id,
        }));

        const { error } = await supabase
          .from(tableName)
          .insert(assignments);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-cities'] });
    },
  });
}

// Hook pour récupérer tous les segments
export function useAllSegments() {
  return useQuery({
    queryKey: ['all-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .order('name');

      if (error) throw error;

      return data as Segment[];
    },
  });
}

// Hook pour récupérer toutes les villes
export function useAllCities() {
  return useQuery({
    queryKey: ['all-cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');

      if (error) throw error;

      return data as City[];
    },
  });
}

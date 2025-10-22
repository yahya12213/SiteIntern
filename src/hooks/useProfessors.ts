import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface Professor {
  id: string;
  username: string;
  full_name: string;
  password: string;
  role: string;
  created_at: string;
}

export interface ProfessorWithCities extends Professor {
  cities: Array<{ id: string; name: string }>;
}

export interface CreateProfessorInput {
  username: string;
  full_name: string;
  password: string;
}

export interface UpdateProfessorInput {
  id: string;
  username: string;
  full_name: string;
  password?: string;
}

// Récupérer tous les professeurs
export const useProfessors = () => {
  return useQuery<Professor[]>({
    queryKey: ['professors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'professor')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

// Récupérer un professeur par ID avec ses villes
export const useProfessor = (id: string) => {
  return useQuery<ProfessorWithCities | null>({
    queryKey: ['professors', id],
    queryFn: async () => {
      // Récupérer le professeur
      const { data: professor, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'professor')
        .single();

      if (profError) {
        if (profError.code === 'PGRST116') return null;
        throw profError;
      }

      // Récupérer les villes affectées
      const { data: cityData, error: cityError } = await supabase
        .from('professor_cities')
        .select(`
          cities:city_id (
            id,
            name
          )
        `)
        .eq('professor_id', id);

      if (cityError) throw cityError;

      const cities = (cityData || []).map((item: any) => item.cities).filter(Boolean);

      return {
        ...professor,
        cities,
      };
    },
    enabled: !!id,
  });
};

// Créer un nouveau professeur
export const useCreateProfessor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProfessorInput) => {
      const id = uuidv4();
      const { data: professor, error } = await supabase
        .from('profiles')
        .insert({
          id,
          username: data.username,
          password: data.password,
          full_name: data.full_name,
          role: 'professor',
        })
        .select()
        .single();

      if (error) throw error;
      return professor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professors'] });
    },
  });
};

// Mettre à jour un professeur
export const useUpdateProfessor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfessorInput) => {
      const updateData: any = {
        username: data.username,
        full_name: data.full_name,
      };

      if (data.password) {
        updateData.password = data.password;
      }

      const { data: professor, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return professor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professors'] });
    },
  });
};

// Supprimer un professeur
export const useDeleteProfessor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professors'] });
    },
  });
};

// Récupérer les villes d'un professeur
export const useProfessorCities = (professorId: string) => {
  return useQuery<Array<{ id: string; name: string; segment_name: string }>>({
    queryKey: ['professors', professorId, 'cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_cities')
        .select(`
          cities:city_id (
            id,
            name,
            segments:segment_id (
              name
            )
          )
        `)
        .eq('professor_id', professorId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.cities?.id,
        name: item.cities?.name,
        segment_name: item.cities?.segments?.name,
      })).filter(city => city.id);
    },
    enabled: !!professorId,
  });
};

// Affecter une ville à un professeur
export const useAssignCityToProfessor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ professorId, cityId }: { professorId: string; cityId: string }) => {
      // Vérifier si l'affectation existe déjà
      const { data: existing } = await supabase
        .from('professor_cities')
        .select('professor_id')
        .eq('professor_id', professorId)
        .eq('city_id', cityId)
        .maybeSingle();

      if (existing) {
        throw new Error('Cette ville est déjà affectée à ce professeur');
      }

      const { error } = await supabase
        .from('professor_cities')
        .insert({
          professor_id: professorId,
          city_id: cityId,
        });

      if (error) throw error;
      return { professorId, cityId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId, 'cities'] });
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId] });
    },
  });
};

// Retirer une ville d'un professeur
export const useUnassignCityFromProfessor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ professorId, cityId }: { professorId: string; cityId: string }) => {
      const { error } = await supabase
        .from('professor_cities')
        .delete()
        .eq('professor_id', professorId)
        .eq('city_id', cityId);

      if (error) throw error;
      return { professorId, cityId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId, 'cities'] });
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId] });
    },
  });
};

// Récupérer les segments d'un professeur
export const useProfessorSegments = (professorId: string) => {
  return useQuery<Array<{ id: string; name: string; color: string }>>({
    queryKey: ['professors', professorId, 'segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_segments')
        .select(`
          segments:segment_id (
            id,
            name,
            color
          )
        `)
        .eq('professor_id', professorId);

      if (error) throw error;

      return (data || []).map((item: any) => item.segments).filter(Boolean);
    },
    enabled: !!professorId,
  });
};

// Affecter un segment à un professeur
export const useAssignSegmentToProfessor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ professorId, segmentId }: { professorId: string; segmentId: string }) => {
      // Vérifier si l'affectation existe déjà
      const { data: existing } = await supabase
        .from('professor_segments')
        .select('professor_id')
        .eq('professor_id', professorId)
        .eq('segment_id', segmentId)
        .maybeSingle();

      if (existing) {
        throw new Error('Ce segment est déjà affecté à ce professeur');
      }

      const { error } = await supabase
        .from('professor_segments')
        .insert({
          professor_id: professorId,
          segment_id: segmentId,
        });

      if (error) throw error;
      return { professorId, segmentId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId, 'segments'] });
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId] });
    },
  });
};

// Retirer un segment d'un professeur
export const useUnassignSegmentFromProfessor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ professorId, segmentId }: { professorId: string; segmentId: string }) => {
      const { error } = await supabase
        .from('professor_segments')
        .delete()
        .eq('professor_id', professorId)
        .eq('segment_id', segmentId);

      if (error) throw error;
      return { professorId, segmentId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId, 'segments'] });
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId] });
      queryClient.invalidateQueries({ queryKey: ['professors', variables.professorId, 'cities'] });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface City {
  id: string;
  name: string;
  segment_id: string;
  segment_name?: string;
  created_at: string;
}

export interface CreateCityInput {
  name: string;
  segment_id: string;
}

export interface UpdateCityInput {
  id: string;
  name: string;
  segment_id: string;
}

// Récupérer toutes les villes avec les informations du segment
export const useCities = () => {
  return useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select(`
          id,
          name,
          segment_id,
          created_at,
          segments:segment_id (name)
        `)
        .order('name', { ascending: true });

      if (error) throw error;

      // Map to include segment_name
      return (data || []).map((city: any) => ({
        id: city.id,
        name: city.name,
        segment_id: city.segment_id,
        segment_name: city.segments?.name,
        created_at: city.created_at,
      }));
    },
  });
};

// Récupérer une ville par ID
export const useCity = (id: string) => {
  return useQuery<City | null>({
    queryKey: ['cities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select(`
          id,
          name,
          segment_id,
          created_at,
          segments:segment_id (name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        segment_id: data.segment_id,
        segment_name: (data as any).segments?.name,
        created_at: data.created_at,
      };
    },
    enabled: !!id,
  });
};

// Récupérer les villes par segment
export const useCitiesBySegment = (segmentId: string) => {
  return useQuery<City[]>({
    queryKey: ['cities', 'segment', segmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select(`
          id,
          name,
          segment_id,
          created_at,
          segments:segment_id (name)
        `)
        .eq('segment_id', segmentId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map((city: any) => ({
        id: city.id,
        name: city.name,
        segment_id: city.segment_id,
        segment_name: city.segments?.name,
        created_at: city.created_at,
      }));
    },
    enabled: !!segmentId,
  });
};

// Créer une nouvelle ville
export const useCreateCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCityInput) => {
      const id = uuidv4();
      const { data: city, error } = await supabase
        .from('cities')
        .insert({
          id,
          name: data.name,
          segment_id: data.segment_id,
        })
        .select()
        .single();

      if (error) throw error;
      return city;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });
};

// Mettre à jour une ville
export const useUpdateCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateCityInput) => {
      const { data: city, error } = await supabase
        .from('cities')
        .update({
          name: data.name,
          segment_id: data.segment_id,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return city;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });
};

// Supprimer une ville
export const useDeleteCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });
};

// Import en masse de villes
export interface ImportCityData {
  name: string;
  segment_id: string;
}

export const useImportCities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cities: ImportCityData[]) => {
      const results = {
        success: 0,
        errors: [] as Array<{ row: number; error: string; data: ImportCityData }>,
      };

      for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        try {
          // Vérifier que toutes les données sont présentes
          if (!city.name || !city.segment_id) {
            results.errors.push({
              row: i + 2, // +2 car ligne 1 = header, et index commence à 0
              error: 'Données manquantes (nom ou segment)',
              data: city,
            });
            continue;
          }

          // Vérifier si la ville existe déjà (par nom et segment)
          const { data: existing } = await supabase
            .from('cities')
            .select('id')
            .eq('name', city.name.trim())
            .eq('segment_id', city.segment_id)
            .maybeSingle();

          if (existing) {
            results.errors.push({
              row: i + 2,
              error: `Une ville avec le nom "${city.name}" existe déjà dans ce segment`,
              data: city,
            });
            continue;
          }

          // Créer la ville
          const id = uuidv4();
          const { error } = await supabase
            .from('cities')
            .insert({
              id,
              name: city.name.trim(),
              segment_id: city.segment_id,
            });

          if (error) throw error;
          results.success++;
        } catch (error) {
          results.errors.push({
            row: i + 2,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
            data: city,
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { citiesApi } from '@/lib/api/cities';
import type { City, CreateCityInput, UpdateCityInput } from '@/lib/api/cities';
import { v4 as uuidv4 } from 'uuid';

// Ré-exporter les types pour compatibilité
export type { City, CreateCityInput, UpdateCityInput };

// Récupérer toutes les villes avec les informations du segment
export const useCities = () => {
  return useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: () => citiesApi.getAll(),
  });
};

// Récupérer une ville par ID
export const useCity = (id: string) => {
  return useQuery<City | null>({
    queryKey: ['cities', id],
    queryFn: () => citiesApi.getById(id),
    enabled: !!id,
  });
};

// Récupérer les villes par segment
export const useCitiesBySegment = (segmentId: string) => {
  return useQuery({
    queryKey: ['cities', 'segment', segmentId],
    queryFn: (): Promise<City[]> => citiesApi.getBySegment(segmentId),
    enabled: !!segmentId,
  });
};

// Créer une nouvelle ville
export const useCreateCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCityInput) => {
      const id = uuidv4();
      return citiesApi.create(id, data);
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
    mutationFn: (data: UpdateCityInput) => citiesApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });
};

// Supprimer une ville
export const useDeleteCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => citiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });
};

// Import en masse de villes
export interface ImportCityData {
  name: string;
  code: string;
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

      // Récupérer toutes les villes existantes pour vérification
      const existingCities = await citiesApi.getAll();

      for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        try {
          // Vérifier que toutes les données sont présentes
          if (!city.name || !city.code || !city.segment_id) {
            results.errors.push({
              row: i + 2, // +2 car ligne 1 = header, et index commence à 0
              error: 'Données manquantes (nom, code ou segment)',
              data: city,
            });
            continue;
          }

          // Vérifier si la ville existe déjà (par nom et segment)
          const existing = existingCities.find(
            (c) => c.name.trim() === city.name.trim() && c.segment_id === city.segment_id
          );

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
          await citiesApi.create(id, {
            name: city.name.trim(),
            code: city.code.trim(),
            segment_id: city.segment_id,
          });

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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { declarationsApi } from '@/lib/api/declarations';
import type { Declaration, DeclarationStatus } from '@/lib/api/declarations';
import { calculationSheetsApi } from '@/lib/api/calculationSheets';
import { citiesApi } from '@/lib/api/cities';
import { segmentsApi } from '@/lib/api/segments';
import { profilesApi } from '@/lib/api/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export type ProfessorDeclaration = Declaration;

export interface ProfessorCity {
  id: string;
  name: string;
  segment_id: string;
  segment_name?: string;
}

export interface CreateDeclarationInput {
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  form_data?: Record<string, unknown>;
  professor_id?: string; // Pour créer une déclaration pour un autre professeur
  status?: DeclarationStatus; // Statut initial (ex: 'a_declarer' pour rôle impression)
}

export interface UpdateDeclarationInput {
  id: string;
  form_data: Record<string, unknown>;
}

// Hook pour récupérer les déclarations du professeur connecté
// Si l'utilisateur a des city_ids (gestionnaire), filtre par villes
// Si le rôle est "impression", voir toutes les déclarations
// Sinon, filtre par professor_id (professeur classique)
export function useProfessorDeclarations() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['professor-declarations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Vérifier si l'utilisateur a des villes assignées (gestionnaire)
      const profile = await profilesApi.getById(user.id);
      const hasCities = profile?.city_ids && profile.city_ids.length > 0;

      // Rôle "impression" voit toutes les déclarations (lecture seule)
      if (profile?.role === 'impression') {
        return declarationsApi.getAll(undefined, false, true); // viewAll = true
      }

      // Si gestionnaire (avec des villes assignées) mais pas admin ni professeur pur
      const isManager = hasCities && profile?.role !== 'professor' && !isAdmin;

      if (isManager) {
        // Récupérer les déclarations des villes assignées
        return declarationsApi.getAll(undefined, true);
      } else {
        // Professeur classique : ses propres déclarations
        return declarationsApi.getAll(user.id);
      }
    },
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
      // Si professor_id est fourni (rôle impression), utiliser celui-ci
      // Sinon utiliser l'utilisateur connecté
      const professorId = input.professor_id || user.id;

      return declarationsApi.create({
        id,
        professor_id: professorId,
        calculation_sheet_id: input.calculation_sheet_id,
        segment_id: input.segment_id,
        city_id: input.city_id,
        start_date: input.start_date,
        end_date: input.end_date,
        form_data: JSON.stringify(input.form_data || {}),
        status: input.status, // Permet de spécifier le statut initial
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
      const declaration = await declarationsApi.getById(id);
      if (!declaration) throw new Error('Déclaration non trouvée');

      return declarationsApi.update({
        id,
        form_data: declaration.form_data,
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

// Hook pour récupérer les fiches de calcul disponibles (publiées)
export function useAvailableCalculationSheets() {
  return useQuery({
    queryKey: ['available-calculation-sheets'],
    queryFn: async () => {
      const sheets = await calculationSheetsApi.getAll();
      return sheets.filter(sheet => sheet.status === 'published');
    },
  });
}

// Hook pour récupérer les segments du professeur connecté
export function useProfessorSegments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-segments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const professor = await profilesApi.getById(user.id);
      if (!professor || !professor.segment_ids) return [];

      const allSegments = await segmentsApi.getAll();
      return allSegments.filter(segment => professor.segment_ids?.includes(segment.id));
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les villes du professeur connecté
export function useProfessorCities(): { data: ProfessorCity[] | undefined; isLoading: boolean } {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['professor-cities', user?.id],
    queryFn: async (): Promise<ProfessorCity[]> => {
      if (!user?.id) return [];

      const professor = await profilesApi.getById(user.id);
      if (!professor || !professor.city_ids) return [];

      const allCities = await citiesApi.getAll();
      return allCities
        .filter(city => professor.city_ids?.includes(city.id))
        .map(city => ({
          id: city.id,
          name: city.name,
          segment_id: city.segment_id,
          segment_name: city.segment_name,
        }));
    },
    enabled: !!user?.id,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}

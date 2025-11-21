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
// Le backend filtre automatiquement par segment ET ville assignés à l'utilisateur (via middleware injectUserScope)
// Admins voient tout, les autres voient uniquement leur scope
export function useProfessorDeclarations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-declarations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Le backend applique automatiquement le filtrage par scope (segment + ville)
      // Plus besoin de passer filter_by_user ou viewAll
      return declarationsApi.getAll();
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
// Si admin: retourne TOUS les segments
// Si professeur: retourne uniquement ses segments assignés
export function useProfessorSegments() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['professor-segments', user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) return [];

      const allSegments = await segmentsApi.getAll();

      // Si admin, retourner tous les segments
      if (isAdmin) {
        return allSegments;
      }

      // Si professeur, filtrer par segments assignés
      const professor = await profilesApi.getById(user.id);
      if (!professor || !professor.segment_ids) return [];

      return allSegments.filter(segment => professor.segment_ids?.includes(segment.id));
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les villes du professeur connecté
// Si admin: retourne TOUTES les villes
// Si professeur: retourne uniquement ses villes assignées
export function useProfessorCities(): { data: ProfessorCity[] | undefined; isLoading: boolean } {
  const { user, isAdmin } = useAuth();

  const query = useQuery({
    queryKey: ['professor-cities', user?.id, isAdmin],
    queryFn: async (): Promise<ProfessorCity[]> => {
      if (!user?.id) return [];

      const allCities = await citiesApi.getAll();

      // Si admin, retourner toutes les villes
      if (isAdmin) {
        return allCities.map(city => ({
          id: city.id,
          name: city.name,
          segment_id: city.segment_id,
          segment_name: city.segment_name,
        }));
      }

      // Si professeur, filtrer par villes assignées
      const professor = await profilesApi.getById(user.id);
      if (!professor || !professor.city_ids) return [];

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

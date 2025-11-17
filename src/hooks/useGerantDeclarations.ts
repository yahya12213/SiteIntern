import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { declarationsApi } from '@/lib/api/declarations';
import { profilesApi } from '@/lib/api/profiles';
import { calculationSheetsApi } from '@/lib/api/calculationSheets';
import { segmentsApi } from '@/lib/api/segments';
import { citiesApi } from '@/lib/api/cities';
import type { Declaration } from '@/lib/api/declarations';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export interface GerantSegment {
  id: string;
  name: string;
  color: string;
}

export interface GerantCity {
  id: string;
  name: string;
  segment_id: string;
}

export interface ProfessorForDeclaration {
  id: string;
  full_name: string;
  username: string;
}

export interface PublishedCalculationSheet {
  id: string;
  title: string;
  template_data: string;
  sheet_date: string;
}

export interface CreateGerantDeclarationInput {
  professor_id: string;
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
}

// Hook pour récupérer les segments du gérant
export function useGerantSegments() {
  const { user, isAdmin } = useAuth();

  return useQuery<GerantSegment[]>({
    queryKey: ['gerant-segments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const allSegments = await segmentsApi.getAll();

      // Si admin, retourner TOUS les segments
      if (isAdmin) {
        return allSegments;
      }

      // Sinon, filtrer par segment_ids du profil
      const profile = await profilesApi.getById(user.id);
      if (!profile || !profile.segment_ids) return [];
      return allSegments.filter(s => profile.segment_ids?.includes(s.id));
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les villes du gérant
export function useGerantCities() {
  const { user, isAdmin } = useAuth();

  return useQuery<GerantCity[]>({
    queryKey: ['gerant-cities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const allCities = await citiesApi.getAll();

      // Si admin, retourner TOUTES les villes
      if (isAdmin) {
        return allCities;
      }

      // Sinon, filtrer par city_ids du profil
      const profile = await profilesApi.getById(user.id);
      if (!profile || !profile.city_ids) return [];
      return allCities.filter(c => profile.city_ids?.includes(c.id));
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les professeurs
export function useAvailableProfessors() {
  return useQuery<ProfessorForDeclaration[]>({
    queryKey: ['available-professors'],
    queryFn: async () => {
      const profiles = await profilesApi.getAll();
      return profiles
        .filter(p => p.role === 'professor')
        .map(p => ({
          id: p.id,
          full_name: p.full_name,
          username: p.username,
        }));
    },
  });
}

// Hook pour récupérer les fiches publiées
export function usePublishedCalculationSheets() {
  return useQuery<PublishedCalculationSheet[]>({
    queryKey: ['published-calculation-sheets'],
    queryFn: async () => {
      const sheets = await calculationSheetsApi.getAll();
      return sheets
        .filter(s => s.status === 'published')
        .map(s => ({
          id: s.id,
          title: s.title,
          template_data: s.template_data,
          sheet_date: s.sheet_date,
        }));
    },
  });
}

// Hook pour créer une déclaration (gérant)
export function useCreateGerantDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGerantDeclarationInput) => {
      const id = uuidv4();
      return declarationsApi.create({
        id,
        ...input,
        form_data: '{}',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerant-declarations'] });
    },
  });
}

// Hook pour récupérer les déclarations du gérant (filtrées par ses villes assignées)
export function useGerantDeclarations() {
  const { user } = useAuth();

  return useQuery<Declaration[]>({
    queryKey: ['gerant-declarations', user?.id],
    queryFn: async () => {
      // Récupérer les déclarations filtrées par les villes de l'utilisateur
      const declarations = await declarationsApi.getAll(undefined, true);
      // Retourner toutes les déclarations des villes assignées (tous statuts)
      return declarations;
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les professeurs par segment et ville
export function useProfessorsBySegmentCity(segmentId?: string, cityId?: string) {
  return useQuery<ProfessorForDeclaration[]>({
    queryKey: ['professors-by-segment-city', segmentId, cityId],
    queryFn: async () => {
      const profiles = await profilesApi.getAll();
      const professors = profiles.filter(p => p.role === 'professor');

      return professors
        .filter(prof => {
          if (segmentId && !prof.segment_ids?.includes(segmentId)) return false;
          if (cityId && !prof.city_ids?.includes(cityId)) return false;
          return true;
        })
        .map(p => ({
          id: p.id,
          full_name: p.full_name,
          username: p.username,
        }));
    },
    enabled: !!segmentId || !!cityId,
  });
}

// Hook pour récupérer les fiches publiées pour un segment spécifique
export function usePublishedSheetForSegment(segmentId?: string) {
  return useQuery<PublishedCalculationSheet[]>({
    queryKey: ['published-sheets-segment', segmentId],
    queryFn: async () => {
      const sheets = await calculationSheetsApi.getAll();
      return sheets
        .filter(s => {
          if (s.status !== 'published') return false;
          if (segmentId && s.segment_ids && !s.segment_ids.includes(segmentId)) return false;
          return true;
        })
        .map(s => ({
          id: s.id,
          title: s.title,
          template_data: s.template_data,
          sheet_date: s.sheet_date,
        }));
    },
    enabled: !!segmentId,
  });
}

// Hook pour créer une déclaration pour un professeur spécifique
export function useCreateDeclarationForProfessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGerantDeclarationInput) => {
      const id = uuidv4();
      return declarationsApi.create({
        id,
        ...input,
        form_data: '{}',
        status: 'a_declarer', // Statut 'a_declarer' pour les déclarations créées par le gérant/admin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerant-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['professor-declarations'] });
    },
  });
}

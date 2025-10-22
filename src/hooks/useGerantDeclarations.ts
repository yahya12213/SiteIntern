import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
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

export interface GerantDeclaration {
  id: string;
  professor_id: string;
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  status: 'brouillon' | 'a_declarer' | 'soumise' | 'en_cours' | 'approuvee' | 'refusee';
  created_by: string;
  creator_role: 'professor' | 'gerant' | 'admin';
  created_at: string;
  updated_at: string;

  // Données jointes
  professor_name?: string;
  segment_name?: string;
  city_name?: string;
  sheet_title?: string;
}

export interface CreateDeclarationForProfessorInput {
  professor_id: string;
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
}

// Hook pour récupérer les segments assignés au gérant connecté (ou tous les segments si admin)
export function useGerantSegments() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['gerant-segments', user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Si admin, retourner tous les segments
      if (isAdmin) {
        const { data, error } = await supabase
          .from('segments')
          .select('id, name, color')
          .order('name');

        if (error) throw error;
        return (data || []) as GerantSegment[];
      }

      // Si gérant, retourner uniquement les segments assignés
      const { data, error } = await supabase
        .from('gerant_segments')
        .select(`
          segment_id,
          segments:segment_id (id, name, color)
        `)
        .eq('gerant_id', user.id);

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.segments)
        .filter(Boolean) as GerantSegment[];
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les villes assignées au gérant connecté (ou toutes les villes si admin)
export function useGerantCities() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['gerant-cities', user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Si admin, retourner toutes les villes
      if (isAdmin) {
        const { data, error } = await supabase
          .from('cities')
          .select('id, name, segment_id')
          .order('name');

        if (error) throw error;
        return (data || []) as GerantCity[];
      }

      // Si gérant, retourner uniquement les villes assignées
      const { data, error } = await supabase
        .from('gerant_cities')
        .select(`
          city_id,
          cities:city_id (id, name, segment_id)
        `)
        .eq('gerant_id', user.id);

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.cities)
        .filter(Boolean) as GerantCity[];
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les professeurs ayant un segment et une ville spécifiques
export function useProfessorsBySegmentCity(segmentId: string, cityId: string) {
  return useQuery({
    queryKey: ['professors-by-segment-city', segmentId, cityId],
    queryFn: async () => {
      if (!segmentId || !cityId) return [];

      // Trouver les profs qui ont ce segment ET cette ville
      const { data: profsBySegment, error: error1 } = await supabase
        .from('professor_segments')
        .select('professor_id')
        .eq('segment_id', segmentId);

      if (error1) throw error1;

      const { data: profsByCity, error: error2 } = await supabase
        .from('professor_cities')
        .select('professor_id')
        .eq('city_id', cityId);

      if (error2) throw error2;

      // Intersection des deux listes
      const profIdsSegment = new Set(profsBySegment?.map(p => p.professor_id) || []);
      const profIdsCity = profsByCity?.map(p => p.professor_id) || [];
      const commonProfIds = profIdsCity.filter(id => profIdsSegment.has(id));

      if (commonProfIds.length === 0) return [];

      // Récupérer les infos des professeurs
      const { data: professors, error: error3 } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('role', 'professor')
        .in('id', commonProfIds);

      if (error3) throw error3;

      return professors as ProfessorForDeclaration[];
    },
    enabled: !!segmentId && !!cityId,
  });
}

// Hook pour récupérer la fiche de calcul publiée pour un segment
export function usePublishedSheetForSegment(segmentId: string) {
  return useQuery({
    queryKey: ['published-sheet-for-segment', segmentId],
    queryFn: async () => {
      if (!segmentId) return null;

      // Récupérer les fiches publiées assignées à ce segment
      const { data: sheetSegments, error: error1 } = await supabase
        .from('calculation_sheet_segments')
        .select('sheet_id')
        .eq('segment_id', segmentId);

      if (error1) throw error1;

      const sheetIds = sheetSegments?.map(s => s.sheet_id) || [];
      if (sheetIds.length === 0) return null;

      // Récupérer les fiches publiées parmi ces IDs
      const { data: sheets, error: error2 } = await supabase
        .from('calculation_sheets')
        .select('id, title, template_data, sheet_date')
        .eq('status', 'published')
        .in('id', sheetIds)
        .order('sheet_date', { ascending: false })
        .limit(1)
        .single();

      if (error2) {
        if (error2.code === 'PGRST116') return null; // Not found
        throw error2;
      }

      return sheets as PublishedCalculationSheet;
    },
    enabled: !!segmentId,
  });
}

// Hook pour récupérer les déclarations créées par le gérant connecté
export function useGerantDeclarations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gerant-declarations', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('professor_declarations')
        .select(`
          id,
          professor_id,
          calculation_sheet_id,
          segment_id,
          city_id,
          start_date,
          end_date,
          status,
          created_by,
          creator_role,
          created_at,
          updated_at,
          professor:professor_id (full_name),
          segment:segment_id (name),
          city:city_id (name),
          calculation_sheet:calculation_sheet_id (title)
        `)
        .eq('created_by', user.id)
        .eq('creator_role', 'gerant')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        professor_id: row.professor_id,
        calculation_sheet_id: row.calculation_sheet_id,
        segment_id: row.segment_id,
        city_id: row.city_id,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        created_by: row.created_by,
        creator_role: row.creator_role,
        created_at: row.created_at,
        updated_at: row.updated_at,
        professor_name: row.professor?.full_name,
        segment_name: row.segment?.name,
        city_name: row.city?.name,
        sheet_title: row.calculation_sheet?.title,
      })) as GerantDeclaration[];
    },
    enabled: !!user?.id,
  });
}

// Hook pour créer une déclaration pour un professeur
export function useCreateDeclarationForProfessor() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDeclarationForProfessorInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const newDeclaration = {
        id: uuidv4(),
        professor_id: input.professor_id,
        calculation_sheet_id: input.calculation_sheet_id,
        segment_id: input.segment_id,
        city_id: input.city_id,
        start_date: input.start_date,
        end_date: input.end_date,
        form_data: '{}',
        status: 'a_declarer',
        created_by: user.id,
        creator_role: (isAdmin ? 'admin' : 'gerant') as 'professor' | 'gerant' | 'admin',
      };

      const { data, error } = await supabase
        .from('professor_declarations')
        .insert(newDeclaration)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerant-declarations'] });
    },
  });
}

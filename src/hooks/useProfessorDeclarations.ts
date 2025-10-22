import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export interface ProfessorDeclaration {
  id: string;
  professor_id: string;
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  form_data: string; // JSON
  status: 'brouillon' | 'soumise' | 'en_cours' | 'approuvee' | 'refusee';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;

  // Données jointes
  segment_name?: string;
  city_name?: string;
  sheet_title?: string;
}

export interface CreateDeclarationInput {
  calculation_sheet_id: string;
  segment_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  form_data?: Record<string, any>;
}

export interface UpdateDeclarationInput {
  id: string;
  form_data: Record<string, any>;
}

export interface ProfessorSegment {
  id: string;
  name: string;
  color: string;
}

export interface ProfessorCity {
  id: string;
  name: string;
  segment_id: string;
}

// Hook pour récupérer les segments affectés au professeur connecté
export function useProfessorSegments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-segments', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('professor_segments')
        .select(`
          segment_id,
          segments:segment_id (id, name, color)
        `)
        .eq('professor_id', user.id);

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.segments)
        .filter(Boolean) as ProfessorSegment[];
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer les villes affectées au professeur connecté
export function useProfessorCities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-cities', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('professor_cities')
        .select(`
          city_id,
          cities:city_id (id, name, segment_id)
        `)
        .eq('professor_id', user.id);

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.cities)
        .filter(Boolean) as ProfessorCity[];
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer toutes les déclarations du professeur connecté
export function useProfessorDeclarations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-declarations', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('professor_declarations')
        .select(`
          *,
          segments:segment_id (name),
          cities:city_id (name),
          calculation_sheets:calculation_sheet_id (title)
        `)
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        segment_name: row.segments?.name,
        city_name: row.cities?.name,
        sheet_title: row.calculation_sheets?.title,
      })) as ProfessorDeclaration[];
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer une déclaration spécifique
export function useProfessorDeclaration(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-declaration', id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('professor_declarations')
        .select(`
          *,
          segments:segment_id (name),
          cities:city_id (name),
          calculation_sheets:calculation_sheet_id (title, template_data)
        `)
        .eq('id', id)
        .eq('professor_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new Error('Declaration not found');
        throw error;
      }

      return {
        ...(data as any),
        segment_name: (data as any).segments?.name,
        city_name: (data as any).cities?.name,
        sheet_title: (data as any).calculation_sheets?.title,
        template_data: (data as any).calculation_sheets?.template_data,
      } as ProfessorDeclaration & { template_data: string };
    },
    enabled: !!user?.id && !!id,
  });
}

// Hook pour récupérer les fiches publiées disponibles pour le professeur
export function useAvailableCalculationSheets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-calculation-sheets', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Récupérer les segments du professeur
      const { data: profSegments } = await supabase
        .from('professor_segments')
        .select('segment_id')
        .eq('professor_id', user.id);

      const segmentIds = profSegments?.map((ps: { segment_id: string }) => ps.segment_id) || [];

      if (segmentIds.length === 0) return [];

      // Récupérer les villes du professeur
      const { data: profCities } = await supabase
        .from('professor_cities')
        .select('city_id')
        .eq('professor_id', user.id);

      const cityIds = profCities?.map((pc: { city_id: string }) => pc.city_id) || [];

      if (cityIds.length === 0) return [];

      // Récupérer les fiches publiées qui correspondent aux segments du professeur
      const { data: sheetSegments } = await supabase
        .from('calculation_sheet_segments')
        .select('sheet_id')
        .in('segment_id', segmentIds);

      const sheetIdsFromSegments = [...new Set(sheetSegments?.map((ss: { sheet_id: string }) => ss.sheet_id) || [])];

      if (sheetIdsFromSegments.length === 0) return [];

      // Récupérer les fiches qui correspondent aussi aux villes du professeur
      const { data: sheetCities } = await supabase
        .from('calculation_sheet_cities')
        .select('sheet_id')
        .in('sheet_id', sheetIdsFromSegments)
        .in('city_id', cityIds);

      const sheetIdsFromCities = [...new Set(sheetCities?.map((sc: { sheet_id: string }) => sc.sheet_id) || [])];

      if (sheetIdsFromCities.length === 0) return [];

      // Récupérer les fiches finales
      const { data: sheets, error } = await supabase
        .from('calculation_sheets')
        .select('*')
        .in('id', sheetIdsFromCities)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec segment_ids et city_ids
      const enrichedSheets = await Promise.all(
        (sheets || []).map(async (sheet: any) => {
          const { data: segData } = await supabase
            .from('calculation_sheet_segments')
            .select('segment_id')
            .eq('sheet_id', sheet.id);

          const { data: cityData } = await supabase
            .from('calculation_sheet_cities')
            .select('city_id')
            .eq('sheet_id', sheet.id);

          return {
            ...sheet,
            segment_ids: segData?.map((s: { segment_id: string }) => s.segment_id) || [],
            city_ids: cityData?.map((c: { city_id: string }) => c.city_id) || [],
          };
        })
      );

      return enrichedSheets;
    },
    enabled: !!user?.id,
  });
}

// Hook pour créer une nouvelle déclaration
export function useCreateDeclaration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDeclarationInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const id = uuidv4();
      const formData = JSON.stringify(input.form_data || {});

      const insertData: any = {
        id,
        professor_id: user.id,
        calculation_sheet_id: input.calculation_sheet_id,
        segment_id: input.segment_id,
        city_id: input.city_id,
        start_date: input.start_date,
        end_date: input.end_date,
        form_data: formData,
        status: 'brouillon',
      };

      const { data, error } = await supabase
        .from('professor_declarations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return (data as any).id;
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
      const formData = JSON.stringify(input.form_data);

      const updateData: any = { form_data: formData };

      const query = supabase
        .from('professor_declarations')
        .update(updateData as never)
        .eq('id', input.id);
      const { error } = await query;

      if (error) throw error;
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
      const now = new Date().toISOString();

      const updateData: any = {
        status: 'soumise',
        submitted_at: now,
      };

      const query = supabase
        .from('professor_declarations')
        .update(updateData as never)
        .eq('id', id);
      const { error } = await query;

      if (error) throw error;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professor_declarations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor-declarations'] });
    },
  });
}

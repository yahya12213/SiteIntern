import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface CalculationSheetData {
  id: string;
  title: string;
  segment_ids: string[];
  city_ids: string[];
  template_data: string; // JSON
  status: 'draft' | 'published';
  sheet_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCalculationSheetInput {
  title: string;
  segment_ids: string[];
  city_ids: string[];
}

// Hook pour récupérer toutes les fiches
export const useCalculationSheets = () => {
  return useQuery<CalculationSheetData[]>({
    queryKey: ['calculation-sheets'],
    queryFn: async () => {
      // Récupérer toutes les fiches
      const { data: sheets, error } = await supabase
        .from('calculation_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!sheets) return [];

      // Pour chaque fiche, récupérer les segments et villes associés
      const enrichedSheets = await Promise.all(
        sheets.map(async (sheet: any) => {
          // Récupérer les IDs de segments
          const { data: segmentData } = await supabase
            .from('calculation_sheet_segments')
            .select('segment_id')
            .eq('sheet_id', sheet.id);

          const segment_ids = segmentData?.map((s: { segment_id: string }) => s.segment_id) || [];

          // Récupérer les IDs de villes
          const { data: cityData } = await supabase
            .from('calculation_sheet_cities')
            .select('city_id')
            .eq('sheet_id', sheet.id);

          const city_ids = cityData?.map((c: { city_id: string }) => c.city_id) || [];

          return {
            ...sheet,
            segment_ids,
            city_ids,
          };
        })
      );

      return enrichedSheets;
    },
  });
};

// Hook pour récupérer une fiche par ID
export const useCalculationSheet = (id: string) => {
  return useQuery<CalculationSheetData | null>({
    queryKey: ['calculation-sheets', id],
    queryFn: async () => {
      const { data: sheet, error } = await supabase
        .from('calculation_sheets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      if (!sheet) return null;

      // Récupérer les IDs de segments
      const { data: segmentData } = await supabase
        .from('calculation_sheet_segments')
        .select('segment_id')
        .eq('sheet_id', id);

      const segment_ids = segmentData?.map((s: { segment_id: string }) => s.segment_id) || [];

      // Récupérer les IDs de villes
      const { data: cityData } = await supabase
        .from('calculation_sheet_cities')
        .select('city_id')
        .eq('sheet_id', id);

      const city_ids = cityData?.map((c: { city_id: string }) => c.city_id) || [];

      return {
        ...(sheet as any),
        segment_ids,
        city_ids,
      };
    },
    enabled: !!id,
  });
};

// Hook pour créer une fiche
export const useCreateCalculationSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCalculationSheetInput) => {
      const id = uuidv4();
      const now = new Date().toISOString();

      // Insérer la fiche principale
      const { data: sheet, error: sheetError } = await supabase
        .from('calculation_sheets')
        .insert({
          id,
          title: input.title,
          template_data: JSON.stringify({}),
          status: 'draft',
          sheet_date: now,
        } as any)
        .select()
        .single();

      if (sheetError) throw sheetError;

      // Insérer les relations segments
      if (input.segment_ids.length > 0) {
        const { error: segError } = await supabase
          .from('calculation_sheet_segments')
          .insert(
            input.segment_ids.map((segmentId: string) => ({
              sheet_id: id,
              segment_id: segmentId,
            })) as any
          );

        if (segError) throw segError;
      }

      // Insérer les relations villes
      if (input.city_ids.length > 0) {
        const { error: cityError } = await supabase
          .from('calculation_sheet_cities')
          .insert(
            input.city_ids.map((cityId: string) => ({
              sheet_id: id,
              city_id: cityId,
            })) as any
          );

        if (cityError) throw cityError;
      }

      return {
        ...(sheet as any),
        segment_ids: input.segment_ids,
        city_ids: input.city_ids,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-sheets'] });
    },
  });
};

// Hook pour mettre à jour une fiche
export const useUpdateCalculationSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CalculationSheetData> }) => {
      // Mettre à jour les champs basiques
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.template_data !== undefined) updateData.template_data = data.template_data;
      if (data.status !== undefined) updateData.status = data.status;

      if (Object.keys(updateData).length > 0) {
        const query = supabase
          .from('calculation_sheets')
          .update(updateData as never)
          .eq('id', id);
        const { error } = await query;

        if (error) throw error;
      }

      // Mettre à jour les segments si fournis
      if (data.segment_ids !== undefined) {
        // Supprimer les anciennes relations
        await supabase
          .from('calculation_sheet_segments')
          .delete()
          .eq('sheet_id', id);

        // Insérer les nouvelles
        if (data.segment_ids.length > 0) {
          const { error } = await supabase
            .from('calculation_sheet_segments')
            .insert(
              data.segment_ids.map((segmentId: string) => ({
                sheet_id: id,
                segment_id: segmentId,
              })) as any
            );

          if (error) throw error;
        }
      }

      // Mettre à jour les villes si fournies
      if (data.city_ids !== undefined) {
        // Supprimer les anciennes relations
        await supabase
          .from('calculation_sheet_cities')
          .delete()
          .eq('sheet_id', id);

        // Insérer les nouvelles
        if (data.city_ids.length > 0) {
          const { error } = await supabase
            .from('calculation_sheet_cities')
            .insert(
              data.city_ids.map((cityId: string) => ({
                sheet_id: id,
                city_id: cityId,
              })) as any
            );

          if (error) throw error;
        }
      }

      return { id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-sheets'] });
    },
  });
};

// Hook pour supprimer une fiche
export const useDeleteCalculationSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Les relations seront supprimées automatiquement via CASCADE
      const { error } = await supabase
        .from('calculation_sheets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-sheets'] });
    },
  });
};

// Hook pour publier/dépublier une fiche
export const useTogglePublishCalculationSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Récupérer le statut actuel
      const { data: sheet, error: fetchError } = await supabase
        .from('calculation_sheets')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!sheet) throw new Error('Fiche non trouvée');

      const newStatus = (sheet as any).status === 'published' ? 'draft' : 'published';

      const updateData: any = { status: newStatus };
      const query = supabase
        .from('calculation_sheets')
        .update(updateData as never)
        .eq('id', id);
      const { error: updateError } = await query;

      if (updateError) throw updateError;

      return { id, status: newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-sheets'] });
    },
  });
};

// Hook pour dupliquer une fiche
export const useDuplicateCalculationSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Récupérer la fiche originale
      const { data: original, error: fetchError } = await supabase
        .from('calculation_sheets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Fiche non trouvée');

      const newId = uuidv4();

      // Dupliquer la fiche
      const insertData: any = {
        id: newId,
        title: `${(original as any).title} (Copie)`,
        template_data: (original as any).template_data,
        status: 'draft',
        sheet_date: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('calculation_sheets')
        .insert(insertData);

      if (insertError) throw insertError;

      // Dupliquer les relations segments
      const { data: segments } = await supabase
        .from('calculation_sheet_segments')
        .select('segment_id')
        .eq('sheet_id', id);

      if (segments && segments.length > 0) {
        await supabase
          .from('calculation_sheet_segments')
          .insert(
            segments.map((s: { segment_id: string }) => ({
              sheet_id: newId,
              segment_id: s.segment_id,
            })) as any
          );
      }

      // Dupliquer les relations villes
      const { data: cities } = await supabase
        .from('calculation_sheet_cities')
        .select('city_id')
        .eq('sheet_id', id);

      if (cities && cities.length > 0) {
        await supabase
          .from('calculation_sheet_cities')
          .insert(
            cities.map((c: { city_id: string }) => ({
              sheet_id: newId,
              city_id: c.city_id,
            })) as any
          );
      }

      return newId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-sheets'] });
    },
  });
};

import { apiClient } from './client';

export interface Segment {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface CreateSegmentInput {
  name: string;
  color: string;
}

export interface UpdateSegmentInput {
  id: string;
  name: string;
  color: string;
}

/**
 * Service API pour les segments
 */
export const segmentsApi = {
  /**
   * Récupérer tous les segments
   */
  async getAll(): Promise<Segment[]> {
    return apiClient.get<Segment[]>('/segments');
  },

  /**
   * Récupérer un segment par ID
   */
  async getById(id: string): Promise<Segment | null> {
    try {
      return await apiClient.get<Segment>(`/segments/${id}`);
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Créer un segment
   */
  async create(id: string, segment: CreateSegmentInput): Promise<Segment> {
    return apiClient.post<Segment>('/segments', { id, ...segment });
  },

  /**
   * Mettre à jour un segment
   */
  async update(segment: UpdateSegmentInput): Promise<Segment> {
    const { id, ...data } = segment;
    return apiClient.put<Segment>(`/segments/${id}`, data);
  },

  /**
   * Supprimer un segment
   */
  async delete(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/segments/${id}`);
  },
};

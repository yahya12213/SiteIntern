import { apiClient } from './client';
import type {
  CertificateTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@/types/certificateTemplate';

/**
 * API client pour les templates de certificats
 */
export const certificateTemplatesApi = {
  /**
   * Lister tous les templates
   */
  getAll: async (): Promise<{ success: boolean; templates: CertificateTemplate[] }> => {
    return apiClient.get('/certificate-templates');
  },

  /**
   * Obtenir un template par ID
   */
  getById: async (id: string): Promise<{ success: boolean; template: CertificateTemplate }> => {
    return apiClient.get(`/certificate-templates/${id}`);
  },

  /**
   * Créer un nouveau template
   */
  create: async (data: CreateTemplateInput): Promise<{ success: boolean; template: CertificateTemplate }> => {
    return apiClient.post('/certificate-templates', data);
  },

  /**
   * Modifier un template existant
   */
  update: async (
    id: string,
    data: UpdateTemplateInput
  ): Promise<{ success: boolean; template: CertificateTemplate }> => {
    return apiClient.put(`/certificate-templates/${id}`, data);
  },

  /**
   * Supprimer un template
   */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/certificate-templates/${id}`);
  },

  /**
   * Dupliquer un template
   */
  duplicate: async (
    id: string
  ): Promise<{ success: boolean; template: CertificateTemplate; message: string }> => {
    return apiClient.post(`/certificate-templates/${id}/duplicate`);
  },

  /**
   * Définir comme template par défaut
   */
  setDefault: async (
    id: string
  ): Promise<{ success: boolean; template: CertificateTemplate; message: string }> => {
    return apiClient.patch(`/certificate-templates/${id}/set-default`);
  },

  /**
   * Créer les templates prédéfinis (seed)
   */
  seedDefaults: async (): Promise<{ success: boolean; message: string; templates: CertificateTemplate[] }> => {
    return apiClient.post('/certificate-templates/seed-defaults');
  },

  /**
   * Générer un aperçu PDF (retourne un Blob)
   */
  generatePreview: async (id: string, certificateData: any): Promise<Blob> => {
    const response = await fetch(`/api/certificate-templates/${id}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(certificateData),
    });

    if (!response.ok) {
      throw new Error('Failed to generate preview');
    }

    return response.blob();
  },

  /**
   * Upload logo pour un template
   */
  uploadLogo: async (id: string, file: File): Promise<{ success: boolean; logo_url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetch(`/api/certificate-templates/${id}/upload-logo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload logo');
    }

    return response.json();
  },

  /**
   * Upload signature pour un template
   */
  uploadSignature: async (id: string, file: File): Promise<{ success: boolean; signature_url: string }> => {
    const formData = new FormData();
    formData.append('signature', file);

    const response = await fetch(`/api/certificate-templates/${id}/upload-signature`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload signature');
    }

    return response.json();
  },
};

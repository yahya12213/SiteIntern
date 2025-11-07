/**
 * Client API générique pour communiquer avec le backend Express
 * Remplace les appels Supabase par des appels REST classiques
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Client HTTP générique avec gestion d'erreurs
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    // Construire l'URL avec les query params si fournis
    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    // Headers par défaut (sauf si FormData est utilisé)
    const isFormData = fetchOptions.body instanceof FormData;
    const headers: HeadersInit = isFormData
      ? {
          // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement avec boundary)
          ...fetchOptions.headers,
        }
      : {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        };

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Gestion des erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || errorData.message || 'Une erreur est survenue',
          response.status,
          errorData.code
        );
      }

      // Parser la réponse JSON
      const data = await response.json();
      return data as T;
    } catch (error) {
      // Si c'est déjà une ApiError, la relancer
      if (error instanceof ApiError) {
        throw error;
      }

      // Erreur réseau ou autre
      if (error instanceof Error) {
        throw new ApiError(
          `Erreur de connexion: ${error.message}`,
          undefined,
          'NETWORK_ERROR'
        );
      }

      throw new ApiError('Une erreur inconnue est survenue');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    // Si data est FormData, l'envoyer tel quel (ne pas stringifier)
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'POST',
      body,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    // Si data est FormData, l'envoyer tel quel (ne pas stringifier)
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'PUT',
      body,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    // Si data est FormData, l'envoyer tel quel (ne pas stringifier)
    const body = data instanceof FormData ? data : JSON.stringify(data);

    return this.request<T>(endpoint, {
      method: 'PATCH',
      body,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Instance singleton du client API
export const apiClient = new ApiClient(API_URL);

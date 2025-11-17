import { apiClient } from './client';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'professor' | 'gerant' | string; // Allow custom roles
  role_id?: string;
  role_name?: string;
  role_description?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  permissions: string[];
  expiresIn: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  permissions: string[];
}

export interface RefreshTokenResponse {
  success: boolean;
  token: string;
  expiresIn: string;
}

/**
 * Service d'authentification avec JWT
 */
export const authApi = {
  /**
   * Connexion utilisateur - retourne token JWT
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      { username, password },
      { skipAuth: true } // Don't send auth header for login
    );
    return response;
  },

  /**
   * Obtenir l'utilisateur actuel (vérifie le token)
   */
  async getCurrentUser(): Promise<AuthResponse> {
    return apiClient.get<AuthResponse>('/auth/me');
  },

  /**
   * Rafraîchir le token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    return apiClient.post<RefreshTokenResponse>('/auth/refresh', {});
  },

  /**
   * Déconnexion
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/logout', {});
  },

  /**
   * Changer le mot de passe
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },
};

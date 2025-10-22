import { apiClient } from './client';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'professor' | 'gerant';
}

export interface LoginResponse {
  user: User;
}

/**
 * Service d'authentification
 */
export const authApi = {
  /**
   * Connexion utilisateur
   */
  async login(username: string, password: string): Promise<User> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      username,
      password,
    });
    return response.user;
  },
};

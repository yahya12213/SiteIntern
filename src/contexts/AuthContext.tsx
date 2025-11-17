import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/api/auth';
import { tokenManager } from '@/lib/api/client';
import type { User } from '@/lib/api/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isGerant: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const savedUser = tokenManager.getUser();
      const savedToken = tokenManager.getToken();
      const savedPermissions = tokenManager.getPermissions();

      if (savedUser && savedToken) {
        setUser(savedUser);
        setPermissions(savedPermissions);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Listen for token expiration events
  useEffect(() => {
    const handleTokenExpired = () => {
      console.warn('Token expired, logging out...');
      setUser(null);
      setPermissions([]);
      // Could redirect to login or show a message here
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(username, password);

      // Store token and user data
      if (response.token) {
        tokenManager.setToken(response.token);
      }

      // Handle both old response format (user object) and new format (response with user, token, permissions)
      const loggedUser = response.user || response;
      tokenManager.setUser(loggedUser);
      setUser(loggedUser);

      // Store permissions if available
      const userPermissions = response.permissions || [];
      tokenManager.setPermissions(userPermissions);
      setPermissions(userPermissions);

      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setPermissions([]);
    tokenManager.clearAll();
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.user) {
        tokenManager.setUser(response.user);
        setUser(response.user);
      }
      if (response.permissions) {
        tokenManager.setPermissions(response.permissions);
        setPermissions(response.permissions);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Admin has all permissions
    if (user?.role === 'admin') return true;
    // Check in permissions array
    return permissions.includes(permission) || permissions.includes('*');
  };

  const hasAnyPermission = (...perms: string[]): boolean => {
    return perms.some(p => hasPermission(p));
  };

  const isAdmin = user?.role === 'admin';
  const isGerant = user?.role === 'gerant';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        isAdmin,
        isGerant,
        permissions,
        hasPermission,
        hasAnyPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

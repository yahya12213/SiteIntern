import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/api/auth';
import type { User } from '@/lib/api/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isGerant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si un utilisateur est connecté (session localStorage)
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const loggedUser = await authApi.login(username, password);
      setUser(loggedUser);
      localStorage.setItem('current_user', JSON.stringify(loggedUser));
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
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

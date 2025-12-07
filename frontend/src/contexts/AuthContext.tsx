import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authService } from '../lib/auth';
import api from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/auth/me/');
      const userData = response.data;
      setUser(userData);
      authService.setCurrentUser(userData);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
      // Don't logout on 401 if user is not authenticated yet
      if (error.response?.status !== 401) {
        authService.logout();
      }
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          await refreshUser();
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoading(false);
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string, tenantSlug?: string) => {
    const data = await authService.login(email, password, tenantSlug);
    setUser(data.user);
    authService.setCurrentUser(data.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


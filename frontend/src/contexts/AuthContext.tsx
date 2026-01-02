import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authService } from '../lib/auth';
import api from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, tenantSlug?: string, totpToken?: string, backupCode?: string) => Promise<void | { requires_2fa: true; message: string }>;
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
      // On 401, token is expired/invalid - logout
      if (error.response?.status === 401) {
        authService.logout();
        setUser(null);
      } else {
        // Other errors - still clear user but don't force logout
        setUser(null);
      }
      setIsLoading(false);
    }
  };
  
  // Listen for auth logout events from API interceptor
  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      authService.logout();
    };
    
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

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

  const login = async (
    email: string, 
    password: string, 
    tenantSlug?: string,
    totpToken?: string,
    backupCode?: string
  ) => {
    const data = await authService.login(email, password, tenantSlug, totpToken, backupCode);
    
    // Check if 2FA is required
    if ('requires_2fa' in data && data.requires_2fa) {
      return data; // Return 2FA requirement to handle in component
    }
    
    // Normal login success
    const loginResponse = data as { user: User; tokens: { access: string; refresh: string } };
    setUser(loginResponse.user);
    authService.setCurrentUser(loginResponse.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    // Clear idle timeout on logout
    import('../utils/idleTimeout').then(({ clearIdleTimeout }) => {
      clearIdleTimeout();
    });
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


export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  tenant: number | null;
  tenant_name?: string;
  branch: number | null;
}

export interface LoginResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
  requires_2fa?: boolean;
}

export interface TwoFactorAuthRequired {
  requires_2fa: true;
  message: string;
}

export interface PasswordExpired {
  password_expired: true;
  message: string;
}

export const authService = {
  login: async (
    email: string, 
    password: string, 
    tenantSlug?: string,
    totpToken?: string,
    backupCode?: string
  ): Promise<LoginResponse | TwoFactorAuthRequired> => {
    const body: any = { email, password };
    if (tenantSlug && tenantSlug.trim()) {
      body.tenant_slug = tenantSlug.trim();
    }
    if (totpToken) {
      body.totp_token = totpToken;
    }
    if (backupCode) {
      body.backup_code = backupCode;
    }
    
    const response = await fetch('/api/auth/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    // Handle 2FA required response
    if (response.ok && responseData.requires_2fa) {
      return {
        requires_2fa: true,
        message: responseData.message || '2FA verification required',
      } as TwoFactorAuthRequired;
    }

    if (!response.ok) {
      // Handle field-specific errors from serializer
      let errorMessage = responseData.error || 'Login failed';
      if (typeof responseData === 'object' && !responseData.error) {
        // Serializer validation errors
        const firstError = Object.values(responseData)[0];
        if (Array.isArray(firstError)) {
          errorMessage = firstError[0] as string;
        } else if (typeof firstError === 'string') {
          errorMessage = firstError;
        } else if (typeof firstError === 'object') {
          errorMessage = Object.values(firstError)[0] as string || 'Invalid input';
        }
      }
      throw new Error(errorMessage);
    }

    const data = responseData as LoginResponse;
    
    // Store tokens
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    if (tenantSlug) {
      localStorage.setItem('tenant_slug', tenantSlug);
    }
    
    return data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('tenant_slug');
    localStorage.removeItem('user');
  },

  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
};


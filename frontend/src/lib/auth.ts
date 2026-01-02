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
    
    // Use API base URL from environment, fallback to relative path
    const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
    const loginUrl = `${API_BASE_URL}/auth/auth/login/`;
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Check if response has content before parsing
    const text = await response.text();
    let responseData;
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch (e) {
      // If response is not JSON, check if it's HTML (error page)
      if (text.trim().startsWith('<')) {
        throw new Error('Server error: Received HTML instead of JSON. Please check backend logs.');
      }
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }

    // Check if response is empty
    if (!text || Object.keys(responseData).length === 0) {
      throw new Error('Server returned empty response. Please check backend logs and ensure VITE_API_URL is correctly configured.');
    }

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

    // Validate response structure
    if (!responseData.tokens || !responseData.tokens.access || !responseData.tokens.refresh) {
      throw new Error(`Invalid response structure. Expected tokens but got: ${JSON.stringify(responseData)}`);
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


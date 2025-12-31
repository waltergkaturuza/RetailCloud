import axios from 'axios';

// Use environment variable for API URL, fallback to relative path for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const tenantSlug = localStorage.getItem('tenant_slug');
    if (tenantSlug) {
      config.headers['X-Tenant-ID'] = tenantSlug;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and logout on auth failure
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Skip refresh if this is the refresh endpoint itself to avoid loops
      const isRefreshRequest = originalRequest.url?.includes('/token/refresh/');
      
      if (isRefreshRequest) {
        // Refresh endpoint failed, force logout
        handleAuthFailure();
        return Promise.reject(error);
      }
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // No refresh token, force logout
          handleAuthFailure();
          return Promise.reject(error);
        }
        
        // Use simplejwt's token refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          // Don't retry the refresh request itself
          validateStatus: (status) => status < 500,
        });
        
        // Check if refresh was successful
        if (response.status === 200 && response.data.access) {
          // SimpleJWT returns access token, and with ROTATE_REFRESH_TOKENS=True,
          // it also returns a new refresh token
          const { access, refresh: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access);
          
          // Update refresh token if a new one was provided
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
          
          // Update axios default header
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          originalRequest.headers.Authorization = `Bearer ${access}`;
          
          // Retry the original request with new token
          return api(originalRequest);
        } else {
          // Refresh endpoint returned an error, force logout
          handleAuthFailure();
          return Promise.reject(error);
        }
      } catch (refreshError: any) {
        // Refresh failed (network error or invalid token), force logout
        console.error('Token refresh failed:', refreshError);
        handleAuthFailure();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle authentication failure
function handleAuthFailure() {
  // Clear all auth data
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('tenant_slug');
  localStorage.removeItem('user');
  localStorage.removeItem('owner_user');
  
  // Remove auth header
  delete api.defaults.headers.common['Authorization'];
  
  // Trigger logout event that contexts can listen to
  window.dispatchEvent(new CustomEvent('auth:logout'));
  
  // Only redirect if we're not already on login page
  if (!window.location.pathname.includes('/login') && 
      !window.location.pathname.includes('/owner/login')) {
    // Redirect to appropriate login page
    if (window.location.pathname.includes('/owner')) {
      window.location.href = '/owner/login';
    } else {
      window.location.href = '/login';
    }
  }
}

export default api;


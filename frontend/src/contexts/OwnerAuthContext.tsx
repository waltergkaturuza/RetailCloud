/**
 * Authentication context specifically for Owner/Super Admin Portal.
 * Separate from tenant authentication.
 */
import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import api from '../lib/api'

interface OwnerUser {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  role: string
}

interface OwnerAuthContextType {
  user: OwnerUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const OwnerAuthContext = createContext<OwnerAuthContextType | undefined>(undefined)

export const OwnerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<OwnerUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Define logout first so it can be used in refreshUser
  const logout = () => {
    // Clear all auth data
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('owner_user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    
    // Redirect to owner login page if we're on owner pages (but not already on login)
    if (window.location.pathname.includes('/owner') && 
        !window.location.pathname.includes('/owner/login')) {
      window.location.href = '/owner/login'
    }
  }

  const refreshUser = async () => {
    try {
      // Check if we have tokens before attempting to refresh
      const accessToken = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')
      
      if (!accessToken && !refreshToken) {
        // No tokens, clear state and stop loading
        setUser(null)
        localStorage.removeItem('owner_user')
        setIsLoading(false)
        // Don't redirect here - let the protected route handle it
        return
      }
      
      // Ensure authorization header is set
      if (accessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      }
      
      const response = await api.get('/auth/auth/me/')
      const userData = response.data
      
      // Verify this is a super_admin without a tenant
      if (userData.role === 'super_admin' && !userData.tenant) {
        setUser(userData)
        localStorage.setItem('owner_user', JSON.stringify(userData))
        setIsLoading(false)
      } else {
        // Not an owner, clear state and logout
        logout()
      }
    } catch (error: any) {
      console.error('Failed to refresh owner user:', error)
      // On 401 or 403, token is expired/invalid or access denied - logout
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
      } else {
        // Network errors or other issues - clear user but don't force redirect
        setUser(null)
        localStorage.removeItem('owner_user')
        setIsLoading(false)
      }
    }
  }
  
  // Listen for auth logout events from API interceptor
  useEffect(() => {
    const handleAuthLogout = () => {
      logout()
    }
    
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for tokens in localStorage first
        const accessToken = localStorage.getItem('access_token')
        const refreshToken = localStorage.getItem('refresh_token')
        const storedUser = localStorage.getItem('owner_user')
        
        // If no tokens at all, skip authentication check
        if (!accessToken && !refreshToken) {
          // Clear any stale user data
          setUser(null)
          localStorage.removeItem('owner_user')
          setIsLoading(false)
          return
        }
        
        // Set authorization header if we have a token
        if (accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        }
        
        // Check if we have a stored owner user
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            if (userData.role === 'super_admin' && !userData.tenant) {
              setUser(userData)
            } else {
              // Invalid user data, clear it
              localStorage.removeItem('owner_user')
            }
          } catch (e) {
            // Invalid JSON, clear it
            localStorage.removeItem('owner_user')
          }
        }
        
        // Verify with backend if we have tokens
        if (accessToken || refreshToken) {
          await refreshUser()
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Owner auth check failed:', error)
        // On any error, clear state and stop loading
        setUser(null)
        localStorage.removeItem('owner_user')
        setIsLoading(false)
      }
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/auth/login/', { email, password })
    const { user: userData, tokens } = response.data
    
    // Verify this is a super_admin without a tenant
    if (userData.role !== 'super_admin' || userData.tenant) {
      // Clear tokens if not owner
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      throw new Error('Access denied. Owner login only. You must be a super_admin without a tenant.')
    }
    
    // Store tokens
    localStorage.setItem('access_token', tokens.access)
    localStorage.setItem('refresh_token', tokens.refresh)
    localStorage.setItem('owner_user', JSON.stringify(userData))
    
    // Set authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`
    
    setUser(userData)
  }


  return (
    <OwnerAuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </OwnerAuthContext.Provider>
  )
}

export const useOwnerAuth = () => {
  const context = useContext(OwnerAuthContext)
  if (context === undefined) {
    throw new Error('useOwnerAuth must be used within an OwnerAuthProvider')
  }
  return context
}


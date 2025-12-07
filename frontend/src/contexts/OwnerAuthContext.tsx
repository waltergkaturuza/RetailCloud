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

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/auth/me/')
      const userData = response.data
      
      // Verify this is a super_admin without a tenant
      if (userData.role === 'super_admin' && !userData.tenant) {
        setUser(userData)
        localStorage.setItem('owner_user', JSON.stringify(userData))
        setIsLoading(false)
      } else {
        // Not an owner, clear state
        setUser(null)
        localStorage.removeItem('owner_user')
        setIsLoading(false)
      }
    } catch (error: any) {
      console.error('Failed to refresh owner user:', error)
      setUser(null)
      localStorage.removeItem('owner_user')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a stored owner user
        const storedUser = localStorage.getItem('owner_user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          if (userData.role === 'super_admin' && !userData.tenant) {
            setUser(userData)
          }
        }
        
        // Verify with backend
        if (api.defaults.headers.common['Authorization']) {
          await refreshUser()
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Owner auth check failed:', error)
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

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('owner_user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
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


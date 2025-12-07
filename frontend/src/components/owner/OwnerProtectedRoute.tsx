/**
 * Protected Route for Owner Portal
 */
import { Navigate } from 'react-router-dom'
import { useOwnerAuth } from '../../contexts/OwnerAuthContext'

interface OwnerProtectedRouteProps {
  children: React.ReactNode
}

export default function OwnerProtectedRoute({ children }: OwnerProtectedRouteProps) {
  const { user, isLoading } = useOwnerAuth()

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f7fa'
      }}>
        <div className="spinner" style={{ marginBottom: '16px' }} />
        <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  if (!user || user.role !== 'super_admin' || user.tenant) {
    return <Navigate to="/owner/login" replace />
  }

  return <>{children}</>
}


/**
 * Role-Based Protected Route
 * Restricts access to routes based on user role
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasPermission } from '../lib/permissions'
import Card from './ui/Card'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  requiredPermission: keyof import('../lib/permissions').RolePermissions
  fallback?: React.ReactNode
}

export default function RoleProtectedRoute({
  children,
  requiredPermission,
  fallback,
}: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth()

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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const hasAccess = hasPermission(user.role as any, requiredPermission)

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div style={{ padding: '30px' }}>
        <Card>
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: '#7f8c8d'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{
              margin: '0 0 12px',
              fontSize: '24px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Access Denied
            </h2>
            <p style={{
              margin: '0 0 24px',
              fontSize: '16px',
              color: '#7f8c8d'
            }}>
              You don't have permission to access this page.
            </p>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#95a5a6'
            }}>
              Your role: <strong>{user.role?.replace('_', ' ').toUpperCase() || 'Unknown'}</strong>
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}


/**
 * Custom hook for role-based permissions
 */
import { useAuth } from '../contexts/AuthContext'
import { getPermissions, hasPermission, type RolePermissions } from '../lib/permissions'

export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role as any
  
  const permissions: RolePermissions = getPermissions(role)
  
  const can = (permission: keyof RolePermissions): boolean => {
    return hasPermission(role, permission)
  }
  
  return {
    permissions,
    can,
    role,
    isAdmin: role === 'super_admin' || role === 'tenant_admin',
    isSuperAdmin: role === 'super_admin',
    isTenantAdmin: role === 'tenant_admin',
    isManager: role === 'manager',
    isCashier: role === 'cashier',
    isSupervisor: role === 'supervisor',
    isStockController: role === 'stock_controller',
    isAccountant: role === 'accountant',
    isAuditor: role === 'auditor',
  }
}





/**
 * Permission and Role Management Utilities
 * Defines role-based access control for frontend
 */

export type UserRole = 
  | 'super_admin'
  | 'tenant_admin'
  | 'supervisor'
  | 'cashier'
  | 'stock_controller'
  | 'accountant'
  | 'auditor'
  | 'manager'

export interface RolePermissions {
  // Page access
  canAccessDashboard: boolean
  canAccessPOS: boolean
  canAccessProducts: boolean
  canAccessInventory: boolean
  canAccessCustomers: boolean
  canAccessSuppliers: boolean
  canAccessSales: boolean
  canAccessPurchases: boolean
  canAccessReports: boolean
  canAccessUsers: boolean
  canAccessEmployees: boolean
  canAccessSettings: boolean
  canAccessBranches: boolean
  
  // Actions
  canCreateProducts: boolean
  canEditProducts: boolean
  canDeleteProducts: boolean
  
  canCreateCustomers: boolean
  canEditCustomers: boolean
  canDeleteCustomers: boolean
  
  canCreateSuppliers: boolean
  canEditSuppliers: boolean
  canDeleteSuppliers: boolean
  
  canCreatePurchases: boolean
  canEditPurchases: boolean
  canDeletePurchases: boolean
  
  canViewReports: boolean
  canExportReports: boolean
  
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canManagePermissions: boolean
  
  canEditSettings: boolean
  
  canVoidSales: boolean
  canViewAllSales: boolean
  canEditSales: boolean
  canAccessReturns: boolean
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  // Super Admin - Full access (but uses Owner Admin Panel)
  super_admin: {
    canAccessDashboard: true,
    canAccessPOS: true,
    canAccessProducts: true,
    canAccessInventory: true,
    canAccessCustomers: true,
    canAccessSuppliers: true,
    canAccessSales: true,
    canAccessPurchases: true,
    canAccessReports: true,
    canAccessUsers: true,
    canAccessEmployees: true,
    canAccessSettings: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canCreateSuppliers: true,
    canEditSuppliers: true,
    canDeleteSuppliers: true,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: true,
    canViewReports: true,
    canExportReports: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canManagePermissions: true,
    canEditSettings: true,
    canVoidSales: true,
    canViewAllSales: true,
    canEditSales: true,
    canAccessReturns: true,
  },
  
  // Tenant Admin - Full access to tenant
  tenant_admin: {
    canAccessDashboard: true,
    canAccessPOS: true,
    canAccessProducts: true,
    canAccessInventory: true,
    canAccessCustomers: true,
    canAccessSuppliers: true,
    canAccessSales: true,
    canAccessPurchases: true,
    canAccessReports: true,
    canAccessUsers: true,
    canAccessEmployees: true,
    canAccessSettings: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canCreateSuppliers: true,
    canEditSuppliers: true,
    canDeleteSuppliers: true,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: true,
    canViewReports: true,
    canExportReports: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canManagePermissions: true,
    canEditSettings: true,
    canVoidSales: true,
    canViewAllSales: true,
    canEditSales: true,
    canAccessReturns: true,
  },
  
  // Manager - Full operational access
  manager: {
    canAccessDashboard: true,
    canAccessPOS: true,
    canAccessProducts: true,
    canAccessInventory: true,
    canAccessCustomers: true,
    canAccessSuppliers: true,
    canAccessSales: true,
    canAccessPurchases: true,
    canAccessReports: true,
    canAccessUsers: false,
    canAccessEmployees: true,
    canAccessSettings: false,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: false,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canCreateSuppliers: true,
    canEditSuppliers: true,
    canDeleteSuppliers: false,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: false,
    canViewReports: true,
    canExportReports: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManagePermissions: false,
    canEditSettings: false,
    canVoidSales: true,
    canViewAllSales: true,
    canEditSales: true,
    canAccessReturns: true,
  },
  
  // Supervisor - Oversight and approvals
  supervisor: {
    canAccessDashboard: true,
    canAccessPOS: true,
    canAccessProducts: true,
    canAccessInventory: true,
    canAccessCustomers: true,
    canAccessSuppliers: false,
    canAccessSales: true,
    canAccessPurchases: false,
    canAccessReports: true,
    canAccessUsers: false,
    canAccessEmployees: true,
    canAccessSettings: false,
    canCreateProducts: false,
    canEditProducts: true,
    canDeleteProducts: false,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canCreateSuppliers: false,
    canEditSuppliers: false,
    canDeleteSuppliers: false,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,
    canViewReports: true,
    canExportReports: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManagePermissions: false,
    canEditSettings: false,
    canVoidSales: true,
    canViewAllSales: true,
    canEditSales: true,
    canAccessReturns: true,
  },
  
  // Cashier - POS and basic sales only
  cashier: {
    canAccessDashboard: true,
    canAccessPOS: true,
    canAccessProducts: false,
    canAccessInventory: false,
    canAccessCustomers: true,
    canAccessSuppliers: false,
    canAccessSales: true,
    canAccessPurchases: false,
    canAccessReports: false,
    canAccessUsers: false,
    canAccessSettings: false,
    canCreateProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,
    canCreateCustomers: true,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canCreateSuppliers: false,
    canEditSuppliers: false,
    canDeleteSuppliers: false,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,
    canViewReports: false,
    canExportReports: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManagePermissions: false,
    canEditSettings: false,
    canVoidSales: false,
    canViewAllSales: false,
    canEditSales: false,
    canAccessReturns: true,
  },
  
  // Stock Controller - Inventory and stock management
  stock_controller: {
    canAccessDashboard: true,
    canAccessPOS: false,
    canAccessProducts: true,
    canAccessInventory: true,
    canAccessCustomers: false,
    canAccessSuppliers: true,
    canAccessSales: false,
    canAccessPurchases: true,
    canAccessReports: true,
    canAccessUsers: false,
    canAccessEmployees: true,
    canAccessSettings: false,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canCreateSuppliers: true,
    canEditSuppliers: true,
    canDeleteSuppliers: false,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: false,
    canViewReports: true,
    canExportReports: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManagePermissions: false,
    canEditSettings: false,
    canVoidSales: false,
    canViewAllSales: false,
    canEditSales: false,
    canAccessReturns: true,
  },
  
  // Accountant - Financial reporting
  accountant: {
    canAccessDashboard: true,
    canAccessPOS: false,
    canAccessProducts: false,
    canAccessInventory: false,
    canAccessCustomers: false,
    canAccessSuppliers: false,
    canAccessSales: true,
    canAccessPurchases: false,
    canAccessReports: true,
    canAccessUsers: false,
    canAccessEmployees: true,
    canAccessSettings: false,
    canCreateProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canCreateSuppliers: false,
    canEditSuppliers: false,
    canDeleteSuppliers: false,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,
    canViewReports: true,
    canExportReports: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManagePermissions: false,
    canEditSettings: false,
    canVoidSales: false,
    canViewAllSales: true,
    canEditSales: false,
    canAccessReturns: true,
  },
  
  // Auditor - Read-only access
  auditor: {
    canAccessDashboard: true,
    canAccessPOS: false,
    canAccessProducts: true,
    canAccessInventory: true,
    canAccessCustomers: true,
    canAccessSuppliers: true,
    canAccessSales: true,
    canAccessPurchases: true,
    canAccessReports: true,
    canAccessUsers: false,
    canAccessEmployees: true,
    canAccessSettings: false,
    canCreateProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canCreateSuppliers: false,
    canEditSuppliers: false,
    canDeleteSuppliers: false,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,
    canViewReports: true,
    canExportReports: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManagePermissions: false,
    canEditSettings: false,
    canVoidSales: false,
    canViewAllSales: true,
    canEditSales: false,
    canAccessReturns: true,
  },
}

/**
 * Get permissions for a user role
 */
export function getPermissions(role: UserRole | undefined | null): RolePermissions {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    // Default to cashier (most restricted) if role is invalid
    return ROLE_PERMISSIONS.cashier
  }
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(
  role: UserRole | undefined | null,
  permission: keyof RolePermissions
): boolean {
  const permissions = getPermissions(role)
  return permissions[permission] || false
}

/**
 * Get allowed navigation items for a role
 */
export function getAllowedNavItems(role: UserRole | undefined | null) {
  const permissions = getPermissions(role)
  
  return [
    { path: '/', label: 'Dashboard', icon: '📊', allowed: permissions.canAccessDashboard },
    { path: '/pos', label: 'POS', icon: '🛒', allowed: permissions.canAccessPOS },
    { path: '/products', label: 'Products', icon: '📦', allowed: permissions.canAccessProducts },
    { path: '/inventory', label: 'Inventory', icon: '📋', allowed: permissions.canAccessInventory },
    { path: '/customers', label: 'Customers', icon: '👥', allowed: permissions.canAccessCustomers },
    { path: '/suppliers', label: 'Suppliers', icon: '🏭', allowed: permissions.canAccessSuppliers },
    { path: '/sales', label: 'Sales', icon: '💰', allowed: permissions.canAccessSales },
    { path: '/quotations', label: 'Quotations', icon: '📄', allowed: permissions.canAccessSales },
    { path: '/invoices', label: 'Invoices', icon: '🧾', allowed: permissions.canAccessSales },
    { path: '/ai-chatbot', label: 'AI CEO Chatbot', icon: '🤖', allowed: permissions.canAccessDashboard },
    { path: '/purchases', label: 'Purchases', icon: '🛍️', allowed: permissions.canAccessPurchases },
    { path: '/returns', label: 'Returns', icon: '↩️', allowed: permissions.canAccessReturns },
    { path: '/reports', label: 'Reports', icon: '📈', allowed: permissions.canAccessReports },
    { path: '/users', label: 'Users', icon: '👤', allowed: permissions.canAccessUsers },
    { path: '/employees', label: 'Employees', icon: '👥', allowed: permissions.canAccessEmployees },
    { path: '/shifts', label: 'Shifts', icon: '⏰', allowed: permissions.canAccessEmployees },
    { path: '/tax-management', label: 'Tax Management', icon: '🧾', allowed: permissions.canAccessReports },
    { path: '/chart-of-accounts', label: 'Chart of Accounts', icon: '📊', allowed: permissions.canAccessReports },
    { path: '/journal-entries', label: 'Journal Entries', icon: '📝', allowed: permissions.canAccessReports },
    { path: '/accounting-reports', label: 'Accounting Reports', icon: '📈', allowed: permissions.canAccessReports },
    { path: '/settings', label: 'Settings', icon: '⚙️', allowed: permissions.canAccessSettings },
  ].filter(item => item.allowed)
}


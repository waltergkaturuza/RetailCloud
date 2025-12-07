/**
 * Global User Management - View and manage all users across all tenants
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  role: string
  role_display: string
  tenant: number | null
  tenant_name: string | null
  tenant_slug: string | null
  branch: number | null
  branch_name: string | null
  is_active: boolean
  is_email_verified: boolean
  last_login: string | null
  last_login_display: string
  last_login_ip: string | null
  created_at: string
}

export default function OwnerUsers() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['owner-users', searchQuery, filters],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (filters.role) params.role = filters.role
      if (filters.tenant) params.tenant = filters.tenant
      if (filters.is_active !== undefined) params.is_active = filters.is_active === 'true'
      
      const response = await api.get('/owner/users/', { params })
      return response.data
    },
  })

  // Fetch tenants for filter
  const { data: tenantsResponse } = useQuery({
    queryKey: ['owner-tenants-for-filter'],
    queryFn: async () => {
      const response = await api.get('/owner/tenants/', { params: { page_size: 1000 } })
      return response.data.results || response.data || []
    },
  })

  const tenants = tenantsResponse || []
  const users = usersResponse?.results || usersResponse || []

  const suspendMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/owner/users/${id}/suspend/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-users'] })
      toast.success('User suspended successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to suspend user')
    },
  })

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/owner/users/${id}/activate/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-users'] })
      toast.success('User activated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to activate user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/owner/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-users'] })
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, new_password }: { id: number; new_password: string }) => {
      return api.post(`/owner/users/${id}/reset_password/`, { new_password })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-users'] })
      toast.success('Password reset successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    },
  })

  const handleSuspend = (user: User) => {
    if (confirm(`Are you sure you want to suspend "${user.full_name || user.email}"?`)) {
      suspendMutation.mutate(user.id)
    }
  }

  const handleActivate = (user: User) => {
    activateMutation.mutate(user.id)
  }

  const handleDelete = (user: User) => {
    if (confirm(`⚠️ WARNING: This will permanently delete user "${user.full_name || user.email}". This action cannot be undone!\n\nAre you absolutely sure?`)) {
      deleteMutation.mutate(user.id)
    }
  }

  const handleResetPassword = (user: User) => {
    const newPassword = prompt(`Reset password for "${user.full_name || user.email}"\n\nEnter new password:`)
    if (newPassword && newPassword.length >= 8) {
      resetPasswordMutation.mutate({ id: user.id, new_password: newPassword })
    } else if (newPassword) {
      toast.error('Password must be at least 8 characters long')
    }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'super_admin': '#e74c3c',
      'tenant_admin': '#9b59b6',
      'supervisor': '#3498db',
      'cashier': '#27ae60',
      'stock_controller': '#f39c12',
      'accountant': '#16a085',
      'auditor': '#34495e',
      'manager': '#e67e22',
    }
    return colors[role] || '#7f8c8d'
  }

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'tenant_admin', label: 'Tenant Admin' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'stock_controller', label: 'Stock Controller' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'manager', label: 'Manager' },
  ]

  // Statistics
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u: User) => u.is_active).length
    const suspended = total - active
    const byRole: Record<string, number> = {}
    users.forEach((u: User) => {
      byRole[u.role] = (byRole[u.role] || 0) + 1
    })
    return { total, active, suspended, byRole }
  }, [users])

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
          👥 Global User Management
        </h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          View and manage all users across all tenants
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Users</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            {stats.total}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Active Users</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60' }}>
            {stats.active}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Suspended Users</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#e74c3c' }}>
            {stats.suspended}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Tenants</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#3498db' }}>
            {new Set(users.map((u: User) => u.tenant).filter(Boolean)).size}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
          gap: '16px',
          alignItems: 'end',
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by name, email, username, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Role
            </label>
            <select
              value={filters.role || ''}
              onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Tenant
            </label>
            <select
              value={filters.tenant || ''}
              onChange={(e) => setFilters({ ...filters, tenant: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Tenants</option>
              {tenants.map((t: any) => (
                <option key={t.id} value={t.id}>{t.company_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Status
            </label>
            <select
              value={filters.is_active !== undefined ? String(filters.is_active) : ''}
              onChange={(e) => setFilters({
                ...filters,
                is_active: e.target.value === '' ? undefined : e.target.value === 'true'
              })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Suspended</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => setFilters({})}
            style={{ height: 'fit-content' }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No users found</p>
            <p style={{ fontSize: '14px' }}>
              {searchQuery || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filters'
                : 'No users in the system yet'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Tenant</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Email Verified</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Last Login</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: User) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8f9fa'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                        {user.full_name || user.username}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        {user.email}
                      </div>
                      {user.phone && (
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          {user.phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {user.tenant_name ? (
                        <div>
                          <div style={{ fontWeight: '500', color: '#2c3e50', marginBottom: '4px' }}>
                            {user.tenant_name}
                          </div>
                          {user.branch_name && (
                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                              📍 {user.branch_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#95a5a6', fontSize: '13px' }}>No Tenant</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getRoleColor(user.role) + '20',
                          color: getRoleColor(user.role),
                        }}
                      >
                        {user.role_display}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {user.is_active ? (
                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#27ae6020',
                            color: '#27ae60',
                          }}
                        >
                          ✅ Active
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#e74c3c20',
                            color: '#e74c3c',
                          }}
                        >
                          ❌ Suspended
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {user.is_email_verified ? (
                        <span style={{ color: '#27ae60', fontSize: '18px' }}>✅</span>
                      ) : (
                        <span style={{ color: '#95a5a6', fontSize: '18px' }}>❌</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#7f8c8d' }}>
                      {user.last_login_display || 'Never'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {!user.is_active ? (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleActivate(user)}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleSuspend(user)}
                            style={{ fontSize: '12px', padding: '6px 12px', color: '#e74c3c', borderColor: '#e74c3c' }}
                          >
                            Suspend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleResetPassword(user)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          disabled={resetPasswordMutation.isPending}
                        >
                          🔑 Reset Password
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleDelete(user)}
                          style={{ fontSize: '12px', padding: '6px 12px', color: '#e74c3c', borderColor: '#e74c3c' }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

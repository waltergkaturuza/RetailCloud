import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import AdvancedSearch from '../components/AdvancedSearch'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PermissionsManager from '../components/PermissionsManager'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

interface User {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  role: string
  role_display?: string
  tenant?: number
  tenant_name?: string
  branch?: number
  is_active: boolean
  is_email_verified?: boolean
  created_at: string
}

export default function Users() {
  const { user: currentUser } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPermissions, setShowPermissions] = useState(false)
  const [permissionsUserId, setPermissionsUserId] = useState<number | null>(null)
  const [permissionsUserName, setPermissionsUserName] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users', searchQuery, filters],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (filters.role && filters.role !== '') params.role = filters.role
      if (filters.is_active !== undefined && filters.is_active !== '') {
        params.is_active = filters.is_active === 'true'
      }
      
      const response = await api.get('/auth/users/', { params })
      return response.data
    }
  })

  const usersRaw = usersResponse?.results || usersResponse || []
  
  // Filter out super_admin users for tenant_admin (they shouldn't see system owners)
  const users = currentUser?.role === 'tenant_admin' 
    ? usersRaw.filter((u: User) => u.role !== 'super_admin')
    : usersRaw

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/auth/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete user')
    }
  })

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setShowForm(true)
  }

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot delete your own account')
      return
    }
    if (confirm(`Are you sure you want to delete user "${user.email}"? This action cannot be undone.`)) {
      deleteMutation.mutate(user.id)
    }
  }

  const canManageUsers = currentUser?.role === 'super_admin' || currentUser?.role === 'tenant_admin'

  if (!canManageUsers) {
    return (
      <div>
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2 style={{ color: '#e74c3c' }}>Access Denied</h2>
            <p style={{ color: '#7f8c8d' }}>You don't have permission to manage users.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            User Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage user accounts and role-based access control ({users.length} users)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            as={Link}
            to="/permissions-matrix"
            variant="outline"
          >
            🔐 Permissions Matrix
          </Button>
          <Button
            onClick={() => {
              setSelectedUser(null)
              setShowForm(true)
            }}
          >
            + Add User
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-3">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <Button variant="secondary" onClick={() => {
            setFilters({})
            setSearchQuery('')
          }}>
            Clear All
          </Button>
        </div>
        
        <AdvancedSearch
          fields={[
            { 
              name: 'role', 
              label: 'Role', 
              type: 'select', 
              options: [
                ...(currentUser?.role === 'super_admin' ? [{ value: 'super_admin', label: 'Super Admin' }] : []),
                { value: 'tenant_admin', label: 'Tenant Admin' },
                { value: 'supervisor', label: 'Supervisor' },
                { value: 'cashier', label: 'Cashier' },
                { value: 'stock_controller', label: 'Stock Controller' },
                { value: 'accountant', label: 'Accountant' },
                { value: 'auditor', label: 'Auditor' },
                { value: 'manager', label: 'Manager' },
              ]
            },
            { 
              name: 'is_active', 
              label: 'Status', 
              type: 'select', 
              options: [
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]
            },
          ]}
          onSearch={(newFilters) => setFilters(newFilters)}
          onReset={() => setFilters({})}
        />
      </Card>

      {showForm && (
        <UserForm
          user={selectedUser}
          onClose={() => {
            setShowForm(false)
            setSelectedUser(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedUser(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success(selectedUser ? 'User updated successfully' : 'User created successfully')
          }}
        />
      )}

      {error && (
        <Card>
          <div style={{ padding: '20px', background: '#fee', color: '#c33', borderRadius: '6px' }}>
            Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading users...</p>
          </div>
        </Card>
      ) : users && users.length > 0 ? (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Username</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Role</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter((user: User) => {
                  if (!searchQuery) return true
                  const query = searchQuery.toLowerCase()
                  return (
                    user.first_name?.toLowerCase().includes(query) ||
                    user.last_name?.toLowerCase().includes(query) ||
                    user.email?.toLowerCase().includes(query) ||
                    user.username?.toLowerCase().includes(query)
                  )
                }).map((user: User) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {user.first_name || user.last_name 
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : user.username}
                      {user.id === currentUser?.id && (
                        <span style={{ fontSize: '11px', color: '#3498db', marginLeft: '8px' }}>(You)</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{user.email}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d', fontFamily: 'monospace', fontSize: '13px' }}>
                      {user.username}
                    </td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{user.phone || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: getRoleColor(user.role).bg,
                        color: getRoleColor(user.role).color
                      }}>
                        {user.role_display || user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: user.is_active ? '#d4edda' : '#f8d7da',
                        color: user.is_active ? '#155724' : '#721c24'
                      }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {user.is_email_verified && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#2ecc71' }}>✓ Verified</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPermissionsUserId(user.id)
                            setPermissionsUserName(user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
                              : user.email)
                            setShowPermissions(true)
                          }}
                        >
                          🔐 Permissions
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(user)}
                            isLoading={deleteMutation.isPending && deleteMutation.variables === user.id}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👤</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Users Found</h3>
            <p style={{ marginBottom: '20px' }}>Start by adding users to your system</p>
            <Button onClick={() => {
              setSelectedUser(null)
              setShowForm(true)
            }}>
              Add Your First User
            </Button>
          </div>
        </Card>
      )}

      {/* Permissions Modal */}
      {showPermissions && permissionsUserId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          overflow: 'auto',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '95vh',
            overflow: 'auto',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  setShowPermissions(false)
                  setPermissionsUserId(null)
                  setPermissionsUserName('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '32px',
                  cursor: 'pointer',
                  color: '#7f8c8d',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ecf0f1'
                  e.currentTarget.style.color = '#2c3e50'
                }}
              >
                ×
              </button>
            </div>
            <PermissionsManager
              userId={permissionsUserId}
              userName={permissionsUserName}
              onClose={() => {
                setShowPermissions(false)
                setPermissionsUserId(null)
                setPermissionsUserName('')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function UserForm({ user, onClose, onSuccess }: any) {
  const { user: currentUser } = useAuth()
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    role: user?.role || 'cashier',
    is_active: user?.is_active !== undefined ? user.is_active : true,
    password: '',
    password_confirm: '',
  })

  const [formErrors, setFormErrors] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true)
      try {
        const cleanedData: any = { ...data }
        if (user) {
          // Update - only include password if provided
          if (!cleanedData.password) {
            delete cleanedData.password
            delete cleanedData.password_confirm
          }
          return await api.patch(`/auth/users/${user.id}/`, cleanedData)
        } else {
          // Create - password is required
          if (!cleanedData.password) {
            throw new Error('Password is required for new users')
          }
          return await api.post('/auth/users/', cleanedData)
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: () => {
      onSuccess()
    },
    onError: (error: any) => {
      const errors = error.response?.data || {}
      setFormErrors(errors)
      if (errors.non_field_errors) {
        toast.error(errors.non_field_errors[0])
      } else {
        toast.error('Failed to save user. Please check the form for errors.')
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    
    if (!formData.username.trim()) {
      setFormErrors({ username: ['This field is required.'] })
      return
    }
    if (!formData.email.trim()) {
      setFormErrors({ email: ['This field is required.'] })
      return
    }
    if (!user && !formData.password) {
      toast.error('Password is required for new users')
      return
    }
    if (formData.password && formData.password !== formData.password_confirm) {
      toast.error('Passwords do not match')
      return
    }

    mutation.mutate(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev: any) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>{user ? 'Edit User' : 'Add New User'}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#7f8c8d',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Username <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
                disabled={!!user}
              />
              {formErrors.username && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.username) ? formErrors.username[0] : formErrors.username}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Email <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
              />
              {formErrors.email && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.email) ? formErrors.email[0] : formErrors.email}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input"
                style={{ width: '100%' }}
                placeholder="+263..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Role <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="input"
                style={{ width: '100%' }}
                required
              >
                <option value="cashier">Cashier</option>
                <option value="supervisor">Supervisor</option>
                <option value="stock_controller">Stock Controller</option>
                <option value="accountant">Accountant</option>
                <option value="auditor">Auditor</option>
                <option value="manager">Manager</option>
                <option value="tenant_admin">Tenant Admin</option>
                {currentUser?.role === 'super_admin' && (
                  <option value="super_admin">Super Admin</option>
                )}
              </select>
            </div>

            {!user && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Password <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required={!user}
                    className="input"
                    style={{ width: '100%' }}
                  />
                  {formErrors.password && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {Array.isArray(formErrors.password) ? formErrors.password[0] : formErrors.password}
                  </span>}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Confirm Password <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password_confirm}
                    onChange={(e) => handleChange('password_confirm', e.target.value)}
                    required={!user}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            {user && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Enter new password"
                  />
                </div>

                {formData.password && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.password_confirm}
                      onChange={(e) => handleChange('password_confirm', e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
              {user ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getRoleColor(role: string) {
  const colors: { [key: string]: { bg: string; color: string } } = {
    super_admin: { bg: '#f8d7da', color: '#721c24' },
    tenant_admin: { bg: '#fff3cd', color: '#856404' },
    supervisor: { bg: '#d1ecf1', color: '#0c5460' },
    manager: { bg: '#d4edda', color: '#155724' },
    cashier: { bg: '#e3f2fd', color: '#1976d2' },
    stock_controller: { bg: '#e7f3ff', color: '#004085' },
    accountant: { bg: '#f3e5f5', color: '#4a148c' },
    auditor: { bg: '#e2e3e5', color: '#383d41' },
  }
  return colors[role] || { bg: '#e2e3e5', color: '#383d41' }
}


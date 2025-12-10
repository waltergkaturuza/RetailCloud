/**
 * Branch Management Page
 * Tenants can create and manage branches with full details
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { usePermissions } from '../hooks/usePermissions'

interface Branch {
  id: number
  name: string
  code: string
  address: string
  city: string
  country: string
  postal_code: string
  phone: string
  phone_alt: string
  email: string
  website: string
  description: string
  opening_hours: Record<string, any>
  latitude: number | null
  longitude: number | null
  manager: number | null
  manager_name?: string
  manager_email?: string
  staff_count: number
  is_active: boolean
  is_main: boolean
  allow_online_orders: boolean
  full_address: string
  created_at: string
  updated_at: string
}

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
}

export default function Branches() {
  const { can } = usePermissions()
  const [showForm, setShowForm] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: branchesResponse, isLoading } = useQuery({
    queryKey: ['branches', searchQuery],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      const response = await api.get('/core/branches/', { params })
      return response.data
    },
  })

  const branches = branchesResponse?.results || branchesResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/core/branches/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Branch deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.response?.data?.error || 'Failed to delete branch')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/core/branches/${id}/toggle_active/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Branch status updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update branch status')
    },
  })

  const setMainMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/core/branches/${id}/set_main/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Main branch updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to set main branch')
    },
  })

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch)
    setShowForm(true)
  }

  const handleDelete = (branch: Branch) => {
    if (branch.is_main) {
      toast.error('Cannot delete the main branch. Please set another branch as main first.')
      return
    }
    if (confirm(`Are you sure you want to delete "${branch.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(branch.id)
    }
  }

  const handleToggleActive = (branch: Branch) => {
    toggleActiveMutation.mutate(branch.id)
  }

  const handleSetMain = (branch: Branch) => {
    if (confirm(`Set "${branch.name}" as the main branch?`)) {
      setMainMutation.mutate(branch.id)
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Branch Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage your store branches and locations ({branches.length} branches)
          </p>
        </div>
        {can('canEditSettings') && (
          <Button
            onClick={() => {
              setSelectedBranch(null)
              setShowForm(true)
            }}
          >
            + Add Branch
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="mb-3">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Search Branches
            </label>
            <input
              type="text"
              placeholder="Search by name, code, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Card>

      {/* Branches List */}
      {isLoading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading branches...</p>
          </div>
        </Card>
      ) : branches.length === 0 ? (
        <Card>
          <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Branches Found</h3>
            <p style={{ marginBottom: '20px' }}>Start by adding your first branch</p>
            {can('canEditSettings') && (
              <Button onClick={() => {
                setSelectedBranch(null)
                setShowForm(true)
              }}>
                Add Your First Branch
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {branches.map((branch: Branch) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                        {branch.name}
                        {branch.is_main && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3498db', fontWeight: '500' }}>
                            🏠 Main
                          </span>
                        )}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                        Code: {branch.code}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: branch.is_active ? '#d4edda' : '#f8d7da',
                      color: branch.is_active ? '#155724' : '#721c24',
                    }}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {branch.full_address && (
                    <div style={{ marginBottom: '8px', fontSize: '13px', color: '#2c3e50' }}>
                      📍 {branch.full_address}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', fontSize: '13px', color: '#2c3e50' }}>
                    {branch.phone && <div>📞 {branch.phone}</div>}
                    {branch.email && <div>✉️ {branch.email}</div>}
                    {branch.manager_name && <div>👤 Manager: {branch.manager_name}</div>}
                    <div>👥 Staff: {branch.staff_count}</div>
                  </div>

                  {branch.description && (
                    <div style={{
                      marginBottom: '12px',
                      padding: '8px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#7f8c8d',
                    }}>
                      {branch.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                    {can('canEditSettings') && (
                      <>
                        {!branch.is_main && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetMain(branch)}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            Set as Main
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleEdit(branch)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(branch)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          {branch.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        {!branch.is_main && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(branch)}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            Delete
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Branch Form Modal */}
      {showForm && (
        <BranchForm
          branch={selectedBranch || undefined}
          onClose={() => {
            setShowForm(false)
            setSelectedBranch(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedBranch(null)
            queryClient.invalidateQueries({ queryKey: ['branches'] })
          }}
        />
      )}
    </div>
  )
}

function BranchForm({ branch, onClose, onSuccess }: { branch?: Branch, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: branch?.name || '',
    code: branch?.code || '',
    address: branch?.address || '',
    city: branch?.city || '',
    country: branch?.country || 'Zimbabwe',
    postal_code: branch?.postal_code || '',
    phone: branch?.phone || '',
    phone_alt: branch?.phone_alt || '',
    email: branch?.email || '',
    website: branch?.website || '',
    description: branch?.description || '',
    opening_hours: branch?.opening_hours || {},
    latitude: branch?.latitude?.toString() || '',
    longitude: branch?.longitude?.toString() || '',
    manager: branch?.manager || '',
    is_active: branch?.is_active !== undefined ? branch.is_active : true,
    is_main: branch?.is_main || false,
    allow_online_orders: branch?.allow_online_orders || false,
  })

  const [formErrors, setFormErrors] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch users for manager selection
  const { data: usersResponse } = useQuery({
    queryKey: ['users-for-manager'],
    queryFn: async () => {
      const response = await api.get('/auth/users/', { params: { limit: 100 } })
      return response.data
    },
  })

  const users = usersResponse?.results || usersResponse || []

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true)
      try {
        const cleanedData: any = { ...data }
        if (!cleanedData.manager) cleanedData.manager = null
        if (!cleanedData.latitude) cleanedData.latitude = null
        else cleanedData.latitude = parseFloat(cleanedData.latitude)
        if (!cleanedData.longitude) cleanedData.longitude = null
        else cleanedData.longitude = parseFloat(cleanedData.longitude)
        
        if (branch) {
          return await api.patch(`/core/branches/${branch.id}/`, cleanedData)
        } else {
          return await api.post('/core/branches/', cleanedData)
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: () => {
      onSuccess()
      toast.success(branch ? 'Branch updated successfully' : 'Branch created successfully')
    },
    onError: (error: any) => {
      const errors = error.response?.data || {}
      setFormErrors(errors)
      if (errors.non_field_errors) {
        toast.error(errors.non_field_errors[0])
      } else {
        toast.error('Failed to save branch. Please check the form for errors.')
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            {branch ? 'Edit Branch' : 'Add New Branch'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Branch Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input"
                required
                style={{ width: '100%' }}
              />
              {formErrors.name && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{formErrors.name}</div>}
            </div>
            <div>
              <label className="form-label">Branch Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                className="input"
                required
                placeholder="e.g., BRANCH01"
                style={{ width: '100%' }}
              />
              {formErrors.code && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{formErrors.code}</div>}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="input"
              rows={2}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label">Alternative Phone</label>
              <input
                type="tel"
                value={formData.phone_alt}
                onChange={(e) => handleChange('phone_alt', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="input"
                placeholder="https://..."
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">GPS Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                className="input"
                placeholder="e.g., -17.8292"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label">GPS Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                className="input"
                placeholder="e.g., 31.0522"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input"
              rows={3}
              placeholder="Branch description, notes, or special information..."
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Branch Manager</label>
            <select
              value={formData.manager || ''}
              onChange={(e) => handleChange('manager', e.target.value ? parseInt(e.target.value) : '')}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">No Manager</option>
              {users.map((user: User) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
              />
              <span>Active</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_main}
                onChange={(e) => handleChange('is_main', e.target.checked)}
              />
              <span>Main Branch</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.allow_online_orders}
                onChange={(e) => handleChange('allow_online_orders', e.target.checked)}
              />
              <span>Allow Online Orders</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {branch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}



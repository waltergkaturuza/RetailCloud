/**
 * Owner Tenant Management Page
 * Full CRUD for all tenants
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import TenantForm from '../../components/owner/TenantForm'
import TenantDetailsModal from '../../components/owner/TenantDetailsModal'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface Tenant {
  id: number
  name: string
  slug: string
  company_name: string
  email: string
  phone: string
  subscription_status: string
  user_count: number
  branch_count: number
  sales_today: string
  business_category_name?: string
  created_at: string
}

export default function OwnerTenants() {
  const [showForm, setShowForm] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [detailsTenantId, setDetailsTenantId] = useState<number | null>(null)
  const [detailsTenantName, setDetailsTenantName] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: tenantsResponse, isLoading } = useQuery({
    queryKey: ['owner-tenants', searchQuery, filters],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (filters.subscription_status) params.subscription_status = filters.subscription_status
      if (filters.business_category) params.business_category = filters.business_category
      
      const response = await api.get('/owner/tenants/', { params })
      return response.data
    },
  })

  const tenants = tenantsResponse?.results || tenantsResponse || []

  const suspendMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/owner/tenants/${id}/suspend/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-tenants'] })
      toast.success('Tenant suspended successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to suspend tenant')
    },
  })

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/owner/tenants/${id}/activate/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-tenants'] })
      toast.success('Tenant activated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to activate tenant')
    },
  })

  const approveTrialMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/owner/tenants/${id}/approve_trial/`)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['owner-tenants'] })
      toast.success(data.data?.message || 'Trial approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve trial')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/owner/tenants/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-tenants'] })
      toast.success('Tenant deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete tenant')
    },
  })

  const handleSuspend = (tenant: Tenant) => {
    if (confirm(`Are you sure you want to suspend "${tenant.company_name}"?`)) {
      suspendMutation.mutate(tenant.id)
    }
  }

  const handleActivate = (tenant: Tenant) => {
    activateMutation.mutate(tenant.id)
  }

  const handleApproveTrial = (tenant: Tenant) => {
    if (confirm(`Approve 7-day trial for "${tenant.company_name}"?`)) {
      approveTrialMutation.mutate(tenant.id)
    }
  }

  const handleDelete = (tenant: Tenant) => {
    if (confirm(`⚠️ WARNING: This will permanently delete "${tenant.company_name}" and all their data. This action cannot be undone!\n\nAre you absolutely sure?`)) {
      deleteMutation.mutate(tenant.id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#27ae60'
      case 'trial': return '#3498db'
      case 'suspended': return '#e74c3c'
      case 'expired': return '#95a5a6'
      default: return '#7f8c8d'
    }
  }

  return (
    <div style={{ width: '100%', padding: '30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            🏢 Tenant Management
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Manage all tenants, subscriptions, and accounts
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          ➕ Create Tenant
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Search Tenants
            </label>
            <input
              type="text"
              placeholder="Search by name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Status
            </label>
            <select
              value={filters.subscription_status || ''}
              onChange={(e) => setFilters({ ...filters, subscription_status: e.target.value || undefined })}
              className="input"
              style={{ minWidth: '150px' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => setFilters({})}
            style={{ height: 'fit-content' }}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Tenants Table */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading tenants...</p>
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No tenants found</p>
            <p style={{ fontSize: '14px' }}>Create your first tenant to get started</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Company</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Contact</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Users</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Branches</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Sales Today</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant: Tenant) => (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background 0.2s'
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
                        {tenant.company_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        {tenant.slug}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ marginBottom: '4px' }}>{tenant.email}</div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{tenant.phone}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#7f8c8d' }}>
                      {tenant.business_category_name || 'N/A'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getStatusColor(tenant.subscription_status) + '20',
                          color: getStatusColor(tenant.subscription_status)
                        }}
                      >
                        {tenant.subscription_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#2c3e50' }}>
                      {tenant.user_count}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#2c3e50' }}>
                      {tenant.branch_count}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#27ae60', fontWeight: '600' }}>
                      ${parseFloat(tenant.sales_today || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => {
                            setDetailsTenantId(tenant.id)
                            setDetailsTenantName(tenant.company_name)
                            setShowDetails(true)
                          }}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          📊 Details
                        </Button>
                        {tenant.subscription_status === 'trial' && (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleApproveTrial(tenant)}
                            style={{ fontSize: '12px', padding: '6px 12px', color: '#3498db', borderColor: '#3498db' }}
                          >
                            ✓ Approve Trial
                          </Button>
                        )}
                        {tenant.subscription_status === 'suspended' ? (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleActivate(tenant)}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            Activate
                          </Button>
                        ) : tenant.subscription_status !== 'trial' && (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleSuspend(tenant)}
                            style={{ fontSize: '12px', padding: '6px 12px', color: '#e74c3c', borderColor: '#e74c3c' }}
                          >
                            Suspend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="small"
                          onClick={async () => {
                            try {
                              // Fetch full tenant details for editing
                              const response = await api.get(`/owner/tenants/${tenant.id}/`)
                              setSelectedTenant(response.data)
                              setShowForm(true)
                            } catch (error: any) {
                              toast.error(error.response?.data?.detail || 'Failed to load tenant details')
                            }
                          }}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleDelete(tenant)}
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

      {/* Tenant Form Modal */}
      {showForm && (
        <TenantForm
          tenant={selectedTenant || undefined}
          onClose={() => {
            setShowForm(false)
            setSelectedTenant(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedTenant(null)
          }}
        />
      )}

      {/* Tenant Details Modal */}
      {showDetails && detailsTenantId && (
        <TenantDetailsModal
          tenantId={detailsTenantId}
          tenantName={detailsTenantName}
          onClose={() => {
            setShowDetails(false)
            setDetailsTenantId(null)
            setDetailsTenantName('')
          }}
        />
      )}
    </div>
  )
}


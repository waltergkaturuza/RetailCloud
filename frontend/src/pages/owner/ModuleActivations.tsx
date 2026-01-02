/**
 * Owner Module Activation Management Page
 * Approve/manage module activation requests from tenants
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

interface TenantModule {
  id: number
  tenant: number
  tenant_name: string
  module: number
  module_name: string
  module_code: string
  module_category: string
  status: string
  enabled_at?: string
  activated_at?: string
  expires_at?: string
  requested_at: string
  activated_by?: number
  activated_by_name?: string
  requires_owner_approval: boolean
  notes?: string
  activation_period_months?: number
  payment_type?: 'trial' | 'paid' | 'debt' | 'complimentary'
  payment_type_display?: string
  price_monthly?: number
  price_yearly?: number
  actual_price?: number
  currency?: string
  pricing_info?: {
    price_monthly: number
    price_yearly: number
    actual_price: number
    currency: string
    discount_applied: number
    period_months: number
  }
}

export default function OwnerModuleActivations() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  // Fetch pending approvals
  const { data: pendingModules, isLoading: pendingLoading } = useQuery<TenantModule[]>({
    queryKey: ['owner-pending-modules', statusFilter],
    queryFn: async () => {
      const response = await api.get('/subscriptions/tenant-modules/pending_approval/')
      return response.data
    },
  })

  // Fetch all tenant modules for management
  const { data: allModulesData, isLoading: allLoading } = useQuery<{results?: TenantModule[], count?: number} | TenantModule[]>({
    queryKey: ['owner-all-modules', searchQuery, statusFilter],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      // Don't filter by status here, we'll do it on the frontend for stats
      // if (statusFilter !== 'all') params.status = statusFilter
      
      // Get all tenant modules - super_admin should see all
      const response = await api.get('/subscriptions/tenant-modules/', { params })
      // Handle paginated response
      if (response.data.results) {
        return response.data.results
      }
      // Handle non-paginated response
      if (Array.isArray(response.data)) {
        return response.data
      }
      return []
    },
  })
  
  // Extract modules array from response
  const allModules = Array.isArray(allModulesData) ? allModulesData : (allModulesData?.results || [])

  // Approve module activation
  const approveMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const response = await api.post(`/subscriptions/tenant-modules/${moduleId}/approve/`)
      return response.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Module activated successfully')
      queryClient.invalidateQueries({ queryKey: ['owner-pending-modules'] })
      queryClient.invalidateQueries({ queryKey: ['owner-all-modules'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve module activation')
    },
  })

  const handleApprove = (module: TenantModule) => {
    if (confirm(`Approve activation of "${module.module_name}" for ${module.tenant_name}?`)) {
      approveMutation.mutate(module.id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#d4edda', border: '#c3e6cb', text: '#155724', badge: '#28a745' }
      case 'pending':
        return { bg: '#fff3cd', border: '#ffeaa7', text: '#856404', badge: '#ffc107' }
      case 'requires_payment':
        return { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24', badge: '#dc3545' }
      case 'trial':
        return { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460', badge: '#17a2b8' }
      default:
        return { bg: '#f8f9fa', border: '#e9ecef', text: '#6c757d', badge: '#6c757d' }
    }
  }

  const filteredPending = pendingModules?.filter((mod) => {
    if (statusFilter !== 'all' && mod.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        mod.tenant_name.toLowerCase().includes(query) ||
        mod.module_name.toLowerCase().includes(query) ||
        mod.module_code.toLowerCase().includes(query)
      )
    }
    return true
  }) || []

  const filteredAll = allModules?.filter((mod) => {
    if (statusFilter !== 'all' && mod.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        mod.tenant_name.toLowerCase().includes(query) ||
        mod.module_name.toLowerCase().includes(query) ||
        mod.module_code.toLowerCase().includes(query)
      )
    }
    return true
  }) || []

  return (
    <div style={{ width: '100%', padding: '30px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
          Module Activation Management
        </h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          Approve and manage module activation requests from tenants
        </p>
      </div>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc107', marginBottom: '4px' }}>
              {allModules?.filter(m => m.status === 'pending').length || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Pending Approval</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc3545', marginBottom: '4px' }}>
              {allModules?.filter(m => m.status === 'requires_payment').length || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Requires Payment</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#28a745', marginBottom: '4px' }}>
              {allModules?.filter(m => m.status === 'active').length || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Active Modules</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#17a2b8', marginBottom: '4px' }}>
              {allModules?.filter(m => m.status === 'trial').length || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Trial Access</div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search by tenant, module name, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="requires_payment">Requires Payment</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
            }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Pending Approvals */}
      {filteredPending.length > 0 && (
        <Card title={`Pending Approvals (${filteredPending.length})`} style={{ marginBottom: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Tenant</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Module</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Requested</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((module) => {
                  const statusColors = getStatusColor(module.status)
                  return (
                    <tr key={module.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{module.tenant_name}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '500' }}>{module.module_name}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{module.module_code}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
                          {module.module_category}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: statusColors.badge,
                            color: 'white',
                            textTransform: 'uppercase',
                          }}
                        >
                          {module.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {new Date(module.requested_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {module.status === 'pending' && (
                            <Button
                              size="small"
                              onClick={() => handleApprove(module)}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </Button>
                          )}
                          {module.status === 'requires_payment' && (
                            <span style={{ fontSize: '12px', color: '#dc3545' }}>
                              Payment Required
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* All Modules */}
      <Card title={`All Module Activations (${filteredAll.length})`}>
        {allLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : filteredAll.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            No module activations found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Tenant</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Module</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Payment Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Period</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Cost</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Requested</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Expires</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Approved By</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAll.map((module) => {
                  const statusColors = getStatusColor(module.status)
                  return (
                    <tr key={module.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{module.tenant_name}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '500' }}>{module.module_name}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{module.module_code}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: statusColors.badge,
                            color: 'white',
                            textTransform: 'uppercase',
                          }}
                        >
                          {module.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        <span style={{ textTransform: 'capitalize' }}>
                          {module.payment_type_display || module.payment_type || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {module.activation_period_months === 12 ? 'Yearly' : module.activation_period_months === 1 ? 'Monthly' : `${module.activation_period_months} months`}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>
                        {module.pricing_info ? (
                          <div>
                            <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                              {module.pricing_info.currency || 'USD'} {(() => {
                                const price = module.actual_price ?? module.pricing_info.actual_price;
                                return price != null ? parseFloat(String(price)).toFixed(2) : '0.00';
                              })()}
                            </div>
                            {module.activation_period_months === 12 && (
                              <div style={{ fontSize: '11px', color: '#28a745' }}>
                                Save {module.pricing_info.discount_applied != null ? parseFloat(String(module.pricing_info.discount_applied)).toFixed(0) : '0'}%
                              </div>
                            )}
                          </div>
                        ) : module.actual_price != null ? (
                          <span style={{ fontWeight: '600' }}>
                            {module.currency || 'USD'} {parseFloat(String(module.actual_price)).toFixed(2)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {new Date(module.requested_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {module.expires_at ? new Date(module.expires_at).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {module.activated_by_name || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {module.status === 'pending' && (
                            <Button
                              size="small"
                              variant="success"
                              onClick={() => handleApprove(module)}
                              disabled={approveMutation.isPending}
                            >
                              ✓ Approve
                            </Button>
                          )}
                          {module.status === 'requires_payment' && (
                            <>
                              <Button
                                size="small"
                                variant="success"
                                onClick={() => handleApprove(module)}
                                disabled={approveMutation.isPending}
                              >
                                ✓ Approve
                              </Button>
                              <span style={{ fontSize: '12px', color: '#dc3545' }}>
                                Payment Required
                              </span>
                            </>
                          )}
                          {module.status === 'active' && !module.activated_by_name && (
                            <Button
                              size="small"
                              variant="success"
                              onClick={() => handleApprove(module)}
                              disabled={approveMutation.isPending}
                              title="Record owner approval for this module"
                            >
                              ✓ Record Approval
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}


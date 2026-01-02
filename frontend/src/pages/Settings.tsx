/**
 * Settings Page - Manage tenant settings including business category
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import BusinessCategorySelector from '../components/BusinessCategorySelector'
import ModuleActivationList from '../components/ModuleActivationList'
import SubscriptionManagement from '../components/SubscriptionManagement'
import SecuritySettings from '../components/SecuritySettings'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'general' | 'category' | 'modules' | 'branches' | 'subscription' | 'branding' | 'security'>('general')

  // Fetch current tenant category
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['tenant-category'],
    queryFn: async () => {
      try {
        const response = await api.get('/business-categories/tenant/category/')
        return response.data
      } catch {
        return null
      }
    },
  })

  // Extract current category early so it can be used in other queries
  const currentCategory = categoryData?.category

  // Fetch enabled modules
  const { data: modulesData } = useQuery({
    queryKey: ['tenant-modules'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/modules/')
        return response.data || []
      } catch (error: any) {
        console.error('Error fetching modules:', error)
        return []
      }
    },
  })

  // Fetch recommended modules
  const { data: recommendedModulesData } = useQuery({
    queryKey: ['recommended-modules'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/tenant-modules/recommended/')
        return response.data
      } catch (error: any) {
        console.error('Error fetching recommended modules:', error)
        return { recommended: [], category: null }
      }
    },
    enabled: true, // Always fetch modules (will return all if no category)
  })

  const enabledModules = Array.isArray(modulesData) ? modulesData : []
  const recommendedModules = recommendedModulesData?.recommended || []

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
          Settings
        </h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          Manage your business profile and preferences
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #ecf0f1',
        }}
      >
        {[
          { id: 'general', label: 'General', icon: '⚙️' },
          { id: 'category', label: 'Business Category', icon: '🏪' },
          { id: 'modules', label: 'Modules', icon: '📦' },
          { id: 'branches', label: 'Branches', icon: '🏢' },
          { id: 'subscription', label: 'Subscription & Billing', icon: '💳' },
          { id: 'branding', label: 'Branding', icon: '🎨' },
          { id: 'security', label: 'Security', icon: '🔐' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === tab.id ? '#667eea' : '#7f8c8d',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card title="General Settings">
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Company Name
              </label>
              <input
                type="text"
                className="input"
                value={user?.tenant_name || 'Not set'}
                disabled
                style={{ width: '100%', opacity: 0.7 }}
              />
              <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                Company name is managed by your tenant administrator
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Your Role
              </label>
              <input
                type="text"
                className="input"
                value={user?.role_display || user?.role || 'N/A'}
                disabled
                style={{ width: '100%', opacity: 0.7 }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Business Category */}
      {activeTab === 'category' && (
        <div>
          {categoryLoading ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
            </Card>
          ) : (
            <>
              {currentCategory && (
                <Card title="Current Business Category" style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      color: 'white',
                    }}
                  >
                    <span style={{ fontSize: '48px' }}>{currentCategory.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                        {currentCategory.name}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>
                        {currentCategory.description}
                      </div>
                      {currentCategory.module_count > 0 && (
                        <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px' }}>
                          ✓ {currentCategory.module_count} module(s) configured for this category
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              <BusinessCategorySelector
                selectedCategoryId={currentCategory?.id}
                autoActivateModules={false}
                showRecommendations={true}
              />
            </>
          )}
        </div>
      )}

      {/* Modules */}
      {activeTab === 'modules' && (
        <div>
          {/* Enabled Modules */}
          <Card title="Enabled Modules" style={{ marginBottom: '24px' }}>
            {enabledModules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No modules enabled yet
                </div>
                <div style={{ fontSize: '14px' }}>
                  {currentCategory 
                    ? 'Select recommended modules below to activate them.'
                    : 'Select a business category first to see recommended modules.'}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '16px',
                }}
              >
                {enabledModules.map((module: any) => (
                  <div
                    key={module.id}
                    style={{
                      padding: '16px',
                      background: module.status === 'active' ? '#d4edda' : '#fff3cd',
                      borderRadius: '8px',
                      border: `1px solid ${module.status === 'active' ? '#c3e6cb' : '#ffeaa7'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '600' }}>{module.module_name}</div>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: module.status === 'active' ? '#28a745' : '#ffc107',
                          color: 'white',
                          textTransform: 'uppercase',
                        }}
                      >
                        {module.status || 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {module.module_category}
                    </div>
                    {module.enabled_at && (
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        Activated: {new Date(module.enabled_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Available Modules */}
          <Card title={currentCategory ? "Available Modules" : "Available Modules"}>
            <p style={{ marginBottom: '16px', color: '#7f8c8d', fontSize: '14px' }}>
              {currentCategory 
                ? "Browse all available modules. Recommended modules for your business category are highlighted."
                : "Browse all available modules. Select a business category to see recommended modules."}
            </p>
            {recommendedModules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                {currentCategory 
                  ? "No modules available at this time."
                  : "Select a business category first, or browse all modules below."}
              </div>
            ) : (
              <ModuleActivationList 
                recommendedModules={recommendedModules}
                enabledModules={enabledModules}
                onActivationRequest={() => {
                  queryClient.invalidateQueries({ queryKey: ['tenant-modules'] })
                  queryClient.invalidateQueries({ queryKey: ['recommended-modules'] })
                }}
              />
            )}
          </Card>
        </div>
      )}

      {/* Branches */}
      {activeTab === 'branches' && (
        <BranchesManagement />
      )}

      {/* Subscription & Billing */}
      {activeTab === 'subscription' && (
        <SubscriptionManagement />
      )}

      {/* Branding */}
      {activeTab === 'branding' && (
        <BrandingSettings />
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <SecuritySettings />
      )}
    </div>
  )
}

// Branding Settings Component
function BrandingSettings() {
  const { data: branding, isLoading, refetch } = useQuery({
    queryKey: ['tenant-branding'],
    queryFn: async () => {
      const response = await api.get('/core/branding/')
      return response.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.patch('/core/branding/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Branding updated successfully')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update branding')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (assetType: string) => {
      await api.delete('/core/branding/', { data: { asset_type: assetType } })
    },
    onSuccess: () => {
      toast.success('Asset deleted successfully')
      refetch()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete asset')
    },
  })

  const handleFileUpload = (field: string, file: File | null) => {
    if (!file) return

    const formData = new FormData()
    formData.append(field, file)
    updateMutation.mutate(formData)
  }

  const handleDelete = (assetType: string) => {
    if (confirm(`Are you sure you want to delete this ${assetType.replace('_', ' ')}?`)) {
      deleteMutation.mutate(assetType)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <Card title="Company Logo">
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '16px' }}>
            Upload your company logo to be used across receipts, reports, and documents.
            Recommended: PNG or JPG, max 2MB, transparent background preferred.
          </p>
          
          {branding?.logo_url && (
            <div style={{ marginBottom: '16px' }}>
              <img
                src={branding.logo_url}
                alt="Company Logo"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '8px',
                  background: 'white',
                }}
              />
              <div style={{ marginTop: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete('logo')}
                  disabled={deleteMutation.isPending}
                >
                  Remove Logo
                </Button>
              </div>
            </div>
          )}
          
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload('logo', file)
            }}
            disabled={updateMutation.isPending}
            style={{ marginTop: '8px' }}
          />
        </div>
      </Card>

      <Card title="Signatures">
        <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '24px' }}>
          Upload signatures to be used in documents and reports. Each signature will be used in its respective field on PDF exports.
        </p>

        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Manager Signature */}
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
              Manager Signature
            </label>
            <p style={{ color: '#7f8c8d', fontSize: '13px', marginBottom: '12px' }}>
              Used for documents requiring manager approval
            </p>
            
            {branding?.manager_signature_url && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={branding.manager_signature_url}
                  alt="Manager Signature"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '150px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '4px',
                    background: 'white',
                  }}
                />
                <div style={{ marginTop: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete('manager_signature')}
                    disabled={deleteMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload('manager_signature', file)
              }}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Approved By Signature */}
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
              Approved By Signature
            </label>
            <p style={{ color: '#7f8c8d', fontSize: '13px', marginBottom: '12px' }}>
              Used for documents requiring approval from authorized personnel
            </p>
            
            {branding?.approved_by_signature_url && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={branding.approved_by_signature_url}
                  alt="Approved By Signature"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '150px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '4px',
                    background: 'white',
                  }}
                />
                <div style={{ marginTop: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete('approved_by_signature')}
                    disabled={deleteMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload('approved_by_signature', file)
              }}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Prepared By Signature */}
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
              Prepared By Signature
            </label>
            <p style={{ color: '#7f8c8d', fontSize: '13px', marginBottom: '12px' }}>
              Used for documents prepared by staff members
            </p>
            
            {branding?.prepared_by_signature_url && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={branding.prepared_by_signature_url}
                  alt="Prepared By Signature"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '150px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '4px',
                    background: 'white',
                  }}
                />
                <div style={{ marginTop: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete('prepared_by_signature')}
                    disabled={deleteMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload('prepared_by_signature', file)
              }}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

// Branch Management Component for Settings
function BranchesManagement() {
  const [showForm, setShowForm] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<any>(null)
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
      setShowForm(false)
      setSelectedBranch(null)
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

  const handleEdit = (branch: any) => {
    setSelectedBranch(branch)
    setShowForm(true)
  }

  const handleDelete = (branch: any) => {
    if (window.confirm(`Are you sure you want to delete "${branch.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(branch.id)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
            Branch Management
          </h2>
          <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Manage your store branches and locations ({branches.length} branches)
          </p>
        </div>
        <Button onClick={() => { setSelectedBranch(null); setShowForm(true) }}>
          + Add Branch
        </Button>
      </div>

      {/* Search */}
      <Card style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search branches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ width: '100%' }}
        />
      </Card>

      {/* Branches List */}
      <Card>
        {isLoading ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading branches...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Branches Found</h3>
            <p style={{ marginBottom: '24px' }}>
              {searchQuery ? 'No branches match your search.' : 'Create your first branch to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowForm(true)}>
                + Create First Branch
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Code</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Main</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch: any) => (
                  <tr key={branch.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{branch.name}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d', fontFamily: 'monospace' }}>{branch.code}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                      {branch.city && branch.country ? `${branch.city}, ${branch.country}` : branch.full_address || '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>{branch.phone || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleActiveMutation.mutate(branch.id)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: 'none',
                          cursor: 'pointer',
                          background: branch.is_active ? '#d4edda' : '#f8d7da',
                          color: branch.is_active ? '#155724' : '#721c24',
                        }}
                      >
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {branch.is_main ? (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: '#667eea',
                          color: 'white',
                        }}>
                          Main
                        </span>
                      ) : (
                        <button
                          onClick={() => setMainMutation.mutate(branch.id)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            border: '1px solid #667eea',
                            background: 'transparent',
                            color: '#667eea',
                            cursor: 'pointer',
                          }}
                        >
                          Set Main
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(branch)}>
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="danger" 
                          onClick={() => handleDelete(branch)}
                          disabled={branch.is_main}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Branch Form Modal */}
      {showForm && (
        <BranchFormModal
          branch={selectedBranch}
          onClose={() => { setShowForm(false); setSelectedBranch(null) }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['branches'] })
            setShowForm(false)
            setSelectedBranch(null)
          }}
        />
      )}
    </div>
  )
}

// Branch Form Modal Component
function BranchFormModal({ branch, onClose, onSuccess }: any) {
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
    is_active: branch?.is_active ?? true,
    allow_online_orders: branch?.allow_online_orders ?? false,
  })
  const [errors, setErrors] = useState<any>({})

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (branch) {
        return await api.patch(`/core/branches/${branch.id}/`, data)
      } else {
        return await api.post('/core/branches/', data)
      }
    },
    onSuccess: () => {
      toast.success(branch ? 'Branch updated successfully' : 'Branch created successfully')
      onSuccess()
    },
    onError: (error: any) => {
      const errorData = error.response?.data || {}
      setErrors(errorData)
      toast.error(errorData.detail || (branch ? 'Failed to update branch' : 'Failed to create branch'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    mutation.mutate(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>{branch ? 'Edit Branch' : 'Create New Branch'}</h2>
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
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Branch Name <span style={{ color: '#e74c3c' }}>*</span></label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>
            <div>
              <label className="form-label">Branch Code <span style={{ color: '#e74c3c' }}>*</span></label>
              <input
                type="text"
                className="input"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              {errors.code && <div className="error-text">{errors.code}</div>}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Address</label>
            <textarea
              className="input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">City</label>
              <input
                type="text"
                className="input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Country</label>
              <input
                type="text"
                className="input"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                className="input"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Alternative Phone</label>
              <input
                type="text"
                className="input"
                value={formData.phone_alt}
                onChange={(e) => setFormData({ ...formData, phone_alt: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>
            <div>
              <label className="form-label">Website</label>
              <input
                type="url"
                className="input"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Description</label>
            <textarea
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.allow_online_orders}
                onChange={(e) => setFormData({ ...formData, allow_online_orders: e.target.checked })}
              />
              Allow Online Orders
            </label>
          </div>

          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {branch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


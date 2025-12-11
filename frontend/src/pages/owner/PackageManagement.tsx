/**
 * Package Management Page for Owner
 * Manage subscription packages (Trial, Standard, Pro, Enterprise, etc.)
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import Card from '../../components/ui/Card'

interface Package {
  id?: number
  name: string
  code: string
  description: string
  price_monthly: number
  price_yearly: number
  currency: string
  max_users: number
  max_branches: number
  is_active: boolean
  sort_order: number
  modules?: Array<{
    id: number
    name: string
    code: string
    description: string
  }>
  module_ids?: number[]
  modules_count?: number
  monthly_savings?: number
  yearly_savings?: number
}

interface Module {
  id: number
  name: string
  code: string
  description: string
  category: string
  icon: string
}

export default function PackageManagement() {
  const queryClient = useQueryClient()
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'comparison'>('comparison')

  // Fetch all packages
  const { data: packagesResponse, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ['owner-packages'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/packages/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch all modules for package assignment
  const { data: modulesResponse } = useQuery<Module[]>({
    queryKey: ['all-modules'],
    queryFn: async () => {
      try {
        const response = await api.get('/core/modules/')
        return response.data?.results || response.data || []
      } catch (error) {
        console.error('Failed to fetch modules:', error)
        return []
      }
    },
  })

  const packages = (packagesResponse || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const modules = (modulesResponse || []) as Module[]

  // Create/Update package mutation
  const savePackageMutation = useMutation({
    mutationFn: async (pkg: Package) => {
      if (pkg.id) {
        return api.patch(`/subscriptions/packages/${pkg.id}/`, pkg)
      } else {
        return api.post('/subscriptions/packages/', pkg)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-packages'] })
      toast.success(selectedPackage?.id ? 'Package updated successfully!' : 'Package created successfully!')
      setIsFormOpen(false)
      setSelectedPackage(null)
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to save package'
      toast.error(errorMsg)
    },
  })

  // Delete package mutation
  const deletePackageMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/subscriptions/packages/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-packages'] })
      toast.success('Package deleted successfully!')
    },
    onError: () => {
      toast.error('Failed to delete package')
    },
  })

  const handleCreateNew = () => {
    setSelectedPackage({
      name: '',
      code: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      currency: 'USD',
      max_users: 5,
      max_branches: 1,
      is_active: true,
      sort_order: packages.length,
      module_ids: [],
    })
    setIsFormOpen(true)
  }

  const handleEdit = (pkg: Package) => {
    setSelectedPackage({
      ...pkg,
      module_ids: pkg.modules?.map(m => m.id) || [],
    })
    setIsFormOpen(true)
  }

  const handleSave = () => {
    if (!selectedPackage) return

    // Validation
    if (!selectedPackage.name.trim()) {
      toast.error('Package name is required')
      return
    }
    if (!selectedPackage.code.trim()) {
      toast.error('Package code is required')
      return
    }
    if (selectedPackage.price_monthly < 0 || selectedPackage.price_yearly < 0) {
      toast.error('Prices must be positive numbers')
      return
    }

    savePackageMutation.mutate(selectedPackage)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      deletePackageMutation.mutate(id)
    }
  }

  // Comparison Table Component
  const ComparisonTable = () => {
    const features = [
      { 
        label: 'Monthly Price', 
        key: 'price_monthly', 
        format: (p: Package) => {
          const price = typeof p.price_monthly === 'string' ? parseFloat(p.price_monthly) : p.price_monthly
          return `${p.currency} ${(price || 0).toFixed(2)}`
        }
      },
      { 
        label: 'Yearly Price', 
        key: 'price_yearly', 
        format: (p: Package) => {
          const price = typeof p.price_yearly === 'string' ? parseFloat(p.price_yearly) : p.price_yearly
          return `${p.currency} ${(price || 0).toFixed(2)}`
        }
      },
      { 
        label: 'Yearly Savings', 
        key: 'yearly_savings', 
        format: (p: Package) => {
          const savings = typeof p.yearly_savings === 'string' ? parseFloat(p.yearly_savings) : (p.yearly_savings || 0)
          return savings > 0 ? `Save ${p.currency} ${savings.toFixed(2)}/year` : '-'
        }
      },
      { label: 'Max Users', key: 'max_users', format: (p: Package) => p.max_users?.toString() || '0' },
      { label: 'Max Branches', key: 'max_branches', format: (p: Package) => p.max_branches?.toString() || '0' },
      { label: 'Modules Included', key: 'modules_count', format: (p: Package) => `${p.modules_count || p.modules?.length || 0} modules` },
    ]

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ background: '#667eea', color: 'white' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', border: '1px solid #ddd' }}>
                Feature
              </th>
              {packages.map((pkg) => (
                <th
                  key={pkg.id}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    border: '1px solid #ddd',
                    background: pkg.is_active ? '#667eea' : '#95a5a6',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>{pkg.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={feature.key} style={{ background: idx % 2 === 0 ? '#f8f9fa' : 'white' }}>
                <td style={{ padding: '16px', fontWeight: '600', border: '1px solid #ddd' }}>
                  {feature.label}
                </td>
                {packages.map((pkg) => (
                  <td
                    key={pkg.id}
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #ddd',
                    }}
                  >
                    {feature.format(pkg)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td style={{ padding: '16px', fontWeight: '600', border: '1px solid #ddd' }}>
                Description
              </td>
              {packages.map((pkg) => (
                <td
                  key={pkg.id}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#666',
                  }}
                >
                  {pkg.description || 'No description'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', padding: '30px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px', fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
            Package Management
          </h1>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
            Manage subscription packages available to tenants
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'comparison' : 'list')}
            style={{
              padding: '10px 20px',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {viewMode === 'list' ? '📊 Comparison View' : '📋 List View'}
          </button>
          <button
            onClick={handleCreateNew}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            + Create Package
          </button>
        </div>
      </div>

      {packagesLoading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: '12px', color: '#6c757d' }}>Loading packages...</p>
        </div>
      ) : packages.length === 0 ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ margin: 0, marginBottom: '8px', color: '#2c3e50' }}>No Packages Yet</h3>
            <p style={{ margin: 0, color: '#6c757d', marginBottom: '24px' }}>
              Create your first subscription package to get started.
            </p>
            <button
              onClick={handleCreateNew}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Create First Package
            </button>
          </div>
        </Card>
      ) : viewMode === 'comparison' ? (
        <Card>
          <ComparisonTable />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '4px', fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
                      {pkg.name}
                    </h3>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: pkg.is_active ? '#27ae60' : '#95a5a6',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginTop: '4px',
                      }}
                    >
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                      {pkg.currency} {(typeof pkg.price_monthly === 'number' ? pkg.price_monthly : parseFloat(pkg.price_monthly?.toString() || '0')).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>per month</div>
                  </div>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6c757d', minHeight: '40px' }}>
                  {pkg.description || 'No description'}
                </p>

                <div style={{ marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span>Max Users:</span>
                    <span style={{ fontWeight: '600' }}>{pkg.max_users}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span>Max Branches:</span>
                    <span style={{ fontWeight: '600' }}>{pkg.max_branches}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>Modules:</span>
                    <span style={{ fontWeight: '600' }}>{pkg.modules_count || pkg.modules?.length || 0}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(pkg)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => pkg.id && handleDelete(pkg.id)}
                    style={{
                      padding: '10px 16px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Package Form Modal */}
      {isFormOpen && selectedPackage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setIsFormOpen(false)}
        >
          <Card
            style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px' }}>
              <h2 style={{ margin: 0, marginBottom: '24px', fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
                {selectedPackage.id ? 'Edit Package' : 'Create New Package'}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Package Name <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedPackage.name}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, name: e.target.value })}
                    placeholder="e.g., Standard, Pro, Enterprise"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Package Code <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedPackage.code}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="e.g., standard, pro, enterprise"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                  Description
                </label>
                <textarea
                  value={selectedPackage.description}
                  onChange={(e) => setSelectedPackage({ ...selectedPackage, description: e.target.value })}
                  placeholder="Describe what this package includes..."
                  className="input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Monthly Price <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={selectedPackage.price_monthly}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, price_monthly: parseFloat(e.target.value) || 0 })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Yearly Price <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={selectedPackage.price_yearly}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, price_yearly: parseFloat(e.target.value) || 0 })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Currency
                  </label>
                  <select
                    value={selectedPackage.currency}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, currency: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="USD">USD</option>
                    <option value="ZWL">ZWL</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="ZAR">ZAR</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Max Users
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedPackage.max_users}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, max_users: parseInt(e.target.value) || 1 })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Max Branches
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedPackage.max_branches}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, max_branches: parseInt(e.target.value) || 1 })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedPackage.sort_order}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, sort_order: parseInt(e.target.value) || 0 })}
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                  Modules Included
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '12px' }}>
                  {modules.length === 0 ? (
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '13px' }}>No modules available</p>
                  ) : (
                    modules.map((module) => (
                      <label
                        key={module.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPackage.module_ids?.includes(module.id) || false}
                          onChange={(e) => {
                            const moduleIds = selectedPackage.module_ids || []
                            if (e.target.checked) {
                              setSelectedPackage({ ...selectedPackage, module_ids: [...moduleIds, module.id] })
                            } else {
                              setSelectedPackage({ ...selectedPackage, module_ids: moduleIds.filter(id => id !== module.id) })
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontSize: '13px' }}>{module.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedPackage.is_active}
                    onChange={(e) => setSelectedPackage({ ...selectedPackage, is_active: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>Active (available for signup)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsFormOpen(false)
                    setSelectedPackage(null)
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={savePackageMutation.isPending}
                  style={{
                    padding: '10px 20px',
                    background: savePackageMutation.isPending ? '#ccc' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savePackageMutation.isPending ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  {savePackageMutation.isPending ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}


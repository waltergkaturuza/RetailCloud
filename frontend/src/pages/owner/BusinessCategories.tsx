/**
 * Business Categories Management
 * Owner interface for managing system-level business categories (industry types)
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import BusinessCategoryForm from '../../components/owner/BusinessCategoryForm'

interface Module {
  id: number
  code: string
  name: string
  description: string
  category: string
  icon: string
}

interface CategoryModuleMapping {
  id: number
  module: Module
  module_id?: number
  is_required: boolean
  priority: number
  notes: string
}

interface BusinessCategory {
  id: number
  code: string
  name: string
  description: string
  icon: string
  requires_expiry_tracking: boolean
  requires_serial_tracking: boolean
  requires_weight_scale: boolean
  requires_variants: boolean
  requires_warranty: boolean
  requires_appointments: boolean
  requires_recipe_costing: boolean
  requires_layby: boolean
  requires_delivery: boolean
  is_active: boolean
  sort_order: number
  module_count: number
  recommended_modules: CategoryModuleMapping[]
  created_at: string
  updated_at: string
}

export default function BusinessCategories() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null)
  const queryClient = useQueryClient()

  // Fetch all business categories
  const { data: categories, isLoading } = useQuery<BusinessCategory[]>({
    queryKey: ['owner-business-categories'],
    queryFn: async () => {
      const response = await api.get('/owner/business-categories/')
      return response.data?.results || response.data || []
    },
  })

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!categories) return []
    
    let filtered = categories
    
    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(cat => cat.is_active)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(cat => !cat.is_active)
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(query) ||
        cat.code.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query)
      )
    }
    
    return filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }, [categories, statusFilter, searchQuery])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (category: Partial<BusinessCategory>) => {
      if (category.id) {
        return api.patch(`/owner/business-categories/${category.id}/`, category)
      } else {
        return api.post('/owner/business-categories/', category)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-business-categories'] })
      toast.success(selectedCategory?.id ? 'Category updated successfully!' : 'Category created successfully!')
      setShowForm(false)
      setSelectedCategory(null)
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save category'
      toast.error(errorMsg)
    },
  })

  // Delete mutation (soft delete - sets is_active=False)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/owner/business-categories/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-business-categories'] })
      toast.success('Category deactivated successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to deactivate category')
    },
  })

  const handleCreate = () => {
    setSelectedCategory(null)
    setShowForm(true)
  }

  const handleEdit = (category: BusinessCategory) => {
    setSelectedCategory(category)
    setShowForm(true)
  }

  const handleDelete = (category: BusinessCategory) => {
    if (confirm(`Are you sure you want to deactivate "${category.name}"?\n\nThis will hide it from tenant selection.`)) {
      deleteMutation.mutate(category.id)
    }
  }

  const handleToggleActive = (category: BusinessCategory) => {
    saveMutation.mutate({
      ...category,
      is_active: !category.is_active,
    })
  }

  const stats = useMemo(() => {
    if (!categories) return { total: 0, active: 0, inactive: 0 }
    return {
      total: categories.length,
      active: categories.filter(c => c.is_active).length,
      inactive: categories.filter(c => !c.is_active).length,
    }
  }, [categories])

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading categories...</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#2c3e50' }}>
            Business Categories
          </h1>
          <p style={{ margin: '8px 0 0', color: '#6c757d', fontSize: '14px' }}>
            Manage industry types and their configurations
          </p>
        </div>
        <Button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>➕</span>
          Create Category
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Categories</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{stats.total}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Active</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#27ae60' }}>{stats.active}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Inactive</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#e74c3c' }}>{stats.inactive}</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'all' ? '#3498db' : 'white',
                color: statusFilter === 'all' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'all' ? '600' : '400',
              }}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'active' ? '#27ae60' : 'white',
                color: statusFilter === 'active' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'active' ? '600' : '400',
              }}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'inactive' ? '#e74c3c' : 'white',
                color: statusFilter === 'inactive' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'inactive' ? '600' : '400',
              }}
            >
              Inactive
            </button>
          </div>
        </div>
      </Card>

      {/* Categories List */}
      {filteredCategories.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d', marginBottom: '8px' }}>
              {searchQuery ? 'No categories found' : 'No categories yet'}
            </div>
            {!searchQuery && (
              <Button onClick={handleCreate} style={{ marginTop: '16px' }}>
                Create Your First Category
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredCategories.map((category) => (
            <Card key={category.id}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                    <div style={{ fontSize: '32px' }}>{category.icon || '📁'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                          {category.name}
                        </h3>
                        {!category.is_active && (
                          <span style={{
                            padding: '4px 8px',
                            background: '#f8f9fa',
                            color: '#6c757d',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}>
                            Inactive
                          </span>
                        )}
                        <span style={{
                          padding: '4px 8px',
                          background: '#e8f4f8',
                          color: '#3498db',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}>
                          {category.code}
                        </span>
                      </div>
                      {category.description && (
                        <p style={{ margin: '0 0 12px', color: '#6c757d', fontSize: '14px' }}>
                          {category.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#6c757d' }}>
                        <span>📦 {category.module_count} modules</span>
                        <span>🔢 Sort: {category.sort_order}</span>
                        {category.requires_expiry_tracking && <span>⏰ Expiry tracking</span>}
                        {category.requires_serial_tracking && <span>🔢 Serial tracking</span>}
                        {category.requires_variants && <span>🎨 Variants</span>}
                        {category.requires_warranty && <span>🛡️ Warranty</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={() => handleToggleActive(category)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        background: category.is_active ? '#f8f9fa' : '#27ae60',
                        color: category.is_active ? '#6c757d' : 'white',
                        border: '1px solid #ddd',
                      }}
                    >
                      {category.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      onClick={() => handleEdit(category)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(category)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        background: '#e74c3c',
                        color: 'white',
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <BusinessCategoryForm
          category={selectedCategory}
          onClose={() => {
            setShowForm(false)
            setSelectedCategory(null)
          }}
          onSave={(categoryData) => {
            saveMutation.mutate(categoryData)
          }}
        />
      )}
    </div>
  )
}


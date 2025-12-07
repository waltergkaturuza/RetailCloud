import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import AdvancedSearch from '../components/AdvancedSearch'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import CategorySpecificFields from '../components/CategorySpecificFields'
import { usePermissions } from '../hooks/usePermissions'
import toast from 'react-hot-toast'

interface Product {
  id: number
  name: string
  sku: string
  barcode: string
  rfid_tag?: string
  description?: string
  selling_price: string
  cost_price: string
  discount_price?: string
  category?: number
  category_name?: string
  track_inventory: boolean
  reorder_level?: number
  reorder_quantity?: number
  unit?: string
  weight?: string
  is_active: boolean
  is_taxable?: boolean
  allow_negative_stock?: boolean
  image?: string
}

interface Category {
  id: number
  name: string
  code?: string
}

export default function Products() {
  const { can } = usePermissions()
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ['products', searchQuery, filters],
    queryFn: async () => {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (filters.category) params.category = filters.category;
      if (filters.is_active !== undefined) params.is_active = filters.is_active === 'true';
      if (filters.track_inventory !== undefined) params.track_inventory = filters.track_inventory === 'true';
      
      const response = await api.get('/inventory/products/', { params })
      return response.data
    }
  })

  const products = productsResponse?.results || productsResponse || []

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/inventory/categories/', { params: { is_active: true } })
      return response.data
    }
  })

  const categories = categoriesResponse?.results || categoriesResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/inventory/products/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete product')
    }
  })

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setShowForm(true)
  }

  const handleDelete = (product: Product) => {
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(product.id)
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Product Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage your product catalog and inventory ({products.length} products)
          </p>
        </div>
        {can('canCreateProducts') && (
          <Button
            onClick={() => {
              setSelectedProduct(null)
              setShowForm(true)
            }}
          >
            + Add Product
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="mb-3">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Quick Search
            </label>
            <input
              type="text"
              placeholder="Search by name, SKU, barcode, or RFID..."
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
              name: 'category', 
              label: 'Category', 
              type: 'select', 
              options: categories.map((cat: Category) => ({ value: cat.id.toString(), label: cat.name }))
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
            { 
              name: 'track_inventory', 
              label: 'Track Inventory', 
              type: 'select', 
              options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]
            },
          ]}
          onSearch={(newFilters) => setFilters(newFilters)}
          onReset={() => setFilters({})}
        />
      </Card>

      {showForm && (
        <ProductForm
          product={selectedProduct}
          categories={categories}
          onClose={() => {
            setShowForm(false)
            setSelectedProduct(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedProduct(null)
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success(selectedProduct ? 'Product updated successfully' : 'Product created successfully')
          }}
        />
      )}

      {error && (
        <Card>
          <div style={{ padding: '20px', background: '#fee', color: '#c33', borderRadius: '6px' }}>
            Error loading products: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading products...</p>
          </div>
        </Card>
      ) : products && products.length > 0 ? (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Barcode</th>
                  <th className="table-header">RFID Tag</th>
                  <th className="table-header">Category</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Selling Price</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Cost Price</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: Product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{product.name}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d', fontFamily: 'monospace' }}>{product.sku}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d', fontFamily: 'monospace' }}>{product.barcode || '—'}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d', fontFamily: 'monospace', fontSize: '12px' }}>
                      {product.rfid_tag ? (product.rfid_tag.length > 16 ? `${product.rfid_tag.substring(0, 16)}...` : product.rfid_tag) : '—'}
                    </td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{product.category_name || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#27ae60' }}>
                      ${parseFloat(product.selling_price || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d' }}>
                      ${parseFloat(product.cost_price || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: product.is_active ? '#d4edda' : '#f8d7da',
                        color: product.is_active ? '#155724' : '#721c24'
                      }}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                        {can('canEditProducts') && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </Button>
                        )}
                        {can('canDeleteProducts') && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(product)}
                            isLoading={deleteMutation.isPending && deleteMutation.variables === product.id}
                          >
                            Delete
                          </Button>
                        )}
                        {!can('canEditProducts') && !can('canDeleteProducts') && (
                          <span style={{ color: '#7f8c8d', fontSize: '13px' }}>View Only</span>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Products Found</h3>
            <p style={{ marginBottom: '20px' }}>Start by adding your first product to the inventory</p>
            <Button onClick={() => {
              setSelectedProduct(null)
              setShowForm(true)
            }}>
              Add Your First Product
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ProductForm({ product, categories, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    rfid_tag: product?.rfid_tag || '',
    description: product?.description || '',
    category: product?.category || '',
    selling_price: product?.selling_price || '',
    cost_price: product?.cost_price || '0',
    discount_price: product?.discount_price || '',
    track_inventory: product?.track_inventory !== undefined ? product.track_inventory : true,
    reorder_level: product?.reorder_level || 10,
    reorder_quantity: product?.reorder_quantity || 50,
    unit: product?.unit || 'piece',
    weight: product?.weight || '',
    is_active: product?.is_active !== undefined ? product.is_active : true,
    is_taxable: product?.is_taxable !== undefined ? product.is_taxable : true,
    allow_negative_stock: product?.allow_negative_stock || false,
    custom_fields: product?.custom_fields || {}, // Category-specific fields
  })

  const [formErrors, setFormErrors] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true)
      try {
        // Separate custom_fields from main product data
        const custom_fields = data.custom_fields || {}
        const cleanedData: any = { ...data }
        delete cleanedData.custom_fields
        
        // Clean up data - remove empty strings for optional fields
        if (!cleanedData.category) delete cleanedData.category
        if (!cleanedData.barcode) cleanedData.barcode = ''
        if (!cleanedData.discount_price) cleanedData.discount_price = null
        if (!cleanedData.weight) cleanedData.weight = null
        
        // Add custom_fields to the request
        cleanedData.custom_fields = custom_fields
        
        if (product) {
          return await api.patch(`/inventory/products/${product.id}/`, cleanedData)
        } else {
          return await api.post('/inventory/products/', cleanedData)
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
        toast.error('Failed to save product. Please check the form for errors.')
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    
    // Basic validation
    if (!formData.name.trim()) {
      setFormErrors({ name: ['This field is required.'] })
      return
    }
    if (!formData.sku.trim()) {
      setFormErrors({ sku: ['This field is required.'] })
      return
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      setFormErrors({ selling_price: ['Selling price must be greater than 0.'] })
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>{product ? 'Edit Product' : 'Add New Product'}</h2>
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
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Product Name <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
              />
              {formErrors.name && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                SKU <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                required
                className="input"
                style={{ width: '100%', fontFamily: 'monospace' }}
                placeholder="PROD-001"
              />
              {formErrors.sku && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.sku) ? formErrors.sku[0] : formErrors.sku}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Barcode
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                className="input"
                style={{ width: '100%', fontFamily: 'monospace' }}
                placeholder="Optional"
              />
              {formErrors.barcode && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.barcode) ? formErrors.barcode[0] : formErrors.barcode}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                RFID Tag
              </label>
              <input
                type="text"
                value={formData.rfid_tag}
                onChange={(e) => handleChange('rfid_tag', e.target.value)}
                className="input"
                style={{ width: '100%', fontFamily: 'monospace' }}
                placeholder="RFID tag identifier (optional)"
              />
              {formErrors.rfid_tag && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.rfid_tag) ? formErrors.rfid_tag[0] : formErrors.rfid_tag}
              </span>}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Category
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => handleChange('category', e.target.value || null)}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="">No Category</option>
                {categories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="input"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                placeholder="Product description..."
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ecf0f1', paddingTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Pricing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Selling Price <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7f8c8d' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.selling_price}
                    onChange={(e) => handleChange('selling_price', e.target.value)}
                    required
                    className="input"
                    style={{ width: '100%', paddingLeft: '28px' }}
                  />
                </div>
                {formErrors.selling_price && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {Array.isArray(formErrors.selling_price) ? formErrors.selling_price[0] : formErrors.selling_price}
                </span>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Cost Price
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7f8c8d' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => handleChange('cost_price', e.target.value)}
                    className="input"
                    style={{ width: '100%', paddingLeft: '28px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Discount Price
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7f8c8d' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_price}
                    onChange={(e) => handleChange('discount_price', e.target.value || null)}
                    className="input"
                    style={{ width: '100%', paddingLeft: '28px' }}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ecf0f1', paddingTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Inventory Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.track_inventory}
                    onChange={(e) => handleChange('track_inventory', e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Track Inventory</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_taxable}
                    onChange={(e) => handleChange('is_taxable', e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Taxable</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.allow_negative_stock}
                    onChange={(e) => handleChange('allow_negative_stock', e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Allow Negative Stock</span>
                </label>
              </div>

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

            {formData.track_inventory && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => handleChange('reorder_level', parseInt(e.target.value) || 0)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_quantity}
                    onChange={(e) => handleChange('reorder_quantity', parseInt(e.target.value) || 0)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">Kilogram</option>
                    <option value="g">Gram</option>
                    <option value="l">Liter</option>
                    <option value="ml">Milliliter</option>
                    <option value="m">Meter</option>
                    <option value="cm">Centimeter</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Category-Specific Fields */}
          <CategorySpecificFields
            formData={formData.custom_fields || {}}
            onChange={(fieldKey, value) => {
              setFormData(prev => ({
                ...prev,
                custom_fields: {
                  ...(prev.custom_fields || {}),
                  [fieldKey]: value
                }
              }))
            }}
            errors={formErrors.custom_fields || {}}
          />

          <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

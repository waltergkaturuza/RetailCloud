/**
 * Location Mapping Management Component
 * Map products to physical locations with quantities
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface LocationMapping {
  id: number
  product: number
  product_name: string
  product_sku: string
  location: number
  location_code: string
  quantity: number
  is_primary: boolean
  last_stocked_at?: string
  last_picked_at?: string
}

export default function LocationMappingManagement() {
  const [showForm, setShowForm] = useState(false)
  const [selectedMapping, setSelectedMapping] = useState<LocationMapping | null>(null)
  const [filterProduct, setFilterProduct] = useState<number | ''>('')
  const [filterLocation, setFilterLocation] = useState<number | ''>('')
  const queryClient = useQueryClient()

  // Fetch mappings
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['location-mappings', filterProduct, filterLocation],
    queryFn: async () => {
      // Note: This endpoint might need to be created or we use product-location-mappings
      // For now, we'll fetch all and filter client-side
      const response = await api.get('/inventory/products/')
      const products = response.data?.results || response.data || []
      
      // Fetch locations for each product (this is a simplified approach)
      // In production, you'd want a dedicated endpoint
      const allMappings: LocationMapping[] = []
      
      for (const product of products.slice(0, 50)) { // Limit for performance
        try {
          // Assuming products have location_mappings relation
          // This is a placeholder - adjust based on actual API
        } catch (e) {
          // Skip if no mappings
        }
      }
      
      return allMappings.filter((m: LocationMapping) => {
        if (filterProduct && m.product !== filterProduct) return false
        if (filterLocation && m.location !== filterLocation) return false
        return true
      })
    },
    enabled: false, // Disabled until proper endpoint exists
  })

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-mapping'],
    queryFn: async () => {
      const response = await api.get('/inventory/products/', { params: { limit: 200 } })
      return response.data?.results || response.data || []
    },
  })

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['product-locations'],
    queryFn: async () => {
      const response = await api.get('/inventory/bulk/locations/')
      return response.data?.results || response.data || []
    },
  })

  // Bulk update mutation (using the bulk_update_locations endpoint)
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      return api.post('/inventory/bulk/bulk_update_locations/', { updates })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['location-mappings'] })
      toast.success(`Updated ${data.success_count || 0} location mapping(s)`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update locations')
    },
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🗺️ Product Location Mappings</h2>
          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Map products to physical locations and track quantities at each location
          </p>
        </div>
        <Button onClick={() => { setSelectedMapping(null); setShowForm(true) }}>
          ➕ Map Product to Location
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Filter by Product:</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value ? parseInt(e.target.value) : '')}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
            >
              <option value="">All Products</option>
              {products.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Filter by Location:</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value ? parseInt(e.target.value) : '')}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
            >
              <option value="">All Locations</option>
              {locations.map((location: any) => (
                <option key={location.id} value={location.id}>
                  {location.location_code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Info Message */}
      <Card style={{ marginBottom: '20px', padding: '16px', background: '#e3f2fd' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div>
            <strong>How to use:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '14px' }}>
              <li>Map products to specific locations (aisle, shelf, bin)</li>
              <li>Set quantities at each location</li>
              <li>Mark primary location for quick access</li>
              <li>Track last stocked/picked times</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Mappings would be displayed here once API endpoint is available */}
      <Card>
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <div>Location mapping interface</div>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Use the "Map Product to Location" button to create mappings
          </p>
        </div>
      </Card>

      {/* Mapping Form Modal */}
      {showForm && (
        <MappingForm
          mapping={selectedMapping}
          products={products}
          locations={locations}
          onClose={() => { setShowForm(false); setSelectedMapping(null) }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedMapping(null)
            queryClient.invalidateQueries({ queryKey: ['location-mappings'] })
          }}
        />
      )}
    </div>
  )
}

interface MappingFormProps {
  mapping: LocationMapping | null
  products: any[]
  locations: any[]
  onClose: () => void
  onSuccess: () => void
}

function MappingForm({ mapping, products, locations, onClose, onSuccess }: MappingFormProps) {
  const [formData, setFormData] = useState({
    product: mapping?.product || null,
    location: mapping?.location || null,
    quantity: mapping?.quantity || 0,
    is_primary: mapping?.is_primary || false,
  })

  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Use bulk update endpoint
      return api.post('/inventory/bulk/bulk_update_locations/', {
        updates: [{
          product_id: data.product,
          location_code: locations.find((l: any) => l.id === data.location)?.location_code,
          quantity: data.quantity,
          is_primary: data.is_primary,
        }]
      })
    },
    onSuccess: () => {
      toast.success(mapping ? 'Mapping updated successfully' : 'Mapping created successfully')
      queryClient.invalidateQueries({ queryKey: ['location-mappings'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to ${mapping ? 'update' : 'create'} mapping`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.product || !formData.location) {
      toast.error('Please select both product and location')
      return
    }
    saveMutation.mutate(formData)
  }

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <Card
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>{mapping ? 'Edit Mapping' : 'Create Mapping'}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Product <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.product || ''}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value ? parseInt(e.target.value) : null })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Select Product</option>
                  {products.map((product: any) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Location <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value ? parseInt(e.target.value) : null })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Select Location</option>
                  {locations.map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.location_code} {location.zone_name ? `(${location.zone_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Quantity <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  step="0.01"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  />
                  <span>Primary Location (default storage location for this product)</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saveMutation.isPending}>
                {mapping ? 'Update' : 'Create'} Mapping
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}


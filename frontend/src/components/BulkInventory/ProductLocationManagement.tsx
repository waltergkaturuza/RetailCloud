/**
 * Product Location Management Component
 * CRUD interface for managing product locations (aisle, shelf, bin)
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface ProductLocation {
  id: number
  location_code: string
  zone?: number
  zone_name?: string
  zone_code?: string
  aisle: string
  shelf: string
  bin: string
  row: string
  level: string
  capacity?: number
  dimensions?: any
  is_active: boolean
  notes: string
  branch?: number
}

export default function ProductLocationManagement() {
  const [showForm, setShowForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | null>(null)
  const [filterZone, setFilterZone] = useState<number | ''>('')
  const queryClient = useQueryClient()

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['product-locations', filterZone],
    queryFn: async () => {
      const params: any = {}
      if (filterZone) params.zone_id = filterZone
      const response = await api.get('/inventory/bulk/locations/', { params })
      return response.data?.results || response.data || []
    },
  })

  // Fetch zones
  const { data: zones = [] } = useQuery({
    queryKey: ['warehouse-zones'],
    queryFn: async () => {
      const response = await api.get('/inventory/bulk/zones/')
      return response.data?.results || response.data || []
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/inventory/bulk/locations/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-locations'] })
      toast.success('Location deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete location')
    },
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📍 Product Locations</h2>
          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Manage physical locations (aisle, shelf, bin) for products
          </p>
        </div>
        <Button onClick={() => { setSelectedLocation(null); setShowForm(true) }}>
          ➕ Add Location
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ fontWeight: '600' }}>Filter by Zone:</label>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value ? parseInt(e.target.value) : '')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', minWidth: '200px' }}
          >
            <option value="">All Zones</option>
            {zones.map((zone: any) => (
              <option key={zone.id} value={zone.id}>
                {zone.code}: {zone.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Locations List */}
      {isLoading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading locations...</div>
        </Card>
      ) : locations.length === 0 ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
            <div>No locations configured</div>
            <Button onClick={() => { setSelectedLocation(null); setShowForm(true) }} style={{ marginTop: '16px' }}>
              Create First Location
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Location Code</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Zone</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Aisle</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Shelf</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Bin</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Capacity</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location: ProductLocation) => (
                  <tr key={location.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600' }}>
                      {location.location_code}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {location.zone_name ? `${location.zone_code}: ${location.zone_name}` : '-'}
                    </td>
                    <td style={{ padding: '12px' }}>{location.aisle || '-'}</td>
                    <td style={{ padding: '12px' }}>{location.shelf || '-'}</td>
                    <td style={{ padding: '12px' }}>{location.bin || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {location.capacity ? location.capacity.toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: location.is_active ? '#d4edda' : '#f8d7da',
                        color: location.is_active ? '#155724' : '#721c24'
                      }}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => { setSelectedLocation(location); setShowForm(true) }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete location "${location.location_code}"?`)) {
                              deleteMutation.mutate(location.id)
                            }
                          }}
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
        </Card>
      )}

      {/* Location Form Modal */}
      {showForm && (
        <LocationForm
          location={selectedLocation}
          zones={zones}
          onClose={() => { setShowForm(false); setSelectedLocation(null) }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedLocation(null)
            queryClient.invalidateQueries({ queryKey: ['product-locations'] })
          }}
        />
      )}
    </div>
  )
}

interface LocationFormProps {
  location: ProductLocation | null
  zones: any[]
  onClose: () => void
  onSuccess: () => void
}

function LocationForm({ location, zones, onClose, onSuccess }: LocationFormProps) {
  const [formData, setFormData] = useState({
    location_code: location?.location_code || '',
    zone: location?.zone || null,
    aisle: location?.aisle || '',
    shelf: location?.shelf || '',
    bin: location?.bin || '',
    row: location?.row || '',
    level: location?.level || '',
    capacity: location?.capacity || null,
    is_active: location?.is_active ?? true,
    notes: location?.notes || '',
  })

  const queryClient = useQueryClient()

  // Auto-generate location code from components
  const generateLocationCode = () => {
    const parts = []
    if (formData.zone) {
      const zoneCode = zones.find((z: any) => z.id === formData.zone)?.code || ''
      if (zoneCode) parts.push(zoneCode)
    }
    if (formData.aisle) parts.push(formData.aisle)
    if (formData.shelf) parts.push(formData.shelf)
    if (formData.bin) parts.push(formData.bin)
    return parts.join('-') || formData.location_code
  }

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Auto-generate location code if not provided
      if (!data.location_code && (data.aisle || data.shelf || data.bin)) {
        data.location_code = generateLocationCode()
      }
      
      if (location) {
        return api.patch(`/inventory/bulk/locations/${location.id}/`, data)
      } else {
        return api.post('/inventory/bulk/locations/', data)
      }
    },
    onSuccess: () => {
      toast.success(location ? 'Location updated successfully' : 'Location created successfully')
      queryClient.invalidateQueries({ queryKey: ['product-locations'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || `Failed to ${location ? 'update' : 'create'} location`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.location_code && !formData.aisle && !formData.shelf && !formData.bin) {
      toast.error('Please provide either location code or at least one component (aisle, shelf, bin)')
      return
    }
    
    const submitData = {
      ...formData,
      zone: formData.zone || null,
      capacity: formData.capacity || null,
    }
    saveMutation.mutate(submitData)
  }

  // Update location code when components change
  const updateComponent = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    // Auto-generate code if manual code is empty
    if (!formData.location_code) {
      setTimeout(() => {
        const newCode = generateLocationCode()
        if (newCode) {
          setFormData(prev => ({ ...prev, location_code: newCode }))
        }
      }, 100)
    }
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
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>{location ? 'Edit Location' : 'Create Location'}</h3>
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
                  Location Code <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.location_code}
                  onChange={(e) => setFormData({ ...formData, location_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., A-3-2-5 (auto-generated from components below)"
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'monospace' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                  Or fill components below to auto-generate
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Zone (Optional)
                </label>
                <select
                  value={formData.zone || ''}
                  onChange={(e) => updateComponent('zone', e.target.value ? parseInt(e.target.value).toString() : '')}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">No Zone</option>
                  {zones.map((zone: any) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.code}: {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Aisle
                  </label>
                  <input
                    type="text"
                    value={formData.aisle}
                    onChange={(e) => updateComponent('aisle', e.target.value)}
                    placeholder="Aisle number"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Shelf
                  </label>
                  <input
                    type="text"
                    value={formData.shelf}
                    onChange={(e) => updateComponent('shelf', e.target.value)}
                    placeholder="Shelf number"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Bin
                  </label>
                  <input
                    type="text"
                    value={formData.bin}
                    onChange={(e) => updateComponent('bin', e.target.value)}
                    placeholder="Bin number"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Row
                  </label>
                  <input
                    type="text"
                    value={formData.row}
                    onChange={(e) => setFormData({ ...formData, row: e.target.value })}
                    placeholder="Row number"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Level
                  </label>
                  <input
                    type="text"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="Level/Floor"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Capacity (Optional)
                </label>
                <input
                  type="number"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Maximum quantity"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saveMutation.isPending}>
                {location ? 'Update' : 'Create'} Location
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}



/**
 * Warehouse Management Component
 * Comprehensive warehouse and location management interface
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface Warehouse {
  id: number
  name: string
  code: string
  warehouse_type: string
  branch_name?: string
  is_active: boolean
  capacity_units?: number
}

interface WarehouseLocation {
  id: number
  location_code: string
  aisle?: string
  shelf?: string
  bin?: string
  zone?: string
  location_type: string
  max_capacity?: number
  current_capacity: number
  is_active: boolean
  warehouse_name?: string
}

export default function WarehouseManagement() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null)
  const [showWarehouseForm, setShowWarehouseForm] = useState(false)
  const [showLocationForm, setShowLocationForm] = useState(false)
  const queryClient = useQueryClient()

  // Fetch warehouses
  const { data: warehouses, isLoading: warehousesLoading } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.get('/inventory/warehouses/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch locations for selected warehouse
  const { data: locations, isLoading: locationsLoading } = useQuery<WarehouseLocation[]>({
    queryKey: ['warehouse-locations', selectedWarehouse],
    queryFn: async () => {
      if (!selectedWarehouse) return []
      const response = await api.get(`/inventory/warehouse-locations/?warehouse=${selectedWarehouse}`)
      return response.data?.results || response.data || []
    },
    enabled: !!selectedWarehouse,
  })

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: async (data: Partial<Warehouse>) => {
      return api.post('/inventory/warehouses/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Warehouse created successfully')
      setShowWarehouseForm(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create warehouse')
    },
  })

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: Partial<WarehouseLocation>) => {
      return api.post('/inventory/warehouse-locations/', {
        ...data,
        warehouse: selectedWarehouse,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-locations'] })
      toast.success('Location created successfully')
      setShowLocationForm(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create location')
    },
  })

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Warehouse Management</h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Manage warehouses and storage locations
          </p>
        </div>
        <Button onClick={() => setShowWarehouseForm(true)}>+ Add Warehouse</Button>
      </div>

      {/* Warehouse List */}
      <Card style={{ marginBottom: '24px' }}>
        <h2 style={{ marginTop: 0 }}>Warehouses</h2>
        {warehousesLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading warehouses...</p>
          </div>
        ) : warehouses && warehouses.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                onClick={() => setSelectedWarehouse(warehouse.id)}
                style={{
                  padding: '16px',
                  border: selectedWarehouse === warehouse.id ? '2px solid #667eea' : '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedWarehouse === warehouse.id ? '#f0f4ff' : 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{warehouse.name}</h3>
                    <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '12px' }}>{warehouse.code}</p>
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: warehouse.is_active ? '#d4edda' : '#f8d7da',
                      color: warehouse.is_active ? '#155724' : '#721c24',
                    }}
                  >
                    {warehouse.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Type: {warehouse.warehouse_type.replace('_', ' ').toUpperCase()}
                  {warehouse.branch_name && (
                    <>
                      <br />
                      Branch: {warehouse.branch_name}
                    </>
                  )}
                  {warehouse.capacity_units && (
                    <>
                      <br />
                      Capacity: {warehouse.capacity_units.toLocaleString()} units
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            No warehouses found. Create your first warehouse to get started.
          </div>
        )}
      </Card>

      {/* Locations for Selected Warehouse */}
      {selectedWarehouse && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>
              Locations: {warehouses?.find((w) => w.id === selectedWarehouse)?.name}
            </h2>
            <Button onClick={() => setShowLocationForm(true)}>+ Add Location</Button>
          </div>

          {locationsLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="spinner" />
            </div>
          ) : locations && locations.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Location Code</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Aisle-Shelf-Bin</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Zone</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Capacity</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Usage</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => {
                    const usagePercent = location.max_capacity
                      ? (location.current_capacity / location.max_capacity) * 100
                      : null
                    return (
                      <tr key={location.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{location.location_code}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
                          {[location.aisle, location.shelf, location.bin].filter(Boolean).join('-') || '—'}
                        </td>
                        <td style={{ padding: '12px' }}>{location.zone || '—'}</td>
                        <td style={{ padding: '12px' }}>{location.location_type.replace('_', ' ')}</td>
                        <td style={{ padding: '12px' }}>
                          {location.max_capacity ? `${location.current_capacity} / ${location.max_capacity}` : location.current_capacity}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {usagePercent !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  flex: 1,
                                  height: '8px',
                                  background: '#e9ecef',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(usagePercent, 100)}%`,
                                    height: '100%',
                                    background: usagePercent > 90 ? '#dc3545' : usagePercent > 70 ? '#ffc107' : '#28a745',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', minWidth: '40px' }}>{usagePercent.toFixed(0)}%</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              background: location.is_active ? '#d4edda' : '#f8d7da',
                              color: location.is_active ? '#155724' : '#721c24',
                            }}
                          >
                            {location.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
              No locations found. Add locations to organize your warehouse.
            </div>
          )}
        </Card>
      )}

      {/* Warehouse Form Modal */}
      {showWarehouseForm && (
        <WarehouseForm
          onClose={() => setShowWarehouseForm(false)}
          onSubmit={(data) => createWarehouseMutation.mutate(data)}
          isLoading={createWarehouseMutation.isPending}
        />
      )}

      {/* Location Form Modal */}
      {showLocationForm && selectedWarehouse && (
        <LocationForm
          warehouseId={selectedWarehouse}
          onClose={() => setShowLocationForm(false)}
          onSubmit={(data) => createLocationMutation.mutate(data)}
          isLoading={createLocationMutation.isPending}
        />
      )}
    </div>
  )
}

function WarehouseForm({ onClose, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    warehouse_type: 'main',
    address: '',
    city: '',
    is_active: true,
  })

  return (
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
      }}
      onClick={onClose}
    >
      <Card
        style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e: any) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Create Warehouse</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(formData)
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Name <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Code <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Type</label>
            <select
              className="input"
              value={formData.warehouse_type}
              onChange={(e) => setFormData({ ...formData, warehouse_type: e.target.value })}
            >
              <option value="main">Main Warehouse</option>
              <option value="distribution">Distribution Center</option>
              <option value="transit">Transit Warehouse</option>
              <option value="store">Store Warehouse</option>
              <option value="virtual">Virtual Warehouse</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Warehouse'}
            </Button>
            <Button type="button" onClick={onClose} style={{ background: '#6c757d' }}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function LocationForm({ warehouseId, onClose, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    location_code: '',
    aisle: '',
    shelf: '',
    bin: '',
    zone: '',
    location_type: 'storage',
    max_capacity: '',
  })

  return (
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
      }}
      onClick={onClose}
    >
      <Card
        style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e: any) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Create Location</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({
              ...formData,
              max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
            })
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Location Code <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              value={formData.location_code}
              onChange={(e) => setFormData({ ...formData, location_code: e.target.value.toUpperCase() })}
              placeholder="e.g., A-01-S-02-B-03"
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Aisle</label>
              <input
                type="text"
                className="input"
                value={formData.aisle}
                onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Shelf</label>
              <input
                type="text"
                className="input"
                value={formData.shelf}
                onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Bin</label>
              <input
                type="text"
                className="input"
                value={formData.bin}
                onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Zone</label>
            <input
              type="text"
              className="input"
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              placeholder="Receiving, Picking, Storage, etc."
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Location Type</label>
            <select
              className="input"
              value={formData.location_type}
              onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
            >
              <option value="receiving">Receiving</option>
              <option value="picking">Picking</option>
              <option value="storage">Storage</option>
              <option value="quarantine">Quarantine</option>
              <option value="damaged">Damaged Goods</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Max Capacity</label>
            <input
              type="number"
              className="input"
              value={formData.max_capacity}
              onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Location'}
            </Button>
            <Button type="button" onClick={onClose} style={{ background: '#6c757d' }}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}



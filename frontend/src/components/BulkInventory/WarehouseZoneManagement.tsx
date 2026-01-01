/**
 * Warehouse Zone Management Component
 * CRUD interface for managing warehouse zones
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface WarehouseZone {
  id: number
  name: string
  code: string
  description: string
  zone_type: string
  is_active: boolean
  sort_order: number
  branch?: number
}

export default function WarehouseZoneManagement() {
  const [showForm, setShowForm] = useState(false)
  const [selectedZone, setSelectedZone] = useState<WarehouseZone | null>(null)
  const queryClient = useQueryClient()

  // Fetch zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['warehouse-zones'],
    queryFn: async () => {
      const response = await api.get('/inventory/bulk/zones/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/core/branches/')
      return response.data?.results || response.data || []
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/inventory/bulk/zones/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-zones'] })
      toast.success('Zone deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete zone')
    },
  })

  const zoneTypes = [
    { value: 'standard', label: 'Standard' },
    { value: 'refrigerated', label: 'Refrigerated' },
    { value: 'frozen', label: 'Frozen' },
    { value: 'hazardous', label: 'Hazardous' },
    { value: 'bulk', label: 'Bulk Storage' },
    { value: 'quarantine', label: 'Quarantine' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🏢 Warehouse Zones</h2>
          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Organize your warehouse into zones (e.g., A, B, C, Freezer, Refrigerated)
          </p>
        </div>
        <Button onClick={() => { setSelectedZone(null); setShowForm(true) }}>
          ➕ Add Zone
        </Button>
      </div>

      {/* Zones List */}
      {isLoading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading zones...</div>
        </Card>
      ) : zones.length === 0 ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <div>No zones configured</div>
            <Button onClick={() => { setSelectedZone(null); setShowForm(true) }} style={{ marginTop: '16px' }}>
              Create First Zone
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Code</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Branch</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Sort Order</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone: WarehouseZone) => (
                  <tr key={zone.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600' }}>
                      {zone.code}
                    </td>
                    <td style={{ padding: '12px' }}>{zone.name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: zone.zone_type === 'frozen' ? '#e3f2fd' : zone.zone_type === 'refrigerated' ? '#e8f5e9' : '#f5f5f5',
                        color: '#333'
                      }}>
                        {zoneTypes.find(t => t.value === zone.zone_type)?.label || zone.zone_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {zone.branch ? branches.find((b: any) => b.id === zone.branch)?.name || 'N/A' : 'All Branches'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{zone.sort_order}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: zone.is_active ? '#d4edda' : '#f8d7da',
                        color: zone.is_active ? '#155724' : '#721c24'
                      }}>
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => { setSelectedZone(zone); setShowForm(true) }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete zone "${zone.name}"?`)) {
                              deleteMutation.mutate(zone.id)
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

      {/* Zone Form Modal */}
      {showForm && (
        <ZoneForm
          zone={selectedZone}
          branches={branches}
          zoneTypes={zoneTypes}
          onClose={() => { setShowForm(false); setSelectedZone(null) }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedZone(null)
            queryClient.invalidateQueries({ queryKey: ['warehouse-zones'] })
          }}
        />
      )}
    </div>
  )
}

interface ZoneFormProps {
  zone: WarehouseZone | null
  branches: any[]
  zoneTypes: { value: string; label: string }[]
  onClose: () => void
  onSuccess: () => void
}

function ZoneForm({ zone, branches, zoneTypes, onClose, onSuccess }: ZoneFormProps) {
  const [formData, setFormData] = useState({
    name: zone?.name || '',
    code: zone?.code || '',
    description: zone?.description || '',
    zone_type: zone?.zone_type || 'standard',
    is_active: zone?.is_active ?? true,
    sort_order: zone?.sort_order || 0,
    branch: zone?.branch || null,
  })

  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (zone) {
        return api.patch(`/inventory/bulk/zones/${zone.id}/`, data)
      } else {
        return api.post('/inventory/bulk/zones/', data)
      }
    },
    onSuccess: () => {
      toast.success(zone ? 'Zone updated successfully' : 'Zone created successfully')
      queryClient.invalidateQueries({ queryKey: ['warehouse-zones'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || `Failed to ${zone ? 'update' : 'create'} zone`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      branch: formData.branch || null,
    }
    saveMutation.mutate(submitData)
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
            <h3 style={{ margin: 0 }}>{zone ? 'Edit Zone' : 'Create Zone'}</h3>
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
                  Code <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., A, B, FREEZER"
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Name <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Zone A, Freezer Section"
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Zone Type
                </label>
                <select
                  value={formData.zone_type}
                  onChange={(e) => setFormData({ ...formData, zone_type: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  {zoneTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Branch (Optional)
                </label>
                <select
                  value={formData.branch || ''}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value ? parseInt(e.target.value) : null })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Zone description..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saveMutation.isPending}>
                {zone ? 'Update' : 'Create'} Zone
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}


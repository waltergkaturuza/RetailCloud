/**
 * IP Whitelist/Blacklist Management Component
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from './ui/Card'
import Button from './ui/Button'
import toast from 'react-hot-toast'

interface IPRule {
  id: number
  ip_address: string
  ip_range: string
  is_whitelist: boolean
  description: string
  is_active: boolean
  created_at: string
  created_by_email: string
}

export default function IPWhitelistManagement() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<IPRule | null>(null)
  const [formData, setFormData] = useState({
    ip_address: '',
    ip_range: '',
    is_whitelist: true,
    description: '',
    is_active: true,
  })

  // Fetch IP rules
  const { data: rulesData, isLoading } = useQuery<IPRule[]>({
    queryKey: ['ip-whitelist'],
    queryFn: async () => {
      const response = await api.get('/accounts/security/ip-whitelist/')
      return response.data?.results || response.data || []
    },
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<IPRule>) => {
      if (editingRule) {
        return await api.patch(`/accounts/security/ip-whitelist/${editingRule.id}/`, data)
      } else {
        return await api.post('/accounts/security/ip-whitelist/', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] })
      toast.success(editingRule ? 'IP rule updated successfully' : 'IP rule created successfully')
      setShowForm(false)
      setEditingRule(null)
      setFormData({
        ip_address: '',
        ip_range: '',
        is_whitelist: true,
        description: '',
        is_active: true,
      })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save IP rule')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/accounts/security/ip-whitelist/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] })
      toast.success('IP rule deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete IP rule')
    },
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      return await api.patch(`/accounts/security/ip-whitelist/${id}/`, { is_active })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] })
      toast.success('IP rule status updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update IP rule')
    },
  })

  const rules = rulesData || []
  const whitelistRules = rules.filter(r => r.is_whitelist)
  const blacklistRules = rules.filter(r => !r.is_whitelist)

  const handleEdit = (rule: IPRule) => {
    setEditingRule(rule)
    setFormData({
      ip_address: rule.ip_address || '',
      ip_range: rule.ip_range || '',
      is_whitelist: rule.is_whitelist,
      description: rule.description || '',
      is_active: rule.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = (rule: IPRule) => {
    if (window.confirm(`Delete IP rule: ${rule.ip_address || rule.ip_range}?`)) {
      deleteMutation.mutate(rule.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ip_address && !formData.ip_range) {
      toast.error('Please provide either an IP address or IP range')
      return
    }
    saveMutation.mutate(formData)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRule(null)
    setFormData({
      ip_address: '',
      ip_range: '',
      is_whitelist: true,
      description: '',
      is_active: true,
    })
  }

  return (
    <Card title="IP Whitelist/Blacklist Management">
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 16px', color: '#7f8c8d', fontSize: '14px' }}>
          Control access to your account by IP address. Use whitelist to allow only specific IPs, 
          or blacklist to block specific IPs. IP ranges use CIDR notation (e.g., 192.168.1.0/24).
        </p>
        <Button onClick={() => setShowForm(true)}>
          + Add IP Rule
        </Button>
      </div>

      {showForm && (
        <Card title={editingRule ? 'Edit IP Rule' : 'Add IP Rule'} style={{ marginBottom: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Rule Type
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={formData.is_whitelist}
                      onChange={(e) => setFormData({ ...formData, is_whitelist: true })}
                    />
                    <span>Whitelist (Allow)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!formData.is_whitelist}
                      onChange={(e) => setFormData({ ...formData, is_whitelist: false })}
                    />
                    <span>Blacklist (Block)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                    IP Address (e.g., 192.168.1.100)
                  </label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value, ip_range: '' })}
                    placeholder="192.168.1.100"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                    IP Range (CIDR, e.g., 192.168.1.0/24)
                  </label>
                  <input
                    type="text"
                    value={formData.ip_range}
                    onChange={(e) => setFormData({ ...formData, ip_range: e.target.value, ip_address: '' })}
                    placeholder="192.168.1.0/24"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Office network, Home IP, etc."
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={saveMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} isLoading={saveMutation.isPending}>
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Whitelist Rules */}
      {whitelistRules.length > 0 && (
        <Card title={`Whitelist Rules (${whitelistRules.length})`} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {whitelistRules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  padding: '16px',
                  border: '1px solid #d4edda',
                  borderRadius: '8px',
                  background: rule.is_active ? '#d4edda' : '#f8f9fa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#155724' }}>
                      {rule.ip_address || rule.ip_range}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: rule.is_active ? '#28a745' : '#6c757d',
                        color: 'white',
                      }}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {rule.description && (
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                      {rule.description}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    Created by {rule.created_by_email} • {new Date(rule.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleActiveMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {rule.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(rule)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Blacklist Rules */}
      {blacklistRules.length > 0 && (
        <Card title={`Blacklist Rules (${blacklistRules.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {blacklistRules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  padding: '16px',
                  border: '1px solid #f8d7da',
                  borderRadius: '8px',
                  background: rule.is_active ? '#f8d7da' : '#f8f9fa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#721c24' }}>
                      {rule.ip_address || rule.ip_range}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: rule.is_active ? '#dc3545' : '#6c757d',
                        color: 'white',
                      }}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {rule.description && (
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                      {rule.description}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    Created by {rule.created_by_email} • {new Date(rule.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleActiveMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {rule.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(rule)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isLoading && rules.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No IP Rules Configured</h3>
          <p style={{ marginBottom: '24px' }}>
            Add IP whitelist or blacklist rules to control access to your account.
          </p>
        </div>
      )}
    </Card>
  )
}


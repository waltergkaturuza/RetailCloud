/**
 * System Announcements Management
 * Complete announcements system with scheduling, targeting, and preview
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import AnnouncementForm from '../../components/owner/AnnouncementForm'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface Announcement {
  id: number
  title: string
  message: string
  announcement_type: string
  target_tenant_count: number
  is_active: boolean
  scheduled_at: string | null
  expires_at: string | null
  created_by_name: string
  created_at: string
  updated_at: string
}

export default function Announcements() {
  const [showForm, setShowForm] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: announcementsResponse, isLoading } = useQuery({
    queryKey: ['system-announcements', searchQuery, filters],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (filters.announcement_type) params.announcement_type = filters.announcement_type
      if (filters.is_active !== undefined) params.is_active = filters.is_active === 'true'
      
      const response = await api.get('/owner/announcements/', { params })
      return response.data
    },
  })

  const announcements = announcementsResponse?.results || announcementsResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/owner/announcements/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] })
      toast.success('Announcement deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete announcement')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      return api.patch(`/owner/announcements/${id}/`, { is_active })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] })
      toast.success('Announcement status updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update announcement')
    },
  })

  const handleDelete = (announcement: Announcement) => {
    if (confirm(`Are you sure you want to delete "${announcement.title}"?\n\nThis action cannot be undone!`)) {
      deleteMutation.mutate(announcement.id)
    }
  }

  const handleToggleActive = (announcement: Announcement) => {
    toggleActiveMutation.mutate({
      id: announcement.id,
      is_active: !announcement.is_active,
    })
  }

  const getTypeInfo = (type: string) => {
    const types: Record<string, { icon: string; color: string; label: string }> = {
      info: { icon: 'ℹ️', color: '#3498db', label: 'Information' },
      warning: { icon: '⚠️', color: '#f39c12', label: 'Warning' },
      maintenance: { icon: '🔧', color: '#e67e22', label: 'Maintenance' },
      update: { icon: '🔄', color: '#16a085', label: 'Update' },
      important: { icon: '🚨', color: '#e74c3c', label: 'Important' },
    }
    return types[type] || { icon: '📋', color: '#7f8c8d', label: 'Unknown' }
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isScheduled = (scheduledAt: string | null) => {
    if (!scheduledAt) return false
    return new Date(scheduledAt) > new Date()
  }

  // Statistics
  const stats = useMemo(() => {
    const total = announcements.length
    const active = announcements.filter(a => a.is_active).length
    const expired = announcements.filter(a => isExpired(a.expires_at)).length
    const scheduled = announcements.filter(a => isScheduled(a.scheduled_at)).length
    return { total, active, expired, scheduled }
  }, [announcements])

  const announcementTypes = [
    { value: '', label: 'All Types' },
    { value: 'info', label: 'Information' },
    { value: 'warning', label: 'Warning' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'update', label: 'Update' },
    { value: 'important', label: 'Important' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            📢 System Announcements
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Send announcements to all or specific tenants
          </p>
        </div>
        <Button onClick={() => {
          setSelectedAnnouncement(null)
          setShowForm(true)
        }}>
          ➕ Create Announcement
        </Button>
      </div>

      {/* Statistics */}
      {announcements.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Announcements</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
              {stats.total}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Active</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60' }}>
              {stats.active}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Scheduled</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#3498db' }}>
              {stats.scheduled}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Expired</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#95a5a6' }}>
              {stats.expired}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr auto',
          gap: '16px',
          alignItems: 'end',
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Search Announcements
            </label>
            <input
              type="text"
              placeholder="Search by title or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Type
            </label>
            <select
              value={filters.announcement_type || ''}
              onChange={(e) => setFilters({ ...filters, announcement_type: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              {announcementTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Status
            </label>
            <select
              value={filters.is_active !== undefined ? String(filters.is_active) : ''}
              onChange={(e) => setFilters({
                ...filters,
                is_active: e.target.value === '' ? undefined : e.target.value === 'true'
              })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => setFilters({})}
            style={{ height: 'fit-content' }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Announcements List */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📢</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No announcements found</p>
            <p style={{ fontSize: '14px' }}>
              {searchQuery || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filters'
                : 'Create your first announcement to get started'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {announcements.map((announcement: Announcement) => {
              const typeInfo = getTypeInfo(announcement.announcement_type)
              const expired = isExpired(announcement.expires_at)
              const scheduled = isScheduled(announcement.scheduled_at)
              
              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '24px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    background: announcement.is_active ? '#fff' : '#f8f9fa',
                    opacity: expired ? 0.7 : 1,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '20px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: '24px' }}>{typeInfo.icon}</span>
                        <h3 style={{
                          margin: 0,
                          fontSize: '20px',
                          fontWeight: '600',
                          color: '#2c3e50',
                        }}>
                          {announcement.title}
                        </h3>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: typeInfo.color + '20',
                          color: typeInfo.color,
                        }}>
                          {typeInfo.label}
                        </span>
                        {announcement.is_active ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            background: '#27ae6020',
                            color: '#27ae60',
                          }}>
                            ✅ Active
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            background: '#95a5a620',
                            color: '#95a5a6',
                          }}>
                            ❌ Inactive
                          </span>
                        )}
                        {scheduled && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            background: '#3498db20',
                            color: '#3498db',
                          }}>
                            ⏰ Scheduled
                          </span>
                        )}
                        {expired && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            background: '#95a5a620',
                            color: '#95a5a6',
                          }}>
                            ⏱️ Expired
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#2c3e50',
                        lineHeight: '1.6',
                        marginBottom: '12px',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {announcement.message.length > 200
                          ? announcement.message.substring(0, 200) + '...'
                          : announcement.message}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '12px',
                        color: '#95a5a6',
                        flexWrap: 'wrap',
                      }}>
                        <span>
                          👥 {announcement.target_tenant_count} tenant{announcement.target_tenant_count !== 1 ? 's' : ''}
                        </span>
                        {announcement.scheduled_at && (
                          <span>
                            ⏰ Scheduled: {new Date(announcement.scheduled_at).toLocaleString()}
                          </span>
                        )}
                        {announcement.expires_at && (
                          <span>
                            ⏱️ Expires: {new Date(announcement.expires_at).toLocaleString()}
                          </span>
                        )}
                        <span>
                          📅 Created: {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                        <span>
                          👤 By: {announcement.created_by_name}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => {
                          // Fetch full details for editing
                          api.get(`/owner/announcements/${announcement.id}/`)
                            .then(response => {
                              setSelectedAnnouncement(response.data)
                              setShowForm(true)
                            })
                            .catch(() => {
                              toast.error('Failed to load announcement details')
                            })
                        }}
                        style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleToggleActive(announcement)}
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          whiteSpace: 'nowrap',
                          color: announcement.is_active ? '#e74c3c' : '#27ae60',
                          borderColor: announcement.is_active ? '#e74c3c' : '#27ae60',
                        }}
                      >
                        {announcement.is_active ? '❌ Deactivate' : '✅ Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleDelete(announcement)}
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          whiteSpace: 'nowrap',
                          color: '#e74c3c',
                          borderColor: '#e74c3c',
                        }}
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Announcement Form Modal */}
      {showForm && (
        <AnnouncementForm
          announcement={selectedAnnouncement || undefined}
          onClose={() => {
            setShowForm(false)
            setSelectedAnnouncement(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedAnnouncement(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Announcement Form Component
 * Full CRUD form for system announcements with rich text editor, scheduling, and targeting
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface Announcement {
  id?: number
  title: string
  message: string
  announcement_type: 'info' | 'warning' | 'maintenance' | 'update' | 'important'
  target_tenants: number[]
  is_active: boolean
  scheduled_at: string | null
  expires_at: string | null
}

interface AnnouncementFormProps {
  announcement?: any
  onClose: () => void
  onSuccess: () => void
}

const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: 'Information', icon: 'ℹ️', color: '#3498db' },
  { value: 'warning', label: 'Warning', icon: '⚠️', color: '#f39c12' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: '#e67e22' },
  { value: 'update', label: 'Update', icon: '🔄', color: '#16a085' },
  { value: 'important', label: 'Important', icon: '🚨', color: '#e74c3c' },
]

export default function AnnouncementForm({ announcement, onClose, onSuccess }: AnnouncementFormProps) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  
  const [formData, setFormData] = useState<Announcement>({
    title: announcement?.title || '',
    message: announcement?.message || '',
    announcement_type: announcement?.announcement_type || 'info',
    target_tenants: announcement?.target_tenants?.map((t: any) => typeof t === 'object' ? t.id : t) || [],
    is_active: announcement?.is_active ?? true,
    scheduled_at: announcement?.scheduled_at ? announcement.scheduled_at.split('T')[0] + 'T' + announcement.scheduled_at.split('T')[1].slice(0, 5) : '',
    expires_at: announcement?.expires_at ? announcement.expires_at.split('T')[0] + 'T' + announcement.expires_at.split('T')[1].slice(0, 5) : '',
  })

  // Fetch tenants for targeting
  const { data: tenantsResponse } = useQuery({
    queryKey: ['owner-tenants-for-announcement'],
    queryFn: async () => {
      const response = await api.get('/owner/tenants/', { params: { page_size: 1000 } })
      return response.data.results || response.data || []
    },
  })

  const tenants = tenantsResponse || []

  const handleChange = (field: keyof Announcement, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const toggleTenant = (tenantId: number) => {
    setFormData(prev => {
      const current = prev.target_tenants || []
      if (current.includes(tenantId)) {
        return { ...prev, target_tenants: current.filter(id => id !== tenantId) }
      } else {
        return { ...prev, target_tenants: [...current, tenantId] }
      }
    })
  }

  const selectAllTenants = () => {
    setFormData(prev => ({ ...prev, target_tenants: [] })) // Empty means all tenants
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Announcement>) => {
      const payload: any = { ...data }
      if (payload.scheduled_at) payload.scheduled_at = `${payload.scheduled_at}:00Z`
      if (payload.expires_at) payload.expires_at = `${payload.expires_at}:00Z`
      if (payload.target_tenants.length === 0) payload.target_tenants = [] // Empty = all tenants
      return api.post('/owner/announcements/', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] })
      toast.success('Announcement created successfully!')
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      const errorData = error.response?.data
      if (errorData) {
        const fieldErrors: Record<string, string> = {}
        Object.keys(errorData).forEach(key => {
          if (Array.isArray(errorData[key])) {
            fieldErrors[key] = errorData[key][0]
          } else if (typeof errorData[key] === 'string') {
            fieldErrors[key] = errorData[key]
          }
        })
        setErrors(fieldErrors)
        toast.error(errorData.detail || 'Failed to create announcement')
      } else {
        toast.error('Failed to create announcement')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Announcement>) => {
      const payload: any = { ...data }
      if (payload.scheduled_at) payload.scheduled_at = `${payload.scheduled_at}:00Z`
      if (payload.expires_at) payload.expires_at = `${payload.expires_at}:00Z`
      if (payload.target_tenants.length === 0) payload.target_tenants = []
      return api.patch(`/owner/announcements/${announcement.id}/`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] })
      toast.success('Announcement updated successfully!')
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      const errorData = error.response?.data
      if (errorData) {
        const fieldErrors: Record<string, string> = {}
        Object.keys(errorData).forEach(key => {
          if (Array.isArray(errorData[key])) {
            fieldErrors[key] = errorData[key][0]
          } else if (typeof errorData[key] === 'string') {
            fieldErrors[key] = errorData[key]
          }
        })
        setErrors(fieldErrors)
        toast.error(errorData.detail || 'Failed to update announcement')
      } else {
        toast.error('Failed to update announcement')
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    if (announcement) {
      await updateMutation.mutateAsync(formData)
    } else {
      await createMutation.mutateAsync(formData)
    }
  }

  const isEditing = !!announcement
  const selectedType = ANNOUNCEMENT_TYPES.find(t => t.value === formData.announcement_type)
  const isScheduled = !!formData.scheduled_at
  const targetAllTenants = formData.target_tenants.length === 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '95vh',
          overflow: 'auto',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '2px solid #ecf0f1',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
                {isEditing ? '✏️ Edit Announcement' : '📢 Create Announcement'}
              </h2>
              <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
                {isEditing
                  ? 'Update announcement details and settings'
                  : 'Send an announcement to tenants'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '32px',
                cursor: 'pointer',
                color: '#7f8c8d',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ecf0f1'
                e.currentTarget.style.color = '#2c3e50'
              }}
            >
              ×
            </button>
          </div>

          {!showPreview ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Title */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Title <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.title ? '#e74c3c' : undefined,
                    }}
                    placeholder="Announcement title"
                  />
                  {errors.title && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Announcement Type
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                  }}>
                    {ANNOUNCEMENT_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleChange('announcement_type', type.value)}
                        style={{
                          padding: '16px',
                          border: formData.announcement_type === type.value
                            ? `2px solid ${type.color}`
                            : '1px solid #e9ecef',
                          borderRadius: '8px',
                          background: formData.announcement_type === type.value
                            ? type.color + '10'
                            : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{type.icon}</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: formData.announcement_type === type.value ? '600' : '400',
                          color: '#2c3e50',
                        }}>
                          {type.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Message <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      resize: 'vertical',
                      borderColor: errors.message ? '#e74c3c' : undefined,
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      lineHeight: '1.6',
                    }}
                    placeholder="Enter announcement message. You can use basic formatting with line breaks..."
                  />
                  {errors.message && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.message}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '12px' }}>
                    Use line breaks for paragraphs. Plain text format.
                  </p>
                </div>

                {/* Targeting */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Target Tenants
                  </label>
                  <div style={{
                    padding: '16px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}>
                    <div style={{ marginBottom: '12px' }}>
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={selectAllTenants}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        {targetAllTenants ? '✅ All Tenants' : 'Select All Tenants'}
                      </Button>
                      <span style={{
                        marginLeft: '12px',
                        fontSize: '13px',
                        color: '#7f8c8d',
                      }}>
                        {targetAllTenants
                          ? 'Sending to all tenants'
                          : `Selected: ${formData.target_tenants.length} tenant${formData.target_tenants.length !== 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '8px',
                    }}>
                      {tenants.map((tenant: any) => {
                        const isSelected = formData.target_tenants.includes(tenant.id)
                        return (
                          <label
                            key={tenant.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              border: isSelected ? '2px solid #3498db' : '1px solid #e9ecef',
                              borderRadius: '6px',
                              background: isSelected ? '#3498db10' : '#fff',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'all 0.2s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTenant(tenant.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ flex: 1, color: '#2c3e50' }}>{tenant.company_name}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Scheduling */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Schedule (Optional)
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                  }}>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="checkbox"
                          checked={isScheduled}
                          onChange={(e) => handleChange('scheduled_at', e.target.checked ? new Date().toISOString().slice(0, 16) : '')}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>Schedule for Later</span>
                      </label>
                      {isScheduled && (
                        <input
                          type="datetime-local"
                          value={formData.scheduled_at || ''}
                          onChange={(e) => handleChange('scheduled_at', e.target.value)}
                          className="input"
                          style={{ width: '100%' }}
                        />
                      )}
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '500',
                        color: '#2c3e50',
                        fontSize: '13px',
                      }}>
                        Expires At (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.expires_at || ''}
                        onChange={(e) => handleChange('expires_at', e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="is_active"
                    style={{
                      fontWeight: '600',
                      color: '#2c3e50',
                      fontSize: '14px',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    Active Announcement
                  </label>
                  <p style={{ margin: 0, color: '#7f8c8d', fontSize: '12px' }}>
                    Only active announcements are displayed to tenants
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '24px',
                marginTop: '24px',
                borderTop: '2px solid #ecf0f1',
              }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  👁️ Preview
                </Button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {isEditing ? '💾 Update Announcement' : '📢 Create Announcement'}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              {/* Preview */}
              <div style={{
                padding: '24px',
                background: selectedType?.color + '10',
                borderRadius: '8px',
                border: `2px solid ${selectedType?.color}`,
                marginBottom: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '32px' }}>{selectedType?.icon}</span>
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#2c3e50',
                    }}>
                      {formData.title || 'Untitled Announcement'}
                    </h3>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: selectedType?.color + '20',
                      color: selectedType?.color,
                    }}>
                      {selectedType?.label}
                    </span>
                  </div>
                </div>
                <div style={{
                  fontSize: '15px',
                  color: '#2c3e50',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                }}>
                  {formData.message || 'No message'}
                </div>
                {targetAllTenants && (
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    color: '#7f8c8d',
                  }}>
                    📢 This announcement will be sent to all tenants
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '24px',
                borderTop: '2px solid #ecf0f1',
              }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  ← Back to Edit
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {isEditing ? '💾 Update' : '📢 Create'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  )
}





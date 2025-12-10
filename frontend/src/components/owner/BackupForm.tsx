/**
 * Backup Form Component
 * Create backup with tenant selection, backup type, and notes
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface BackupFormProps {
  onClose: () => void
  onSuccess: () => void
}

const BACKUP_TYPES = [
  { value: 'full', label: 'Full Backup', icon: '💾', description: 'Complete backup of all tenant data' },
  { value: 'database_only', label: 'Database Only', icon: '🗄️', description: 'Backup database data only' },
  { value: 'files_only', label: 'Files Only', icon: '📁', description: 'Backup uploaded files only' },
  { value: 'incremental', label: 'Incremental', icon: '🔄', description: 'Backup only changes since last backup' },
]

export default function BackupForm({ onClose, onSuccess }: BackupFormProps) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    tenant: '',
    backup_type: 'full',
    notes: '',
  })

  // Fetch tenants
  const { data: tenantsResponse } = useQuery({
    queryKey: ['owner-tenants-for-backup'],
    queryFn: async () => {
      const response = await api.get('/owner/tenants/', { params: { page_size: 1000 } })
      return response.data.results || response.data || []
    },
  })

  const tenants = tenantsResponse || []

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.tenant) {
      newErrors.tenant = 'Please select a tenant'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/owner/backups/create_backup/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] })
      toast.success('Backup creation started! This may take a few minutes.')
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
        toast.error(errorData.detail || 'Failed to create backup')
      } else {
        toast.error('Failed to create backup')
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    await createMutation.mutateAsync(formData)
  }

  const selectedType = BACKUP_TYPES.find(t => t.value === formData.backup_type)

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
          maxWidth: '700px',
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
                💾 Create Backup
              </h2>
              <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
                Create a backup for a tenant
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

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Tenant Selection */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Tenant <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.tenant}
                  onChange={(e) => handleChange('tenant', e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    borderColor: errors.tenant ? '#e74c3c' : undefined,
                  }}
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map((tenant: any) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.company_name || tenant.name}
                    </option>
                  ))}
                </select>
                {errors.tenant && (
                  <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                    {errors.tenant}
                  </p>
                )}
              </div>

              {/* Backup Type */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Backup Type
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                }}>
                  {BACKUP_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange('backup_type', type.value)}
                      style={{
                        padding: '16px',
                        border: formData.backup_type === type.value
                          ? '2px solid #3498db'
                          : '1px solid #e9ecef',
                        borderRadius: '8px',
                        background: formData.backup_type === type.value
                          ? '#3498db10'
                          : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{type.icon}</div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: formData.backup_type === type.value ? '600' : '400',
                        color: '#2c3e50',
                        marginBottom: '4px',
                      }}>
                        {type.label}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#7f8c8d',
                      }}>
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                  }}
                  placeholder="Add any notes about this backup..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              marginTop: '24px',
              borderTop: '2px solid #ecf0f1',
            }}>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createMutation.isPending}
                disabled={createMutation.isPending}
              >
                💾 Create Backup
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}



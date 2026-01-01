/**
 * Setting Form Component for Create/Edit System Settings
 */
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface Setting {
  id?: number
  key: string
  value: string
  typed_value?: any
  data_type: 'string' | 'number' | 'boolean' | 'json'
  description: string
  category: string
  is_public: boolean
}

interface SettingFormProps {
  setting?: Setting
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  { value: 'currency', label: 'Currency & Exchange Rates', icon: '💱' },
  { value: 'payment', label: 'Payment Methods', icon: '💳' },
  { value: 'tax', label: 'Tax & Compliance', icon: '📊' },
  { value: 'pos', label: 'POS Settings', icon: '🛒' },
  { value: 'integration', label: 'Integrations', icon: '🔌' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'notification', label: 'Notifications', icon: '🔔' },
  { value: 'other', label: 'Other', icon: '⚙️' },
]

const DATA_TYPES = [
  { value: 'string', label: 'String (Text)' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean (True/False)' },
  { value: 'json', label: 'JSON (Structured Data)' },
]

export default function SettingForm({ setting, onClose, onSuccess }: SettingFormProps) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<Setting>({
    key: setting?.key || '',
    value: setting?.value || '',
    data_type: setting?.data_type || 'string',
    description: setting?.description || '',
    category: setting?.category || 'other',
    is_public: setting?.is_public || false,
  })

  const [jsonValue, setJsonValue] = useState<string>('')

  useEffect(() => {
    if (setting) {
      setFormData({
        key: setting.key,
        value: setting.value,
        data_type: setting.data_type,
        description: setting.description,
        category: setting.category,
        is_public: setting.is_public,
      })
      
      if (setting.data_type === 'json') {
        try {
          setJsonValue(JSON.stringify(setting.typed_value || {}, null, 2))
        } catch {
          setJsonValue('{}')
        }
      } else if (setting.data_type === 'boolean') {
        setJsonValue(String(setting.typed_value || false))
      } else {
        setJsonValue(setting.value || '')
      }
    }
  }, [setting])

  const handleChange = (field: keyof Setting, value: any) => {
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

    if (!formData.key.trim()) {
      newErrors.key = 'Setting key is required'
    } else if (!/^[a-z0-9_]+$/.test(formData.key)) {
      newErrors.key = 'Key can only contain lowercase letters, numbers, and underscores'
    }

    // Validate value based on data type
    if (formData.data_type === 'json') {
      try {
        JSON.parse(jsonValue)
      } catch {
        newErrors.value = 'Invalid JSON format'
      }
    } else if (formData.data_type === 'number') {
      if (isNaN(Number(jsonValue))) {
        newErrors.value = 'Value must be a valid number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatValue = (): string => {
    if (formData.data_type === 'json') {
      try {
        return JSON.stringify(JSON.parse(jsonValue))
      } catch {
        return jsonValue
      }
    } else if (formData.data_type === 'boolean') {
      return String(jsonValue === 'true' || jsonValue === '1')
    } else if (formData.data_type === 'number') {
      return String(Number(jsonValue))
    }
    return jsonValue
  }

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Setting>) => {
      const payload: any = {
        ...data,
        value: formatValue(),
      }
      return api.post('/owner/settings/', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-settings'] })
      toast.success('Setting created successfully!')
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
        toast.error(errorData.detail || 'Failed to create setting')
      } else {
        toast.error('Failed to create setting')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Setting>) => {
      const payload: any = {
        ...data,
        value: formatValue(),
      }
      return api.patch(`/owner/settings/${setting!.key}/`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-settings'] })
      toast.success('Setting updated successfully!')
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
        toast.error(errorData.detail || 'Failed to update setting')
      } else {
        toast.error('Failed to update setting')
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    if (setting) {
      await updateMutation.mutateAsync(formData)
    } else {
      await createMutation.mutateAsync(formData)
    }
  }

  const isEditing = !!setting

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
                {isEditing ? '✏️ Edit Setting' : '➕ Create New Setting'}
              </h2>
              <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
                {isEditing
                  ? 'Update system setting configuration'
                  : 'Add a new system-wide setting'}
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
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#7f8c8d'
              }}
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gap: '20px',
            }}>
              {/* Key */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Setting Key <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => handleChange('key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="input"
                  style={{
                    width: '100%',
                    borderColor: errors.key ? '#e74c3c' : undefined,
                  }}
                  placeholder="setting_key_name"
                  disabled={isEditing}
                />
                {errors.key && (
                  <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                    {errors.key}
                  </p>
                )}
                <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '12px' }}>
                  Unique identifier (lowercase letters, numbers, underscores only)
                </p>
              </div>

              {/* Category */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Category <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Type */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Data Type <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.data_type}
                  onChange={(e) => {
                    handleChange('data_type', e.target.value)
                    // Reset value when changing type
                    if (e.target.value === 'boolean') {
                      setJsonValue('false')
                    } else if (e.target.value === 'number') {
                      setJsonValue('0')
                    } else if (e.target.value === 'json') {
                      setJsonValue('{}')
                    } else {
                      setJsonValue('')
                    }
                  }}
                  className="input"
                  style={{ width: '100%' }}
                >
                  {DATA_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Value <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                
                {formData.data_type === 'boolean' ? (
                  <select
                    value={jsonValue}
                    onChange={(e) => setJsonValue(e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.value ? '#e74c3c' : undefined,
                    }}
                  >
                    <option value="false">False</option>
                    <option value="true">True</option>
                  </select>
                ) : formData.data_type === 'json' ? (
                  <textarea
                    value={jsonValue}
                    onChange={(e) => setJsonValue(e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      borderColor: errors.value ? '#e74c3c' : undefined,
                    }}
                    placeholder='{"key": "value"}'
                  />
                ) : formData.data_type === 'number' ? (
                  <input
                    type="number"
                    value={jsonValue}
                    onChange={(e) => setJsonValue(e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.value ? '#e74c3c' : undefined,
                    }}
                    placeholder="0"
                  />
                ) : (
                  <input
                    type="text"
                    value={jsonValue}
                    onChange={(e) => setJsonValue(e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.value ? '#e74c3c' : undefined,
                    }}
                    placeholder="Enter value"
                  />
                )}
                
                {errors.value && (
                  <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                    {errors.value}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px',
                }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe what this setting controls..."
                />
              </div>

              {/* Is Public */}
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
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => handleChange('is_public', e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label
                  htmlFor="is_public"
                  style={{
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  Public Setting
                </label>
                <p style={{ margin: 0, color: '#7f8c8d', fontSize: '12px' }}>
                  If enabled, tenants can view this setting (read-only)
                </p>
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
                {isEditing ? '💾 Update Setting' : '➕ Create Setting'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}





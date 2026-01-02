/**
 * Business Category Form Component for Create/Edit
 */
import { useState, useEffect } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface BusinessCategory {
  id?: number
  code: string
  name: string
  description: string
  icon: string
  requires_expiry_tracking: boolean
  requires_serial_tracking: boolean
  requires_weight_scale: boolean
  requires_variants: boolean
  requires_warranty: boolean
  requires_appointments: boolean
  requires_recipe_costing: boolean
  requires_layby: boolean
  requires_delivery: boolean
  is_active: boolean
  sort_order: number
}

interface BusinessCategoryFormProps {
  category?: BusinessCategory | null
  onClose: () => void
  onSave: (category: Partial<BusinessCategory>) => void
}

export default function BusinessCategoryForm({ category, onClose, onSave }: BusinessCategoryFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<BusinessCategory>({
    code: category?.code || '',
    name: category?.name || '',
    description: category?.description || '',
    icon: category?.icon || '📁',
    requires_expiry_tracking: category?.requires_expiry_tracking || false,
    requires_serial_tracking: category?.requires_serial_tracking || false,
    requires_weight_scale: category?.requires_weight_scale || false,
    requires_variants: category?.requires_variants || false,
    requires_warranty: category?.requires_warranty || false,
    requires_appointments: category?.requires_appointments || false,
    requires_recipe_costing: category?.requires_recipe_costing || false,
    requires_layby: category?.requires_layby || false,
    requires_delivery: category?.requires_delivery || false,
    is_active: category?.is_active !== undefined ? category.is_active : true,
    sort_order: category?.sort_order || 0,
  })

  useEffect(() => {
    if (category) {
      setFormData({
        code: category.code,
        name: category.name,
        description: category.description || '',
        icon: category.icon || '📁',
        requires_expiry_tracking: category.requires_expiry_tracking || false,
        requires_serial_tracking: category.requires_serial_tracking || false,
        requires_weight_scale: category.requires_weight_scale || false,
        requires_variants: category.requires_variants || false,
        requires_warranty: category.requires_warranty || false,
        requires_appointments: category.requires_appointments || false,
        requires_recipe_costing: category.requires_recipe_costing || false,
        requires_layby: category.requires_layby || false,
        requires_delivery: category.requires_delivery || false,
        is_active: category.is_active !== undefined ? category.is_active : true,
        sort_order: category.sort_order || 0,
      })
    }
  }, [category])

  const handleChange = (field: keyof BusinessCategory, value: any) => {
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

    if (!formData.code.trim()) {
      newErrors.code = 'Category code is required'
    } else if (!/^[a-z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code can only contain lowercase letters, numbers, and underscores'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    const payload: Partial<BusinessCategory> = {
      ...formData,
    }

    if (category?.id) {
      payload.id = category.id
    }

    onSave(payload)
  }

  const featureFlags = [
    { key: 'requires_expiry_tracking' as const, label: 'Requires Expiry Tracking', icon: '⏰' },
    { key: 'requires_serial_tracking' as const, label: 'Requires Serial Tracking', icon: '🔢' },
    { key: 'requires_weight_scale' as const, label: 'Requires Weight Scale', icon: '⚖️' },
    { key: 'requires_variants' as const, label: 'Requires Variants', icon: '🎨' },
    { key: 'requires_warranty' as const, label: 'Requires Warranty', icon: '🛡️' },
    { key: 'requires_appointments' as const, label: 'Requires Appointments', icon: '📅' },
    { key: 'requires_recipe_costing' as const, label: 'Requires Recipe Costing', icon: '📝' },
    { key: 'requires_layby' as const, label: 'Requires Layby', icon: '💳' },
    { key: 'requires_delivery' as const, label: 'Requires Delivery', icon: '🚚' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
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
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {category?.id ? 'Edit Business Category' : 'Create Business Category'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
          </div>

          {/* Form Content */}
          <div style={{ padding: '24px' }}>
            {/* Basic Information */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                Basic Information
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                  Code <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="e.g., grocery, motor_spares"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: errors.code ? '1px solid #e74c3c' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                  disabled={!!category?.id}
                />
                {errors.code && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.code}</div>}
                <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>
                  Unique identifier (lowercase, numbers, underscores only). Cannot be changed after creation.
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                  Name <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Grocery / Supermarket / Convenience Store"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: errors.name ? '1px solid #e74c3c' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                {errors.name && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe this business category..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => handleChange('icon', e.target.value)}
                  placeholder="🛒"
                  maxLength={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>
                  Emoji or icon character to represent this category
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>
                  Lower numbers appear first in lists
                </div>
              </div>
            </div>

            {/* Feature Flags */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                Feature Requirements
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {featureFlags.map((flag) => (
                  <label
                    key={flag.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: formData[flag.key] ? '#e8f5e9' : 'white',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData[flag.key]}
                      onChange={(e) => handleChange(flag.key, e.target.checked)}
                      style={{ marginRight: '8px', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px' }}>
                      <span style={{ marginRight: '6px' }}>{flag.icon}</span>
                      {flag.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  style={{ marginRight: '8px', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                  Active (visible to tenants)
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8f9fa',
                color: '#2c3e50',
                border: '1px solid #ddd',
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {category?.id ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}


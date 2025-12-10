/**
 * Category-Specific Fields Component
 * Dynamically renders fields based on tenant's business category
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface CategoryField {
  key: string
  label: string
  type: string
  required?: boolean
  section: string
  placeholder?: string
  help_text?: string
  width?: string
  options?: any[]
}

interface CategoryFieldsResponse {
  category: string
  category_name: string
  sections: Record<string, CategoryField[]>
  fields: CategoryField[]
}

interface CategorySpecificFieldsProps {
  formData: Record<string, any>
  onChange: (fieldKey: string, value: any) => void
  errors?: Record<string, string>
}

export default function CategorySpecificFields({
  formData,
  onChange,
  errors = {},
}: CategorySpecificFieldsProps) {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<string>('general')

  const { data: categoryFields, isLoading } = useQuery<CategoryFieldsResponse>({
    queryKey: ['category-fields'],
    queryFn: async () => {
      const response = await api.get('/industry/category-fields/')
      return response.data
    },
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: '12px', color: '#7f8c8d' }}>Loading category fields...</p>
      </div>
    )
  }

  if (!categoryFields || !categoryFields.fields || categoryFields.fields.length === 0) {
    return null // No category-specific fields for this tenant
  }

  const sections = categoryFields.sections || {}
  const sectionNames = Object.keys(sections)

  const renderField = (field: CategoryField) => {
    const value = formData[field.key] || ''
    const error = errors[field.key]
    const widthClass = field.width === 'half' ? 'half-width' : 
                      field.width === 'third' ? 'third-width' : 'full-width'

    const commonProps = {
      id: `field-${field.key}`,
      value: value,
      onChange: (e: any) => onChange(field.key, e.target.value),
      placeholder: field.placeholder,
      className: `input ${error ? 'error' : ''}`,
      style: { width: '100%' },
      required: field.required,
    }

    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <div key={field.key} className={widthClass} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              {field.label}
              {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
            </label>
            <input
              {...commonProps}
              type={field.type}
              step={field.type === 'number' ? 'any' : undefined}
            />
            {field.help_text && (
              <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {field.help_text}
              </small>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>
        )

      case 'decimal':
        return (
          <div key={field.key} className={widthClass} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              {field.label}
              {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
            </label>
            <input
              {...commonProps}
              type="number"
              step="0.01"
            />
            {field.help_text && (
              <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {field.help_text}
              </small>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>
        )

      case 'boolean':
        return (
          <div key={field.key} className={widthClass} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(field.key, e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontWeight: '500', fontSize: '13px' }}>
                {field.label}
                {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
              </span>
            </label>
            {field.help_text && (
              <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block', marginLeft: '24px' }}>
                {field.help_text}
              </small>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>
        )

      case 'select':
        const options = field.options || []
        return (
          <div key={field.key} className={widthClass} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              {field.label}
              {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
            </label>
            <select {...commonProps} value={value || ''}>
              <option value="">Select {field.label}</option>
              {options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </option>
              ))}
            </select>
            {field.help_text && (
              <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {field.help_text}
              </small>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>
        )

      case 'multiselect':
        const multiOptions = field.options || []
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div key={field.key} className={widthClass} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              {field.label}
              {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
            </label>
            <select
              {...commonProps}
              multiple
              value={selectedValues}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                onChange(field.key, selected)
              }}
              style={{ minHeight: '100px' }}
            >
              {multiOptions.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </option>
              ))}
            </select>
            {field.help_text && (
              <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {field.help_text}
              </small>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div key={field.key} className={widthClass} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              {field.label}
              {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
            </label>
            <textarea
              {...commonProps}
              rows={4}
            />
            {field.help_text && (
              <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {field.help_text}
              </small>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>
        )

      case 'file':
        return (
          <div key={field.key} className={widthClass} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              {field.label}
              {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  // Handle file upload - you might want to upload immediately or store for later
                  onChange(field.key, file.name) // For now, just store filename
                }
              }}
              className={`input ${error ? 'error' : ''}`}
            />
            {field.help_text && (
              <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {field.help_text}
              </small>
            )}
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // If only one section, don't show tabs
  if (sectionNames.length <= 1) {
    return (
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          {categoryFields.category_name} Specific Fields
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '16px' 
        }}>
          {categoryFields.fields.map(renderField)}
        </div>
      </div>
    )
  }

  // Multiple sections - show tabs
  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
        {categoryFields.category_name} Specific Fields
      </h3>
      
      {/* Section Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '24px',
        borderBottom: '2px solid #ecf0f1'
      }}>
        {sectionNames.map(sectionName => (
          <button
            key={sectionName}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveSection(sectionName)
            }}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeSection === sectionName ? '3px solid #3498db' : '3px solid transparent',
              color: activeSection === sectionName ? '#3498db' : '#7f8c8d',
              fontWeight: activeSection === sectionName ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {sectionName.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Active Section Fields */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '16px' 
      }}>
        {sections[activeSection]?.map(renderField)}
      </div>
    </div>
  )
}


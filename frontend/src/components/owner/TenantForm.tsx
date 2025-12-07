/**
 * Complete Tenant Form Component
 * Full CRUD form for tenant management with all fields and validation
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface BusinessCategory {
  id: number
  code: string
  name: string
  icon: string
}

interface TenantFormData {
  name: string
  slug: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  country: string
  city: string
  subscription_status: 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled'
  trial_ends_at: string
  subscription_ends_at: string
  timezone: string
  currency: string
  tax_rate: number
  vat_number: string
  business_category: number | null
  custom_category_name: string
  is_active: boolean
}

interface TenantFormProps {
  tenant?: any // Tenant detail object
  onClose: () => void
  onSuccess: () => void
}

export default function TenantForm({ tenant, onClose, onSuccess }: TenantFormProps) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<TenantFormData>({
    name: tenant?.name || '',
    slug: tenant?.slug || '',
    company_name: tenant?.company_name || '',
    contact_person: tenant?.contact_person || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    country: tenant?.country || 'Zimbabwe',
    city: tenant?.city || '',
    subscription_status: tenant?.subscription_status || 'trial',
    trial_ends_at: tenant?.trial_ends_at ? tenant.trial_ends_at.split('T')[0] : '',
    subscription_ends_at: tenant?.subscription_ends_at ? tenant.subscription_ends_at.split('T')[0] : '',
    timezone: tenant?.timezone || 'Africa/Harare',
    currency: tenant?.currency || 'USD',
    tax_rate: tenant?.tax_rate || 0,
    vat_number: tenant?.vat_number || '',
    business_category: tenant?.business_category || null,
    custom_category_name: tenant?.custom_category_name || '',
    is_active: tenant?.is_active ?? true,
  })

  // Fetch business categories
  const { data: categoriesData } = useQuery({
    queryKey: ['business-categories'],
    queryFn: async () => {
      const response = await api.get('/business-categories/categories/')
      return response.data
    },
  })

  const categories: BusinessCategory[] = categoriesData || []

  // Auto-generate slug from company name
  useEffect(() => {
    if (!tenant && formData.company_name && !formData.slug) {
      const slug = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.company_name, tenant])

  const handleChange = (field: keyof TenantFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
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

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    }
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: async (data: Partial<TenantFormData>) => {
      const payload: any = { ...data }
      // Handle date fields - convert empty strings to null
      if (payload.trial_ends_at && payload.trial_ends_at.trim()) {
        payload.trial_ends_at = `${payload.trial_ends_at}T00:00:00Z`
      } else {
        payload.trial_ends_at = null
      }
      if (payload.subscription_ends_at && payload.subscription_ends_at.trim()) {
        payload.subscription_ends_at = `${payload.subscription_ends_at}T00:00:00Z`
      } else {
        payload.subscription_ends_at = null
      }
      // Handle business_category - convert empty string or 0 to null
      if (!payload.business_category || payload.business_category === '') {
        payload.business_category = null
      }
      // Clean up optional fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === undefined) {
          if (['address', 'city', 'vat_number', 'custom_category_name', 'name'].includes(key)) {
            payload[key] = ''
          } else if (['trial_ends_at', 'subscription_ends_at', 'business_category'].includes(key)) {
            payload[key] = null
          } else {
            delete payload[key]
          }
        }
      })
      return api.post('/owner/tenants/', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-tenants'] })
      toast.success('Tenant created successfully!')
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
        toast.error(errorData.detail || 'Failed to create tenant')
      } else {
        toast.error('Failed to create tenant')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TenantFormData>) => {
      const payload: any = { ...data }
      // Handle date fields - convert empty strings to null
      if (payload.trial_ends_at && payload.trial_ends_at.trim()) {
        payload.trial_ends_at = `${payload.trial_ends_at}T00:00:00Z`
      } else {
        payload.trial_ends_at = null
      }
      if (payload.subscription_ends_at && payload.subscription_ends_at.trim()) {
        payload.subscription_ends_at = `${payload.subscription_ends_at}T00:00:00Z`
      } else {
        payload.subscription_ends_at = null
      }
      // Handle business_category - convert empty string or 0 to null
      if (!payload.business_category || payload.business_category === '') {
        payload.business_category = null
      }
      // Remove undefined or empty string values for optional fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === undefined) {
          if (['address', 'city', 'vat_number', 'custom_category_name'].includes(key)) {
            payload[key] = ''
          } else if (['trial_ends_at', 'subscription_ends_at', 'business_category'].includes(key)) {
            payload[key] = null
          } else {
            delete payload[key]
          }
        }
      })
      return api.patch(`/owner/tenants/${tenant.id}/`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['owner-tenant', tenant.id] })
      toast.success('Tenant updated successfully!')
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      console.error('Tenant update error:', error)
      const errorData = error.response?.data
      if (errorData) {
        const fieldErrors: Record<string, string> = {}
        Object.keys(errorData).forEach(key => {
          if (Array.isArray(errorData[key])) {
            fieldErrors[key] = errorData[key][0]
          } else if (typeof errorData[key] === 'string') {
            fieldErrors[key] = errorData[key]
          } else if (typeof errorData[key] === 'object' && errorData[key] !== null) {
            // Handle nested error objects
            fieldErrors[key] = JSON.stringify(errorData[key])
          }
        })
        setErrors(fieldErrors)
        const errorMessage = errorData.detail || errorData.error || Object.values(fieldErrors)[0] || 'Failed to update tenant'
        toast.error(errorMessage)
      } else {
        toast.error(error.message || 'Failed to update tenant')
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsSubmitting(true)
    try {
      if (tenant) {
        await updateMutation.mutateAsync(formData)
      } else {
        await createMutation.mutateAsync(formData)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditing = !!tenant

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
                {isEditing ? '✏️ Edit Tenant' : '➕ Create New Tenant'}
              </h2>
              <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
                {isEditing
                  ? 'Update tenant information and settings'
                  : 'Add a new tenant to the system'}
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
            {/* Basic Information Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #ecf0f1',
              }}>
                📋 Basic Information
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '20px',
              }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Company Name <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.company_name ? '#e74c3c' : undefined,
                    }}
                    placeholder="Enter company name"
                  />
                  {errors.company_name && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.company_name}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Slug <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.slug ? '#e74c3c' : undefined,
                    }}
                    placeholder="company-slug"
                  />
                  {errors.slug && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.slug}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '12px' }}>
                    URL-friendly identifier (auto-generated from company name)
                  </p>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Tenant name (optional)"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Contact Person <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => handleChange('contact_person', e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.contact_person ? '#e74c3c' : undefined,
                    }}
                    placeholder="Full name"
                  />
                  {errors.contact_person && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.contact_person}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Email <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.email ? '#e74c3c' : undefined,
                    }}
                    placeholder="contact@company.com"
                  />
                  {errors.email && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Phone <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="input"
                    style={{
                      width: '100%',
                      borderColor: errors.phone ? '#e74c3c' : undefined,
                    }}
                    placeholder="+263 77 123 4567"
                  />
                  {errors.phone && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #ecf0f1',
              }}>
                📍 Address Information
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '20px',
              }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="input"
                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Harare"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Zimbabwe"
                  />
                </div>
              </div>
            </div>

            {/* Subscription Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #ecf0f1',
              }}>
                💳 Subscription Settings
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '20px',
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Subscription Status
                  </label>
                  <select
                    value={formData.subscription_status}
                    onChange={(e) => handleChange('subscription_status', e.target.value as any)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Trial Ends At
                  </label>
                  <input
                    type="date"
                    value={formData.trial_ends_at}
                    onChange={(e) => handleChange('trial_ends_at', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Subscription Ends At
                  </label>
                  <input
                    type="date"
                    value={formData.subscription_ends_at}
                    onChange={(e) => handleChange('subscription_ends_at', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Business Settings Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #ecf0f1',
              }}>
                🏢 Business Settings
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '20px',
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Business Category
                  </label>
                  <select
                    value={formData.business_category || ''}
                    onChange={(e) => handleChange('business_category', e.target.value ? parseInt(e.target.value) : null)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="ZWL">ZWL - Zimbabwe Dollar</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="Africa/Harare">Africa/Harare (Zimbabwe)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (South Africa)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    fontSize: '14px',
                  }}>
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.vat_number}
                    onChange={(e) => handleChange('vat_number', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="VAT registration number"
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '24px',
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
                    }}
                  >
                    Tenant is Active
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '2px solid #ecf0f1',
            }}>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isEditing ? '💾 Update Tenant' : '➕ Create Tenant'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}


import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import toast from 'react-hot-toast'
import AddressForm, { AddressData } from '../components/ui/AddressForm'
import TimezoneSelector from '../components/ui/TimezoneSelector'
import BusinessCategorySelector from '../components/BusinessCategorySelector'
import PaymentForm, { PaymentData } from '../components/PaymentForm'

interface BusinessCategory {
  id: number
  name: string
  code: string
  description: string
  icon: string
}

interface Package {
  id: number
  name: string
  code: string
  description: string
  price_monthly: number
  price_yearly: number
  currency: string
  max_users: number
  max_branches: number
  modules: Array<{ id: number; name: string; code: string; description: string }>
}

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [trialInfo, setTrialInfo] = useState<{ start_date?: string; end_date?: string; duration_days?: number } | null>(null)
  
  // Fetch business categories
  const { data: categoriesData } = useQuery({
    queryKey: ['business-categories'],
    queryFn: async () => {
      const response = await api.get('/business-categories/categories/')
      return response.data
    },
  })

  // Fetch available packages
  const { data: packagesData, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/packages/')
      return response.data?.results || response.data || []
    },
  })

  const categories: BusinessCategory[] = categoriesData || []
  const packages: Package[] = packagesData || []
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    signup_option: 'trial' as 'trial' | 'subscription',
    subscription_type: 'monthly' as 'monthly' | 'yearly',
    preferred_payment_method: '',
    address: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'Zimbabwe',
    timezone: 'Africa/Harare',
    currency: 'USD',
    tax_rate: 0,
    vat_number: '',
    business_category: null as number | null,
    custom_category_name: '',
    package_id: null as number | null,
  })

  // Calculate trial dates when signup option is trial
  useEffect(() => {
    if (formData.signup_option === 'trial') {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7) // 7-day trial
      
      setTrialInfo({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        duration_days: 7
      })
    } else {
      setTrialInfo(null)
    }
  }, [formData.signup_option])

  // Auto-generate slug from company name
  useEffect(() => {
    if (formData.company_name) {
      const slug = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      // We'll let backend generate the final slug to ensure uniqueness
    }
  }, [formData.company_name])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleAddressChange = (addressData: Partial<AddressData>) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.street_address || '',
      address_line_2: addressData.address_line_2 || '',
      city: addressData.city || '',
      state_province: addressData.state_province || '',
      postal_code: addressData.postal_code || '',
      country: addressData.country || 'Zimbabwe',
    }))
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    }
    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.address.trim()) {
      newErrors.address = 'Street address is required'
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }
    if (!formData.country) {
      newErrors.country = 'Country is required'
    }
    if (!formData.timezone) {
      newErrors.timezone = 'Timezone is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Don't submit if we're not on the final step
    if (step < (formData.signup_option === 'subscription' ? 4 : 3)) {
      return
    }
    
    if (step === 1) {
      if (validateStep1()) {
        if (formData.signup_option === 'subscription' && !selectedPackage) {
          setStep(2) // Go to package selection
        } else {
          setStep(step + 1)
        }
      } else {
        toast.error('Please fix the errors in the form')
      }
      return
    }
    
    if (!validateStep2()) {
      toast.error('Please fix the errors in the form')
      return
    }

    // For subscription, require payment data
    if (formData.signup_option === 'subscription' && !paymentData) {
      toast.error('Please complete payment information')
      return
    }

    handleFinalSubmit()
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    try {
      const payload: any = {
        company_name: formData.company_name,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        signup_option: formData.signup_option,
        subscription_type: formData.subscription_type,
        preferred_payment_method: formData.preferred_payment_method || null,
        address: formData.address,
        address_line_2: formData.address_line_2 || '',
        city: formData.city,
        state_province: formData.state_province || '',
        postal_code: formData.postal_code || '',
        country: formData.country,
        timezone: formData.timezone,
        currency: formData.currency,
        tax_rate: formData.tax_rate || 0,
        vat_number: formData.vat_number || '',
      }

      // Add business category if selected
      if (formData.business_category) {
        payload.business_category = formData.business_category
      }
      if (formData.custom_category_name) {
        payload.custom_category_name = formData.custom_category_name
      }

      // Add package and payment data if subscription
      if (formData.signup_option === 'subscription') {
        if (selectedPackage) {
          payload.package_id = selectedPackage.id
        }
        if (paymentData) {
          payload.payment_data = paymentData
        }
      }

      const response = await api.post('/tenant/signup/', payload)
      
      if (response.data.success) {
        if (formData.signup_option === 'trial') {
          // Show confirmation with trial details
          const trialEndDate = response.data.trial_ends_at 
            ? new Date(response.data.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : 'Upon Approval'
          
          toast.success(
            `Trial request submitted! Your trial will end on ${trialEndDate}. You'll be notified once approved.`,
            { duration: 6000 }
          )
          setTimeout(() => {
            navigate('/login?message=trial_pending')
          }, 3000)
        } else {
          toast.success('Account created and payment processed! Your subscription is now active.')
          setTimeout(() => {
            navigate('/login?message=signup_success')
          }, 2000)
        }
      }
    } catch (err: any) {
      const errorData = err.response?.data
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
        
        const errorMessage = errorData.error || 
                            errorData.message || 
                            err.message || 
                            'Signup failed. Please try again.'
        setError(errorMessage)
        toast.error(errorMessage)
      } else {
        const errorMessage = err.message || 'Signup failed. Please try again.'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'flex-start',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <form 
        onSubmit={handleSubmit} 
        style={{ 
          width: '100%',
          maxWidth: '800px', 
          padding: '40px', 
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          marginTop: '20px',
          marginBottom: '20px'
        }}
      >
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, marginBottom: '8px', color: '#333', fontSize: '28px' }}>
            Join RetailCloud
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Step {step} of {formData.signup_option === 'subscription' ? 4 : 3} • Create your business account
          </p>
        </div>
        
        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            background: '#fee',
            color: '#c33',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            {/* Signup Option Selection */}
            <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #ecf0f1' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '16px' }}>
                💳 Choose Your Signup Option
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleChange('signup_option', 'trial')}
                  style={{
                    padding: '16px',
                    border: formData.signup_option === 'trial' ? '2px solid #667eea' : '2px solid #ddd',
                    borderRadius: '8px',
                    background: formData.signup_option === 'trial' ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#333' }}>7-Day Free Trial</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Free trial, requires approval</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('signup_option', 'subscription')}
                  style={{
                    padding: '16px',
                    border: formData.signup_option === 'subscription' ? '2px solid #667eea' : '2px solid #ddd',
                    borderRadius: '8px',
                    background: formData.signup_option === 'subscription' ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#333' }}>Direct Subscription</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Start immediately after payment</div>
                </button>
              </div>

              {/* Trial Information Display */}
              {formData.signup_option === 'trial' && trialInfo && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                  borderRadius: '8px',
                  border: '1px solid #667eea30'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px' }}>🎁</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '16px', marginBottom: '4px' }}>
                        7-Day Free Trial
                      </div>
                      <div style={{ fontSize: '13px', color: '#6c757d' }}>
                        Full access to all features - no credit card required
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Trial Duration</div>
                      <div style={{ fontWeight: '600', color: '#2c3e50' }}>{trialInfo.duration_days} Days</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Start Date</div>
                      <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                        {trialInfo.start_date ? new Date(trialInfo.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upon Approval'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>End Date</div>
                      <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                        {trialInfo.end_date ? new Date(trialInfo.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', padding: '10px', background: '#fff3cd', borderRadius: '6px', fontSize: '12px', color: '#856404' }}>
                    ⚠️ Your trial request will be reviewed and activated by our team within 24 hours.
                  </div>
                </div>
              )}

              {formData.signup_option === 'subscription' && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                        Subscription Type
                      </label>
                      <select
                        value={formData.subscription_type}
                        onChange={(e) => handleChange('subscription_type', e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly (Save 20%)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                        Preferred Payment Method
                      </label>
                      <select
                        value={formData.preferred_payment_method}
                        onChange={(e) => handleChange('preferred_payment_method', e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                      >
                        <option value="">Select payment method...</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="ecocash">EcoCash</option>
                        <option value="onemoney">OneMoney</option>
                        <option value="telecash">Telecash</option>
                        <option value="zipit">ZIPIT</option>
                        <option value="paypal">PayPal</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #ecf0f1' }}>
                📋 Basic Information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Company Name <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="Your Company Name"
                    className="input"
                    style={{ 
                      width: '100%',
                      borderColor: errors.company_name ? '#e74c3c' : undefined,
                    }}
                  />
                  {errors.company_name && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.company_name}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Contact Person <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => handleChange('contact_person', e.target.value)}
                    placeholder="Your Full Name"
                    className="input"
                    style={{ 
                      width: '100%',
                      borderColor: errors.contact_person ? '#e74c3c' : undefined,
                    }}
                  />
                  {errors.contact_person && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.contact_person}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Email <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="your@email.com"
                      className="input"
                      style={{ 
                        width: '100%',
                        paddingRight: emailVerified ? '40px' : undefined,
                        borderColor: errors.email ? '#e74c3c' : emailVerified ? '#27ae60' : undefined,
                      }}
                    />
                    {emailVerified && (
                      <span style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: '#27ae60',
                        fontSize: '18px'
                      }}>
                        ✓
                      </span>
                    )}
                  </div>
                  {errors.email && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.email}
                    </p>
                  )}
                  {formData.email && !emailVerified && !emailVerificationSent && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // TODO: Implement email verification API call
                          toast.success('Verification email sent! Please check your inbox.')
                          setEmailVerificationSent(true)
                        } catch (err) {
                          toast.error('Failed to send verification email')
                        }
                      }}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      📧 Verify Email Address
                    </button>
                  )}
                  {emailVerificationSent && !emailVerified && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px',
                      background: '#fff3cd',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#856404'
                    }}>
                      ✉️ Verification email sent! Please check your inbox and click the verification link.
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Check verification status
                          setEmailVerified(true)
                          toast.success('Email verified!')
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '4px 8px',
                          background: '#ffc107',
                          color: '#856404',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        I've Verified
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Phone <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1234567890"
                    className="input"
                    style={{ 
                      width: '100%',
                      borderColor: errors.phone ? '#e74c3c' : undefined,
                    }}
                  />
                  {errors.phone && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Password <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="At least 8 characters"
                    className="input"
                    minLength={8}
                    style={{ 
                      width: '100%',
                      borderColor: errors.password ? '#e74c3c' : undefined,
                    }}
                  />
                  {errors.password && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Confirm Password <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => handleChange('confirm_password', e.target.value)}
                    placeholder="Confirm your password"
                    className="input"
                    style={{ 
                      width: '100%',
                      borderColor: errors.confirm_password ? '#e74c3c' : undefined,
                    }}
                  />
                  {errors.confirm_password && (
                    <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                      {errors.confirm_password}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Business Category */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #ecf0f1' }}>
                🏢 Business Information
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                  Business Category
                </label>
                <BusinessCategorySelector
                  selectedCategoryId={formData.business_category || undefined}
                  onCategorySelect={(categoryId) => {
                    handleChange('business_category', categoryId)
                    handleChange('custom_category_name', '')
                  }}
                  showRecommendations={false}
                  autoActivateModules={false}
                  compact={true}
                />
                {errors.business_category && (
                  <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
                    {errors.business_category}
                  </p>
                )}
              </div>

              {formData.business_category === null && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Custom Category Name
                  </label>
                  <input
                    type="text"
                    value={formData.custom_category_name}
                    onChange={(e) => handleChange('custom_category_name', e.target.value)}
                    placeholder="Enter your business category"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Package Selection Step (Step 2 for subscriptions only) */}
        {step === 2 && formData.signup_option === 'subscription' && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #ecf0f1' }}>
                📦 Choose Your Package
              </h3>
              {packagesLoading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="spinner" />
                  <p style={{ marginTop: '12px', color: '#6c757d' }}>Loading packages...</p>
                </div>
              ) : packages.length === 0 ? (
                <div style={{ padding: '16px', background: '#fff3cd', borderRadius: '8px', fontSize: '13px', color: '#856404' }}>
                  ⚠️ No packages available. Please contact support.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {packages.map((pkg) => {
                    const price = formData.subscription_type === 'yearly' ? pkg.price_yearly : pkg.price_monthly
                    const monthlyEquivalent = formData.subscription_type === 'yearly' ? (pkg.price_yearly / 12).toFixed(2) : pkg.price_monthly.toFixed(2)
                    const isSelected = selectedPackage?.id === pkg.id
                    
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          setSelectedPackage(pkg)
                          handleChange('package_id', pkg.id)
                        }}
                        style={{
                          padding: '20px',
                          border: isSelected ? '2px solid #667eea' : '2px solid #dee2e6',
                          borderRadius: '12px',
                          background: isSelected ? '#f0f4ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '8px', color: '#2c3e50' }}>
                          {pkg.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '16px', minHeight: '40px' }}>
                          {pkg.description}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#667eea', marginBottom: '4px' }}>
                            {pkg.currency} {price.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            per {formData.subscription_type === 'monthly' ? 'month' : 'year'}
                            {formData.subscription_type === 'yearly' && (
                              <span style={{ marginLeft: '8px', color: '#27ae60', fontWeight: '500' }}>
                                ({pkg.currency} {monthlyEquivalent}/mo)
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '16px' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>Includes:</div>
                          <div style={{ fontSize: '13px', color: '#2c3e50', marginBottom: '4px' }}>
                            👥 Up to {pkg.max_users} users
                          </div>
                          <div style={{ fontSize: '13px', color: '#2c3e50', marginBottom: '4px' }}>
                            🏢 Up to {pkg.max_branches} branch{pkg.max_branches !== 1 ? 'es' : ''}
                          </div>
                          <div style={{ fontSize: '13px', color: '#2c3e50' }}>
                            📦 {pkg.modules?.length || 0} module{pkg.modules?.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#667eea', fontWeight: '600' }}>
                            ✓ Selected
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {!selectedPackage && !packagesLoading && packages.length > 0 && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#fff3cd', borderRadius: '8px', fontSize: '13px', color: '#856404' }}>
                  ⚠️ Please select a package to continue
                </div>
              )}
            </div>
          </>
        )}

        {/* Address Information Step */}
        {step === (formData.signup_option === 'subscription' ? 3 : 2) && (
          <>
            {/* Address Information */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #ecf0f1' }}>
                📍 Address Information
              </h3>
              <AddressForm
                value={{
                  street_address: formData.address,
                  address_line_2: formData.address_line_2,
                  city: formData.city,
                  state_province: formData.state_province,
                  postal_code: formData.postal_code,
                  country: formData.country,
                }}
                onChange={handleAddressChange}
                required={['street_address', 'city', 'country']}
                showLabel={false}
                errors={{
                  street_address: errors.address,
                  city: errors.city,
                  country: errors.country,
                }}
              />
            </div>

            {/* Business Settings */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #ecf0f1' }}>
                ⚙️ Business Settings
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <TimezoneSelector
                    value={formData.timezone}
                    onChange={(tz) => handleChange('timezone', tz)}
                    label="Timezone"
                    placeholder="Select timezone..."
                    country={formData.country}
                    required={true}
                    error={errors.timezone}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Currency <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="ZWL">ZWL - Zimbabwe Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="NGN">NGN - Nigerian Naira</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.vat_number}
                    onChange={(e) => handleChange('vat_number', e.target.value)}
                    placeholder="VAT/Tax ID (optional)"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Payment Step for Subscriptions */}
        {step === 4 && formData.signup_option === 'subscription' && selectedPackage && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #ecf0f1' }}>
                💳 Payment Information
              </h3>
              <PaymentForm
                onSubmit={(data) => {
                  setPaymentData(data)
                  // Continue to final submission
                  handleFinalSubmit()
                }}
                isLoading={loading}
                currency={selectedPackage.currency}
                amount={formData.subscription_type === 'yearly' ? selectedPackage.price_yearly : selectedPackage.price_monthly}
                billingCycle={formData.subscription_type}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f0f0f0',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          {step < (formData.signup_option === 'subscription' ? 4 : 3) && (
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault()
                if (step === 1 && validateStep1()) {
                  if (formData.signup_option === 'subscription' && !selectedPackage) {
                    setStep(2) // Go to package selection
                  } else {
                    setStep(step + 1)
                  }
                } else if (step === 2 && formData.signup_option === 'subscription') {
                  if (selectedPackage) {
                    setStep(3) // Go to address
                  } else {
                    toast.error('Please select a package')
                  }
                } else if (step === (formData.signup_option === 'subscription' ? 3 : 2) && validateStep2()) {
                  if (formData.signup_option === 'subscription') {
                    setStep(4) // Go to payment
                  } else {
                    handleSubmit(e as any)
                  }
                }
              }}
              style={{ 
                flex: 1,
                padding: '12px', 
                background: '#667eea', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Continue →
            </button>
          )}
          {(step === (formData.signup_option === 'subscription' ? 4 : 3) || (step === 4 && paymentData)) && (
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                flex: 1,
                padding: '12px', 
                background: loading ? '#ccc' : '#667eea', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Processing...' : formData.signup_option === 'trial' ? 'Submit Trial Request' : 'Complete Signup & Pay'}
            </button>
          )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}>
            Login here
          </Link>
        </div>
      </form>
    </div>
  )
}

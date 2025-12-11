/**
 * Payment Form Component for Subscription Signup
 * Handles credit card collection for subscriptions
 */
import { useState } from 'react'

interface PaymentFormProps {
  onSubmit: (paymentData: PaymentData) => void
  isLoading?: boolean
  currency?: string
  amount?: number
  billingCycle?: 'monthly' | 'yearly'
}

export interface PaymentData {
  card_number: string
  expiry_month: string
  expiry_year: string
  cvv: string
  cardholder_name: string
  billing_address?: string
  billing_city?: string
  billing_country?: string
  billing_postal_code?: string
}

export default function PaymentForm({ 
  onSubmit, 
  isLoading = false,
  currency = 'USD',
  amount,
  billingCycle = 'monthly'
}: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentData>({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: '',
    billing_address: '',
    billing_city: '',
    billing_country: '',
    billing_postal_code: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '').replace(/\D/g, '')
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    return formatted.slice(0, 19) // Max 16 digits + 3 spaces
  }

  const handleChange = (field: keyof PaymentData, value: string) => {
    let processedValue = value
    
    if (field === 'card_number') {
      processedValue = formatCardNumber(value)
    } else if (field === 'expiry_month' || field === 'expiry_year' || field === 'cvv') {
      processedValue = value.replace(/\D/g, '')
      if (field === 'expiry_month' && processedValue.length > 2) {
        processedValue = processedValue.slice(0, 2)
      } else if (field === 'expiry_year' && processedValue.length > 4) {
        processedValue = processedValue.slice(0, 4)
      } else if (field === 'cvv' && processedValue.length > 4) {
        processedValue = processedValue.slice(0, 4)
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.card_number.replace(/\s/g, '').match(/^\d{13,16}$/)) {
      newErrors.card_number = 'Please enter a valid card number'
    }

    const month = parseInt(formData.expiry_month)
    const year = parseInt(formData.expiry_year)
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    if (!formData.expiry_month || month < 1 || month > 12) {
      newErrors.expiry_month = 'Invalid month'
    }

    if (!formData.expiry_year || year < currentYear || (year === currentYear && month < currentMonth)) {
      newErrors.expiry_year = 'Card has expired'
    }

    if (!formData.cvv.match(/^\d{3,4}$/)) {
      newErrors.cvv = 'Invalid CVV'
    }

    if (!formData.cardholder_name.trim()) {
      newErrors.cardholder_name = 'Cardholder name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {amount && (
        <div style={{
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
            Total Amount
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
            {currency} {amount.toFixed(2)} / {billingCycle === 'monthly' ? 'month' : 'year'}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
          Cardholder Name <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <input
          type="text"
          value={formData.cardholder_name}
          onChange={(e) => handleChange('cardholder_name', e.target.value)}
          placeholder="John Doe"
          className="input"
          style={{ 
            width: '100%',
            borderColor: errors.cardholder_name ? '#e74c3c' : undefined,
          }}
        />
        {errors.cardholder_name && (
          <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
            {errors.cardholder_name}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
          Card Number <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <input
          type="text"
          value={formData.card_number}
          onChange={(e) => handleChange('card_number', e.target.value)}
          placeholder="1234 5678 9012 3456"
          className="input"
          style={{ 
            width: '100%',
            borderColor: errors.card_number ? '#e74c3c' : undefined,
          }}
          maxLength={19}
        />
        {errors.card_number && (
          <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
            {errors.card_number}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
            Expiry Month <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.expiry_month}
            onChange={(e) => handleChange('expiry_month', e.target.value)}
            placeholder="MM"
            className="input"
            style={{ 
              width: '100%',
              borderColor: errors.expiry_month ? '#e74c3c' : undefined,
            }}
            maxLength={2}
          />
          {errors.expiry_month && (
            <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
              {errors.expiry_month}
            </p>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
            Expiry Year <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.expiry_year}
            onChange={(e) => handleChange('expiry_year', e.target.value)}
            placeholder="YYYY"
            className="input"
            style={{ 
              width: '100%',
              borderColor: errors.expiry_year ? '#e74c3c' : undefined,
            }}
            maxLength={4}
          />
          {errors.expiry_year && (
            <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
              {errors.expiry_year}
            </p>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
            CVV <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.cvv}
            onChange={(e) => handleChange('cvv', e.target.value)}
            placeholder="123"
            className="input"
            style={{ 
              width: '100%',
              borderColor: errors.cvv ? '#e74c3c' : undefined,
            }}
            maxLength={4}
          />
          {errors.cvv && (
            <p style={{ margin: '4px 0 0', color: '#e74c3c', fontSize: '12px' }}>
              {errors.cvv}
            </p>
          )}
        </div>
      </div>

      <div style={{
        padding: '12px',
        background: '#fff3cd',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#856404',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🔒</span>
        <span>Your payment information is encrypted and secure. We never store your full card details.</span>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '14px',
          background: isLoading ? '#ccc' : '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s'
        }}
      >
        {isLoading ? 'Processing Payment...' : `Pay ${currency} ${amount?.toFixed(2) || '0.00'}`}
      </button>
    </form>
  )
}


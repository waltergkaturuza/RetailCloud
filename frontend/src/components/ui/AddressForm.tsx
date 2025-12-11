/**
 * Comprehensive Address Form Component
 * Reusable address form with country, state, city, postal code, etc.
 * Dynamically loads states/provinces based on selected country
 */
import { useState, useEffect } from 'react'
import CountrySelector from './CountrySelector'
import StateProvinceSelector from './StateProvinceSelector'
import { getCountryByCode, getCountryByName } from '../../data/countries'

export interface AddressData {
  street_address: string
  address_line_2: string
  city: string
  state_province: string
  postal_code: string
  country: string
}

interface AddressFormProps {
  value: Partial<AddressData>
  onChange: (data: Partial<AddressData>) => void
  showLabel?: boolean
  errors?: Partial<Record<keyof AddressData, string>>
  required?: (keyof AddressData)[]
  disabled?: boolean
}

export default function AddressForm({
  value,
  onChange,
  showLabel = true,
  errors = {},
  required = [],
  disabled = false,
}: AddressFormProps) {
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('')

  // Update country code when country name changes
  useEffect(() => {
    if (value.country) {
      const country = getCountryByName(value.country) || getCountryByCode(value.country)
      if (country) {
        setSelectedCountryCode(country.code)
      }
    }
  }, [value.country])

  const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
    const newData = {
      ...value,
      [field]: fieldValue,
    }
    
    // If country changed, optionally clear state/province if it doesn't match
    if (field === 'country') {
      const country = getCountryByName(fieldValue) || getCountryByCode(fieldValue)
      if (country) {
        setSelectedCountryCode(country.code)
      }
      // Optionally clear state if it doesn't belong to new country
      // For now, we'll keep it and let the user change it
    }
    
    onChange(newData)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showLabel && (
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#2c3e50',
          margin: '0 0 8px 0',
        }}>
          📍 Address Information
        </h4>
      )}

      {/* Street Address */}
      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          color: '#2c3e50',
          fontSize: '14px',
        }}>
          Street Address {required.includes('street_address') && <span style={{ color: '#e74c3c' }}>*</span>}
        </label>
        <input
          type="text"
          value={value.street_address || ''}
          onChange={(e) => handleFieldChange('street_address', e.target.value)}
          disabled={disabled}
          placeholder="123 Main Street, Building Name"
          className="input"
          style={{
            width: '100%',
            border: errors.street_address ? '2px solid #e74c3c' : undefined,
          }}
        />
        {errors.street_address && (
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#e74c3c' }}>
            {errors.street_address}
          </div>
        )}
      </div>

      {/* Address Line 2 (Optional) */}
      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          color: '#2c3e50',
          fontSize: '14px',
        }}>
          Address Line 2 <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: 'normal' }}>(Optional)</span>
        </label>
        <input
          type="text"
          value={value.address_line_2 || ''}
          onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
          disabled={disabled}
          placeholder="Apartment, suite, unit, building, floor, etc."
          className="input"
          style={{ width: '100%' }}
        />
      </div>

      {/* City, State/Province, Postal Code Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 2fr 1.5fr',
        gap: '16px',
      }}>
        {/* City */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#2c3e50',
            fontSize: '14px',
          }}>
            City {required.includes('city') && <span style={{ color: '#e74c3c' }}>*</span>}
          </label>
          <input
            type="text"
            value={value.city || ''}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            disabled={disabled}
            placeholder="City"
            className="input"
            style={{
              width: '100%',
              border: errors.city ? '2px solid #e74c3c' : undefined,
            }}
          />
          {errors.city && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#e74c3c' }}>
              {errors.city}
            </div>
          )}
        </div>

        {/* State/Province - Dynamic selector based on country */}
        <div>
          <StateProvinceSelector
            country={value.country || ''}
            value={value.state_province || ''}
            onChange={(state) => handleFieldChange('state_province', state)}
            label="State/Province"
            required={required.includes('state_province')}
            placeholder="Select state/province..."
            error={errors.state_province}
            disabled={disabled}
          />
        </div>

        {/* Postal Code */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#2c3e50',
            fontSize: '14px',
          }}>
            Postal Code {required.includes('postal_code') && <span style={{ color: '#e74c3c' }}>*</span>}
          </label>
          <input
            type="text"
            value={value.postal_code || ''}
            onChange={(e) => handleFieldChange('postal_code', e.target.value)}
            disabled={disabled}
            placeholder="ZIP/Postal Code"
            className="input"
            style={{
              width: '100%',
              border: errors.postal_code ? '2px solid #e74c3c' : undefined,
            }}
          />
          {errors.postal_code && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#e74c3c' }}>
              {errors.postal_code}
            </div>
          )}
        </div>
      </div>

      {/* Country */}
      <div>
        <CountrySelector
          value={value.country || ''}
          onChange={(country) => handleFieldChange('country', country)}
          label="Country"
          required={required.includes('country')}
          placeholder="Select country..."
          error={errors.country}
          disabled={disabled}
        />
      </div>
    </div>
  )
}


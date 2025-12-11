/**
 * Reusable Country Selector Component
 * Provides a searchable dropdown with all countries
 */
import { useState, useMemo } from 'react'
import { COUNTRIES, Country } from '../../data/countries'

interface CountrySelectorProps {
  value: string
  onChange: (countryName: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  error?: string
  disabled?: boolean
}

export default function CountrySelector({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Select country...',
  error,
  disabled = false,
}: CountrySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return COUNTRIES
    const query = searchQuery.toLowerCase()
    return COUNTRIES.filter(country =>
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.iso2.toLowerCase().includes(query) ||
      country.iso3.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const selectedCountry = COUNTRIES.find(c => c.name === value)

  const handleSelect = (country: Country) => {
    onChange(country.name)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          color: '#2c3e50',
          fontSize: '14px',
        }}>
          {label} {required && <span style={{ color: '#e74c3c' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: error ? '2px solid #e74c3c' : '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: disabled ? '#f5f5f5' : '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: selectedCountry ? '#2c3e50' : '#999' }}>
            {selectedCountry ? selectedCountry.name : placeholder}
          </span>
          <span style={{ color: '#999', fontSize: '12px' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && !disabled && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 998,
              }}
              onClick={() => setIsOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 999,
                maxHeight: '300px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Search Input */}
              <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsOpen(false)
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Countries List */}
              <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                {filteredCountries.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                    No countries found
                  </div>
                ) : (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleSelect(country)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        backgroundColor: value === country.name ? '#e3f2fd' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (value !== country.name) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (value !== country.name) {
                          e.currentTarget.style.backgroundColor = '#fff'
                        }
                      }}
                    >
                      <span style={{ fontWeight: value === country.name ? '600' : '400' }}>
                        {country.name}
                      </span>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {country.code}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#e74c3c' }}>
          {error}
        </div>
      )}
    </div>
  )
}


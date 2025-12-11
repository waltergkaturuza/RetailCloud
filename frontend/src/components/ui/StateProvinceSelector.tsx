/**
 * Dynamic State/Province Selector Component
 * Filters states/provinces based on selected country
 */
import { useState, useMemo } from 'react'
import { getStatesForCountry, hasStates, StateProvince } from '../../data/countries-states'

interface StateProvinceSelectorProps {
  country: string
  value: string
  onChange: (stateProvince: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  error?: string
  disabled?: boolean
}

export default function StateProvinceSelector({
  country,
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Select state/province...',
  error,
  disabled = false,
}: StateProvinceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const availableStates = useMemo(() => {
    if (!country || !hasStates(country)) return []
    return getStatesForCountry(country)
  }, [country])

  const filteredStates = useMemo(() => {
    if (!searchQuery) return availableStates
    const query = searchQuery.toLowerCase()
    return availableStates.filter(state =>
      state.name.toLowerCase().includes(query) ||
      state.code.toLowerCase().includes(query)
    )
  }, [availableStates, searchQuery])

  const selectedState = availableStates.find(s => s.name === value || s.code === value)

  const handleSelect = (state: StateProvince) => {
    onChange(state.name)
    setIsOpen(false)
    setSearchQuery('')
  }

  // If country doesn't have states defined, show regular text input
  if (!country || !hasStates(country)) {
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
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || 'Enter state/province'}
          className="input"
          style={{
            width: '100%',
            border: error ? '2px solid #e74c3c' : undefined,
          }}
        />
        {error && (
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#e74c3c' }}>
            {error}
          </div>
        )}
        {country && !hasStates(country) && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#7f8c8d' }}>
            Enter state/province manually for {country}
          </div>
        )}
      </div>
    )
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
          disabled={disabled || availableStates.length === 0}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: error ? '2px solid #e74c3c' : '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: disabled ? '#f5f5f5' : '#fff',
            cursor: disabled || availableStates.length === 0 ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: selectedState ? '#2c3e50' : '#999' }}>
            {selectedState ? selectedState.name : placeholder}
          </span>
          <span style={{ color: '#999', fontSize: '12px' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && !disabled && availableStates.length > 0 && (
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
                  placeholder="Search states/provinces..."
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

              {/* States List */}
              <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                {filteredStates.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                    No states/provinces found
                  </div>
                ) : (
                  filteredStates.map((state) => (
                    <button
                      key={state.code}
                      type="button"
                      onClick={() => handleSelect(state)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        backgroundColor: value === state.name ? '#e3f2fd' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (value !== state.name) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (value !== state.name) {
                          e.currentTarget.style.backgroundColor = '#fff'
                        }
                      }}
                    >
                      <span style={{ fontWeight: value === state.name ? '600' : '400' }}>
                        {state.name}
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', textTransform: 'capitalize' }}>
                        {state.type}
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


/**
 * Comprehensive Timezone Selector Component
 * Provides a searchable dropdown with all IANA timezones organized by region
 */
import { useState, useMemo } from 'react'
import { TIMEZONES, Timezone, getTimezonesByRegion, getTimezoneRegions, searchTimezones, suggestTimezoneForCountry } from '../../data/timezones'

interface TimezoneSelectorProps {
  value: string
  onChange: (timezone: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  error?: string
  disabled?: boolean
  country?: string // Optional: suggest timezone based on country
}

export default function TimezoneSelector({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Select timezone...',
  error,
  disabled = false,
  country,
}: TimezoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  // Suggest timezone based on country
  useMemo(() => {
    if (country && !value) {
      const suggested = suggestTimezoneForCountry(country)
      if (suggested) {
        onChange(suggested.value)
      }
    }
  }, [country, value, onChange])

  const regions = getTimezoneRegions()

  // Filter timezones based on search and region
  const filteredTimezones = useMemo(() => {
    let tzs = TIMEZONES

    // Filter by region if selected
    if (selectedRegion) {
      tzs = getTimezonesByRegion(selectedRegion)
    }

    // Filter by search query
    if (searchQuery) {
      tzs = searchTimezones(searchQuery).filter(tz =>
        !selectedRegion || tz.region === selectedRegion
      )
    }

    return tzs
  }, [searchQuery, selectedRegion])

  const selectedTimezone = TIMEZONES.find(tz => tz.value === value)

  const handleSelect = (tz: Timezone) => {
    onChange(tz.value)
    setIsOpen(false)
    setSearchQuery('')
    setSelectedRegion(null)
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
          <span style={{ color: selectedTimezone ? '#2c3e50' : '#999' }}>
            {selectedTimezone ? selectedTimezone.label : placeholder}
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
                maxHeight: '400px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Search Input */}
              <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                <input
                  type="text"
                  placeholder="Search timezones..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSelectedRegion(null)
                  }}
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

              {/* Region Filter */}
              <div style={{
                padding: '8px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                gap: '4px',
                flexWrap: 'wrap',
                maxHeight: '80px',
                overflowY: 'auto',
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedRegion(null)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    border: selectedRegion === null ? '1px solid #3498db' : '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: selectedRegion === null ? '#e3f2fd' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  All
                </button>
                {regions.map(region => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(region)
                      setSearchQuery('')
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: selectedRegion === region ? '1px solid #3498db' : '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: selectedRegion === region ? '#e3f2fd' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {region}
                  </button>
                ))}
              </div>

              {/* Timezones List */}
              <div style={{ overflowY: 'auto', maxHeight: '280px' }}>
                {filteredTimezones.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                    No timezones found
                  </div>
                ) : (
                  filteredTimezones.map((tz) => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => handleSelect(tz)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        backgroundColor: value === tz.value ? '#e3f2fd' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 0.2s',
                        borderBottom: '1px solid #f5f5f5',
                      }}
                      onMouseEnter={(e) => {
                        if (value !== tz.value) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (value !== tz.value) {
                          e.currentTarget.style.backgroundColor = '#fff'
                        }
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: value === tz.value ? '600' : '500', marginBottom: '2px' }}>
                          {tz.value}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7f8c8d' }}>
                          {tz.region} • {tz.offset} • {tz.abbreviation}
                        </div>
                      </div>
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
      
      {country && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#7f8c8d' }}>
          💡 Timezone suggestion available for {country}
        </div>
      )}
    </div>
  )
}


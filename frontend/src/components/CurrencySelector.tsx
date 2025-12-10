import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import Button from './ui/Button'

interface Currency {
  code: string
  name: string
  symbol: string
  is_enabled: boolean
  is_default: boolean
}

interface ExchangeRate {
  base_currency: string
  rates: { [key: string]: { rate: number; effective_date: string; is_locked: boolean } }
  date: string
}

interface CurrencySelectorProps {
  selectedCurrency: string
  onCurrencyChange: (currency: string, rate?: number) => void
  showRates?: boolean
}

export default function CurrencySelector({ 
  selectedCurrency, 
  onCurrencyChange,
  showRates = true 
}: CurrencySelectorProps) {
  const [showRateModal, setShowRateModal] = useState(false)

  const { data: currencies } = useQuery<Currency[]>({
    queryKey: ['tenant-currencies-enabled'],
    queryFn: async () => {
      const response = await api.get('/currency/tenant-currencies/enabled/')
      return response.data
    }
  })

  const { data: exchangeRates } = useQuery<ExchangeRate>({
    queryKey: ['exchange-rates-current', selectedCurrency],
    queryFn: async () => {
      const response = await api.get(`/currency/exchange-rates/current/?from=${selectedCurrency}`)
      return response.data
    },
    enabled: showRates && !!selectedCurrency
  })

  const enabledCurrencies = currencies || []

  const handleCurrencyClick = (currency: Currency) => {
    if (currency.code === selectedCurrency) return
    
    // Get exchange rate if different currency
    let rate: number | undefined
    if (exchangeRates && currency.code !== selectedCurrency) {
      rate = exchangeRates.rates[currency.code]?.rate
    }
    
    onCurrencyChange(currency.code, rate)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {enabledCurrencies.map((currency) => (
          <button
            key={currency.code}
            onClick={() => handleCurrencyClick(currency)}
            style={{
              padding: '10px 16px',
              border: `2px solid ${selectedCurrency === currency.code ? '#3498db' : '#e1e8ed'}`,
              borderRadius: '8px',
              background: selectedCurrency === currency.code ? '#ebf5fb' : 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: selectedCurrency === currency.code ? '600' : '400',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{currency.symbol}</span>
            <span>{currency.code}</span>
            {currency.is_default && (
              <span style={{ fontSize: '10px', color: '#7f8c8d' }}>(Default)</span>
            )}
          </button>
        ))}
        {showRates && exchangeRates && (
          <button
            onClick={() => setShowRateModal(true)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#3498db'
            }}
          >
            📊 Rates
          </button>
        )}
      </div>

      {/* Exchange Rate Modal */}
      {showRateModal && exchangeRates && (
        <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Exchange Rates</h2>
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#7f8c8d' }}>
              Base Currency: <strong>{exchangeRates.base_currency}</strong>
              <br />
              Date: {new Date(exchangeRates.date).toLocaleDateString()}
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Currency</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(exchangeRates.rates).map(([code, rateInfo]) => (
                    <tr key={code} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: '500' }}>{code}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {rateInfo.rate.toFixed(4)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {rateInfo.is_locked ? (
                          <span style={{ color: '#2ecc71', fontSize: '12px' }}>🔒 Locked</span>
                        ) : (
                          <span style={{ color: '#7f8c8d', fontSize: '12px' }}>Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <Button onClick={() => setShowRateModal(false)} variant="secondary">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



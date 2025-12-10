import { useState, useEffect } from 'react'
import Button from './ui/Button'
import toast from 'react-hot-toast'

interface SplitPayment {
  payment_method: string
  currency: string
  amount: number
  reference: string
}

interface SplitPaymentModalProps {
  total: number
  baseCurrency: string
  availableCurrencies: Array<{ code: string; symbol: string; name: string }>
  exchangeRates?: { [key: string]: { rate: number } }
  onConfirm: (splits: SplitPayment[]) => void
  onClose: () => void
}

export default function SplitPaymentModal({
  total,
  baseCurrency,
  availableCurrencies,
  exchangeRates = {},
  onConfirm,
  onClose
}: SplitPaymentModalProps) {
  const [splits, setSplits] = useState<SplitPayment[]>([
    { payment_method: 'cash', currency: baseCurrency, amount: 0, reference: '' }
  ])

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'ecocash', label: 'EcoCash' },
    { value: 'onemoney', label: 'OneMoney' },
    { value: 'card', label: 'Card (Swipe)' },
    { value: 'zipit', label: 'ZIPIT' },
    { value: 'rtgs', label: 'RTGS' },
  ]

  const calculateTotal = () => {
    let sum = 0
    splits.forEach(split => {
      if (split.currency === baseCurrency) {
        sum += split.amount
      } else {
        // Convert to base currency
        const rate = exchangeRates[split.currency]?.rate || 1
        sum += split.amount / rate
      }
    })
    return sum
  }

  const remaining = total - calculateTotal()

  const handleSplitChange = (index: number, field: keyof SplitPayment, value: any) => {
    const newSplits = [...splits]
    newSplits[index] = { ...newSplits[index], [field]: value }
    setSplits(newSplits)
  }

  const handleAddSplit = () => {
    setSplits([...splits, { payment_method: 'cash', currency: baseCurrency, amount: 0, reference: '' }])
  }

  const handleRemoveSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index))
    }
  }

  const handleAutoSplit = (method: string) => {
    // Auto-split: USD and selected method 50/50
    const half = total / 2
    setSplits([
      { payment_method: 'cash', currency: baseCurrency, amount: half, reference: '' },
      { payment_method: method, currency: baseCurrency, amount: half, reference: '' }
    ])
  }

  const handleConfirm = () => {
    if (Math.abs(remaining) > 0.01) {
      toast.error(`Total must equal ${total.toFixed(2)}. Remaining: ${remaining.toFixed(2)}`)
      return
    }

    const validSplits = splits.filter(s => s.amount > 0)
    if (validSplits.length === 0) {
      toast.error('At least one payment method required')
      return
    }

    onConfirm(validSplits)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Split Payment</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#7f8c8d',
              padding: '0',
              width: '32px',
              height: '32px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ 
          padding: '16px', 
          background: '#f8f9fa', 
          borderRadius: '8px', 
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Total Amount</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
              {availableCurrencies.find(c => c.code === baseCurrency)?.symbol || '$'}
              {total.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#7f8c8d' }}>Remaining</div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              color: Math.abs(remaining) < 0.01 ? '#2ecc71' : '#e74c3c'
            }}>
              {availableCurrencies.find(c => c.code === baseCurrency)?.symbol || '$'}
              {remaining.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Quick Split Buttons */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Quick Split:</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['ecocash', 'card', 'onemoney'].map(method => (
              <Button
                key={method}
                size="sm"
                variant="secondary"
                onClick={() => handleAutoSplit(method)}
              >
                USD + {paymentMethods.find(m => m.value === method)?.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Split Payments */}
        <div style={{ marginBottom: '20px' }}>
          {splits.map((split, index) => (
            <div
              key={index}
              style={{
                padding: '16px',
                border: '1px solid #e1e8ed',
                borderRadius: '8px',
                marginBottom: '12px',
                background: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                  Payment {index + 1}
                </div>
                {splits.length > 1 && (
                  <button
                    onClick={() => handleRemoveSplit(index)}
                    style={{
                      background: '#fee',
                      border: 'none',
                      color: '#e74c3c',
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                    Payment Method
                  </label>
                  <select
                    value={split.payment_method}
                    onChange={(e) => handleSplitChange(index, 'payment_method', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    {paymentMethods.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                    Currency
                  </label>
                  <select
                    value={split.currency}
                    onChange={(e) => handleSplitChange(index, 'currency', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    {availableCurrencies.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} ({curr.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={split.amount || ''}
                    onChange={(e) => handleSplitChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  />
                  {split.currency !== baseCurrency && exchangeRates[split.currency] && (
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '4px' }}>
                      = {availableCurrencies.find(c => c.code === baseCurrency)?.symbol || '$'}
                      {((split.amount || 0) / exchangeRates[split.currency].rate).toFixed(2)} {baseCurrency}
                    </div>
                  )}
                </div>

                {(split.payment_method === 'ecocash' || split.payment_method === 'onemoney' || split.payment_method === 'zipit') && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                      Reference / Number
                    </label>
                    <input
                      type="text"
                      value={split.reference}
                      onChange={(e) => handleSplitChange(index, 'reference', e.target.value)}
                      placeholder="Transaction number"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={handleAddSplit}
            style={{ width: '100%', marginTop: '12px' }}
          >
            + Add Another Payment
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={Math.abs(remaining) > 0.01}
            style={{
              background: Math.abs(remaining) < 0.01 ? '#2ecc71' : '#bdc3c7'
            }}
          >
            Confirm Split Payment
          </Button>
        </div>
      </div>
    </div>
  )
}



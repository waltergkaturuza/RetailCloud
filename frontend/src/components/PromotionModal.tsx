import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import Button from './ui/Button'
import toast from 'react-hot-toast'

interface Promotion {
  id: number
  name: string
  code?: string
  promotion_type: string
  discount_percentage?: number
  discount_amount?: number
  description?: string
  is_valid: boolean
}

interface PromotionModalProps {
  cartItems: Array<{ product_id: number; quantity: number; unit_price: number; category_id?: number }>
  subtotal: number
  onApply: (promotion: Promotion, discount: number) => void
  onClose: () => void
}

export default function PromotionModal({ cartItems, subtotal, onApply, onClose }: PromotionModalProps) {
  const [promoCode, setPromoCode] = useState('')
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)

  // Fetch active promotions
  const { data: promotions, isLoading } = useQuery<Promotion[]>({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const response = await api.get('/pos/promotions/active/')
      return response.data
    }
  })

  // Apply promotion mutation
  const applyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/pos/promotions/apply/', data)
      return response.data
    },
    onSuccess: (data) => {
      if (selectedPromotion) {
        onApply(selectedPromotion, data.discount_amount)
        toast.success(`Promotion "${selectedPromotion.name}" applied! Discount: $${data.discount_amount.toFixed(2)}`)
        onClose()
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to apply promotion')
    }
  })

  const handleApplyPromoCode = () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promotion code')
      return
    }

    applyMutation.mutate({
      promotion_code: promoCode.trim(),
      subtotal: subtotal,
      items: cartItems
    })
  }

  const handleSelectPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion)
    applyMutation.mutate({
      promotion_id: promotion.id,
      subtotal: subtotal,
      items: cartItems
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Apply Promotion</h2>
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

        {/* Promo Code Input */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Enter Promotion Code
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleApplyPromoCode()
                }
              }}
              placeholder="Enter code..."
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #3498db',
                borderRadius: '8px',
                fontSize: '16px',
                textTransform: 'uppercase',
                fontFamily: 'monospace'
              }}
              autoFocus
            />
            <Button
              onClick={handleApplyPromoCode}
              isLoading={applyMutation.isPending}
              style={{ padding: '12px 24px' }}
            >
              Apply
            </Button>
          </div>
        </div>

        <div style={{ 
          textAlign: 'center', 
          padding: '12px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#7f8c8d'
        }}>
          OR select from available promotions
        </div>

        {/* Available Promotions */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
            Available Promotions
          </h3>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" />
            </div>
          ) : promotions && promotions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {promotions.map((promotion) => (
                <div
                  key={promotion.id}
                  onClick={() => handleSelectPromotion(promotion)}
                  style={{
                    padding: '16px',
                    border: '2px solid #e1e8ed',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: selectedPromotion?.id === promotion.id ? '#ebf5fb' : 'white'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPromotion?.id !== promotion.id) {
                      e.currentTarget.style.borderColor = '#3498db'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPromotion?.id !== promotion.id) {
                      e.currentTarget.style.borderColor = '#e1e8ed'
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px', color: '#2c3e50' }}>
                        {promotion.name}
                      </div>
                      {promotion.code && (
                        <div style={{ fontSize: '12px', color: '#3498db', fontFamily: 'monospace', marginBottom: '4px' }}>
                          Code: {promotion.code}
                        </div>
                      )}
                      {promotion.description && (
                        <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>
                          {promotion.description}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {promotion.promotion_type === 'percentage' && promotion.discount_percentage && (
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#2ecc71' }}>
                          {promotion.discount_percentage}% OFF
                        </div>
                      )}
                      {promotion.promotion_type === 'amount' && promotion.discount_amount && (
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#2ecc71' }}>
                          ${promotion.discount_amount.toFixed(2)} OFF
                        </div>
                      )}
                      {promotion.promotion_type === 'bogo' && (
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#2ecc71' }}>
                          Buy 1 Get 1 Free
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#95a5a6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      background: '#d4edda',
                      color: '#155724',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {promotion.promotion_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#7f8c8d' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎁</div>
              <div>No active promotions available</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}


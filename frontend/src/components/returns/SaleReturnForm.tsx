import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface SaleReturnFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface Sale {
  id: number
  invoice_number: string
  date: string
  customer_name?: string
  total_amount: string
  items: SaleItem[]
}

interface SaleItem {
  id: number
  product: number
  product_name: string
  quantity: number
  unit_price: string
  tax_amount: string
  discount_amount: string
  total: string
}

export default function SaleReturnForm({ onClose, onSuccess }: SaleReturnFormProps) {
  const queryClient = useQueryClient()
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [returnReason, setReturnReason] = useState('other')
  const [reasonDetails, setReasonDetails] = useState('')
  const [refundMethod, setRefundMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: { quantity: number; condition: string; notes: string } }>({})

  // Fetch sales
  const { data: salesResponse } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await api.get('/pos/sales/', {
        params: { status: 'completed', ordering: '-date' }
      })
      return response.data
    },
  })

  const sales: Sale[] = salesResponse?.results || salesResponse || []

  // Fetch selected sale details
  const { data: saleDetails } = useQuery({
    queryKey: ['sale', selectedSaleId],
    queryFn: async () => {
      if (!selectedSaleId) return null
      const response = await api.get(`/pos/sales/${selectedSaleId}/`)
      return response.data
    },
    enabled: !!selectedSaleId,
  })

  // Get already returned quantities
  const { data: existingReturns } = useQuery({
    queryKey: ['sale-returns-for-sale', selectedSaleId],
    queryFn: async () => {
      if (!selectedSaleId) return []
      const response = await api.get('/pos/sale-returns/', {
        params: { sale: selectedSaleId, status: 'approved,processed' }
      })
      return response.data?.results || response.data || []
    },
    enabled: !!selectedSaleId,
  })

  const createReturnMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/pos/sale-returns/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      toast.success('Return created successfully')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create return')
    },
  })

  const handleItemSelect = (itemId: number, maxQuantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        quantity: prev[itemId]?.quantity || 1,
        condition: prev[itemId]?.condition || 'new',
        notes: prev[itemId]?.notes || ''
      }
    }))
  }

  const handleQuantityChange = (itemId: number, quantity: number, maxQuantity: number) => {
    if (quantity > maxQuantity) quantity = maxQuantity
    if (quantity < 1) quantity = 1
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity }
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSaleId) {
      toast.error('Please select a sale')
      return
    }

    const items = Object.keys(selectedItems).map(itemId => {
      const item = saleDetails?.items?.find((i: SaleItem) => i.id === parseInt(itemId))
      if (!item) return null
      return {
        sale_item: parseInt(itemId),
        quantity_returned: selectedItems[parseInt(itemId)].quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || '0',
        tax_amount: item.tax_amount || '0',
        condition: selectedItems[parseInt(itemId)].condition,
        condition_notes: selectedItems[parseInt(itemId)].notes
      }
    }).filter(Boolean)

    if (items.length === 0) {
      toast.error('Please select at least one item to return')
      return
    }

    createReturnMutation.mutate({
      sale: selectedSaleId,
      return_reason: returnReason,
      reason_details: reasonDetails,
      refund_method: refundMethod,
      notes,
      items
    })
  }

  // Calculate available quantities
  const getAvailableQuantity = (itemId: number) => {
    const item = saleDetails?.items?.find((i: SaleItem) => i.id === itemId)
    if (!item) return 0

    const alreadyReturned = existingReturns?.reduce((total: number, ret: any) => {
      const retItem = ret.items?.find((ri: any) => ri.sale_item === itemId)
      return total + (retItem?.quantity_returned || 0)
    }, 0) || 0

    return item.quantity - alreadyReturned
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Create Customer Return</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Sale Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Sale *</label>
            <select
              value={selectedSaleId || ''}
              onChange={(e) => setSelectedSaleId(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            >
              <option value="">-- Select a sale --</option>
              {sales.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  {sale.invoice_number} - {new Date(sale.date).toLocaleDateString()} - ${parseFloat(sale.total_amount).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Sale Info */}
          {saleDetails && (
            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <strong>Invoice:</strong> {saleDetails.invoice_number}
                </div>
                <div>
                  <strong>Customer:</strong> {saleDetails.customer_name || 'Walk-in'}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(saleDetails.date).toLocaleString()}
                </div>
                <div>
                  <strong>Total:</strong> ${parseFloat(saleDetails.total_amount).toFixed(2)}
                </div>
              </div>

              {/* Items to Return */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Items to Return *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {saleDetails.items?.map((item: SaleItem) => {
                    const availableQty = getAvailableQuantity(item.id)
                    const isSelected = selectedItems[item.id]
                    const selectedQty = isSelected?.quantity || 0

                    if (availableQty <= 0) return null

                    return (
                      <div key={item.id} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px', background: isSelected ? '#e8f5e9' : 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <strong>{item.product_name}</strong>
                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                              Qty: {item.quantity} | Price: ${parseFloat(item.unit_price).toFixed(2)} | Available: {availableQty}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleItemSelect(item.id, availableQty)
                              } else {
                                setSelectedItems(prev => {
                                  const next = { ...prev }
                                  delete next[item.id]
                                  return next
                                })
                              }
                            }}
                            style={{ marginLeft: '12px' }}
                          />
                        </div>

                        {isSelected && (
                          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px' }}>
                            <div>
                              <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>Quantity</label>
                              <input
                                type="number"
                                min="1"
                                max={availableQty}
                                value={selectedQty}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1, availableQty)}
                                style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>Condition</label>
                              <select
                                value={isSelected.condition}
                                onChange={(e) => setSelectedItems(prev => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], condition: e.target.value }
                                }))}
                                style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                              >
                                <option value="new">New/Unopened</option>
                                <option value="opened">Opened</option>
                                <option value="damaged">Damaged</option>
                                <option value="defective">Defective</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>Condition Notes</label>
                              <input
                                type="text"
                                value={isSelected.notes}
                                onChange={(e) => setSelectedItems(prev => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], notes: e.target.value }
                                }))}
                                placeholder="Optional notes..."
                                style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Return Reason */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Return Reason *</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            >
              <option value="defective">Defective/Damaged Product</option>
              <option value="wrong_item">Wrong Item Received</option>
              <option value="not_as_described">Not as Described</option>
              <option value="changed_mind">Changed Mind</option>
              <option value="duplicate">Duplicate Purchase</option>
              <option value="expired">Expired Product</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Reason Details</label>
            <textarea
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              rows={3}
              placeholder="Provide additional details about the return..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Refund Method */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Refund Method *</label>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            >
              <option value="cash">Cash Refund</option>
              <option value="ecocash">EcoCash Refund</option>
              <option value="card">Card Refund</option>
              <option value="store_credit">Store Credit</option>
              <option value="exchange">Exchange Only</option>
              <option value="no_refund">No Refund</option>
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={createReturnMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createReturnMutation.isPending}>
              {createReturnMutation.isPending ? 'Creating...' : 'Create Return'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface PurchaseReturnFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface PurchaseOrder {
  id: number
  po_number: string
  supplier_name: string
  date: string
  status: string
  items: PurchaseOrderItem[]
}

interface PurchaseOrderItem {
  id: number
  product: number
  product_name: string
  quantity: number
  received_quantity: number
  unit_price: string
  total: string
}

export default function PurchaseReturnForm({ onClose, onSuccess }: PurchaseReturnFormProps) {
  const queryClient = useQueryClient()
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null)
  const [returnReason, setReturnReason] = useState('other')
  const [reasonDetails, setReasonDetails] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: { quantity: number; condition: string; notes: string } }>({})

  // Fetch purchase orders that have received items
  const { data: purchaseOrdersResponse } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await api.get('/purchases/purchase-orders/', {
        params: { status: 'received,partially_received', ordering: '-date' }
      })
      return response.data
    },
  })

  const purchaseOrders: PurchaseOrder[] = purchaseOrdersResponse?.results || purchaseOrdersResponse || []

  // Fetch selected PO details
  const { data: poDetails } = useQuery({
    queryKey: ['purchase-order', selectedPOId],
    queryFn: async () => {
      if (!selectedPOId) return null
      const response = await api.get(`/purchases/purchase-orders/${selectedPOId}/`)
      return response.data
    },
    enabled: !!selectedPOId,
  })

  // Get already returned quantities
  const { data: existingReturns } = useQuery({
    queryKey: ['purchase-returns-for-po', selectedPOId],
    queryFn: async () => {
      if (!selectedPOId) return []
      const response = await api.get('/pos/purchase-returns/', {
        params: { purchase_order: selectedPOId, status: 'approved,processed,received_by_supplier' }
      })
      return response.data?.results || response.data || []
    },
    enabled: !!selectedPOId,
  })

  const createReturnMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/pos/purchase-returns/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      toast.success('Purchase return created successfully')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create purchase return')
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

    if (!selectedPOId) {
      toast.error('Please select a purchase order')
      return
    }

    const items = Object.keys(selectedItems).map(itemId => {
      const item = poDetails?.items?.find((i: PurchaseOrderItem) => i.id === parseInt(itemId))
      if (!item) return null
      return {
        purchase_order_item: parseInt(itemId),
        quantity_returned: selectedItems[parseInt(itemId)].quantity,
        unit_price: item.unit_price,
        tax_amount: '0',
        condition: selectedItems[parseInt(itemId)].condition,
        condition_notes: selectedItems[parseInt(itemId)].notes
      }
    }).filter(Boolean)

    if (items.length === 0) {
      toast.error('Please select at least one item to return')
      return
    }

    createReturnMutation.mutate({
      purchase_order: selectedPOId,
      return_reason: returnReason,
      reason_details: reasonDetails,
      notes,
      items
    })
  }

  // Calculate available quantities
  const getAvailableQuantity = (itemId: number) => {
    const item = poDetails?.items?.find((i: PurchaseOrderItem) => i.id === itemId)
    if (!item) return 0

    const alreadyReturned = existingReturns?.reduce((total: number, ret: any) => {
      const retItem = ret.items?.find((ri: any) => ri.purchase_order_item === itemId)
      return total + (retItem?.quantity_returned || 0)
    }, 0) || 0

    return item.received_quantity - alreadyReturned
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Create Supplier Return</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Purchase Order Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Purchase Order *</label>
            <select
              value={selectedPOId || ''}
              onChange={(e) => setSelectedPOId(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            >
              <option value="">-- Select a purchase order --</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number} - {po.supplier_name} - {new Date(po.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {/* Selected PO Info */}
          {poDetails && (
            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <strong>PO Number:</strong> {poDetails.po_number}
                </div>
                <div>
                  <strong>Supplier:</strong> {poDetails.supplier_name}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(poDetails.date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Total:</strong> ${parseFloat(poDetails.total_amount).toFixed(2)}
                </div>
              </div>

              {/* Items to Return */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Items to Return *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {poDetails.items?.map((item: PurchaseOrderItem) => {
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
                              Received: {item.received_quantity} | Price: ${parseFloat(item.unit_price).toFixed(2)} | Available: {availableQty}
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
                                <option value="expired">Expired</option>
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
              <option value="defective">Defective/Damaged Goods</option>
              <option value="wrong_item">Wrong Item Received</option>
              <option value="overstocked">Overstocked</option>
              <option value="expired">Expired Products</option>
              <option value="quality_issue">Quality Issue</option>
              <option value="customer_return">Customer Returned to Us</option>
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




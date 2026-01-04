/**
 * Quotation Form Component
 */
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface QuotationLineItem {
  id?: number
  item_description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order?: number
}

interface Quotation {
  id?: number
  quotation_number?: string
  customer: number
  quotation_date: string
  valid_until: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_percentage: number
  discount_amount: number
  total_amount: number
  currency: string
  line_items: QuotationLineItem[]
  terms_and_conditions?: string
  notes?: string
}

interface QuotationFormProps {
  quotation?: Quotation | null
  onClose: () => void
  onSuccess: () => void
}

export default function QuotationForm({ quotation, onClose, onSuccess }: QuotationFormProps) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers/customers/')
      return response.data?.results || response.data || []
    },
  })

  const [formData, setFormData] = useState<Partial<Quotation>>({
    customer: quotation?.customer || 0,
    quotation_date: quotation?.quotation_date || format(new Date(), 'yyyy-MM-dd'),
    valid_until: quotation?.valid_until || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: quotation?.status || 'draft',
    tax_rate: quotation?.tax_rate || 0,
    discount_percentage: quotation?.discount_percentage || 0,
    currency: quotation?.currency || 'USD',
    line_items: quotation?.line_items || [{ item_description: '', quantity: 1, unit_price: 0, line_total: 0 }],
    terms_and_conditions: quotation?.terms_and_conditions || '',
    notes: quotation?.notes || '',
  })

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = formData.line_items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0
    const discountAmount = (subtotal * (formData.discount_percentage || 0)) / 100
    const subtotalAfterDiscount = subtotal - discountAmount
    const taxAmount = (subtotalAfterDiscount * (formData.tax_rate || 0)) / 100
    const total = subtotalAfterDiscount + taxAmount
    
    return { subtotal, discountAmount, taxAmount, total }
  }, [formData.line_items, formData.discount_percentage, formData.tax_rate])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (quotation?.id) {
        return api.patch(`/quotes/quotations/${quotation.id}/`, data)
      } else {
        return api.post('/quotes/quotations/', data)
      }
    },
    onSuccess: () => {
      toast.success(quotation?.id ? 'Quotation updated successfully' : 'Quotation created successfully')
      onSuccess()
    },
    onError: (error: any) => {
      const errorData = error.response?.data
      if (errorData) {
        setErrors(errorData)
        toast.error(errorData.detail || 'Failed to save quotation')
      } else {
        toast.error('Failed to save quotation')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!formData.customer) {
      setErrors({ customer: 'Please select a customer' })
      return
    }
    
    if (!formData.line_items || formData.line_items.length === 0) {
      setErrors({ line_items: 'Please add at least one line item' })
      return
    }

    const data = {
      ...formData,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      tax_amount: totals.taxAmount,
      total_amount: totals.total,
    }
    
    saveMutation.mutate(data)
  }

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...(formData.line_items || []), { item_description: '', quantity: 1, unit_price: 0, line_total: 0 }],
    })
  }

  const removeLineItem = (index: number) => {
    const newItems = formData.line_items?.filter((_, i) => i !== index) || []
    setFormData({ ...formData, line_items: newItems })
  }

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...(formData.line_items || [])]
    newItems[index] = { ...newItems[index], [field]: value }
    newItems[index].line_total = newItems[index].quantity * newItems[index].unit_price
    setFormData({ ...formData, line_items: newItems })
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={quotation?.id ? 'Edit Quotation' : 'New Quotation'}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Basic Information */}
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Customer *
                </label>
                <Select
                  value={formData.customer || ''}
                  onChange={(e) => setFormData({ ...formData, customer: parseInt(e.target.value) })}
                  options={[
                    { value: '', label: 'Select customer...' },
                    ...(customers || []).map((c: any) => ({ value: c.id, label: c.name })),
                  ]}
                />
                {errors.customer && <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>{errors.customer}</div>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Quotation Date *
                </label>
                <input
                  type="date"
                  value={formData.quotation_date}
                  onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Valid Until *
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'sent', label: 'Sent' },
                  ]}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Currency
                </label>
                <Select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'ZWL', label: 'ZWL' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Line Items</h3>
              <Button type="button" variant="secondary" size="small" onClick={addLineItem}>
                + Add Item
              </Button>
            </div>
            {errors.line_items && <div style={{ color: '#dc3545', fontSize: '12px', marginBottom: '12px' }}>{errors.line_items}</div>}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Quantity</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Unit Price</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Total</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.line_items?.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={item.item_description}
                          onChange={(e) => updateLineItem(index, 'item_description', e.target.value)}
                          className="input"
                          style={{ width: '100%' }}
                          placeholder="Item or service description"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="input"
                          style={{ width: '100px', textAlign: 'right' }}
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="input"
                          style={{ width: '120px', textAlign: 'right' }}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '500' }}>
                        {(item.quantity * item.unit_price).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {formData.line_items && formData.line_items.length > 1 && (
                          <Button
                            type="button"
                            variant="danger"
                            size="small"
                            onClick={() => removeLineItem(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pricing */}
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Pricing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.tax_rate || 0}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Discount (%)
                </label>
                <input
                  type="number"
                  value={formData.discount_percentage || 0}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600' }}>{formData.currency} {totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#28a745' }}>
                  <span>Discount:</span>
                  <span>-{formData.currency} {totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Tax:</span>
                  <span>{formData.currency} {totals.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #dee2e6', fontSize: '18px', fontWeight: '700' }}>
                <span>Total:</span>
                <span style={{ color: '#2ecc71' }}>{formData.currency} {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Terms & Notes */}
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Terms & Notes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms_and_conditions || ''}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="Payment terms, delivery terms, etc."
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Notes (Visible to Customer)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Additional notes for the customer"
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : quotation?.id ? 'Update Quotation' : 'Create Quotation'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}


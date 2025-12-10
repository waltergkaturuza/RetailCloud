import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import BranchSelector from '../components/BranchSelector'
import toast from 'react-hot-toast'

interface PurchaseOrder {
  id: number
  po_number: string
  supplier: number
  supplier_name: string
  branch: number
  branch_name: string
  date: string
  expected_delivery_date?: string
  subtotal: string
  tax_amount: string
  total_amount: string
  status: string
  notes?: string
  items?: any[]
}

export default function Purchases() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const [showGRNForm, setShowGRNForm] = useState<PurchaseOrder | null>(null)
  const [showDetails, setShowDetails] = useState<PurchaseOrder | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'grns'>('orders')
  const queryClient = useQueryClient()
  
  // Auto-open PO form if action=create-po in URL
  useEffect(() => {
    if (searchParams.get('action') === 'create-po') {
      setShowForm(true)
      setActiveTab('orders')
      // Clean up URL
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data: purchaseOrdersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await api.get('/purchases/purchase-orders/', {
        params: { ordering: '-date' }
      })
      return response.data
    },
  })

  const purchaseOrders = purchaseOrdersResponse?.results || purchaseOrdersResponse || []

  const { data: grnsResponse, isLoading: grnsLoading } = useQuery({
    queryKey: ['grns'],
    queryFn: async () => {
      const response = await api.get('/purchases/grns/', {
        params: { ordering: '-date' }
      })
      return response.data
    },
  })

  const grns = grnsResponse?.results || grnsResponse || []

  const { data: suppliersResponse } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers/suppliers/')
      return response.data
    },
  })

  const suppliers = suppliersResponse?.results || suppliersResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/purchases/purchase-orders/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete purchase order')
    },
  })

  const handleViewDetails = async (poId: number) => {
    try {
      const response = await api.get(`/purchases/purchase-orders/${poId}/`)
      setShowDetails(response.data)
    } catch (error: any) {
      toast.error('Failed to load purchase order details')
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Purchase Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage purchase orders and goods received ({purchaseOrders.length} POs, {grns.length} GRNs)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          + Create Purchase Order
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '24px',
        borderBottom: '2px solid #ecf0f1'
      }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'orders' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'orders' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('grns')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'grns' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'grns' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'grns' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Goods Received ({grns.length})
        </button>
      </div>

      {activeTab === 'orders' && (
        <Card>
          {ordersLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <div className="spinner" />
              <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading purchase orders...</p>
            </div>
          ) : purchaseOrders && purchaseOrders.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">PO Number</th>
                    <th className="table-header">Supplier</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Expected Delivery</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Amount</th>
                    <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                    <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po: PurchaseOrder) => (
                    <tr key={po.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#3498db', fontFamily: 'monospace' }}>
                        {po.po_number}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{po.supplier_name}</td>
                      <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '13px' }}>
                        {new Date(po.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '13px' }}>
                        {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600', textAlign: 'right', color: '#2ecc71' }}>
                        ${parseFloat(po.total_amount || '0').toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: getStatusColor(po.status).bg,
                          color: getStatusColor(po.status).color
                        }}>
                          {po.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => handleViewDetails(po.id)}
                          >
                            View
                          </Button>
                          {['draft', 'sent', 'partially_received'].includes(po.status) && (
                            <Button 
                              size="sm" 
                              variant="primary"
                              onClick={() => setShowGRNForm(po)}
                            >
                              {po.status === 'partially_received' ? 'Receive More' : 'Receive'}
                            </Button>
                          )}
                          {['draft'].includes(po.status) && (
                            <Button 
                              size="sm" 
                              variant="danger"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete PO ${po.po_number}?`)) {
                                  deleteMutation.mutate(po.id)
                                }
                              }}
                              isLoading={deleteMutation.isPending && deleteMutation.variables === po.id}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Purchase Orders</h3>
              <p style={{ marginBottom: '20px' }}>Create your first purchase order to start managing inventory purchases</p>
              <Button onClick={() => setShowForm(true)}>
                Create Purchase Order
              </Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'grns' && (
        <Card>
          {grnsLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <div className="spinner" />
              <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading GRNs...</p>
            </div>
          ) : grns && grns.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">GRN Number</th>
                    <th className="table-header">PO Number</th>
                    <th className="table-header">Supplier</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Invoice Number</th>
                    <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((grn: any) => (
                    <tr key={grn.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#3498db', fontFamily: 'monospace' }}>
                        {grn.grn_number}
                      </td>
                      <td style={{ padding: '12px', color: '#7f8c8d' }}>
                        {grn.purchase_order || '—'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{grn.supplier_name}</td>
                      <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '13px' }}>
                        {new Date(grn.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', color: '#7f8c8d', fontFamily: 'monospace' }}>
                        {grn.invoice_number || '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleViewDetails(grn.purchase_order)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Goods Received Notes</h3>
              <p>GRNs will appear here when you receive goods from suppliers</p>
            </div>
          )}
        </Card>
      )}

      {showForm && (
        <PurchaseOrderForm
          suppliers={suppliers}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
            toast.success('Purchase order created successfully')
          }}
        />
      )}

      {showGRNForm && (
        <GRNForm
          purchaseOrder={showGRNForm}
          onClose={() => setShowGRNForm(null)}
          onSuccess={() => {
            setShowGRNForm(null)
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
            queryClient.invalidateQueries({ queryKey: ['grns'] })
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
            toast.success('Goods received successfully')
          }}
        />
      )}

      {showDetails && (
        <PODetailsModal
          purchaseOrder={showDetails}
          onClose={() => setShowDetails(null)}
          onReceiveGoods={() => {
            setShowDetails(null)
            setShowGRNForm(showDetails)
          }}
        />
      )}
    </div>
  )
}

function PurchaseOrderForm({ suppliers, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    supplier: '',
    branch_id: null as number | null,
    expected_delivery_date: '',
    items: [{ product_id: '', quantity: 1, unit_price: '0' }],
    notes: '',
  })

  const [formErrors, setFormErrors] = useState<any>({})

  const { data: productsResponse } = useQuery({
    queryKey: ['products-for-po'],
    queryFn: async () => {
      const response = await api.get('/inventory/products/', {
        params: { is_active: true }
      })
      return response.data
    },
  })

  const products = productsResponse?.results || productsResponse || []

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.branch_id) {
        throw new Error('Branch is required')
      }
      
      const items = data.items.map((item: any) => ({
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price)
      }))

      const subtotal = items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unit_price), 0
      )
      
      return api.post('/purchases/purchase-orders/', {
        branch_id: parseInt(data.branch_id),
        supplier: parseInt(data.supplier),
        expected_delivery_date: data.expected_delivery_date || null,
        items: items,
        notes: data.notes || '',
      })
    },
    onSuccess: onSuccess,
    onError: (error: any) => {
      const errors = error.response?.data || {}
      setFormErrors(errors)
      toast.error('Failed to create purchase order. Please check the form for errors.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    
    if (!formData.supplier) {
      setFormErrors({ supplier: ['This field is required.'] })
      return
    }
    
    if (!formData.branch_id) {
      setFormErrors({ branch_id: ['This field is required.'] })
      return
    }
    
    if (formData.items.length === 0 || formData.items.some((item: any) => !item.product_id)) {
      toast.error('Please add at least one product')
      return
    }

    mutation.mutate(formData)
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (parseInt(newItems[index].quantity) || 0) * (parseFloat(newItems[index].unit_price) || 0)
    }
    setFormData({ ...formData, items: newItems })
  }

  const total = formData.items.reduce((sum, item) => 
    sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingBottom: '20px', borderBottom: '2px solid #ecf0f1' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>Create Purchase Order</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#7f8c8d' }}>Fill in the details to create a new purchase order</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8f9fa',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#7f8c8d',
              padding: '0',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e74c3c'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8f9fa'
              e.currentTarget.style.color = '#7f8c8d'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Basic Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#34495e' }}>
                  Branch <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <BranchSelector
                  selectedBranch={formData.branch_id}
                  onBranchChange={(branchId) => setFormData({ ...formData, branch_id: branchId as number })}
                  showAll={false}
                  label=""
                  placeholder="Select branch..."
                  style={{ 
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: formErrors.branch_id ? '2px solid #e74c3c' : '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                />
                {formErrors.branch_id && (
                  <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '6px' }}>
                    {Array.isArray(formErrors.branch_id) ? formErrors.branch_id[0] : formErrors.branch_id}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#34495e' }}>
                  Supplier <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="input"
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    fontSize: '14px', 
                    border: formErrors.supplier ? '2px solid #e74c3c' : '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {formErrors.supplier && (
                  <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '6px' }}>
                    {Array.isArray(formErrors.supplier) ? formErrors.supplier[0] : formErrors.supplier}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#34495e' }}>
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  className="input"
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📦</span> Order Items
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFormData({
                    ...formData,
                    items: [...formData.items, { product_id: '', quantity: 1, unit_price: '0' }]
                  })
                }}
                style={{ fontSize: '13px' }}
              >
                + Add Item
              </Button>
            </div>
            
            <div style={{ border: '1px solid #e1e8ed', borderRadius: '8px', overflow: 'hidden', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #dee2e6' }}>Product</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #dee2e6', width: '120px' }}>Quantity</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #dee2e6', width: '140px' }}>Unit Price</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #dee2e6', width: '120px' }}>Total</th>
                      <th style={{ padding: '14px 16px', width: '60px', borderBottom: '2px solid #dee2e6' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f3f5', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                            className="input"
                            style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
                            required
                          >
                            <option value="">Select Product</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} {p.cost_price ? `($${parseFloat(p.cost_price).toFixed(2)})` : ''}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="input"
                            style={{ width: '100%', padding: '8px 12px', fontSize: '14px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                            required
                          />
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <span style={{ color: '#7f8c8d', fontSize: '14px' }}>$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                              className="input"
                              style={{ width: '100px', padding: '8px 12px', fontSize: '14px', textAlign: 'right', border: '1px solid #ddd', borderRadius: '4px' }}
                              required
                            />
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                          ${((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  items: formData.items.filter((_, i) => i !== idx)
                                })
                              }}
                              style={{
                                background: '#fee',
                                color: '#e74c3c',
                                border: '1px solid #fcc',
                                borderRadius: '4px',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e74c3c'
                                e.currentTarget.style.color = 'white'
                                e.currentTarget.style.borderColor = '#e74c3c'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fee'
                                e.currentTarget.style.color = '#e74c3c'
                                e.currentTarget.style.borderColor = '#fcc'
                              }}
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
                      <td colSpan={3} style={{ padding: '16px', textAlign: 'right', fontWeight: '600', fontSize: '15px', color: '#495057' }}>
                        Grand Total:
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '18px', color: '#2ecc71' }}>
                        ${total.toFixed(2)}
                      </td>
                      <td style={{ padding: '16px' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span> Additional Notes
            </h3>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              style={{ 
                width: '100%', 
                minHeight: '100px', 
                resize: 'vertical',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
              placeholder="Add any additional notes or instructions for this purchase order..."
            />
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end', 
            paddingTop: '24px', 
            borderTop: '2px solid #ecf0f1',
            marginTop: '32px'
          }}>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose} 
              disabled={mutation.isPending}
              style={{ minWidth: '120px' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={mutation.isPending}
              style={{ minWidth: '180px' }}
            >
              {mutation.isPending ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GRNForm({ purchaseOrder, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    invoice_number: '',
    items: (purchaseOrder?.items || []).map((item: any) => ({
      purchase_order_item_id: item.id,
      product_id: item.product,
      product_name: item.product_name,
      ordered_quantity: item.quantity,
      received_quantity: item.quantity - item.received_quantity || item.quantity,
      batch_number: '',
      expiry_date: '',
      cost_price: item.unit_price,
    })),
    notes: '',
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const grnItems = data.items.map((item: any) => ({
        purchase_order_item: item.purchase_order_item_id,
        product: item.product_id,
        quantity_received: parseInt(item.received_quantity),
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || null,
        cost_price: parseFloat(item.cost_price),
      }))

      return api.post('/purchases/grns/', {
        purchase_order: purchaseOrder.id,
        branch_id: purchaseOrder.branch,  // Send branch_id from purchase order
        invoice_number: data.invoice_number,
        items: grnItems,
        notes: data.notes || '',
      })
    },
    onSuccess: onSuccess,
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create GRN')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Create Goods Received Note</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>×</button>
        </div>

        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
          <div><strong>PO Number:</strong> {purchaseOrder.po_number}</div>
          <div><strong>Supplier:</strong> {purchaseOrder.supplier_name}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Supplier Invoice Number</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="input"
              style={{ width: '100%' }}
              placeholder="Invoice number from supplier"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>Received Items</label>
            <div style={{ border: '1px solid #ecf0f1', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>Product</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Ordered</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Received</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Cost Price</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>Batch</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '10px' }}>{item.product_name}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{item.ordered_quantity}</td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="number"
                          min="1"
                          max={item.ordered_quantity}
                          value={item.received_quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items]
                            newItems[idx].received_quantity = e.target.value
                            setFormData({ ...formData, items: newItems })
                          }}
                          className="input"
                          style={{ width: '80px', textAlign: 'right' }}
                          required
                        />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost_price}
                          onChange={(e) => {
                            const newItems = [...formData.items]
                            newItems[idx].cost_price = e.target.value
                            setFormData({ ...formData, items: newItems })
                          }}
                          className="input"
                          style={{ width: '100px', textAlign: 'right' }}
                          required
                        />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          value={item.batch_number}
                          onChange={(e) => {
                            const newItems = [...formData.items]
                            newItems[idx].batch_number = e.target.value
                            setFormData({ ...formData, items: newItems })
                          }}
                          className="input"
                          style={{ width: '120px' }}
                          placeholder="Optional"
                        />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => {
                            const newItems = [...formData.items]
                            newItems[idx].expiry_date = e.target.value
                            setFormData({ ...formData, items: newItems })
                          }}
                          className="input"
                          style={{ width: '150px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Create GRN
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PODetailsModal({ purchaseOrder, onClose, onReceiveGoods }: any) {
  const canReceiveMore = purchaseOrder && ['draft', 'sent', 'partially_received'].includes(purchaseOrder.status)
  const hasUnreceivedItems = purchaseOrder?.items?.some((item: any) => (item.received_quantity || 0) < item.quantity)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Purchase Order Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Order Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>PO Number:</strong> {purchaseOrder.po_number}</div>
              <div><strong>Supplier:</strong> {purchaseOrder.supplier_name}</div>
              <div><strong>Branch:</strong> {purchaseOrder.branch_name}</div>
              <div><strong>Date:</strong> {new Date(purchaseOrder.date).toLocaleString()}</div>
              {purchaseOrder.expected_delivery_date && (
                <div><strong>Expected Delivery:</strong> {new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}</div>
              )}
              <div><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{purchaseOrder.status.replace('_', ' ')}</span></div>
            </div>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Totals</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>${parseFloat(purchaseOrder.subtotal || '0').toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax:</span>
                <span>${parseFloat(purchaseOrder.tax_amount || '0').toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', paddingTop: '8px', borderTop: '1px solid #ecf0f1' }}>
                <span>Total:</span>
                <span style={{ color: '#2ecc71' }}>${parseFloat(purchaseOrder.total_amount || '0').toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        {purchaseOrder.items && purchaseOrder.items.length > 0 && (
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Items</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Quantity</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Unit Price</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Total</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>${parseFloat(item.unit_price || '0').toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>${parseFloat(item.total || '0').toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {item.received_quantity || 0} / {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Show GRNs for this PO */}
        {purchaseOrder.grns && purchaseOrder.grns.length > 0 && (
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Goods Received Notes (GRNs)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {purchaseOrder.grns.map((grn: any) => (
                <div key={grn.id} style={{ padding: '12px', border: '1px solid #ecf0f1', borderRadius: '6px', background: '#f8f9fa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#3498db', fontFamily: 'monospace' }}>{grn.grn_number}</strong>
                    <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{new Date(grn.date).toLocaleString()}</span>
                  </div>
                  {grn.invoice_number && (
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                      <strong>Invoice:</strong> <span style={{ fontFamily: 'monospace' }}>{grn.invoice_number}</span>
                    </div>
                  )}
                  {grn.notes && (
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e1e8ed' }}>
                      <strong>Notes:</strong> {grn.notes}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '8px' }}>
                    Received by: {grn.received_by_name || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {purchaseOrder.notes && (
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Purchase Order Notes</h3>
            <p style={{ margin: 0, color: '#7f8c8d' }}>{purchaseOrder.notes}</p>
          </Card>
        )}

        <div style={{ 
          marginTop: '32px', 
          paddingTop: '24px',
          borderTop: '2px solid #ecf0f1',
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          {canReceiveMore && hasUnreceivedItems && (
            <Button 
              variant="primary"
              onClick={() => {
                onClose()
                onReceiveGoods()
              }}
              style={{ minWidth: '180px' }}
            >
              {purchaseOrder.status === 'partially_received' ? '📦 Receive More Goods' : '📦 Receive Goods'}
            </Button>
          )}
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </div>
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: { [key: string]: { bg: string; color: string } } = {
    draft: { bg: '#e2e3e5', color: '#383d41' },
    sent: { bg: '#d1ecf1', color: '#0c5460' },
    partially_received: { bg: '#fff3cd', color: '#856404' },
    received: { bg: '#d4edda', color: '#155724' },
    cancelled: { bg: '#f8d7da', color: '#721c24' },
  }
  return colors[status] || { bg: '#e2e3e5', color: '#383d41' }
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'
import SaleReturnForm from '../components/returns/SaleReturnForm'
import PurchaseReturnForm from '../components/returns/PurchaseReturnForm'
import ReturnDetailsModal from '../components/returns/ReturnDetailsModal'

interface SaleReturn {
  id: number
  return_number: string
  sale: number
  sale_invoice_number: string
  sale_date: string
  customer_name?: string
  branch_name: string
  date: string
  return_reason: string
  reason_details?: string
  subtotal: string
  tax_amount: string
  discount_amount: string
  total_amount: string
  refund_method: string
  refund_amount: string
  status: 'pending' | 'approved' | 'processed' | 'rejected' | 'cancelled'
  processed_by_name?: string
  approved_by_name?: string
  approved_at?: string
  rejection_reason?: string
  items?: any[]
}

interface PurchaseReturn {
  id: number
  return_number: string
  purchase_order: number
  purchase_order_number: string
  supplier_name: string
  branch_name: string
  date: string
  return_reason: string
  reason_details?: string
  subtotal: string
  tax_amount: string
  total_amount: string
  status: 'pending' | 'approved' | 'processed' | 'received_by_supplier' | 'rejected' | 'cancelled'
  created_by_name?: string
  approved_by_name?: string
  approved_at?: string
  rejection_reason?: string
  items?: any[]
}

export default function Returns() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales')
  const [showSaleReturnForm, setShowSaleReturnForm] = useState(false)
  const [showPurchaseReturnForm, setShowPurchaseReturnForm] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | PurchaseReturn | null>(null)
  const [returnType, setReturnType] = useState<'sale' | 'purchase'>('sale')

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'tenant_admin' || user?.role === 'super_admin' || user?.role === 'manager'
  const canCreatePurchaseReturns = ['supervisor', 'stock_controller', 'tenant_admin', 'super_admin', 'manager'].includes(user?.role || '')

  // Fetch sale returns
  const { data: saleReturnsResponse, isLoading: salesLoading } = useQuery({
    queryKey: ['sale-returns'],
    queryFn: async () => {
      const response = await api.get('/pos/sale-returns/', {
        params: { ordering: '-date' }
      })
      return response.data
    },
  })

  const saleReturns: SaleReturn[] = saleReturnsResponse?.results || saleReturnsResponse || []

  // Fetch purchase returns
  const { data: purchaseReturnsResponse, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchase-returns'],
    queryFn: async () => {
      const response = await api.get('/pos/purchase-returns/', {
        params: { ordering: '-date' }
      })
      return response.data
    },
  })

  const purchaseReturns: PurchaseReturn[] = purchaseReturnsResponse?.results || purchaseReturnsResponse || []

  // Approval mutations
  const approveSaleReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/pos/sale-returns/${id}/approve/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      toast.success('Return approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve return')
    },
  })

  const rejectSaleReturnMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/pos/sale-returns/${id}/reject/`, {
        rejection_reason: reason
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      toast.success('Return rejected')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject return')
    },
  })

  const processSaleReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/pos/sale-returns/${id}/process/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      toast.success('Return processed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process return')
    },
  })

  const approvePurchaseReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/pos/purchase-returns/${id}/approve/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      toast.success('Return approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve return')
    },
  })

  const processPurchaseReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/pos/purchase-returns/${id}/process/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      toast.success('Return processed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process return')
    },
  })

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: { bg: string; color: string } } = {
      pending: { bg: '#fff3cd', color: '#856404' },
      approved: { bg: '#d4edda', color: '#155724' },
      processed: { bg: '#cce5ff', color: '#004085' },
      rejected: { bg: '#f8d7da', color: '#721c24' },
      cancelled: { bg: '#e2e3e5', color: '#383d41' },
      received_by_supplier: { bg: '#d1ecf1', color: '#0c5460' },
    }
    return colors[status] || { bg: '#e2e3e5', color: '#383d41' }
  }

  const handleViewDetails = (returnItem: SaleReturn | PurchaseReturn, type: 'sale' | 'purchase') => {
    setSelectedReturn(returnItem)
    setReturnType(type)
  }

  const handleApprove = (id: number, type: 'sale' | 'purchase') => {
    if (confirm('Are you sure you want to approve this return?')) {
      if (type === 'sale') {
        approveSaleReturnMutation.mutate(id)
      } else {
        approvePurchaseReturnMutation.mutate(id)
      }
    }
  }

  const handleReject = (id: number) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (reason) {
      rejectSaleReturnMutation.mutate({ id, reason })
    }
  }

  const handleProcess = (id: number, type: 'sale' | 'purchase') => {
    if (confirm('Process this return? This will update inventory.')) {
      if (type === 'sale') {
        processSaleReturnMutation.mutate(id)
      } else {
        processPurchaseReturnMutation.mutate(id)
      }
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#2c3e50' }}>Returns Management</h1>
          <p style={{ margin: '8px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Manage customer and supplier returns
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'sales' && (
            <Button
              variant="primary"
              onClick={() => setShowSaleReturnForm(true)}
            >
              + Create Customer Return
            </Button>
          )}
          {activeTab === 'purchases' && canCreatePurchaseReturns && (
            <Button
              variant="primary"
              onClick={() => setShowPurchaseReturnForm(true)}
            >
              + Create Supplier Return
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #ecf0f1' }}>
        <button
          onClick={() => setActiveTab('sales')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            color: activeTab === 'sales' ? '#3498db' : '#7f8c8d',
            borderBottom: activeTab === 'sales' ? '3px solid #3498db' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          Customer Returns ({saleReturns.length})
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            color: activeTab === 'purchases' ? '#3498db' : '#7f8c8d',
            borderBottom: activeTab === 'purchases' ? '3px solid #3498db' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          Supplier Returns ({purchaseReturns.length})
        </button>
      </div>

      {/* Customer Returns Table */}
      {activeTab === 'sales' && (
        <Card>
          {salesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : saleReturns.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#7f8c8d' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Customer Returns</h3>
              <p>Create your first customer return to get started</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Return #</th>
                    <th className="table-header">Sale Invoice</th>
                    <th className="table-header">Customer</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Reason</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Amount</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {saleReturns.map((returnItem) => {
                    const statusStyle = getStatusColor(returnItem.status)
                    return (
                      <tr key={returnItem.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                          {returnItem.return_number}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {returnItem.sale_invoice_number}
                        </td>
                        <td>{returnItem.customer_name || 'Walk-in'}</td>
                        <td>{new Date(returnItem.date).toLocaleDateString()}</td>
                        <td>
                          <span style={{ fontSize: '13px' }}>
                            {returnItem.return_reason.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#e74c3c' }}>
                          ${parseFloat(returnItem.total_amount).toFixed(2)}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              textTransform: 'capitalize'
                            }}
                          >
                            {returnItem.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewDetails(returnItem, 'sale')}
                            >
                              View
                            </Button>
                            {returnItem.status === 'pending' && isSupervisor && (
                              <>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleApprove(returnItem.id, 'sale')}
                                  disabled={approveSaleReturnMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleReject(returnItem.id)}
                                  disabled={rejectSaleReturnMutation.isPending}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {(returnItem.status === 'approved' || (returnItem.status === 'pending' && !isSupervisor)) && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleProcess(returnItem.id, 'sale')}
                                disabled={processSaleReturnMutation.isPending}
                              >
                                Process
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Supplier Returns Table */}
      {activeTab === 'purchases' && (
        <Card>
          {purchasesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : purchaseReturns.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#7f8c8d' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Supplier Returns</h3>
              <p>Create your first supplier return to get started</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Return #</th>
                    <th className="table-header">PO Number</th>
                    <th className="table-header">Supplier</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Reason</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Amount</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseReturns.map((returnItem) => {
                    const statusStyle = getStatusColor(returnItem.status)
                    return (
                      <tr key={returnItem.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                          {returnItem.return_number}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {returnItem.purchase_order_number}
                        </td>
                        <td>{returnItem.supplier_name}</td>
                        <td>{new Date(returnItem.date).toLocaleDateString()}</td>
                        <td>
                          <span style={{ fontSize: '13px' }}>
                            {returnItem.return_reason.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#e74c3c' }}>
                          ${parseFloat(returnItem.total_amount).toFixed(2)}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              textTransform: 'capitalize'
                            }}
                          >
                            {returnItem.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewDetails(returnItem, 'purchase')}
                            >
                              View
                            </Button>
                            {returnItem.status === 'pending' && isSupervisor && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApprove(returnItem.id, 'purchase')}
                                disabled={approvePurchaseReturnMutation.isPending}
                              >
                                Approve
                              </Button>
                            )}
                            {(returnItem.status === 'approved' || returnItem.status === 'pending') && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleProcess(returnItem.id, 'purchase')}
                                disabled={processPurchaseReturnMutation.isPending}
                              >
                                Process
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      {showSaleReturnForm && (
        <SaleReturnForm
          onClose={() => setShowSaleReturnForm(false)}
          onSuccess={() => {
            setShowSaleReturnForm(false)
            queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
          }}
        />
      )}

      {showPurchaseReturnForm && (
        <PurchaseReturnForm
          onClose={() => setShowPurchaseReturnForm(false)}
          onSuccess={() => {
            setShowPurchaseReturnForm(false)
            queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
          }}
        />
      )}

      {selectedReturn && (
        <ReturnDetailsModal
          returnData={selectedReturn}
          returnType={returnType}
          onClose={() => setSelectedReturn(null)}
          onApprove={(id) => handleApprove(id, returnType)}
          onReject={handleReject}
          onProcess={(id) => handleProcess(id, returnType)}
          isSupervisor={isSupervisor}
        />
      )}
    </div>
  )
}




/**
 * Customer Invoices Management Page
 * Premium Feature - Quotations & Invoicing Module
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import InvoiceForm from '../components/quotes/InvoiceForm'
import PaymentModal from '../components/quotes/PaymentModal'

interface InvoiceLineItem {
  id?: number
  item_description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order?: number
}

interface Invoice {
  id: number
  invoice_number: string
  customer: number
  customer_detail?: {
    id: number
    name: string
    email?: string
    phone?: string
  }
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'refunded'
  status_display?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_percentage: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  currency: string
  line_items: InvoiceLineItem[]
  quotation?: number
  quotation_number?: string
  terms_and_conditions?: string
  notes?: string
  created_at: string
}

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const queryClient = useQueryClient()

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      try {
        const response = await api.get('/quotes/invoices/')
        return response.data?.results || response.data || []
      } catch (err: any) {
        if (err.response?.status === 403) {
          toast.error('Quotations & Invoicing module is not activated. Please activate it to use this feature.')
        }
        throw err
      }
    },
  })

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return []
    
    let filtered = invoices
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(i =>
        i.invoice_number.toLowerCase().includes(query) ||
        i.customer_detail?.name.toLowerCase().includes(query) ||
        i.customer_detail?.email?.toLowerCase().includes(query)
      )
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [invoices, statusFilter, searchQuery])

  // Send invoice mutation
  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/quotes/invoices/${id}/send/`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Invoice marked as sent')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/quotes/invoices/${id}/`)
    },
    onSuccess: () => {
      toast.success('Invoice deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete invoice')
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return { bg: '#f8f9fa', text: '#6c757d', badge: '#6c757d' }
      case 'sent': return { bg: '#d1ecf1', text: '#0c5460', badge: '#17a2b8' }
      case 'paid': return { bg: '#d4edda', text: '#155724', badge: '#28a745' }
      case 'partially_paid': return { bg: '#fff3cd', text: '#856404', badge: '#ffc107' }
      case 'overdue': return { bg: '#f8d7da', text: '#721c24', badge: '#dc3545' }
      case 'cancelled': return { bg: '#f8f9fa', text: '#6c757d', badge: '#6c757d' }
      case 'refunded': return { bg: '#f8d7da', text: '#721c24', badge: '#dc3545' }
      default: return { bg: '#f8f9fa', text: '#6c757d', badge: '#6c757d' }
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowForm(true)
  }

  const handleNew = () => {
    setSelectedInvoice(null)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setSelectedInvoice(null)
  }

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPaymentModal(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate(id)
    }
  }

  // Stats
  const stats = useMemo(() => {
    if (!invoices) return { total: 0, unpaid: 0, overdue: 0, totalValue: 0, totalPaid: 0, totalOutstanding: 0 }
    return {
      total: invoices.length,
      unpaid: invoices.filter(i => ['sent', 'partially_paid'].includes(i.status)).length,
      overdue: invoices.filter(i => i.status === 'overdue').length,
      totalValue: invoices.reduce((sum, i) => sum + parseFloat(String(i.total_amount || 0)), 0),
      totalPaid: invoices.reduce((sum, i) => sum + parseFloat(String(i.paid_amount || 0)), 0),
      totalOutstanding: invoices.reduce((sum, i) => sum + parseFloat(String(i.balance_due || 0)), 0),
    }
  }, [invoices])

  return (
    <div style={{ padding: '24px', width: '100%' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px', fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
            Invoices
          </h1>
          <p style={{ margin: 0, color: '#7f8c8d', fontSize: '14px' }}>
            Create and manage customer invoices
          </p>
        </div>
        <Button onClick={handleNew} variant="primary">
          + New Invoice
        </Button>
      </div>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Invoices</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{stats.total}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Unpaid</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffc107' }}>{stats.unpaid}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Overdue</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc3545' }}>{stats.overdue}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Outstanding</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc3545' }}>
              ${stats.totalOutstanding.toFixed(2)}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Paid</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#28a745' }}>
              ${stats.totalPaid.toFixed(2)}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search by invoice number, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
            }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Invoices List */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            No invoices found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Invoice #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Customer</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Due Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Total</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Paid</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Balance</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const statusColors = getStatusColor(invoice.status)
                  return (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{invoice.invoice_number}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '500' }}>{invoice.customer_detail?.name || 'N/A'}</div>
                        {invoice.customer_detail?.email && (
                          <div style={{ fontSize: '12px', color: '#999' }}>{invoice.customer_detail.email}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: invoice.status === 'overdue' ? '#dc3545' : '#666' }}>
                        {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: statusColors.badge + '20',
                            color: statusColors.badge,
                            textTransform: 'uppercase',
                          }}
                        >
                          {invoice.status_display || invoice.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontFamily: 'monospace' }}>
                        {invoice.currency} {parseFloat(String(invoice.total_amount)).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#28a745' }}>
                        {invoice.currency} {parseFloat(String(invoice.paid_amount)).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: invoice.balance_due > 0 ? '#dc3545' : '#28a745', fontWeight: '600' }}>
                        {invoice.currency} {parseFloat(String(invoice.balance_due)).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => window.open(`/api/quotes/invoices/${invoice.id}/pdf/`, '_blank')}
                            title="Download PDF"
                          >
                            📄 PDF
                          </Button>
                          {invoice.balance_due > 0 && (
                            <Button
                              size="small"
                              variant="success"
                              onClick={() => handlePayment(invoice)}
                            >
                              Record Payment
                            </Button>
                          )}
                          {invoice.status === 'draft' && (
                            <Button
                              size="small"
                              variant="primary"
                              onClick={() => sendMutation.mutate(invoice.id)}
                              disabled={sendMutation.isPending}
                            >
                              Send
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => handleEdit(invoice)}
                          >
                            Edit
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              size="small"
                              variant="danger"
                              onClick={() => handleDelete(invoice.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
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

      {/* Invoice Form Modal */}
      {showForm && (
        <InvoiceForm
          invoice={selectedInvoice}
          onClose={handleClose}
          onSuccess={() => {
            handleClose()
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedInvoice(null)
          }}
          onSuccess={() => {
            setShowPaymentModal(false)
            setSelectedInvoice(null)
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
          }}
        />
      )}
    </div>
  )
}


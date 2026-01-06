/**
 * Quotations Management Page
 * Premium Feature - Quotations & Invoicing Module
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import QuotationForm from '../components/quotes/QuotationForm'

interface QuotationLineItem {
  id?: number
  item_description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order?: number
}

interface Quotation {
  id: number
  quotation_number: string
  customer: number
  customer_detail?: {
    id: number
    name: string
    email?: string
    phone?: string
  }
  quotation_date: string
  valid_until: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
  status_display?: string
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
  invoice?: number
  created_at: string
}

export default function Quotations() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const queryClient = useQueryClient()

  // Fetch quotations
  const { data: quotations, isLoading } = useQuery<Quotation[]>({
    queryKey: ['quotations', statusFilter],
    queryFn: async () => {
      try {
        const response = await api.get('/quotes/quotations/')
        return response.data?.results || response.data || []
      } catch (err: any) {
        if (err.response?.status === 403) {
          toast.error('Quotations & Invoicing module is not activated. Please activate it to use this feature.')
        }
        throw err
      }
    },
  })

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    if (!quotations) return []
    
    let filtered = quotations
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(q =>
        q.quotation_number.toLowerCase().includes(query) ||
        q.customer_detail?.name.toLowerCase().includes(query) ||
        q.customer_detail?.email?.toLowerCase().includes(query)
      )
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [quotations, statusFilter, searchQuery])

  // Convert to invoice mutation
  const convertMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/quotes/quotations/${id}/convert_to_invoice/`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Quotation converted to invoice successfully')
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to convert quotation')
    },
  })

  // Accept/Reject mutations
  const acceptMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/quotes/quotations/${id}/accept/`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Quotation marked as accepted')
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/quotes/quotations/${id}/reject/`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Quotation marked as rejected')
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/quotes/quotations/${id}/`)
    },
    onSuccess: () => {
      toast.success('Quotation deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete quotation')
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return { bg: '#f8f9fa', text: '#6c757d', badge: '#6c757d' }
      case 'sent': return { bg: '#d1ecf1', text: '#0c5460', badge: '#17a2b8' }
      case 'accepted': return { bg: '#d4edda', text: '#155724', badge: '#28a745' }
      case 'rejected': return { bg: '#f8d7da', text: '#721c24', badge: '#dc3545' }
      case 'expired': return { bg: '#fff3cd', text: '#856404', badge: '#ffc107' }
      case 'converted': return { bg: '#d1ecf1', text: '#0c5460', badge: '#17a2b8' }
      default: return { bg: '#f8f9fa', text: '#6c757d', badge: '#6c757d' }
    }
  }

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
    setShowForm(true)
  }

  const handleNew = () => {
    setSelectedQuotation(null)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setSelectedQuotation(null)
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      deleteMutation.mutate(id)
    }
  }

  // Stats
  const stats = useMemo(() => {
    if (!quotations) return { total: 0, draft: 0, sent: 0, accepted: 0, totalValue: 0 }
    return {
      total: quotations.length,
      draft: quotations.filter(q => q.status === 'draft').length,
      sent: quotations.filter(q => q.status === 'sent').length,
      accepted: quotations.filter(q => q.status === 'accepted').length,
      totalValue: quotations.reduce((sum, q) => sum + parseFloat(String(q.total_amount || 0)), 0),
    }
  }, [quotations])

  return (
    <div style={{ padding: '24px', width: '100%' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px', fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
            Quotations
          </h1>
          <p style={{ margin: 0, color: '#7f8c8d', fontSize: '14px' }}>
            Create and manage quotations for your customers
          </p>
        </div>
        <Button onClick={handleNew} variant="primary">
          + New Quotation
        </Button>
      </div>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Quotations</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{stats.total}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Draft</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#6c757d' }}>{stats.draft}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Sent</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#17a2b8' }}>{stats.sent}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Accepted</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#28a745' }}>{stats.accepted}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Value</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2ecc71' }}>
              ${stats.totalValue.toFixed(2)}
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
              placeholder="Search by quotation number, customer..."
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
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
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

      {/* Quotations List */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : filteredQuotations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            No quotations found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Quotation #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Customer</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Valid Until</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((quotation) => {
                  const statusColors = getStatusColor(quotation.status)
                  return (
                    <tr key={quotation.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{quotation.quotation_number}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '500' }}>{quotation.customer_detail?.name || 'N/A'}</div>
                        {quotation.customer_detail?.email && (
                          <div style={{ fontSize: '12px', color: '#999' }}>{quotation.customer_detail.email}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {format(new Date(quotation.quotation_date), 'MMM dd, yyyy')}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {format(new Date(quotation.valid_until), 'MMM dd, yyyy')}
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
                          {quotation.status_display || quotation.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontFamily: 'monospace' }}>
                        {quotation.currency} {parseFloat(String(quotation.total_amount)).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => window.open(`/api/quotes/quotations/${quotation.id}/pdf/`, '_blank')}
                            title="Download PDF"
                          >
                            📄 PDF
                          </Button>
                          {quotation.status === 'accepted' && !quotation.invoice && (
                            <Button
                              size="small"
                              variant="success"
                              onClick={() => convertMutation.mutate(quotation.id)}
                              disabled={convertMutation.isPending}
                            >
                              Convert to Invoice
                            </Button>
                          )}
                          {quotation.status === 'sent' && (
                            <>
                              <Button
                                size="small"
                                variant="success"
                                onClick={() => acceptMutation.mutate(quotation.id)}
                                disabled={acceptMutation.isPending}
                              >
                                Accept
                              </Button>
                              <Button
                                size="small"
                                variant="warning"
                                onClick={() => rejectMutation.mutate(quotation.id)}
                                disabled={rejectMutation.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => handleEdit(quotation)}
                          >
                            Edit
                          </Button>
                          {quotation.status === 'draft' && (
                            <Button
                              size="small"
                              variant="danger"
                              onClick={() => handleDelete(quotation.id)}
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

      {/* Quotation Form Modal */}
      {showForm && (
        <QuotationForm
          quotation={selectedQuotation}
          onClose={handleClose}
          onSuccess={() => {
            handleClose()
            queryClient.invalidateQueries({ queryKey: ['quotations'] })
          }}
        />
      )}
    </div>
  )
}


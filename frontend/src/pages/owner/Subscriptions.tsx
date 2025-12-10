/**
 * Owner Subscription Management Page
 * View and manage all tenant subscriptions, invoices, and payments
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

interface Subscription {
  id: number
  tenant: number
  tenant_name: string
  package: number
  package_name: string
  billing_cycle: string
  status: string
  started_at: string
  current_period_start: string
  current_period_end: string
  cancelled_at?: string
  is_active: boolean
}

interface Invoice {
  id: number
  tenant: number
  tenant_name: string
  invoice_number: string
  amount: string
  tax_amount: string
  total_amount: string
  currency: string
  status: string
  due_date: string
  paid_at?: string
  created_at: string
}

interface Payment {
  id: number
  tenant: number
  tenant_name: string
  amount: string
  currency: string
  payment_method: string
  transaction_id: string
  status: string
  paid_at?: string
  created_at: string
}

export default function OwnerSubscriptions() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices' | 'payments'>('subscriptions')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch all subscriptions
  const { data: subscriptionsResponse } = useQuery({
    queryKey: ['owner-subscriptions', statusFilter],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const response = await api.get('/subscriptions/subscriptions/', { params })
      return response.data.results || response.data || []
    },
  })

  // Fetch all invoices
  const { data: invoicesResponse } = useQuery({
    queryKey: ['owner-invoices', statusFilter],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const response = await api.get('/subscriptions/invoices/', { params })
      return response.data.results || response.data || []
    },
  })

  // Fetch all payments
  const { data: paymentsResponse } = useQuery({
    queryKey: ['owner-payments', statusFilter],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const response = await api.get('/subscriptions/payments/', { params })
      return response.data.results || response.data || []
    },
  })

  const subscriptions = (subscriptionsResponse as Subscription[]) || []
  const invoices = (invoicesResponse as Invoice[]) || []
  const payments = (paymentsResponse as Payment[]) || []

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        sub.tenant_name.toLowerCase().includes(query) ||
        sub.package_name.toLowerCase().includes(query)
      )
    }
    return true
  })

  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        inv.tenant_name.toLowerCase().includes(query) ||
        inv.invoice_number.toLowerCase().includes(query)
      )
    }
    return true
  })

  const filteredPayments = payments.filter((pay) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        pay.tenant_name.toLowerCase().includes(query) ||
        pay.transaction_id.toLowerCase().includes(query)
      )
    }
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
      case 'completed':
        return '#28a745'
      case 'pending':
      case 'trial':
        return '#ffc107'
      case 'overdue':
      case 'past_due':
      case 'failed':
        return '#dc3545'
      case 'cancelled':
      case 'expired':
        return '#6c757d'
      default:
        return '#6c757d'
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
          Subscription Management
        </h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          Manage all tenant subscriptions, invoices, and payments across RetailCloud
        </p>
      </div>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#28a745', marginBottom: '4px' }}>
              {subscriptions.filter((s) => s.status === 'active').length}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Active Subscriptions</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc107', marginBottom: '4px' }}>
              {subscriptions.filter((s) => s.status === 'trial').length}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Trial Subscriptions</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea', marginBottom: '4px' }}>
              {invoices.filter((i) => i.status === 'paid').length}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Paid Invoices</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc3545', marginBottom: '4px' }}>
              {invoices.filter((i) => i.status === 'overdue').length}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Overdue Invoices</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#17a2b8', marginBottom: '4px' }}>
              {payments.filter((p) => p.status === 'completed').length}
            </div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Completed Payments</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #ecf0f1' }}>
        {[
          { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: '💳' },
          { id: 'invoices', label: `Invoices (${invoices.length})`, icon: '🧾' },
          { id: 'payments', label: `Payments (${payments.length})`, icon: '💵' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === tab.id ? '#667eea' : '#7f8c8d',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search by tenant name, package, invoice number..."
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
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <Button variant="secondary" onClick={() => { setSearchQuery(''); setStatusFilter('all') }}>
            Clear
          </Button>
        </div>
      </Card>

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <Card title="All Subscriptions">
          {filteredSubscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No subscriptions found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Tenant</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Package</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Billing Cycle</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Started</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Period End</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{sub.tenant_name}</td>
                      <td style={{ padding: '12px' }}>{sub.package_name}</td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{sub.billing_cycle}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: getStatusColor(sub.status),
                            color: 'white',
                            textTransform: 'uppercase',
                          }}
                        >
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {new Date(sub.started_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {new Date(sub.current_period_end).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <Card title="All Invoices">
          {filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No invoices found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Tenant</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Invoice #</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Due Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{inv.tenant_name}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '12px' }}>
                        {inv.currency} {parseFloat(inv.total_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: getStatusColor(inv.status),
                            color: 'white',
                            textTransform: 'uppercase',
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {new Date(inv.due_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <Card title="All Payments">
          {filteredPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No payments found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Tenant</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Method</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Transaction ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((pay) => (
                    <tr key={pay.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{pay.tenant_name}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {new Date(pay.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>
                        {pay.currency} {parseFloat(pay.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', textTransform: 'capitalize' }}>
                        {pay.payment_method.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace', color: '#6c757d' }}>
                        {pay.transaction_id || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: getStatusColor(pay.status),
                            color: 'white',
                            textTransform: 'uppercase',
                          }}
                        >
                          {pay.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}



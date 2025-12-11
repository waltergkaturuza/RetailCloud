/**
 * Subscription Management Component for Tenant Settings
 * Shows current subscription, invoices, payment history, and failed payments
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import Card from './ui/Card'
import Button from './ui/Button'

interface Subscription {
  id: number
  package_name: string
  billing_cycle: string
  status: string
  current_period_start: string
  current_period_end: string
  started_at: string
  is_active: boolean
}

interface Invoice {
  id: number
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
  amount: string
  currency: string
  payment_method: string
  transaction_id: string
  status: string
  paid_at?: string
  created_at: string
}

interface PricingRule {
  id: number
  name: string
  code: string
  category_price_monthly: number
  user_price_monthly: number
  branch_price_monthly: number
  yearly_discount_percent: number
  currency: string
  is_active: boolean
  is_default: boolean
  module_pricing_count: number
  module_pricing?: Array<{
    id: number
    module_name: string
    module_code: string
    price_monthly: number
    price_yearly: number
  }>
}

interface Package {
  id: number
  name: string
  code: string
  description: string
  price_monthly: number | string
  price_yearly: number | string
  currency: string
  max_users: number
  max_branches: number
  is_active: boolean
  modules?: Array<{
    id: number
    name: string
    code: string
    description: string
  }>
  modules_count?: number
  yearly_savings?: number | string
}

export default function SubscriptionManagement() {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'packages' | 'pricing' | 'invoices' | 'payments' | 'failed'>('overview')

  // Fetch pricing summary
  const { data: pricingSummary, isLoading: pricingLoading } = useQuery({
    queryKey: ['tenant-pricing-summary'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/tenant-modules/pricing_summary/')
        return response.data
      } catch {
        return null
      }
    },
  })

  // Fetch active pricing rule
  const { data: activePricingRule, isLoading: pricingRuleLoading } = useQuery<PricingRule>({
    queryKey: ['active-pricing-rule'],
    queryFn: async () => {
      try {
        const response = await api.get('/core/pricing-rules/active/')
        return response.data
      } catch {
        return null
      }
    },
  })

  // Fetch current subscription
  const { data: currentSubscription, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/subscriptions/current/')
        return response.data
      } catch (error: any) {
        // Return null for 404 (no subscription found) instead of throwing
        if (error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    retry: false,
  })

  // Fetch subscription history
  const { data: subscriptionHistory } = useQuery<Subscription[]>({
    queryKey: ['subscription-history'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/subscriptions/history/')
        return response.data || []
      } catch (error: any) {
        // Return empty array for 400/404 errors instead of throwing
        if (error.response?.status === 400 || error.response?.status === 404) {
          return []
        }
        throw error
      }
    },
    retry: false,
  })

  // Fetch invoices
  const { data: invoicesResponse } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/invoices/')
      return response.data.results || response.data || []
    },
  })

  // Fetch overdue invoices
  const { data: overdueInvoices } = useQuery<Invoice[]>({
    queryKey: ['overdue-invoices'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/invoices/overdue/')
      return response.data || []
    },
    retry: false,
  })

  // Fetch payment history
  const { data: paymentsResponse } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/payments/history/')
      return response.data.results || response.data || []
    },
  })

  // Fetch failed payments
  const { data: failedPayments } = useQuery<Payment[]>({
    queryKey: ['failed-payments'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/payments/failed/')
      return response.data || []
    },
    retry: false,
  })

  // Fetch available packages for upgrade
  const { data: packagesResponse } = useQuery<Package[]>({
    queryKey: ['available-packages'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/packages/')
        return response.data?.results || response.data || []
      } catch {
        return []
      }
    },
  })

  const invoices = (invoicesResponse as Invoice[]) || []
  const payments = (paymentsResponse as Payment[]) || []
  const availablePackages = (packagesResponse || []).filter((pkg: Package) => pkg.is_active).sort((a, b) => {
    const aPrice = typeof a.price_monthly === 'number' ? a.price_monthly : parseFloat(a.price_monthly?.toString() || '0')
    const bPrice = typeof b.price_monthly === 'number' ? b.price_monthly : parseFloat(b.price_monthly?.toString() || '0')
    return aPrice - bPrice
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
      case 'completed':
        return { bg: '#d4edda', border: '#c3e6cb', text: '#155724', badge: '#28a745' }
      case 'pending':
      case 'trial':
        return { bg: '#fff3cd', border: '#ffeaa7', text: '#856404', badge: '#ffc107' }
      case 'overdue':
      case 'past_due':
      case 'failed':
        return { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24', badge: '#dc3545' }
      case 'cancelled':
      case 'expired':
        return { bg: '#f8f9fa', border: '#e9ecef', text: '#6c757d', badge: '#6c757d' }
      default:
        return { bg: '#f8f9fa', border: '#e9ecef', text: '#6c757d', badge: '#6c757d' }
    }
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #ecf0f1',
        }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'packages', label: 'Available Plans', icon: '📦' },
          { id: 'invoices', label: `Invoices (${invoices.length})`, icon: '🧾' },
          { id: 'payments', label: `Payment History (${payments.length})`, icon: '💵' },
          { id: 'failed', label: `Failed Payments (${failedPayments?.length || 0})`, icon: '⚠️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeSubTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
              color: activeSubTab === tab.id ? '#667eea' : '#7f8c8d',
              fontWeight: activeSubTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && (
        <div>
          {/* Current Subscription */}
          <Card title="Current Subscription" style={{ marginBottom: '24px' }}>
            {subLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
            ) : !currentSubscription ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No active subscription
                </div>
                <div style={{ fontSize: '14px' }}>
                  Contact support to set up your subscription.
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Package</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>{currentSubscription.package_name}</div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Billing Cycle</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', textTransform: 'capitalize' }}>
                      {currentSubscription.billing_cycle}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Status</div>
                    <div>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getStatusColor(currentSubscription.status).badge,
                          color: 'white',
                          textTransform: 'uppercase',
                        }}
                      >
                        {currentSubscription.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Period End</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Subscription Details */}
                <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#6c757d' }}>Started:</span>{' '}
                      <span style={{ fontWeight: '500' }}>
                        {new Date(currentSubscription.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6c757d' }}>Current Period:</span>{' '}
                      <span style={{ fontWeight: '500' }}>
                        {new Date(currentSubscription.current_period_start).toLocaleDateString()} -{' '}
                        {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
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
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc107', marginBottom: '4px' }}>
                  {invoices.filter((i) => i.status === 'pending').length}
                </div>
                <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Pending Invoices</div>
              </div>
            </Card>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc3545', marginBottom: '4px' }}>
                  {overdueInvoices?.length || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Overdue Invoices</div>
              </div>
            </Card>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc3545', marginBottom: '4px' }}>
                  {failedPayments?.length || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Failed Payments</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Pricing Models Tab */}
      {activeSubTab === 'pricing' && (
        <div>
          {/* Active Pricing Rule */}
          <Card title="Active Pricing Model" style={{ marginBottom: '24px' }}>
            {pricingRuleLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading pricing information...</div>
            ) : !activePricingRule ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No active pricing model found
                </div>
                <div style={{ fontSize: '14px' }}>
                  Contact support for pricing information.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
                        {activePricingRule.name}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7f8c8d' }}>
                        {activePricingRule.code}
                      </p>
                    </div>
                    {activePricingRule.is_default && (
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: '#28a745',
                        color: 'white',
                      }}>
                        DEFAULT
                      </span>
                    )}
                  </div>
                </div>

                {/* Base Pricing */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Category Price (Monthly)</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      {activePricingRule.currency} {parseFloat(activePricingRule.category_price_monthly.toString()).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>User Price (Monthly)</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      {activePricingRule.currency} {parseFloat(activePricingRule.user_price_monthly.toString()).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Branch Price (Monthly)</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      {activePricingRule.currency} {parseFloat(activePricingRule.branch_price_monthly.toString()).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Yearly Discount</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                      {parseFloat(activePricingRule.yearly_discount_percent.toString()).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Module Pricing Overrides */}
                {activePricingRule.module_pricing_count > 0 && (
                  <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
                      Module-Specific Pricing ({activePricingRule.module_pricing_count} modules)
                    </h4>
                    {activePricingRule.module_pricing && activePricingRule.module_pricing.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Module</th>
                              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Monthly Price</th>
                              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Yearly Price</th>
                              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Savings</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activePricingRule.module_pricing.map((mp) => {
                              const monthlyPrice = parseFloat(mp.price_monthly.toString())
                              const yearlyPrice = parseFloat(mp.price_yearly?.toString() || (monthlyPrice * 12 * (1 - parseFloat(activePricingRule.yearly_discount_percent.toString()) / 100)).toString())
                              const savings = (monthlyPrice * 12) - yearlyPrice
                              return (
                                <tr key={mp.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                  <td style={{ padding: '12px', fontWeight: '500' }}>{mp.module_name}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                    {activePricingRule.currency} {monthlyPrice.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                    {activePricingRule.currency} {yearlyPrice.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#28a745', fontWeight: '600' }}>
                                    {activePricingRule.currency} {savings.toFixed(2)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d', fontSize: '14px' }}>
                        No module-specific pricing overrides. Using base pricing for all modules.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Pricing Summary */}
          {pricingSummary && (
            <Card title="Your Current Pricing Summary">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px'
              }}>
                <div style={{ padding: '16px', background: '#e3f2fd', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Monthly Total</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1976d2' }}>
                    {pricingSummary.currency || 'USD'} {parseFloat(pricingSummary.total_monthly?.toString() || '0').toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#e8f5e9', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Yearly Total</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#388e3c' }}>
                    {pricingSummary.currency || 'USD'} {parseFloat(pricingSummary.total_yearly?.toString() || '0').toFixed(2)}
                  </div>
                </div>
                {pricingSummary.breakdown && pricingSummary.breakdown.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>Cost Breakdown</h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {pricingSummary.breakdown.map((item: any, idx: number) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '12px', 
                          background: '#f8f9fa', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}>
                          <span style={{ color: '#6c757d' }}>{item.description || item.name}</span>
                          <span style={{ fontWeight: '600' }}>
                            {pricingSummary.currency || 'USD'} {parseFloat(item.amount?.toString() || '0').toFixed(2)}/mo
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeSubTab === 'invoices' && (
        <Card title="Invoices">
          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No invoices found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Invoice #</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Due Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Paid Date</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const statusColors = getStatusColor(invoice.status)
                    return (
                      <tr key={invoice.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{invoice.invoice_number}</td>
                        <td style={{ padding: '12px' }}>
                          {invoice.currency} {parseFloat(invoice.total_amount).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: statusColors.badge,
                              color: 'white',
                              textTransform: 'uppercase',
                            }}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <Button size="small" variant="secondary">
                            Download
                          </Button>
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

      {/* Payments Tab */}
      {activeSubTab === 'payments' && (
        <Card title="Payment History">
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No payment history found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Method</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Transaction ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const statusColors = getStatusColor(payment.status)
                    return (
                      <tr key={payment.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '600' }}>
                          {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', textTransform: 'capitalize' }}>
                          {payment.payment_method.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#6c757d', fontFamily: 'monospace' }}>
                          {payment.transaction_id || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: statusColors.badge,
                              color: 'white',
                              textTransform: 'uppercase',
                            }}
                          >
                            {payment.status}
                          </span>
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

      {/* Failed Payments Tab */}
      {activeSubTab === 'failed' && (
        <Card title="Failed Payments">
          {!failedPayments || failedPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '16px', fontWeight: '500' }}>No failed payments</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>All your payments have been successful.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Method</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Transaction ID</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6c757d' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {failedPayments.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>
                        {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', textTransform: 'capitalize' }}>
                        {payment.payment_method.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#6c757d', fontFamily: 'monospace' }}>
                        {payment.transaction_id || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <Button size="small">Retry Payment</Button>
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


/**
 * Detailed Tenant Information Modal
 * Shows comprehensive information about a tenant
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { motion, AnimatePresence } from 'framer-motion'

interface TenantDetailsModalProps {
  tenantId: number
  tenantName: string
  onClose: () => void
}

interface TenantDetails {
  id: number
  name: string
  slug: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  country: string
  city: string
  subscription_status: string
  trial_ends_at?: string
  subscription_ends_at?: string
  timezone: string
  currency: string
  tax_rate: string
  vat_number?: string
  business_category_name?: string
  business_category_icon?: string
  user_count: number
  branch_count: number
  sales_today: number
  sales_this_month: number
  subscription_name?: string
  enabled_modules: Array<{ id: number; code: string; name: string; category: string }>
  users: Array<{
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    full_name: string
    phone: string
    role: string
    role_display: string
    branch_name?: string
    is_active: boolean
    is_email_verified: boolean
    created_at: string
  }>
  branches: Array<{
    id: number
    name: string
    code: string
    address: string
    phone: string
    email: string
    manager_name?: string
    manager_email?: string
    staff_count: number
    is_active: boolean
    is_main: boolean
    created_at: string
  }>
  product_count: number
  total_stock_quantity: number
  low_stock_count: number
  customer_count: number
  total_sales_all_time: number
  role_distribution: Record<string, number>
  created_at: string
  updated_at: string
}

export default function TenantDetailsModal({ tenantId, tenantName, onClose }: TenantDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'branches' | 'modules' | 'subscription' | 'statistics'>('overview')

  const { data: tenantDetails, isLoading, error } = useQuery({
    queryKey: ['tenant-details', tenantId],
    queryFn: async () => {
      const response = await api.get(`/owner/tenants/${tenantId}/detailed_stats/`)
      return response.data as TenantDetails
    },
  })

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '1200px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="spinner" style={{ marginBottom: '16px' }} />
            <div style={{ color: '#7f8c8d' }}>Loading tenant details...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tenantDetails) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '1200px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '60px', textAlign: 'center', color: '#e74c3c' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3>Failed to load tenant details</h3>
            <p style={{ marginTop: '12px', color: '#7f8c8d' }}>
              {error ? 'An error occurred while loading data.' : 'Tenant details not found.'}
            </p>
            <Button onClick={onClose} style={{ marginTop: '24px' }}>Close</Button>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: `Users (${tenantDetails.user_count})`, icon: '👥' },
    { id: 'branches', label: `Branches (${tenantDetails.branch_count})`, icon: '🏢' },
    { id: 'modules', label: `Modules (${tenantDetails.enabled_modules.length})`, icon: '🔌' },
    { id: 'subscription', label: 'Subscription & Billing', icon: '💳' },
    { id: 'statistics', label: 'Statistics', icon: '📈' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        style={{ maxWidth: '1200px', width: '90%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {tenantDetails.company_name}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
              {tenantDetails.business_category_name && (
                <span>{tenantDetails.business_category_icon} {tenantDetails.business_category_name} • </span>
              )}
              Slug: {tenantDetails.slug}
            </p>
          </div>
          <Button variant="secondary" onClick={onClose}>✕ Close</Button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#f8f9fa' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '16px 24px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #3498db' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? '600' : '400',
                color: activeTab === tab.id ? '#2c3e50' : '#7f8c8d',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ marginRight: '8px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <OverviewTab tenant={tenantDetails} />
              </motion.div>
            )}
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <UsersTab users={tenantDetails.users} roleDistribution={tenantDetails.role_distribution} />
              </motion.div>
            )}
            {activeTab === 'branches' && (
              <motion.div
                key="branches"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <BranchesTab branches={tenantDetails.branches} />
              </motion.div>
            )}
            {activeTab === 'modules' && (
              <motion.div
                key="modules"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ModulesTab modules={tenantDetails.enabled_modules} />
              </motion.div>
            )}
            {activeTab === 'subscription' && (
              <motion.div
                key="subscription"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SubscriptionTab tenantId={tenantId} tenantName={tenantDetails.company_name} />
              </motion.div>
            )}
            {activeTab === 'statistics' && (
              <motion.div
                key="statistics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <StatisticsTab tenant={tenantDetails} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

function OverviewTab({ tenant }: { tenant: TenantDetails }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{tenant.user_count}</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Users</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{tenant.branch_count}</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Branches</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{tenant.product_count}</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Products</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{tenant.customer_count}</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Customers</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {tenant.currency} {tenant.total_sales_all_time.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Sales (All Time)</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {tenant.currency} {tenant.sales_this_month.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Sales This Month</div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>Company Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Contact Person</div>
              <div style={{ fontWeight: '500' }}>{tenant.contact_person}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Email</div>
              <div>{tenant.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Phone</div>
              <div>{tenant.phone}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Address</div>
              <div>{tenant.address || 'Not provided'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Location</div>
              <div>{tenant.city}, {tenant.country}</div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>Subscription Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Status</div>
              <div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: tenant.subscription_status === 'active' ? '#d4edda' : 
                             tenant.subscription_status === 'suspended' ? '#f8d7da' : '#fff3cd',
                  color: tenant.subscription_status === 'active' ? '#155724' : 
                        tenant.subscription_status === 'suspended' ? '#721c24' : '#856404',
                }}>
                  {tenant.subscription_status.toUpperCase()}
                </span>
              </div>
            </div>
            {tenant.subscription_name && (
              <div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Package</div>
                <div style={{ fontWeight: '500' }}>{tenant.subscription_name}</div>
              </div>
            )}
            {tenant.trial_ends_at && (
              <div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Trial Ends</div>
                <div>{new Date(tenant.trial_ends_at).toLocaleDateString()}</div>
              </div>
            )}
            {tenant.subscription_ends_at && (
              <div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Subscription Ends</div>
                <div>{new Date(tenant.subscription_ends_at).toLocaleDateString()}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Currency</div>
              <div>{tenant.currency}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Tax Rate</div>
              <div>{parseFloat(tenant.tax_rate).toFixed(2)}%</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function UsersTab({ users, roleDistribution }: { users: TenantDetails['users'], roleDistribution: Record<string, number> }) {
  return (
    <div>
      <Card style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>Role Distribution</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {Object.entries(roleDistribution).map(([role, count]) => (
            <div key={role} style={{
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
            }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>{count}</div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', textTransform: 'capitalize' }}>
                {role.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>All Users</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#7f8c8d' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#7f8c8d' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#7f8c8d' }}>Role</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#7f8c8d' }}>Branch</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#7f8c8d' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#7f8c8d' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{user.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>@{user.username}</div>
                  </td>
                  <td style={{ padding: '12px' }}>{user.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: '#e3f2fd',
                      color: '#1976d2',
                    }}>
                      {user.role_display}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{user.branch_name || '-'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: user.is_active ? '#d4edda' : '#f8d7da',
                      color: user.is_active ? '#155724' : '#721c24',
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function BranchesTab({ branches }: { branches: TenantDetails['branches'] }) {
  return (
    <div>
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>All Branches</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {branches.map((branch) => (
            <Card key={branch.id} style={{ background: branch.is_main ? '#f0f8ff' : 'white' }}>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                      {branch.name}
                      {branch.is_main && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3498db' }}>🏠 Main</span>}
                    </h4>
                    <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>Code: {branch.code}</div>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: branch.is_active ? '#d4edda' : '#f8d7da',
                    color: branch.is_active ? '#155724' : '#721c24',
                  }}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {branch.address && (
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#2c3e50' }}>
                    📍 {branch.address}
                  </div>
                )}
                {branch.phone && (
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#2c3e50' }}>
                    📞 {branch.phone}
                  </div>
                )}
                {branch.email && (
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#2c3e50' }}>
                    ✉️ {branch.email}
                  </div>
                )}
                {branch.manager_name && (
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#2c3e50' }}>
                    👤 Manager: {branch.manager_name}
                  </div>
                )}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0', fontSize: '13px', color: '#7f8c8d' }}>
                  👥 {branch.staff_count} staff members
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ModulesTab({ modules }: { modules: TenantDetails['enabled_modules'] }) {
  return (
    <div>
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>Enabled Modules</h3>
        {modules.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
            <p>No modules enabled for this tenant.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {modules.map((module) => (
              <Card key={module.id} style={{ padding: '16px' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔌</div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{module.name}</div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>Code: {module.code}</div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Category: {module.category}</div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function SubscriptionTab({ tenantId, tenantName }: { tenantId: number; tenantName: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'invoices' | 'payments' | 'history'>('overview')

  // Fetch subscription data
  const { data: subscription, isLoading: subLoading, error: subError } = useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: async () => {
      const response = await api.get(`/owner/tenants/${tenantId}/subscription/`)
      return response.data
    },
    retry: false,
  })

  const { data: invoices } = useQuery({
    queryKey: ['tenant-invoices', tenantId],
    queryFn: async () => {
      const response = await api.get(`/subscriptions/invoices/?tenant=${tenantId}`)
      return response.data.results || response.data || []
    },
  })

  const { data: payments } = useQuery({
    queryKey: ['tenant-payments', tenantId],
    queryFn: async () => {
      const response = await api.get(`/subscriptions/payments/?tenant=${tenantId}`)
      return response.data.results || response.data || []
    },
  })

  const { data: subscriptionHistory } = useQuery({
    queryKey: ['tenant-subscription-history', tenantId],
    queryFn: async () => {
      const response = await api.get(`/subscriptions/subscriptions/history/?tenant=${tenantId}`)
      return response.data || []
    },
  })

  if (subLoading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading subscription data...</div>
  }

  // Check if subscription is null (no subscription exists)
  const hasSubscription = subscription && subscription.id !== null

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #ecf0f1' }}>
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'invoices', label: `Invoices (${(invoices as any[])?.length || 0})`, icon: '🧾' },
          { id: 'payments', label: `Payments (${(payments as any[])?.length || 0})`, icon: '💵' },
          { id: 'history', label: 'History', icon: '📜' },
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
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'overview' && (
        <Card title="Subscription Details">
          {hasSubscription ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Package</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{subscription.package_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Billing Cycle</div>
                <div style={{ fontSize: '18px', fontWeight: '600', textTransform: 'capitalize' }}>
                  {subscription.billing_cycle}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Status</div>
                <div>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: subscription.status === 'active' ? '#28a745' : '#ffc107',
                      color: 'white',
                      textTransform: 'uppercase',
                    }}
                  >
                    {subscription.status}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Period End</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No subscription found for this tenant.
            </div>
          )}
        </Card>
      )}

      {activeSubTab === 'invoices' && (
        <Card title="Invoices">
          {(invoices as any[])?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No invoices found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Invoice #</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoices as any[]).map((invoice: any) => (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px' }}>{invoice.invoice_number}</td>
                      <td style={{ padding: '12px' }}>
                        {invoice.currency} {parseFloat(invoice.total_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: invoice.status === 'paid' ? '#28a745' : '#ffc107',
                            color: 'white',
                          }}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{new Date(invoice.due_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeSubTab === 'payments' && (
        <Card title="Payments">
          {(payments as any[])?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No payments found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Method</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments as any[]).map((payment: any) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px' }}>{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>
                        {payment.payment_method.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: payment.status === 'completed' ? '#28a745' : '#dc3545',
                            color: 'white',
                          }}
                        >
                          {payment.status}
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

      {activeSubTab === 'history' && (
        <Card title="Subscription History">
          {!subscriptionHistory || (subscriptionHistory as any[]).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No subscription history.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Package</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Billing Cycle</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Started</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Ended</th>
                  </tr>
                </thead>
                <tbody>
                  {(subscriptionHistory as any[]).map((sub: any) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '12px' }}>{sub.package_name}</td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{sub.billing_cycle}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: sub.status === 'active' ? '#28a745' : '#6c757d',
                            color: 'white',
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{new Date(sub.started_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        {sub.cancelled_at ? new Date(sub.cancelled_at).toLocaleDateString() : '-'}
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

function StatisticsTab({ tenant }: { tenant: TenantDetails }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{tenant.product_count}</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Products</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{tenant.total_stock_quantity.toLocaleString()}</div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Stock Quantity</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: tenant.low_stock_count > 0 ? '#e74c3c' : '#27ae60' }}>
              {tenant.low_stock_count}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Low Stock Items</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {tenant.currency} {tenant.sales_today.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Sales Today</div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>Sales Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>Today</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {tenant.currency} {tenant.sales_today.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>This Month</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {tenant.currency} {tenant.sales_this_month.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>All Time</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {tenant.currency} {tenant.total_sales_all_time.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}


/**
 * Chart of Accounts Management Page
 * Premium Feature - Double-Entry Bookkeeping
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import AccountForm from '../components/accounting/AccountForm'

interface ChartAccount {
  id: number
  code: string
  name: string
  description: string
  account_type: string
  account_type_display: string
  parent: number | null
  parent_code?: string
  parent_name?: string
  is_active: boolean
  is_system_account: boolean
  normal_balance: string
  normal_balance_display: string
  allow_manual_entries: boolean
  requires_reconciliation: boolean
  current_balance?: {
    net_balance: number
    debit_balance: number
    credit_balance: number
  }
  sub_account_count: number
}

export default function ChartOfAccounts() {
  const [searchQuery, setSearchQuery] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(null)
  const queryClient = useQueryClient()

  // Fetch all accounts
  const { data: accounts, isLoading, error } = useQuery<ChartAccount[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      try {
        const response = await api.get('/accounting/chart-of-accounts/')
        return response.data?.results || response.data || []
      } catch (err: any) {
        if (err.response?.status === 403) {
          throw new Error('Accounting module is not activated. Please activate it to use double-entry bookkeeping features.')
        }
        throw err
      }
    },
  })

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    if (!accounts) return []
    
    let filtered = accounts
    
    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(acc => acc.is_active)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(acc => !acc.is_active)
    }
    
    // Filter by account type
    if (accountTypeFilter !== 'all') {
      filtered = filtered.filter(acc => acc.account_type === accountTypeFilter)
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(acc =>
        acc.code.toLowerCase().includes(query) ||
        acc.name.toLowerCase().includes(query) ||
        acc.description.toLowerCase().includes(query)
      )
    }
    
    return filtered.sort((a, b) => a.code.localeCompare(b.code))
  }, [accounts, statusFilter, accountTypeFilter, searchQuery])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (account: Partial<ChartAccount>) => {
      if (account.id) {
        return api.patch(`/accounting/chart-of-accounts/${account.id}/`, account)
      } else {
        return api.post('/accounting/chart-of-accounts/', account)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      toast.success(selectedAccount?.id ? 'Account updated successfully!' : 'Account created successfully!')
      setShowForm(false)
      setSelectedAccount(null)
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save account'
      toast.error(errorMsg)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/accounting/chart-of-accounts/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      toast.success('Account deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete account')
    },
  })

  const handleCreate = () => {
    setSelectedAccount(null)
    setShowForm(true)
  }

  const handleEdit = (account: ChartAccount) => {
    setSelectedAccount(account)
    setShowForm(true)
  }

  const handleDelete = (account: ChartAccount) => {
    if (account.is_system_account) {
      toast.error('System accounts cannot be deleted')
      return
    }
    if (confirm(`Are you sure you want to delete account "${account.code} - ${account.name}"?`)) {
      deleteMutation.mutate(account.id)
    }
  }

  const accountTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'asset_current', label: 'Current Assets' },
    { value: 'asset_fixed', label: 'Fixed Assets' },
    { value: 'asset_intangible', label: 'Intangible Assets' },
    { value: 'liability_current', label: 'Current Liabilities' },
    { value: 'liability_long_term', label: 'Long-Term Liabilities' },
    { value: 'equity', label: 'Equity' },
    { value: 'equity_retained', label: 'Retained Earnings' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'revenue_other', label: 'Other Income' },
    { value: 'expense', label: 'Expenses' },
    { value: 'expense_cogs', label: 'Cost of Goods Sold' },
  ]

  const stats = useMemo(() => {
    if (!accounts) return { total: 0, active: 0, inactive: 0 }
    return {
      total: accounts.length,
      active: accounts.filter(a => a.is_active).length,
      inactive: accounts.filter(a => !a.is_active).length,
    }
  }, [accounts])

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#e74c3c', marginBottom: '16px' }}>
              {(error as Error).message || 'Failed to load accounts'}
            </div>
            <p style={{ color: '#6c757d' }}>
              This feature requires the Accounting module to be activated.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading accounts...</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#2c3e50' }}>
            📊 Chart of Accounts
          </h1>
          <p style={{ margin: '8px 0 0', color: '#6c757d', fontSize: '14px' }}>
            Manage your account structure for double-entry bookkeeping
          </p>
        </div>
        <Button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>➕</span>
          Create Account
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Accounts</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{stats.total}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Active</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#27ae60' }}>{stats.active}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Inactive</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#e74c3c' }}>{stats.inactive}</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px',
              }}
            >
              {accountTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'all' ? '#3498db' : 'white',
                color: statusFilter === 'all' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'all' ? '600' : '400',
              }}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'active' ? '#27ae60' : 'white',
                color: statusFilter === 'active' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'active' ? '600' : '400',
              }}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'inactive' ? '#e74c3c' : 'white',
                color: statusFilter === 'inactive' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'inactive' ? '600' : '400',
              }}
            >
              Inactive
            </button>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      {filteredAccounts.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d', marginBottom: '8px' }}>
              {searchQuery ? 'No accounts found' : 'No accounts yet'}
            </div>
            {!searchQuery && (
              <Button onClick={handleCreate} style={{ marginTop: '16px' }}>
                Create Your First Account
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Code</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Normal Balance</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Balance</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: '#3498db' }}>
                      {account.code}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500', color: '#2c3e50' }}>{account.name}</div>
                      {account.description && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                          {account.description.substring(0, 60)}
                          {account.description.length > 60 ? '...' : ''}
                        </div>
                      )}
                      {account.parent_name && (
                        <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '2px' }}>
                          Parent: {account.parent_code} - {account.parent_name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#6c757d' }}>
                      {account.account_type_display}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: account.normal_balance === 'debit' ? '#e8f5e9' : '#fff3e0',
                        color: account.normal_balance === 'debit' ? '#27ae60' : '#f39c12',
                      }}>
                        {account.normal_balance_display}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '500' }}>
                      {account.current_balance ? (
                        <div>
                          <div style={{ color: account.current_balance.net_balance >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {account.current_balance.net_balance >= 0 ? 'DR' : 'CR'} {Math.abs(account.current_balance.net_balance).toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#95a5a6' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: account.is_active ? '#e8f5e9' : '#f8f9fa',
                        color: account.is_active ? '#27ae60' : '#6c757d',
                      }}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {account.is_system_account && (
                        <div style={{ fontSize: '10px', color: '#95a5a6', marginTop: '4px' }}>System</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button
                          onClick={() => handleEdit(account)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Edit
                        </Button>
                        {!account.is_system_account && (
                          <Button
                            onClick={() => handleDelete(account)}
                            style={{ padding: '6px 12px', fontSize: '12px', background: '#e74c3c', color: 'white' }}
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
        </Card>
      )}

      {/* Form Modal */}
      {showForm && (
        <AccountForm
          account={selectedAccount}
          accounts={accounts || []}
          onClose={() => {
            setShowForm(false)
            setSelectedAccount(null)
          }}
          onSave={(accountData) => {
            saveMutation.mutate(accountData)
          }}
        />
      )}
    </div>
  )
}


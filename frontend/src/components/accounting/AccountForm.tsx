/**
 * Account Form Component for Create/Edit Chart of Accounts
 */
import { useState, useEffect } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'

interface ChartAccount {
  id?: number
  code: string
  name: string
  description: string
  account_type: string
  parent?: number | null
  is_active: boolean
  normal_balance: string
  allow_manual_entries: boolean
  requires_reconciliation: boolean
}

interface AccountFormProps {
  account?: ChartAccount | null
  accounts: ChartAccount[]
  onClose: () => void
  onSave: (account: Partial<ChartAccount>) => void
}

const ACCOUNT_TYPES = [
  { value: 'asset_current', label: 'Current Asset' },
  { value: 'asset_fixed', label: 'Fixed Asset' },
  { value: 'asset_intangible', label: 'Intangible Asset' },
  { value: 'liability_current', label: 'Current Liability' },
  { value: 'liability_long_term', label: 'Long-Term Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'equity_retained', label: 'Retained Earnings' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'revenue_other', label: 'Other Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'expense_cogs', label: 'Cost of Goods Sold' },
]

export default function AccountForm({ account, accounts, onClose, onSave }: AccountFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<ChartAccount>({
    code: account?.code || '',
    name: account?.name || '',
    description: account?.description || '',
    account_type: account?.account_type || 'asset_current',
    parent: account?.parent || null,
    is_active: account?.is_active !== undefined ? account.is_active : true,
    normal_balance: account?.normal_balance || 'debit',
    allow_manual_entries: account?.allow_manual_entries !== undefined ? account.allow_manual_entries : true,
    requires_reconciliation: account?.requires_reconciliation !== undefined ? account.requires_reconciliation : false,
  })

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code,
        name: account.name,
        description: account.description || '',
        account_type: account.account_type,
        parent: account.parent || null,
        is_active: account.is_active,
        normal_balance: account.normal_balance,
        allow_manual_entries: account.allow_manual_entries !== undefined ? account.allow_manual_entries : true,
        requires_reconciliation: account.requires_reconciliation !== undefined ? account.requires_reconciliation : false,
      })
    }
  }, [account])

  // Auto-set normal balance based on account type
  useEffect(() => {
    if (formData.account_type) {
      const assetTypes = ['asset_current', 'asset_fixed', 'asset_intangible']
      const expenseTypes = ['expense', 'expense_cogs']
      const liabilityTypes = ['liability_current', 'liability_long_term']
      const equityTypes = ['equity', 'equity_retained']
      const revenueTypes = ['revenue', 'revenue_other']
      
      if (assetTypes.includes(formData.account_type) || expenseTypes.includes(formData.account_type)) {
        setFormData(prev => ({ ...prev, normal_balance: 'debit' }))
      } else if (liabilityTypes.includes(formData.account_type) || equityTypes.includes(formData.account_type) || revenueTypes.includes(formData.account_type)) {
        setFormData(prev => ({ ...prev, normal_balance: 'credit' }))
      }
    }
  }, [formData.account_type])

  const handleChange = (field: keyof ChartAccount, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'Account code is required'
    } else if (!/^[A-Z0-9._-]+$/.test(formData.code)) {
      newErrors.code = 'Code can only contain uppercase letters, numbers, dots, underscores, and hyphens'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    const payload: Partial<ChartAccount> = {
      ...formData,
    }

    if (account?.id) {
      payload.id = account.id
    }

    onSave(payload)
  }

  // Filter out current account and its children from parent options
  const parentOptions = accounts.filter(acc => 
    acc.id !== account?.id && 
    acc.is_active &&
    (!account || acc.id !== account.parent)
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {account?.id ? 'Edit Account' : 'Create Account'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
          </div>

          {/* Form Content */}
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Code <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="e.g., 1000, 2000, 4000"
                disabled={!!account?.id}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.code ? '1px solid #e74c3c' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
              {errors.code && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.code}</div>}
              <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>
                Unique identifier. Cannot be changed after creation.
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Name <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Cash, Accounts Receivable, Sales Revenue"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.name ? '1px solid #e74c3c' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              {errors.name && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Account description..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Account Type <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                value={formData.account_type}
                onChange={(e) => handleChange('account_type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {ACCOUNT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Parent Account (Optional)
              </label>
              <select
                value={formData.parent || ''}
                onChange={(e) => handleChange('parent', e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">None (Top-level account)</option>
                {parentOptions.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Normal Balance
              </label>
              <select
                value={formData.normal_balance}
                onChange={(e) => handleChange('normal_balance', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
              <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>
                Auto-set based on account type. Assets and Expenses = Debit; Liabilities, Equity, Revenue = Credit
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  style={{ marginRight: '8px', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                  Active (available for use)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  checked={formData.allow_manual_entries}
                  onChange={(e) => handleChange('allow_manual_entries', e.target.checked)}
                  style={{ marginRight: '8px', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                  Allow Manual Journal Entries
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.requires_reconciliation}
                  onChange={(e) => handleChange('requires_reconciliation', e.target.checked)}
                  style={{ marginRight: '8px', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                  Requires Reconciliation (e.g., bank accounts)
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8f9fa',
                color: '#2c3e50',
                border: '1px solid #ddd',
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {account?.id ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}


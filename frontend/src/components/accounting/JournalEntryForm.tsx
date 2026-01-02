/**
 * Journal Entry Form Component for Create/Edit
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface JournalEntry {
  id?: number
  entry_number?: string
  date: string
  description: string
  reference?: string
  entry_type: string
  branch?: number | null
  journal_lines: JournalLine[]
  is_posted?: boolean
}

interface JournalLine {
  id?: number
  account: number
  account_code?: string
  account_name?: string
  debit_amount: number
  credit_amount: number
  description?: string
  reference?: string
}

interface JournalEntryFormProps {
  entry?: JournalEntry | null
  onClose: () => void
  onSave: () => void
}

const ENTRY_TYPES = [
  { value: 'general', label: 'General Journal' },
  { value: 'sales', label: 'Sales' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'cash_receipt', label: 'Cash Receipt' },
  { value: 'cash_payment', label: 'Cash Payment' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'reversal', label: 'Reversal' },
]

export default function JournalEntryForm({ entry, onClose, onSave }: JournalEntryFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<JournalEntry>({
    date: entry?.date || new Date().toISOString().split('T')[0],
    description: entry?.description || '',
    reference: entry?.reference || '',
    entry_type: entry?.entry_type || 'general',
    branch: entry?.branch || null,
    journal_lines: entry?.journal_lines || [
      { account: 0, debit_amount: 0, credit_amount: 0, description: '' },
      { account: 0, debit_amount: 0, credit_amount: 0, description: '' },
    ],
  })

  // Fetch accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await api.get('/accounting/chart-of-accounts/', { params: { is_active: 'true' } })
      return response.data?.results || response.data || []
    },
  })

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/core/branches/')
      return response.data?.results || response.data || []
    },
  })

  const handleChange = (field: keyof JournalEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleLineChange = (index: number, field: keyof JournalLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      journal_lines: prev.journal_lines.map((line, i) => {
        if (i === index) {
          const updatedLine = { ...line, [field]: value }
          // Ensure only one of debit/credit is non-zero
          if (field === 'debit_amount') {
            updatedLine.credit_amount = 0
          } else if (field === 'credit_amount') {
            updatedLine.debit_amount = 0
          }
          return updatedLine
        }
        return line
      })
    }))
  }

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      journal_lines: [...prev.journal_lines, { account: 0, debit_amount: 0, credit_amount: 0, description: '' }]
    }))
  }

  const removeLine = (index: number) => {
    if (formData.journal_lines.length <= 2) {
      toast.error('A journal entry must have at least 2 lines')
      return
    }
    setFormData(prev => ({
      ...prev,
      journal_lines: prev.journal_lines.filter((_, i) => i !== index)
    }))
  }

  const calculateTotals = () => {
    const totalDebit = formData.journal_lines.reduce((sum, line) => sum + (parseFloat(String(line.debit_amount)) || 0), 0)
    const totalCredit = formData.journal_lines.reduce((sum, line) => sum + (parseFloat(String(line.credit_amount)) || 0), 0)
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.journal_lines.length < 2) {
      newErrors.journal_lines = 'A journal entry must have at least 2 lines'
    }

    formData.journal_lines.forEach((line, index) => {
      if (!line.account || line.account === 0) {
        newErrors[`line_${index}_account`] = 'Account is required'
      }
      const debit = parseFloat(String(line.debit_amount)) || 0
      const credit = parseFloat(String(line.credit_amount)) || 0
      if (debit === 0 && credit === 0) {
        newErrors[`line_${index}_amount`] = 'Either debit or credit amount is required'
      }
      if (debit > 0 && credit > 0) {
        newErrors[`line_${index}_amount`] = 'Cannot have both debit and credit amounts'
      }
    })

    const { isBalanced } = calculateTotals()
    if (!isBalanced) {
      newErrors.balance = 'Total debits must equal total credits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    try {
      const payload = {
        date: formData.date,
        description: formData.description,
        reference: formData.reference || '',
        entry_type: formData.entry_type,
        branch: formData.branch || null,
        journal_lines: formData.journal_lines.map(line => ({
          account: line.account,
          debit_amount: parseFloat(String(line.debit_amount)) || 0,
          credit_amount: parseFloat(String(line.credit_amount)) || 0,
          description: line.description || '',
          reference: line.reference || '',
        })),
      }

      if (entry?.id) {
        await api.patch(`/accounting/journal-entries/${entry.id}/`, payload)
      } else {
        await api.post('/accounting/journal-entries/', payload)
      }

      onSave()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save entry'
      if (err.response?.data) {
        // Handle field-specific errors
        const fieldErrors = err.response.data
        const newErrors: Record<string, string> = {}
        Object.keys(fieldErrors).forEach(key => {
          if (Array.isArray(fieldErrors[key])) {
            newErrors[key] = fieldErrors[key][0]
          } else {
            newErrors[key] = fieldErrors[key]
          }
        })
        setErrors(newErrors)
      } else {
        toast.error(errorMsg)
      }
    }
  }

  const { totalDebit, totalCredit, isBalanced } = calculateTotals()

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
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '900px',
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
              {entry?.id ? `Edit Entry ${entry.entry_number}` : 'Create Journal Entry'}
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
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                  Date <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                  Entry Type <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.entry_type}
                  onChange={(e) => handleChange('entry_type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {ENTRY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Description <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter entry description..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.description ? '1px solid #e74c3c' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              {errors.description && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.description}</div>}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Reference (Optional)
              </label>
              <input
                type="text"
                value={formData.reference || ''}
                onChange={(e) => handleChange('reference', e.target.value)}
                placeholder="Invoice #, Document #, etc."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '14px' }}>
                Branch (Optional)
              </label>
              <select
                value={formData.branch || ''}
                onChange={(e) => handleChange('branch', e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">All Branches</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            {/* Journal Lines */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <label style={{ fontWeight: '600', color: '#2c3e50', fontSize: '16px' }}>
                  Journal Lines <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <Button type="button" onClick={addLine} style={{ padding: '8px 16px', fontSize: '14px' }}>
                  ➕ Add Line
                </Button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', fontSize: '13px', fontWeight: '600' }}>Account</th>
                      <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd', fontSize: '13px', fontWeight: '600' }}>Debit</th>
                      <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd', fontSize: '13px', fontWeight: '600' }}>Credit</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd', fontSize: '13px', fontWeight: '600' }}>Description</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd', fontSize: '13px', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.journal_lines.map((line, index) => (
                      <tr key={index}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <select
                            value={line.account || 0}
                            onChange={(e) => handleLineChange(index, 'account', parseInt(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: errors[`line_${index}_account`] ? '1px solid #e74c3c' : '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '13px',
                            }}
                          >
                            <option value={0}>Select Account</option>
                            {accounts.map((acc: any) => (
                              <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                            ))}
                          </select>
                          {errors[`line_${index}_account`] && (
                            <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '2px' }}>
                              {errors[`line_${index}_account`]}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit_amount || 0}
                            onChange={(e) => handleLineChange(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: errors[`line_${index}_amount`] ? '1px solid #e74c3c' : '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '13px',
                              textAlign: 'right',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit_amount || 0}
                            onChange={(e) => handleLineChange(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: errors[`line_${index}_amount`] ? '1px solid #e74c3c' : '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '13px',
                              textAlign: 'right',
                            }}
                          />
                          {errors[`line_${index}_amount`] && (
                            <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '2px' }}>
                              {errors[`line_${index}_amount`]}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          <input
                            type="text"
                            value={line.description || ''}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            placeholder="Line description..."
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '13px',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                          {formData.journal_lines.length > 2 && (
                            <Button
                              type="button"
                              onClick={() => removeLine(index)}
                              style={{ padding: '4px 8px', fontSize: '12px', background: '#e74c3c', color: 'white' }}
                            >
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f9fa', fontWeight: '600' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Total:</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontFamily: 'monospace', color: isBalanced ? '#27ae60' : '#e74c3c' }}>
                        ${totalDebit.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontFamily: 'monospace', color: isBalanced ? '#27ae60' : '#e74c3c' }}>
                        ${totalCredit.toFixed(2)}
                      </td>
                      <td colSpan={2} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                        <span style={{ color: isBalanced ? '#27ae60' : '#e74c3c', fontWeight: '600' }}>
                          {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {errors.balance && (
                <div style={{ color: '#e74c3c', fontSize: '13px', marginTop: '8px' }}>
                  {errors.balance}
                </div>
              )}
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
            <Button type="submit" disabled={!isBalanced}>
              {entry?.id ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}


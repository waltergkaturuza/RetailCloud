import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import AdvancedSearch from '../components/AdvancedSearch'
import BranchSelector from '../components/BranchSelector'
import toast from 'react-hot-toast'

interface TaxTransaction {
  id: number
  tax_number: string
  date: string
  tax_period_start?: string
  tax_period_end?: string
  tax_type: string
  amount: string
  currency: string
  status: string
  paid_at?: string
  due_date?: string
  reference_number?: string
  tax_authority: string
  branch?: number
  branch_name?: string
  description?: string
  notes?: string
}

export default function Taxes() {
  const [showForm, setShowForm] = useState(false)
  const [selectedTax, setSelectedTax] = useState<TaxTransaction | null>(null)
  const [filters, setFilters] = useState<any>({})
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>('all')
  const queryClient = useQueryClient()

  const { data: taxesResponse, isLoading } = useQuery({
    queryKey: ['tax-transactions', filters, selectedBranch],
    queryFn: async () => {
      const params: any = { ...filters }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/accounting/tax-transactions/', { params })
      return response.data
    },
  })

  const taxes = taxesResponse?.results || taxesResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/accounting/tax-transactions/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-transactions'] })
      toast.success('Tax transaction deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete tax transaction')
    },
  })

  const handleEdit = (tax: TaxTransaction) => {
    setSelectedTax(tax)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this tax transaction?')) {
      deleteMutation.mutate(id)
    }
  }

  const taxTypeLabels: Record<string, string> = {
    vat: 'VAT',
    income_tax: 'Income Tax',
    paye: 'PAYE',
    aids_levy: 'AIDS Levy',
    nssa: 'NSSA',
    zimdef: 'ZIMDEF',
    customs: 'Customs Duty',
    excise: 'Excise Duty',
    withholding: 'Withholding Tax',
    other: 'Other',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    waived: 'Waived',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>Tax Transactions</h1>
        <Button onClick={() => { setShowForm(true); setSelectedTax(null) }}>
          ➕ Add Tax Transaction
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Branch
            </label>
            <BranchSelector
              selectedBranch={selectedBranch}
              onBranchChange={setSelectedBranch}
              showAll={true}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Tax Type
            </label>
            <select
              value={filters.tax_type || ''}
              onChange={(e) => setFilters({ ...filters, tax_type: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Types</option>
              {Object.entries(taxTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <AdvancedSearch
          fields={[
            { name: 'start_date', label: 'Start Date', type: 'date' },
            { name: 'end_date', label: 'End Date', type: 'date' },
          ]}
          filters={filters}
          onSearch={setFilters}
        />
      </Card>

      {/* Taxes List */}
      {isLoading ? (
        <Card>
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading tax transactions...</p>
          </div>
        </Card>
      ) : taxes.length > 0 ? (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tax #</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Authority</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Reference</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((tax: TaxTransaction) => (
                <tr key={tax.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                  <td style={{ padding: '12px' }}>{tax.tax_number}</td>
                  <td style={{ padding: '12px' }}>{new Date(tax.date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>{taxTypeLabels[tax.tax_type] || tax.tax_type}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                    {tax.currency} {parseFloat(tax.amount).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px' }}>{tax.tax_authority}</td>
                  <td style={{ padding: '12px' }}>{tax.reference_number || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: tax.status === 'paid' ? '#d5f4e6' : tax.status === 'overdue' ? '#ffe8e8' : '#fff3cd',
                      color: tax.status === 'paid' ? '#27ae60' : tax.status === 'overdue' ? '#e74c3c' : '#856404'
                    }}>
                      {statusLabels[tax.status] || tax.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(tax)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(tax.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card>
          <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Tax Transactions</h3>
            <p>No tax transactions recorded yet</p>
          </div>
        </Card>
      )}

      {/* Tax Form Modal */}
      {showForm && (
        <TaxFormModal
          tax={selectedTax}
          onClose={() => {
            setShowForm(false)
            setSelectedTax(null)
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tax-transactions'] })
            setShowForm(false)
            setSelectedTax(null)
          }}
        />
      )}
    </div>
  )
}

function TaxFormModal({ tax, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    date: tax?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    tax_period_start: tax?.tax_period_start?.split('T')[0] || '',
    tax_period_end: tax?.tax_period_end?.split('T')[0] || '',
    tax_type: tax?.tax_type || 'vat',
    amount: tax?.amount || '',
    currency: tax?.currency || 'USD',
    status: tax?.status || 'pending',
    due_date: tax?.due_date?.split('T')[0] || '',
    reference_number: tax?.reference_number || '',
    tax_authority: tax?.tax_authority || 'ZIMRA',
    description: tax?.description || '',
    notes: tax?.notes || '',
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (tax) {
        return await api.patch(`/accounting/tax-transactions/${tax.id}/`, data)
      } else {
        return await api.post('/accounting/tax-transactions/', data)
      }
    },
    onSuccess: () => {
      toast.success(`Tax transaction ${tax ? 'updated' : 'created'} successfully`)
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to ${tax ? 'update' : 'create'} tax transaction`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <Card style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{tax ? 'Edit Tax Transaction' : 'Add Tax Transaction'}</h2>
          <Button variant="secondary" onClick={onClose}>✕</Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Tax Type *</label>
              <select
                value={formData.tax_type}
                onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                className="input"
                required
              >
                <option value="vat">VAT</option>
                <option value="income_tax">Income Tax</option>
                <option value="paye">PAYE</option>
                <option value="aids_levy">AIDS Levy</option>
                <option value="nssa">NSSA</option>
                <option value="zimdef">ZIMDEF</option>
                <option value="customs">Customs Duty</option>
                <option value="excise">Excise Duty</option>
                <option value="withholding">Withholding Tax</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Currency *</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input"
                required
              >
                <option value="USD">USD</option>
                <option value="ZWL">ZWL</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Tax Period Start</label>
              <input
                type="date"
                value={formData.tax_period_start}
                onChange={(e) => setFormData({ ...formData, tax_period_start: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Tax Period End</label>
              <input
                type="date"
                value={formData.tax_period_end}
                onChange={(e) => setFormData({ ...formData, tax_period_end: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
                required
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Tax Authority *</label>
            <input
              type="text"
              value={formData.tax_authority}
              onChange={(e) => setFormData({ ...formData, tax_authority: e.target.value })}
              className="input"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="input"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : tax ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}


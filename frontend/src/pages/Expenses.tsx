import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import AdvancedSearch from '../components/AdvancedSearch'
import BranchSelector from '../components/BranchSelector'
import toast from 'react-hot-toast'

interface Expense {
  id: number
  expense_number: string
  date: string
  category: number
  category_name?: string
  expense_type: string
  amount: string
  currency: string
  payment_method: string
  paid: boolean
  vendor_supplier?: string
  invoice_number?: string
  receipt_number?: string
  branch?: number
  branch_name?: string
  description?: string
  notes?: string
}

export default function Expenses() {
  const [showForm, setShowForm] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [filters, setFilters] = useState<any>({})
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>('all')
  const queryClient = useQueryClient()

  const { data: expensesResponse, isLoading } = useQuery({
    queryKey: ['expenses', filters, selectedBranch],
    queryFn: async () => {
      const params: any = { ...filters }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/accounting/expenses/', { params })
      return response.data
    },
  })

  const expenses = expensesResponse?.results || expensesResponse || []

  const { data: categoriesResponse } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const response = await api.get('/accounting/expense-categories/')
      return response.data
    },
  })

  const categories = categoriesResponse?.results || categoriesResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/accounting/expenses/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete expense')
    },
  })

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(id)
    }
  }

  const expenseTypeLabels: Record<string, string> = {
    operating: 'Operating',
    shipping: 'Shipping/Delivery',
    warehouse: 'Warehouse/Storage',
    utilities: 'Utilities',
    rent: 'Rent',
    salaries: 'Salaries & Wages',
    marketing: 'Marketing',
    insurance: 'Insurance',
    maintenance: 'Maintenance',
    office: 'Office Supplies',
    professional: 'Professional Fees',
    taxes: 'Taxes (Other)',
    depreciation: 'Depreciation',
    other: 'Other',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>Expenses</h1>
        <Button onClick={() => { setShowForm(true); setSelectedExpense(null) }}>
          ➕ Add Expense
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
              Expense Type
            </label>
            <select
              value={filters.expense_type || ''}
              onChange={(e) => setFilters({ ...filters, expense_type: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Types</option>
              {Object.entries(expenseTypeLabels).map(([value, label]) => (
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

      {/* Expenses List */}
      {isLoading ? (
        <Card>
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading expenses...</p>
          </div>
        </Card>
      ) : expenses.length > 0 ? (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Expense #</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Vendor</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense: Expense) => (
                <tr key={expense.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                  <td style={{ padding: '12px' }}>{expense.expense_number}</td>
                  <td style={{ padding: '12px' }}>{new Date(expense.date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>{expense.category_name || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{expenseTypeLabels[expense.expense_type] || expense.expense_type}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                    {expense.currency} {parseFloat(expense.amount).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px' }}>{expense.vendor_supplier || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: expense.paid ? '#d5f4e6' : '#ffe8e8',
                      color: expense.paid ? '#27ae60' : '#e74c3c'
                    }}>
                      {expense.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(expense)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(expense.id)}>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💸</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Expenses</h3>
            <p>No expenses recorded yet</p>
          </div>
        </Card>
      )}

      {/* Expense Form Modal - Simplified, can be expanded */}
      {showForm && (
        <ExpenseFormModal
          expense={selectedExpense}
          categories={categories}
          onClose={() => {
            setShowForm(false)
            setSelectedExpense(null)
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            setShowForm(false)
            setSelectedExpense(null)
          }}
        />
      )}
    </div>
  )
}

function ExpenseFormModal({ expense, categories, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    date: expense?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    category: expense?.category || '',
    expense_type: expense?.expense_type || 'operating',
    amount: expense?.amount || '',
    currency: expense?.currency || 'USD',
    payment_method: expense?.payment_method || 'cash',
    paid: expense?.paid ?? true,
    vendor_supplier: expense?.vendor_supplier || '',
    invoice_number: expense?.invoice_number || '',
    receipt_number: expense?.receipt_number || '',
    description: expense?.description || '',
    notes: expense?.notes || '',
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (expense) {
        return await api.patch(`/accounting/expenses/${expense.id}/`, data)
      } else {
        return await api.post('/accounting/expenses/', data)
      }
    },
    onSuccess: () => {
      toast.success(`Expense ${expense ? 'updated' : 'created'} successfully`)
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || `Failed to ${expense ? 'update' : 'create'} expense`)
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
          <h2>{expense ? 'Edit Expense' : 'Add Expense'}</h2>
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
              <label style={{ display: 'block', marginBottom: '8px' }}>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Expense Type *</label>
              <select
                value={formData.expense_type}
                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                className="input"
                required
              >
                <option value="operating">Operating Expenses</option>
                <option value="shipping">Shipping/Delivery</option>
                <option value="warehouse">Warehouse/Storage</option>
                <option value="utilities">Utilities</option>
                <option value="rent">Rent</option>
                <option value="salaries">Salaries & Wages</option>
                <option value="marketing">Marketing</option>
                <option value="insurance">Insurance</option>
                <option value="maintenance">Maintenance</option>
                <option value="office">Office Supplies</option>
                <option value="professional">Professional Fees</option>
                <option value="taxes">Taxes (Other)</option>
                <option value="depreciation">Depreciation</option>
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
              <label style={{ display: 'block', marginBottom: '8px' }}>Payment Method *</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="input"
                required
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="ecocash">EcoCash</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={formData.paid}
                onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
              />
              Paid
            </label>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Vendor/Supplier</label>
            <input
              type="text"
              value={formData.vendor_supplier}
              onChange={(e) => setFormData({ ...formData, vendor_supplier: e.target.value })}
              className="input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Invoice Number</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Receipt Number</label>
              <input
                type="text"
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                className="input"
              />
            </div>
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
              {mutation.isPending ? 'Saving...' : expense ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}


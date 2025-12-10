import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import AdvancedSearch from '../components/AdvancedSearch'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'

interface Supplier {
  id: number
  code?: string
  name: string
  contact_person?: string
  email?: string
  phone: string
  phone_alt?: string
  address?: string
  city?: string
  country?: string
  credit_limit?: string
  balance?: string
  payment_terms: string
  notes?: string
  is_active: boolean
}

export default function Suppliers() {
  const [showForm, setShowForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showDetails, setShowDetails] = useState<Supplier | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: suppliersResponse, isLoading, error } = useQuery({
    queryKey: ['suppliers', searchQuery, filters],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (filters.is_active !== undefined && filters.is_active !== '') {
        params.is_active = filters.is_active === 'true'
      }
      if (filters.payment_terms && filters.payment_terms !== '') {
        params.payment_terms = filters.payment_terms
      }
      
      const response = await api.get('/suppliers/suppliers/', { params })
      return response.data
    }
  })

  const suppliers = suppliersResponse?.results || suppliersResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/suppliers/suppliers/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete supplier')
    }
  })

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowForm(true)
  }

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(supplier.id)
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Supplier Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage your supplier database and payment tracking ({suppliers.length} suppliers)
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedSupplier(null)
            setShowForm(true)
          }}
        >
          + Add Supplier
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-3">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Search Suppliers
            </label>
            <input
              type="text"
              placeholder="Search by name, email, phone, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <Button variant="secondary" onClick={() => {
            setFilters({})
            setSearchQuery('')
          }}>
            Clear All
          </Button>
        </div>
        
        <AdvancedSearch
          fields={[
            { 
              name: 'payment_terms', 
              label: 'Payment Terms', 
              type: 'select', 
              options: [
                { value: 'cash', label: 'Cash on Delivery' },
                { value: '7days', label: 'Net 7 Days' },
                { value: '15days', label: 'Net 15 Days' },
                { value: '30days', label: 'Net 30 Days' },
                { value: '60days', label: 'Net 60 Days' },
                { value: 'custom', label: 'Custom Terms' },
              ]
            },
            { 
              name: 'is_active', 
              label: 'Status', 
              type: 'select', 
              options: [
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]
            },
          ]}
          onSearch={(newFilters) => setFilters(newFilters)}
          onReset={() => setFilters({})}
        />
      </Card>

      {showForm && (
        <SupplierForm
          supplier={selectedSupplier}
          onClose={() => {
            setShowForm(false)
            setSelectedSupplier(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedSupplier(null)
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success(selectedSupplier ? 'Supplier updated successfully' : 'Supplier created successfully')
          }}
        />
      )}

      {showDetails && (
        <SupplierDetailsModal
          supplier={showDetails}
          onClose={() => setShowDetails(null)}
        />
      )}

      {error && (
        <Card>
          <div style={{ padding: '20px', background: '#fee', color: '#c33', borderRadius: '6px' }}>
            Error loading suppliers: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading suppliers...</p>
          </div>
        </Card>
      ) : suppliers && suppliers.length > 0 ? (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Contact Person</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Payment Terms</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Credit Limit</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Balance</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier: Supplier) => (
                  <tr key={supplier.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {supplier.name}
                      {supplier.code && (
                        <span style={{ fontSize: '11px', color: '#7f8c8d', marginLeft: '8px' }}>
                          ({supplier.code})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{supplier.contact_person || '—'}</td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{supplier.email || '—'}</td>
                    <td style={{ padding: '12px' }}>{supplier.phone}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#e3f2fd',
                        color: '#1976d2'
                      }}>
                        {supplier.payment_terms?.replace('days', ' Days').replace('cash', 'COD').replace('custom', 'Custom') || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ${parseFloat(supplier.credit_limit || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: parseFloat(supplier.balance || '0') > 0 ? '#e74c3c' : '#2ecc71' }}>
                      ${parseFloat(supplier.balance || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: supplier.is_active ? '#d4edda' : '#f8d7da',
                        color: supplier.is_active ? '#155724' : '#721c24'
                      }}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setShowDetails(supplier)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleEdit(supplier)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(supplier)}
                          isLoading={deleteMutation.isPending && deleteMutation.variables === supplier.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏭</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Suppliers Found</h3>
            <p style={{ marginBottom: '20px' }}>Start adding suppliers to track purchases and payments</p>
            <Button onClick={() => {
              setSelectedSupplier(null)
              setShowForm(true)
            }}>
              Add Your First Supplier
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function SupplierForm({ supplier, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    code: supplier?.code || '',
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    phone_alt: supplier?.phone_alt || '',
    address: supplier?.address || '',
    city: supplier?.city || '',
    country: supplier?.country || 'Zimbabwe',
    credit_limit: supplier?.credit_limit || '0',
    payment_terms: supplier?.payment_terms || '30days',
    notes: supplier?.notes || '',
    is_active: supplier?.is_active !== undefined ? supplier.is_active : true,
  })

  const [formErrors, setFormErrors] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true)
      try {
        const cleanedData: any = { ...data }
        if (!cleanedData.code) cleanedData.code = ''
        if (!cleanedData.email) cleanedData.email = ''
        
        if (supplier) {
          return await api.patch(`/suppliers/suppliers/${supplier.id}/`, cleanedData)
        } else {
          return await api.post('/suppliers/suppliers/', cleanedData)
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: () => {
      onSuccess()
    },
    onError: (error: any) => {
      const errors = error.response?.data || {}
      setFormErrors(errors)
      if (errors.non_field_errors) {
        toast.error(errors.non_field_errors[0])
      } else {
        toast.error('Failed to save supplier. Please check the form for errors.')
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    
    if (!formData.name.trim()) {
      setFormErrors({ name: ['This field is required.'] })
      return
    }
    if (!formData.phone.trim()) {
      setFormErrors({ phone: ['This field is required.'] })
      return
    }

    mutation.mutate(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev: any) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#7f8c8d',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Supplier Name <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
              />
              {formErrors.name && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Supplier Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                className="input"
                style={{ width: '100%', fontFamily: 'monospace' }}
                placeholder="SUP-001"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                className="input"
                style={{ width: '100%' }}
                placeholder="Person's name"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Phone <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
                placeholder="+263..."
              />
              {formErrors.phone && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.phone) ? formErrors.phone[0] : formErrors.phone}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Alternate Phone
              </label>
              <input
                type="tel"
                value={formData.phone_alt}
                onChange={(e) => handleChange('phone_alt', e.target.value)}
                className="input"
                style={{ width: '100%' }}
                placeholder="Optional"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="input"
                style={{ width: '100%' }}
                placeholder="supplier@example.com"
              />
              {formErrors.email && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.email) ? formErrors.email[0] : formErrors.email}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => handleChange('payment_terms', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="cash">Cash on Delivery</option>
                <option value="7days">Net 7 Days</option>
                <option value="15days">Net 15 Days</option>
                <option value="30days">Net 30 Days</option>
                <option value="60days">Net 60 Days</option>
                <option value="custom">Custom Terms</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Credit Limit
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7f8c8d' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => handleChange('credit_limit', e.target.value)}
                  className="input"
                  style={{ width: '100%', paddingLeft: '28px' }}
                />
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="input"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                placeholder="Street address..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                placeholder="Additional notes about the supplier..."
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
              {supplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SupplierDetailsModal({ supplier, onClose }: any) {
  const { data: transactions } = useQuery({
    queryKey: ['supplier-transactions', supplier.id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/transactions/`, {
        params: { supplier: supplier.id }
      })
      return response.data?.results || response.data || []
    },
    enabled: !!supplier?.id
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Supplier Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#7f8c8d',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong>Name:</strong> {supplier.name}
                {supplier.code && <span style={{ fontSize: '12px', color: '#7f8c8d', marginLeft: '8px' }}>({supplier.code})</span>}
              </div>
              {supplier.contact_person && <div><strong>Contact Person:</strong> {supplier.contact_person}</div>}
              {supplier.email && <div><strong>Email:</strong> {supplier.email}</div>}
              <div><strong>Phone:</strong> {supplier.phone}</div>
              {supplier.phone_alt && <div><strong>Alt Phone:</strong> {supplier.phone_alt}</div>}
              {supplier.address && <div><strong>Address:</strong> {supplier.address}</div>}
              {(supplier.city || supplier.country) && (
                <div><strong>Location:</strong> {[supplier.city, supplier.country].filter(Boolean).join(', ')}</div>
              )}
            </div>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Financial Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong>Payment Terms:</strong>{' '}
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: '#e3f2fd',
                  color: '#1976d2'
                }}>
                  {supplier.payment_terms?.replace('days', ' Days').replace('cash', 'COD').replace('custom', 'Custom') || 'N/A'}
                </span>
              </div>
              <div><strong>Credit Limit:</strong> ${parseFloat(supplier.credit_limit || '0').toFixed(2)}</div>
              <div><strong>Balance:</strong> 
                <span style={{ 
                  color: parseFloat(supplier.balance || '0') > 0 ? '#e74c3c' : '#2ecc71',
                  fontWeight: '600',
                  marginLeft: '8px'
                }}>
                  ${parseFloat(supplier.balance || '0').toFixed(2)}
                </span>
              </div>
              <div><strong>Available Credit:</strong> 
                <span style={{ 
                  color: '#2ecc71',
                  fontWeight: '600',
                  marginLeft: '8px'
                }}>
                  ${(parseFloat(supplier.credit_limit || '0') - parseFloat(supplier.balance || '0')).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {supplier.notes && (
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Notes</h3>
            <p style={{ margin: 0, color: '#7f8c8d' }}>{supplier.notes}</p>
          </Card>
        )}

        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Transaction History</h3>
          {transactions && transactions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Type</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Amount</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Balance Before</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Balance After</th>
                    <th className="table-header">Reference</th>
                    <th className="table-header">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id}>
                      <td style={{ padding: '10px' }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          background: '#e3f2fd',
                          color: '#1976d2'
                        }}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                        ${parseFloat(tx.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        ${parseFloat(tx.balance_before).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        ${parseFloat(tx.balance_after).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px', color: '#7f8c8d', fontSize: '13px' }}>
                        {tx.reference_type} {tx.reference_id ? `#${tx.reference_id}` : ''}
                      </td>
                      <td style={{ padding: '10px', color: '#7f8c8d', fontSize: '13px' }}>
                        {tx.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>No transactions found</p>
          )}
        </Card>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}



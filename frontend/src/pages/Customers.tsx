import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import AdvancedSearch from '../components/AdvancedSearch'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'

interface Customer {
  id: number
  code?: string
  first_name: string
  last_name: string
  full_name?: string
  email?: string
  phone: string
  phone_alt?: string
  address?: string
  city?: string
  country?: string
  loyalty_points?: number
  loyalty_points_balance?: number
  credit_limit?: string
  credit_balance?: string
  credit_available?: string
  credit_rating: string
  is_credit_available?: boolean
  total_purchases?: string
  total_visits?: number
  last_purchase_date?: string
  notes?: string
  is_active: boolean
}

export default function Customers() {
  const [showForm, setShowForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetails, setShowDetails] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: customersResponse, isLoading, error } = useQuery({
    queryKey: ['customers', searchQuery, filters],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (filters.is_active !== undefined) params.is_active = filters.is_active === 'true'
      if (filters.credit_rating) params.credit_rating = filters.credit_rating
      
      const response = await api.get('/customers/customers/', { params })
      return response.data
    }
  })

  const customers = customersResponse?.results || customersResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/customers/customers/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete customer')
    }
  })

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowForm(true)
  }

  const handleDelete = (customer: Customer) => {
    if (confirm(`Are you sure you want to delete "${customer.first_name} ${customer.last_name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(customer.id)
    }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Customer Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage your customer database and relationships ({customers.length} customers)
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedCustomer(null)
            setShowForm(true)
          }}
        >
          + Add Customer
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-3">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Search Customers
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
              name: 'credit_rating', 
              label: 'Credit Rating', 
              type: 'select', 
              options: [
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' },
                { value: 'blacklisted', label: 'Blacklisted' },
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
        <CustomerForm
          customer={selectedCustomer}
          onClose={() => {
            setShowForm(false)
            setSelectedCustomer(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedCustomer(null)
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            toast.success(selectedCustomer ? 'Customer updated successfully' : 'Customer created successfully')
          }}
        />
      )}

      {showDetails && (
        <CustomerDetailsModal
          customer={showDetails}
          onClose={() => setShowDetails(null)}
        />
      )}

      {error && (
        <Card>
          <div style={{ padding: '20px', background: '#fee', color: '#c33', borderRadius: '6px' }}>
            Error loading customers: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading customers...</p>
          </div>
        </Card>
      ) : customers && customers.length > 0 ? (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Credit Rating</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Total Purchases</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Credit Available</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Loyalty Points</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: Customer) => (
                  <tr key={customer.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {customer.full_name || `${customer.first_name} ${customer.last_name}`}
                      {customer.code && (
                        <span style={{ fontSize: '11px', color: '#7f8c8d', marginLeft: '8px' }}>
                          ({customer.code})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#7f8c8d' }}>{customer.email || '—'}</td>
                    <td style={{ padding: '12px' }}>{customer.phone}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: getCreditRatingColor(customer.credit_rating).bg,
                        color: getCreditRatingColor(customer.credit_rating).color
                      }}>
                        {customer.credit_rating?.charAt(0).toUpperCase() + customer.credit_rating?.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                      ${parseFloat(customer.total_purchases || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d' }}>
                      ${parseFloat(customer.credit_available || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#2ecc71', fontWeight: '500' }}>
                      {customer.loyalty_points_balance || customer.loyalty_points || 0}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: customer.is_active ? '#d4edda' : '#f8d7da',
                        color: customer.is_active ? '#155724' : '#721c24'
                      }}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setShowDetails(customer)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleEdit(customer)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(customer)}
                          isLoading={deleteMutation.isPending && deleteMutation.variables === customer.id}
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Customers Found</h3>
            <p style={{ marginBottom: '20px' }}>Start adding customers to track their purchases and loyalty points</p>
            <Button onClick={() => {
              setSelectedCustomer(null)
              setShowForm(true)
            }}>
              Add Your First Customer
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function CustomerForm({ customer, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    code: customer?.code || '',
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    phone_alt: customer?.phone_alt || '',
    address: customer?.address || '',
    city: customer?.city || '',
    country: customer?.country || 'Zimbabwe',
    credit_limit: customer?.credit_limit || '0',
    credit_rating: customer?.credit_rating || 'good',
    notes: customer?.notes || '',
    is_active: customer?.is_active !== undefined ? customer.is_active : true,
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
        
        if (customer) {
          return await api.patch(`/customers/customers/${customer.id}/`, cleanedData)
        } else {
          return await api.post('/customers/customers/', cleanedData)
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
        toast.error('Failed to save customer. Please check the form for errors.')
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})
    
    if (!formData.first_name.trim()) {
      setFormErrors({ first_name: ['This field is required.'] })
      return
    }
    if (!formData.last_name.trim()) {
      setFormErrors({ last_name: ['This field is required.'] })
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
          <h2 style={{ margin: 0 }}>{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
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
                First Name <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
              />
              {formErrors.first_name && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.first_name) ? formErrors.first_name[0] : formErrors.first_name}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Last Name <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
                className="input"
                style={{ width: '100%' }}
              />
              {formErrors.last_name && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.last_name) ? formErrors.last_name[0] : formErrors.last_name}
              </span>}
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
                placeholder="customer@example.com"
              />
              {formErrors.email && <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {Array.isArray(formErrors.email) ? formErrors.email[0] : formErrors.email}
              </span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Customer Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                className="input"
                style={{ width: '100%', fontFamily: 'monospace' }}
                placeholder="CUST-001"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Credit Rating
              </label>
              <select
                value={formData.credit_rating}
                onChange={(e) => handleChange('credit_rating', e.target.value)}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="blacklisted">Blacklisted</option>
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
                placeholder="Additional notes about the customer..."
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
              {customer ? 'Update Customer' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CustomerDetailsModal({ customer, onClose }: any) {
  const { data: transactions } = useQuery({
    queryKey: ['customer-transactions', customer.id],
    queryFn: async () => {
      const response = await api.get(`/customers/transactions/`, {
        params: { customer: customer.id }
      })
      return response.data?.results || response.data || []
    },
    enabled: !!customer?.id
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Customer Details</h2>
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
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Personal Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong>Name:</strong> {customer.full_name || `${customer.first_name} ${customer.last_name}`}
              </div>
              {customer.code && <div><strong>Code:</strong> {customer.code}</div>}
              {customer.email && <div><strong>Email:</strong> {customer.email}</div>}
              <div><strong>Phone:</strong> {customer.phone}</div>
              {customer.phone_alt && <div><strong>Alt Phone:</strong> {customer.phone_alt}</div>}
              {customer.address && <div><strong>Address:</strong> {customer.address}</div>}
              {(customer.city || customer.country) && (
                <div><strong>Location:</strong> {[customer.city, customer.country].filter(Boolean).join(', ')}</div>
              )}
            </div>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Account Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong>Credit Rating:</strong>{' '}
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: getCreditRatingColor(customer.credit_rating).bg,
                  color: getCreditRatingColor(customer.credit_rating).color
                }}>
                  {customer.credit_rating?.charAt(0).toUpperCase() + customer.credit_rating?.slice(1)}
                </span>
              </div>
              <div><strong>Credit Limit:</strong> ${parseFloat(customer.credit_limit || '0').toFixed(2)}</div>
              <div><strong>Credit Balance:</strong> ${parseFloat(customer.credit_balance || '0').toFixed(2)}</div>
              <div><strong>Credit Available:</strong> ${parseFloat(customer.credit_available || '0').toFixed(2)}</div>
              <div><strong>Total Purchases:</strong> ${parseFloat(customer.total_purchases || '0').toFixed(2)}</div>
              <div><strong>Total Visits:</strong> {customer.total_visits || 0}</div>
              <div><strong>Loyalty Points:</strong> {customer.loyalty_points_balance || customer.loyalty_points || 0}</div>
            </div>
          </Card>
        </div>

        {customer.notes && (
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Notes</h3>
            <p style={{ margin: 0, color: '#7f8c8d' }}>{customer.notes}</p>
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

function getCreditRatingColor(rating: string) {
  const colors: { [key: string]: { bg: string; color: string } } = {
    excellent: { bg: '#d4edda', color: '#155724' },
    good: { bg: '#d1ecf1', color: '#0c5460' },
    fair: { bg: '#fff3cd', color: '#856404' },
    poor: { bg: '#f8d7da', color: '#721c24' },
    blacklisted: { bg: '#f5c6cb', color: '#721c24' },
  };
  return colors[rating] || { bg: '#e2e3e5', color: '#383d41' };
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import AdvancedSearch from '../components/AdvancedSearch'
import BranchSelector from '../components/BranchSelector'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Receipt from '../components/Receipt'
import toast from 'react-hot-toast'
import { exportToExcel } from '../utils/export'

interface Sale {
  id: number
  invoice_number: string
  date: string
  branch?: number
  branch_name?: string
  customer?: number
  customer_name?: string
  cashier?: number
  cashier_name?: string
  subtotal: string
  tax_amount: string
  discount_amount: string
  total_amount: string
  amount_paid: string
  change_amount: string
  payment_method: string
  status: string
  is_paid: boolean
  items?: any[]
}

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  const { data: salesResponse, isLoading, error } = useQuery({
    queryKey: ['sales', searchQuery, filters, dateRange, selectedBranch],
    queryFn: async () => {
      const params: any = {
        ordering: '-date'
      }
      if (searchQuery) params.search = searchQuery
      if (filters.status) params.status = filters.status
      if (filters.payment_method) params.payment_method = filters.payment_method
      if (filters.customer) params.customer = filters.customer
      if (dateRange.start) params.date__gte = dateRange.start
      if (dateRange.end) params.date__lte = dateRange.end
      if (selectedBranch !== 'all') params.branch = selectedBranch
      
      const response = await api.get('/pos/sales/', { params })
      return response.data
    }
  })

  const sales = salesResponse?.results || salesResponse || []

  const { data: customers } = useQuery({
    queryKey: ['sales-customers'],
    queryFn: async () => {
      const response = await api.get('/customers/customers/', { params: { limit: 100 } })
      return response.data?.results || response.data || []
    }
  })

  const handleViewSale = async (saleId: number) => {
    try {
      const response = await api.get(`/pos/sales/${saleId}/`)
      setSelectedSale(response.data)
    } catch (error: any) {
      toast.error('Failed to load sale details')
    }
  }

  const handleExport = () => {
    if (sales.length === 0) {
      toast.error('No sales to export')
      return
    }

    const exportData = sales.map((sale: Sale) => ({
      'Invoice #': sale.invoice_number,
      'Date': new Date(sale.date).toLocaleString(),
      'Customer': sale.customer_name || 'Walk-in',
      'Cashier': sale.cashier_name || 'System',
      'Subtotal': parseFloat(sale.subtotal || '0').toFixed(2),
      'Tax': parseFloat(sale.tax_amount || '0').toFixed(2),
      'Discount': parseFloat(sale.discount_amount || '0').toFixed(2),
      'Total': parseFloat(sale.total_amount || '0').toFixed(2),
      'Amount Paid': parseFloat(sale.amount_paid || '0').toFixed(2),
      'Change': parseFloat(sale.change_amount || '0').toFixed(2),
      'Payment Method': sale.payment_method,
      'Status': sale.status,
    }))

    exportToExcel(exportData, `Sales_${dateRange.start}_to_${dateRange.end}`)
    toast.success('Sales exported successfully')
  }

  const totalSales = sales.reduce((sum: number, sale: Sale) => 
    sum + parseFloat(sale.total_amount || '0'), 0
  )
  const totalCount = sales.length

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Sales History
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            View and manage all sales transactions ({totalCount} sales, Total: ${totalSales.toFixed(2)})
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={sales.length === 0}>
          Export to Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Sales</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              ${totalSales.toFixed(2)}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Transactions</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {totalCount}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Average Sale</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              ${totalCount > 0 ? (totalSales / totalCount).toFixed(2) : '0.00'}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <BranchSelector
              selectedBranch={selectedBranch}
              onBranchChange={setSelectedBranch}
              showAll={true}
              label="Branch"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
            Search Invoice Number
          </label>
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ width: '100%' }}
          />
        </div>

        <AdvancedSearch
          fields={[
            { 
              name: 'status', 
              label: 'Status', 
              type: 'select', 
              options: [
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'voided', label: 'Voided' },
                { value: 'returned', label: 'Returned' },
              ]
            },
            { 
              name: 'payment_method', 
              label: 'Payment Method', 
              type: 'select', 
              options: [
                { value: 'cash', label: 'Cash' },
                { value: 'ecocash', label: 'EcoCash' },
                { value: 'onemoney', label: 'OneMoney' },
                { value: 'telecash', label: 'Telecash' },
                { value: 'card', label: 'Card' },
                { value: 'zipit', label: 'ZIPIT' },
                { value: 'usd', label: 'USD Cash' },
                { value: 'rtgs', label: 'RTGS' },
                { value: 'credit', label: 'Credit' },
                { value: 'split', label: 'Split Payment' },
              ]
            },
            {
              name: 'customer',
              label: 'Customer',
              type: 'select',
              options: customers?.map((c: any) => ({
                value: c.id.toString(),
                label: c.full_name || `${c.first_name} ${c.last_name}`
              })) || []
            },
          ]}
          onSearch={(newFilters) => setFilters(newFilters)}
          onReset={() => {
            setFilters({})
            setSearchQuery('')
            setDateRange({
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0],
            })
          }}
        />
      </Card>

      {error && (
        <Card>
          <div style={{ padding: '20px', background: '#fee', color: '#c33', borderRadius: '6px' }}>
            Error loading sales: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading sales...</p>
          </div>
        </Card>
      ) : sales && sales.length > 0 ? (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Date & Time</th>
                  <th className="table-header">Branch</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Cashier</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Subtotal</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Tax</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Total</th>
                  <th className="table-header">Payment</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale: Sale) => (
                  <tr key={sale.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#3498db', fontFamily: 'monospace' }}>
                      {sale.invoice_number}
                    </td>
                    <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '13px' }}>
                      <div>{new Date(sale.date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '11px', color: '#95a5a6' }}>
                        {new Date(sale.date).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#3498db' }}>
                      {sale.branch_name || 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {sale.customer_name || (
                        <span style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Walk-in</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '13px' }}>
                      {sale.cashier_name || 'System'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ${parseFloat(sale.subtotal || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d' }}>
                      ${parseFloat(sale.tax_amount || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2ecc71' }}>
                      ${parseFloat(sale.total_amount || '0').toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        background: '#e3f2fd',
                        color: '#1976d2'
                      }}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: getStatusColor(sale.status).bg,
                        color: getStatusColor(sale.status).color
                      }}>
                        {sale.status?.toUpperCase() || 'COMPLETED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleViewSale(sale.id)}
                        >
                          View
                        </Button>
                        {sale.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewSale(sale.id)}
                            title="Print Receipt"
                          >
                            🖨️
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
      ) : (
        <Card>
          <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💰</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Sales Found</h3>
            <p>Start processing sales through the POS system</p>
          </div>
        </Card>
      )}

      {/* Receipt Modal */}
      {selectedSale && (
        <Receipt
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: { [key: string]: { bg: string; color: string } } = {
    completed: { bg: '#d4edda', color: '#155724' },
    pending: { bg: '#fff3cd', color: '#856404' },
    voided: { bg: '#f8d7da', color: '#721c24' },
    returned: { bg: '#d1ecf1', color: '#0c5460' },
  };
  return colors[status?.toLowerCase()] || { bg: '#e2e3e5', color: '#383d41' };
}

/**
 * Bulk Operations Component
 * Import/Export CSV, Bulk Price Updates, Bulk Stock Adjustments
 */
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface BulkOperationResult {
  success: any[]
  errors: any[]
  total?: number
}

export default function BulkOperations() {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'prices' | 'stock'>('import')
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Fetch branches
  const { data: branches } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/core/branches/')
      return response.data?.results || response.data || []
    },
  })

  // Import products mutation
  const importProductsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/inventory/bulk-operations/import_products/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: (data: BulkOperationResult) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      const successCount = data.success?.length || 0
      const errorCount = data.errors?.length || 0
      toast.success(`Import completed: ${successCount} successful, ${errorCount} errors`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Import failed')
    },
  })

  // Bulk update prices mutation
  const bulkUpdatePricesMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      const response = await api.post('/inventory/bulk-operations/bulk_update_prices/', { updates })
      return response.data
    },
    onSuccess: (data: BulkOperationResult) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      const successCount = data.success?.length || 0
      const errorCount = data.errors?.length || 0
      toast.success(`Price update completed: ${successCount} successful, ${errorCount} errors`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Price update failed')
    },
  })

  // Bulk adjust stock mutation
  const bulkAdjustStockMutation = useMutation({
    mutationFn: async (data: { branch_id: number; adjustments: any[] }) => {
      const response = await api.post('/inventory/bulk-operations/bulk_adjust_stock/', data)
      return response.data
    },
    onSuccess: (data: BulkOperationResult) => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      const successCount = data.success?.length || 0
      const errorCount = data.errors?.length || 0
      toast.success(`Stock adjustment completed: ${successCount} successful, ${errorCount} errors`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Stock adjustment failed')
    },
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    if (selectedBranch) {
      formData.append('branch_id', selectedBranch.toString())
    }

    importProductsMutation.mutate(formData)
  }

  const handleExportProducts = () => {
    const params: any = {}
    if (selectedBranch) params.branch_id = selectedBranch
    window.open(`${api.defaults.baseURL}/inventory/bulk-operations/export_products/?${new URLSearchParams(params).toString()}`, '_blank')
  }

  const handleExportStockLevels = () => {
    if (!selectedBranch) {
      toast.error('Please select a branch')
      return
    }
    window.open(`${api.defaults.baseURL}/inventory/bulk-operations/export_stock_levels/?branch_id=${selectedBranch}`, '_blank')
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Bulk Operations</h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          Import/Export CSV, Bulk Price Updates, and Bulk Stock Adjustments
        </p>
      </div>

      {/* Branch Selector */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ fontWeight: '600', minWidth: '100px' }}>Branch:</label>
          <select
            className="input"
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value ? parseInt(e.target.value) : null)}
            style={{ flex: 1, maxWidth: '300px' }}
          >
            <option value="">All Branches</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #dee2e6' }}>
        {(['import', 'export', 'prices', 'stock'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === tab ? '#667eea' : '#6c757d',
              fontWeight: activeTab === tab ? '600' : '400',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'import' ? 'Import CSV' : tab === 'export' ? 'Export CSV' : tab === 'prices' ? 'Bulk Prices' : 'Stock Adjustment'}
          </button>
        ))}
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <Card>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Import Products from CSV</h2>
          <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>CSV Format</h3>
            <p style={{ marginBottom: '8px', fontSize: '14px' }}>Your CSV file should include the following columns:</p>
            <code style={{ display: 'block', padding: '12px', background: 'white', borderRadius: '4px', fontSize: '12px' }}>
              sku, name, category, description, barcode, cost_price, selling_price, reorder_level, reorder_quantity, unit,
              track_inventory, is_active, quantity
            </code>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select CSV File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={importProductsMutation.isPending}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            {importProductsMutation.data && (
              <div style={{ padding: '16px', background: '#d4edda', borderRadius: '8px', color: '#155724' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>Import Results:</div>
                <div>Total: {importProductsMutation.data.total || 0}</div>
                <div>Successful: {importProductsMutation.data.success?.length || 0}</div>
                <div>Errors: {importProductsMutation.data.errors?.length || 0}</div>
                {importProductsMutation.data.errors && importProductsMutation.data.errors.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Errors:</div>
                    {importProductsMutation.data.errors.slice(0, 5).map((error: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '12px' }}>
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                    {importProductsMutation.data.errors.length > 5 && (
                      <div style={{ fontSize: '12px', fontStyle: 'italic' }}>
                        ...and {importProductsMutation.data.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <Card>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Export to CSV</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <Card style={{ padding: '24px', textAlign: 'center', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ marginTop: 0 }}>Export Products</h3>
              <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                Export all products with current prices and settings
              </p>
              <Button onClick={handleExportProducts} style={{ width: '100%' }}>
                Export Products
              </Button>
            </Card>

            <Card style={{ padding: '24px', textAlign: 'center', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ marginTop: 0 }}>Export Stock Levels</h3>
              <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                Export current stock levels for selected branch
              </p>
              <Button
                onClick={handleExportStockLevels}
                disabled={!selectedBranch}
                style={{ width: '100%' }}
              >
                {selectedBranch ? 'Export Stock Levels' : 'Select Branch First'}
              </Button>
            </Card>
          </div>
        </Card>
      )}

      {/* Bulk Prices Tab */}
      {activeTab === 'prices' && (
        <BulkPriceUpdate
          onUpdate={(updates) => bulkUpdatePricesMutation.mutate(updates)}
          isLoading={bulkUpdatePricesMutation.isPending}
          result={bulkUpdatePricesMutation.data}
        />
      )}

      {/* Stock Adjustment Tab */}
      {activeTab === 'stock' && (
        <BulkStockAdjustment
          branchId={selectedBranch}
          onAdjust={(adjustments) => {
            if (!selectedBranch) {
              toast.error('Please select a branch')
              return
            }
            bulkAdjustStockMutation.mutate({ branch_id: selectedBranch, adjustments })
          }}
          isLoading={bulkAdjustStockMutation.isPending}
          result={bulkAdjustStockMutation.data}
        />
      )}
    </div>
  )
}

function BulkPriceUpdate({ onUpdate, isLoading, result }: any) {
  const [updates, setUpdates] = useState([{ sku: '', selling_price: '', cost_price: '' }])

  const addRow = () => {
    setUpdates([...updates, { sku: '', selling_price: '', cost_price: '' }])
  }

  const removeRow = (index: number) => {
    setUpdates(updates.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validUpdates = updates
      .filter((u) => u.sku || u.selling_price || u.cost_price)
      .map((u) => ({
        sku: u.sku,
        selling_price: u.selling_price ? parseFloat(u.selling_price) : undefined,
        cost_price: u.cost_price ? parseFloat(u.cost_price) : undefined,
      }))
      .filter((u) => u.selling_price !== undefined || u.cost_price !== undefined)

    if (validUpdates.length === 0) {
      toast.error('Please enter at least one update')
      return
    }

    onUpdate(validUpdates)
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Bulk Price Update</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>SKU *</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Selling Price</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Cost Price</th>
                <th style={{ padding: '12px', width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {updates.map((update, index) => (
                <tr key={index}>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="text"
                      className="input"
                      value={update.sku}
                      onChange={(e) => {
                        const newUpdates = [...updates]
                        newUpdates[index].sku = e.target.value
                        setUpdates(newUpdates)
                      }}
                      placeholder="SKU"
                      required
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={update.selling_price}
                      onChange={(e) => {
                        const newUpdates = [...updates]
                        newUpdates[index].selling_price = e.target.value
                        setUpdates(newUpdates)
                      }}
                      placeholder="0.00"
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={update.cost_price}
                      onChange={(e) => {
                        const newUpdates = [...updates]
                        newUpdates[index].cost_price = e.target.value
                        setUpdates(newUpdates)
                      }}
                      placeholder="0.00"
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    {updates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        style={{
                          padding: '4px 8px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button type="button" onClick={addRow} style={{ background: '#6c757d' }}>
            + Add Row
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Prices'}
          </Button>
        </div>
        {result && (
          <div style={{ marginTop: '16px', padding: '16px', background: '#d4edda', borderRadius: '8px', color: '#155724' }}>
            <div>Successful: {result.success?.length || 0}</div>
            <div>Errors: {result.errors?.length || 0}</div>
          </div>
        )}
      </form>
    </Card>
  )
}

function BulkStockAdjustment({ branchId, onAdjust, isLoading, result }: any) {
  const [adjustments, setAdjustments] = useState([{ sku: '', quantity: '', notes: '' }])

  const addRow = () => {
    setAdjustments([...adjustments, { sku: '', quantity: '', notes: '' }])
  }

  const removeRow = (index: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validAdjustments = adjustments
      .filter((a) => a.sku && a.quantity)
      .map((a) => ({
        sku: a.sku,
        quantity: parseInt(a.quantity),
        notes: a.notes || 'Bulk adjustment',
      }))

    if (validAdjustments.length === 0) {
      toast.error('Please enter at least one adjustment')
      return
    }

    onAdjust(validAdjustments)
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Bulk Stock Adjustment</h2>
      {!branchId && (
        <div style={{ padding: '16px', background: '#fff3cd', borderRadius: '8px', color: '#856404', marginBottom: '20px' }}>
          Please select a branch to adjust stock levels
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>SKU *</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Quantity Adjustment *</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Notes</th>
                <th style={{ padding: '12px', width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment, index) => (
                <tr key={index}>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="text"
                      className="input"
                      value={adjustment.sku}
                      onChange={(e) => {
                        const newAdjustments = [...adjustments]
                        newAdjustments[index].sku = e.target.value
                        setAdjustments(newAdjustments)
                      }}
                      placeholder="SKU"
                      required
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      className="input"
                      value={adjustment.quantity}
                      onChange={(e) => {
                        const newAdjustments = [...adjustments]
                        newAdjustments[index].quantity = e.target.value
                        setAdjustments(newAdjustments)
                      }}
                      placeholder="+50 or -10"
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                      Use + for increase, - for decrease
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="text"
                      className="input"
                      value={adjustment.notes}
                      onChange={(e) => {
                        const newAdjustments = [...adjustments]
                        newAdjustments[index].notes = e.target.value
                        setAdjustments(newAdjustments)
                      }}
                      placeholder="Reason for adjustment"
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    {adjustments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        style={{
                          padding: '4px 8px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button type="button" onClick={addRow} style={{ background: '#6c757d' }}>
            + Add Row
          </Button>
          <Button type="submit" disabled={isLoading || !branchId}>
            {isLoading ? 'Adjusting...' : 'Apply Adjustments'}
          </Button>
        </div>
        {result && (
          <div style={{ marginTop: '16px', padding: '16px', background: '#d4edda', borderRadius: '8px', color: '#155724' }}>
            <div>Successful: {result.success?.length || 0}</div>
            <div>Errors: {result.errors?.length || 0}</div>
          </div>
        )}
      </form>
    </Card>
  )
}



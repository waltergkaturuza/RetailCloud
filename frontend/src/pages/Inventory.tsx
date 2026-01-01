import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import WarehouseManagement from '../components/AdvancedInventory/WarehouseManagement'
import DemandForecasting from '../components/AdvancedInventory/DemandForecasting'
import StockAnalysis from '../components/AdvancedInventory/StockAnalysis'
import BulkOperations from '../components/AdvancedInventory/BulkOperations'

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [showAdjustmentForm, setShowAdjustmentForm] = useState<any>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'batches' | 'warehouse' | 'forecasting' | 'analysis' | 'bulk'>('stock')
  const queryClient = useQueryClient()

  // Fetch branches for filtering and adjustment
  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.get('/core/branches/')
        const data = response.data?.results || response.data
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  })

  const branches = Array.isArray(branchesResponse) ? branchesResponse : []

  const { data: stockLevelsResponse, isLoading } = useQuery({
    queryKey: ['stock-levels', filterBranch, filterLowStock],
    queryFn: async () => {
      const params: any = {}
      if (filterBranch) params.branch = filterBranch
      if (filterLowStock) params.is_low_stock = true
      
      const response = await api.get('/inventory/stock-levels/', { params })
      return response.data
    },
  })

  const stockLevels = stockLevelsResponse?.results || stockLevelsResponse || []

  const { data: movementsResponse, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements', selectedProduct],
    queryFn: async () => {
      const params: any = { ordering: '-created_at' }
      if (selectedProduct) params.product = selectedProduct.id
      
      const response = await api.get('/inventory/stock-movements/', { params })
      return response.data
    },
    enabled: activeTab === 'movements'
  })

  const movements = movementsResponse?.results || movementsResponse || []

  const { data: batchesResponse, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const params: any = { ordering: 'expiry_date' }
      
      const response = await api.get('/inventory/batches/', { params })
      return response.data
    },
    enabled: activeTab === 'batches'
  })

  const batches = batchesResponse?.results || batchesResponse || []

  const filteredStock = stockLevels.filter((stock: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      stock.product_name?.toLowerCase().includes(query) ||
      stock.product_sku?.toLowerCase().includes(query) ||
      stock.product_barcode?.toLowerCase().includes(query)
    )
  })

  const adjustmentMutation = useMutation({
    mutationFn: async ({ productId, branchId, quantity, notes }: any) => {
      return api.post(`/inventory/products/${productId}/adjust_stock/`, {
        branch_id: branchId,
        quantity: parseInt(quantity),
        notes,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      setShowAdjustmentForm(null)
      toast.success('Stock adjusted successfully')
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || 'Failed to adjust stock'
      console.error('Stock adjustment error:', error.response?.data)
      toast.error(errorMsg)
    }
  })

  const lowStockCount = stockLevels.filter((s: any) => s.is_low_stock).length
  const outOfStockCount = stockLevels.filter((s: any) => s.quantity === 0).length
  const totalValue = stockLevels.reduce((sum: number, stock: any) => {
    // This would need product cost_price - simplified for now
    return sum
  }, 0)

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Inventory Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Monitor and manage inventory stock levels, movements, and batches
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Products</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
              {stockLevels.length}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Low Stock</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#f39c12' }}>
              {lowStockCount}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Out of Stock</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#e74c3c' }}>
              {outOfStockCount}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '24px',
        borderBottom: '2px solid #ecf0f1'
      }}>
        <button
          onClick={() => setActiveTab('stock')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'stock' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'stock' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'stock' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Stock Levels ({stockLevels.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'movements' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'movements' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'movements' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Stock Movements
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'batches' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'batches' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'batches' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('warehouse')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'warehouse' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'warehouse' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'warehouse' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          🏭 Warehouse
        </button>
        <button
          onClick={() => setActiveTab('forecasting')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'forecasting' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'forecasting' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'forecasting' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          🔮 Forecasting
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'analysis' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'analysis' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'analysis' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          📈 Analysis
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'bulk' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'bulk' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'bulk' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          📥 Bulk Ops
        </button>
      </div>

      {/* Stock Levels Tab */}
      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <Card className="mb-3">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Search Products
                </label>
                <input
                  type="text"
                  placeholder="Search by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Branch
                </label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '24px' }}>
                  <input
                    type="checkbox"
                    checked={filterLowStock}
                    onChange={(e) => setFilterLowStock(e.target.checked)}
                  />
                  Low Stock Only
                </label>
              </div>
              <Button 
                variant="secondary"
                onClick={() => {
                  setSearchQuery('')
                  setFilterBranch('')
                  setFilterLowStock(false)
                }}
              >
                Clear
              </Button>
            </div>
          </Card>

          {/* Stock Levels Table */}
          <Card>
            {isLoading ? (
              <div className="text-center" style={{ padding: '40px' }}>
                <div className="spinner" />
                <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading stock levels...</p>
              </div>
            ) : filteredStock.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th className="table-header">Product</th>
                      <th className="table-header">SKU</th>
                      <th className="table-header">Branch</th>
                      <th className="table-header" style={{ textAlign: 'right' }}>Current Stock</th>
                      <th className="table-header" style={{ textAlign: 'right' }}>Available</th>
                      <th className="table-header" style={{ textAlign: 'right' }}>Reserved</th>
                      <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                      <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((stock: any) => (
                      <tr key={stock.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>
                          {stock.product_name}
                        </td>
                        <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '13px', fontFamily: 'monospace' }}>
                          {stock.product_sku}
                        </td>
                        <td style={{ padding: '12px' }}>{stock.branch_name}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '16px' }}>
                          {stock.quantity}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#2ecc71', fontWeight: '500' }}>
                          {stock.available_quantity || 0}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#f39c12' }}>
                          {stock.reserved_quantity || 0}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {stock.is_low_stock ? (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#fff3cd',
                              color: '#856404'
                            }}>
                              Low Stock
                            </span>
                          ) : stock.quantity === 0 ? (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#f8d7da',
                              color: '#721c24'
                            }}>
                              Out of Stock
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#d4edda',
                              color: '#155724'
                            }}>
                              In Stock
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setShowAdjustmentForm({
                                productId: stock.product,
                                branchId: stock.branch,
                                currentStock: stock.quantity,
                                productName: stock.product_name,
                                productSku: stock.product_sku,
                              })}
                            >
                              Adjust
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedProduct({ id: stock.product, name: stock.product_name })
                                setActiveTab('movements')
                              }}
                            >
                              History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
                <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Stock Data</h3>
                <p>Stock levels will appear here after you add products and receive inventory</p>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Stock Movements Tab */}
      {activeTab === 'movements' && (
        <Card>
          {selectedProduct && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#e3f2fd', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>Filtering:</strong> {selectedProduct.name}</span>
                <Button size="sm" variant="secondary" onClick={() => setSelectedProduct(null)}>
                  Clear Filter
                </Button>
              </div>
            </div>
          )}
          {movementsLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <div className="spinner" />
              <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading movements...</p>
            </div>
          ) : movements && movements.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Date & Time</th>
                    <th className="table-header">Product</th>
                    <th className="table-header">Branch</th>
                    <th className="table-header">Type</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Quantity</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Before</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>After</th>
                    <th className="table-header">Reference</th>
                    <th className="table-header">User</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement: any) => (
                    <tr key={movement.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                        {new Date(movement.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{movement.product_name}</td>
                      <td style={{ padding: '12px' }}>{movement.branch_name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          background: getMovementTypeColor(movement.movement_type).bg,
                          color: getMovementTypeColor(movement.movement_type).color
                        }}>
                          {movement.movement_type}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: parseFloat(movement.quantity) > 0 ? '#2ecc71' : '#e74c3c'
                      }}>
                        {parseFloat(movement.quantity) > 0 ? '+' : ''}{movement.quantity}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d' }}>
                        {movement.quantity_before}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        {movement.quantity_after}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                        {movement.reference_type} {movement.reference_id ? `#${movement.reference_id}` : ''}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                        {movement.user_name || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Stock Movements</h3>
              <p>Stock movement history will appear here</p>
            </div>
          )}
        </Card>
      )}

      {/* Advanced Inventory Tabs */}
      {activeTab === 'warehouse' && <WarehouseManagement />}
      {activeTab === 'forecasting' && <DemandForecasting />}
      {activeTab === 'analysis' && <StockAnalysis />}
      {activeTab === 'bulk' && <BulkOperations />}

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <Card>
          {batchesLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <div className="spinner" />
              <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading batches...</p>
            </div>
          ) : batches && batches.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header">Batch Number</th>
                    <th className="table-header">Branch</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Quantity</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Remaining</th>
                    <th className="table-header">Received Date</th>
                    <th className="table-header">Expiry Date</th>
                    <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch: any) => (
                    <tr key={batch.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{batch.product_name}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#3498db' }}>
                        {batch.batch_number || '—'}
                      </td>
                      <td style={{ padding: '12px' }}>{batch.branch || 'Main'}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        {batch.quantity}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2ecc71' }}>
                        {batch.remaining_quantity || batch.quantity}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                        {batch.received_date ? new Date(batch.received_date).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        {batch.expiry_date ? (
                          <span style={{ 
                            color: batch.is_expired ? '#e74c3c' : batch.is_expiring_soon ? '#f39c12' : '#2c3e50'
                          }}>
                            {new Date(batch.expiry_date).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {batch.is_expired ? (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#f8d7da',
                            color: '#721c24'
                          }}>
                            Expired
                          </span>
                        ) : batch.is_expiring_soon ? (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#fff3cd',
                            color: '#856404'
                          }}>
                            Expiring Soon
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#d4edda',
                            color: '#155724'
                          }}>
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Batches</h3>
              <p>Batches will appear here when you receive goods with batch numbers</p>
            </div>
          )}
        </Card>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentForm && (
        <StockAdjustmentModal
          formData={showAdjustmentForm}
          onClose={() => setShowAdjustmentForm(null)}
          onSubmit={(data) => adjustmentMutation.mutate(data)}
          isLoading={adjustmentMutation.isPending}
        />
      )}
    </div>
  )
}

function StockAdjustmentModal({ formData, onClose, onSubmit, isLoading }: any) {
  const [quantity, setQuantity] = useState(formData.currentStock.toString())
  const [notes, setNotes] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState(formData.branchId?.toString() || '')
  
  // Fetch branches for the modal
  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.get('/core/branches/')
        const data = response.data?.results || response.data
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  })

  const branches = Array.isArray(branchesResponse) ? branchesResponse : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Use selected branch or fall back to formData branchId
    const branchIdToUse = selectedBranchId || formData.branchId
    
    if (!branchIdToUse) {
      toast.error('Please select a branch')
      return
    }
    
    onSubmit({
      productId: formData.productId,
      branchId: parseInt(branchIdToUse.toString()),
      quantity,
      notes,
    })
  }

  const difference = parseInt(quantity) - formData.currentStock

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Adjust Stock Level</h2>
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

        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
          <div><strong>Product:</strong> {formData.productName}</div>
          <div><strong>SKU:</strong> {formData.productSku}</div>
          <div><strong>Current Stock:</strong> {formData.currentStock}</div>
        </div>

        {branches.length === 0 ? (
          <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '6px', marginBottom: '20px' }}>
            <p style={{ margin: 0, color: '#856404' }}>
              <strong>No branches available.</strong> Please create a branch first before adjusting stock.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Branch <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="input"
                style={{ width: '100%' }}
                required
              >
                <option value="">Select Branch</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              New Stock Level <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              min="0"
              required
            />
            {difference !== 0 && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px',
                borderRadius: '4px',
                background: difference > 0 ? '#d4edda' : '#f8d7da',
                color: difference > 0 ? '#155724' : '#721c24',
                fontSize: '14px'
              }}>
                {difference > 0 ? '+' : ''}{difference} units {difference > 0 ? 'increase' : 'decrease'}
              </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Notes / Reason
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                placeholder="Reason for adjustment (e.g., damaged goods, stocktake correction, etc.)..."
              />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #ecf0f1' }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Save Adjustment
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function getMovementTypeColor(type: string) {
  const colors: { [key: string]: { bg: string; color: string } } = {
    'in': { bg: '#d4edda', color: '#155724' },
    'out': { bg: '#f8d7da', color: '#721c24' },
    'sale': { bg: '#f8d7da', color: '#721c24' },
    'purchase': { bg: '#d4edda', color: '#155724' },
    'adjustment': { bg: '#fff3cd', color: '#856404' },
    'return': { bg: '#d1ecf1', color: '#0c5460' },
    'transfer': { bg: '#e2e3e5', color: '#383d41' },
  }
  return colors[type?.toLowerCase()] || { bg: '#e2e3e5', color: '#383d41' }
}

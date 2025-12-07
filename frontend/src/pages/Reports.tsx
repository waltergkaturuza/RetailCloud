import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import BranchSelector from '../components/BranchSelector'
import { exportToExcel } from '../utils/export'
import toast from 'react-hot-toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'inventory'>('sales')
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>('all')

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', dateRange, selectedBranch],
    queryFn: async () => {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/sales/', { params })
      return response.data
    },
  })

  const { data: profitLoss, isLoading: plLoading } = useQuery({
    queryKey: ['profit-loss', dateRange, selectedBranch],
    queryFn: async () => {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/profit-loss/', { params })
      return response.data
    },
  })

  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-report', selectedBranch],
    queryFn: async () => {
      const params: any = {}
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/inventory/', { params })
      return response.data
    },
  })

  const dailySalesData = {
    labels: salesReport?.daily_breakdown?.map((d: any) => {
      const date = new Date(d.date__date || d.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }) || [],
    datasets: [
      {
        label: 'Sales Amount',
        data: salesReport?.daily_breakdown?.map((d: any) => parseFloat(d.total || 0)) || [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const paymentMethodsData = {
    labels: salesReport?.payment_methods?.map((p: any) => 
      p.payment_method?.charAt(0).toUpperCase() + p.payment_method?.slice(1) || 'Unknown'
    ) || [],
    datasets: [
      {
        label: 'Amount',
        data: salesReport?.payment_methods?.map((p: any) => parseFloat(p.total || 0)) || [],
        backgroundColor: [
          '#3498db',
          '#2ecc71',
          '#f39c12',
          '#e74c3c',
          '#9b59b6',
          '#1abc9c',
          '#34495e',
          '#e67e22',
        ],
        borderWidth: 0,
      },
    ],
  }

  const handleExportSales = () => {
    if (!salesReport) {
      toast.error('No data to export')
      return
    }

    const exportData = salesReport.daily_breakdown?.map((d: any) => ({
      'Date': new Date(d.date__date || d.date).toLocaleDateString(),
      'Sales Count': d.count || 0,
      'Total Amount': parseFloat(d.total || 0).toFixed(2),
    })) || []

    exportToExcel(exportData, `Sales_Report_${dateRange.start}_to_${dateRange.end}`)
    toast.success('Sales report exported successfully')
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Reports & Analytics
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            View detailed reports and analytics for your business
          </p>
        </div>
        {activeTab === 'sales' && (
          <Button variant="secondary" onClick={handleExportSales} disabled={!salesReport}>
            Export to Excel
          </Button>
        )}
      </div>

      {/* Date Range Filter */}
      <Card className="mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
      </Card>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '24px',
        borderBottom: '2px solid #ecf0f1'
      }}>
        <button
          onClick={() => setActiveTab('sales')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'sales' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'sales' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'sales' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Sales Report
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'profit' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'profit' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'profit' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Profit & Loss
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'inventory' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'inventory' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'inventory' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Inventory Report
        </button>
      </div>

      {/* Sales Report Tab */}
      {activeTab === 'sales' && (
        <>
          {salesLoading ? (
            <Card>
              <div className="text-center" style={{ padding: '40px' }}>
                <div className="spinner" />
                <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading sales report...</p>
              </div>
            </Card>
          ) : salesReport ? (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Sales</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
                      {salesReport.summary?.total_sales || 0}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Amount</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#2ecc71' }}>
                      ${parseFloat(salesReport.summary?.total_amount || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Tax</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#3498db' }}>
                      ${parseFloat(salesReport.summary?.total_tax || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Discounts</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#f39c12' }}>
                      ${parseFloat(salesReport.summary?.total_discount || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <Card>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
                    Daily Sales Trend
                  </h3>
                  {salesReport.daily_breakdown && salesReport.daily_breakdown.length > 0 ? (
                    <Line 
                      data={dailySalesData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return '$' + value
                              }
                            }
                          }
                        }
                      }}
                      height={300}
                    />
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                      No sales data for the selected period
                    </div>
                  )}
                </Card>

                <Card>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
                    Payment Methods
                  </h3>
                  {salesReport.payment_methods && salesReport.payment_methods.length > 0 ? (
                    <Doughnut 
                      data={paymentMethodsData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        }
                      }}
                      height={300}
                    />
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                      No payment data available
                    </div>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
                <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Sales Data</h3>
                <p>No sales data available for the selected period</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Profit & Loss Tab */}
      {activeTab === 'profit' && (
        <>
          {plLoading ? (
            <Card>
              <div className="text-center" style={{ padding: '40px' }}>
                <div className="spinner" />
                <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading profit & loss report...</p>
              </div>
            </Card>
          ) : profitLoss ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <Card>
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Revenue</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#2ecc71' }}>
                      ${parseFloat(profitLoss.revenue || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Cost of Goods Sold</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#e74c3c' }}>
                      ${parseFloat(profitLoss.cost_of_goods_sold || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Gross Profit</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: parseFloat(profitLoss.gross_profit || 0) >= 0 ? '#2ecc71' : '#e74c3c' }}>
                      ${parseFloat(profitLoss.gross_profit || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Profit Margin</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#3498db' }}>
                      {parseFloat(profitLoss.gross_profit_margin || 0).toFixed(2)}%
                    </div>
                  </div>
                </Card>
              </div>

              <Card>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
                  Revenue vs COGS
                </h3>
                {profitLoss.revenue > 0 && (
                  <Bar
                    data={{
                      labels: ['Revenue', 'COGS', 'Gross Profit'],
                      datasets: [
                        {
                          label: 'Amount',
                          data: [
                            parseFloat(profitLoss.revenue || 0),
                            parseFloat(profitLoss.cost_of_goods_sold || 0),
                            parseFloat(profitLoss.gross_profit || 0),
                          ],
                          backgroundColor: ['#2ecc71', '#e74c3c', '#3498db'],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '$' + value
                            }
                          }
                        }
                      }
                    }}
                    height={300}
                  />
                )}
              </Card>
            </>
          ) : (
            <Card>
              <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>💰</div>
                <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Profit Data</h3>
                <p>No profit & loss data available for the selected period</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Inventory Report Tab */}
      {activeTab === 'inventory' && (
        <>
          {inventoryLoading ? (
            <Card>
              <div className="text-center" style={{ padding: '40px' }}>
                <div className="spinner" />
                <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading inventory report...</p>
              </div>
            </Card>
          ) : inventoryReport ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <Card>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                    Low Stock Items ({inventoryReport.low_stock_items?.length || 0})
                  </h3>
                  {inventoryReport.low_stock_items && inventoryReport.low_stock_items.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="table-header">Product</th>
                            <th className="table-header">SKU</th>
                            <th className="table-header" style={{ textAlign: 'right' }}>Current</th>
                            <th className="table-header" style={{ textAlign: 'right' }}>Reorder Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryReport.low_stock_items.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td style={{ padding: '10px' }}>{item.product__name}</td>
                              <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>{item.product__sku}</td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#f39c12' }}>
                                {item.quantity}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'right' }}>{item.product__reorder_level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                      No low stock items
                    </div>
                  )}
                </Card>

                <Card>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                    Out of Stock Items ({inventoryReport.out_of_stock_items?.length || 0})
                  </h3>
                  {inventoryReport.out_of_stock_items && inventoryReport.out_of_stock_items.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="table-header">Product</th>
                            <th className="table-header">SKU</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryReport.out_of_stock_items.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td style={{ padding: '10px' }}>{item.product__name}</td>
                              <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>{item.product__sku}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                      No out of stock items
                    </div>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <div className="text-center" style={{ padding: '60px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>No Inventory Data</h3>
                <p>No inventory report data available</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

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
import RecommendationSummary from '../components/RecommendationSummary'
import PLStatementGrid from '../components/PLStatementGrid'
import { exportToExcel } from '../utils/export'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

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
  const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'inventory' | 'advanced'>('sales')
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
      try {
        const dateStr = d.date__date || d.date || ''
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return 'N/A'
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } catch (e) {
        return 'N/A'
      }
    }) || [],
    datasets: [
      {
        label: 'Sales Amount',
        data: salesReport?.daily_breakdown?.map((d: any) => {
          const value = d.total || 0
          const parsed = typeof value === 'string' ? parseFloat(value) : value
          return isNaN(parsed) ? 0 : parsed
        }) || [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const paymentMethodsData = {
    labels: salesReport?.payment_methods?.map((p: any) => {
      const method = p.payment_method || 'unknown'
      return method.charAt(0).toUpperCase() + method.slice(1)
    }) || [],
    datasets: [
      {
        label: 'Amount',
        data: salesReport?.payment_methods?.map((p: any) => {
          const value = p.total || 0
          const parsed = typeof value === 'string' ? parseFloat(value) : value
          return isNaN(parsed) ? 0 : parsed
        }) || [],
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

      {/* Recommendations - 4 Column Layout */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div style={{ gridColumn: 'span 4' }}>
          <RecommendationSummary maxDisplay={4} showSummary={false} collapsed={false} />
        </div>
      </div>

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
        <button
          onClick={() => setActiveTab('advanced')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'advanced' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'advanced' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'advanced' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Advanced Analytics
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
              {/* Summary Cards - Compact */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>Total Sales</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                      {salesReport.summary?.total_sales || 0}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>Total Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#2ecc71' }}>
                      ${parseFloat(salesReport.summary?.total_amount || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>Total Tax</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#3498db' }}>
                      ${parseFloat(salesReport.summary?.total_tax || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>Total Discounts</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#f39c12' }}>
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
                    <div style={{ height: '350px', position: 'relative' }}>
                      <Line 
                        data={dailySalesData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          aspectRatio: 2,
                          devicePixelRatio: 1,
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
                      />
                    </div>
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
                    <div style={{ height: '350px', position: 'relative' }}>
                      <Doughnut 
                        data={paymentMethodsData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          aspectRatio: 1,
                          devicePixelRatio: 1,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          }
                        }}
                      />
                    </div>
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
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>Net Revenue</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#2ecc71' }}>
                      ${parseFloat(profitLoss.trading_account?.net_revenue || profitLoss.revenue || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>COGS</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#e74c3c' }}>
                      ${parseFloat(profitLoss.trading_account?.cost_of_goods_sold || profitLoss.cost_of_goods_sold || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>Gross Profit</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: parseFloat(profitLoss.trading_account?.gross_profit || profitLoss.gross_profit || 0) >= 0 ? '#2ecc71' : '#e74c3c' }}>
                      ${parseFloat(profitLoss.trading_account?.gross_profit || profitLoss.gross_profit || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
                <Card>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '500' }}>Net Profit</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: parseFloat(profitLoss.summary?.net_profit || 0) >= 0 ? '#2ecc71' : '#e74c3c' }}>
                      ${parseFloat(profitLoss.summary?.net_profit || 0).toFixed(2)}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Comprehensive P&L Statement Grid with Chart */}
              <PLStatementGrid 
                plData={profitLoss} 
                dateRange={dateRange}
                branchId={selectedBranch}
              />
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

      {/* Advanced Analytics Tab */}
      {activeTab === 'advanced' && (
        <AdvancedAnalyticsTab dateRange={dateRange} selectedBranch={selectedBranch} />
      )}
    </div>
  )
}

// Advanced Analytics Component
function AdvancedAnalyticsTab({ dateRange, selectedBranch }: { dateRange: { start: string; end: string }; selectedBranch: number | 'all' }) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'quantity' | 'customers'>('revenue')

  const { data: productAnalytics, isLoading: productLoading } = useQuery({
    queryKey: ['product-analytics', dateRange, selectedBranch, period],
    queryFn: async () => {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        period: period,
      }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/analytics/products/', { params })
      return response.data
    },
  })

  const { data: branchComparison, isLoading: branchLoading } = useQuery({
    queryKey: ['branch-comparison', dateRange],
    queryFn: async () => {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      }
      const response = await api.get('/reports/analytics/branches/', { params })
      return response.data
    },
  })

  const { data: trendAnalysis, isLoading: trendLoading } = useQuery({
    queryKey: ['trend-analysis', dateRange, selectedBranch, metric, period],
    queryFn: async () => {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        metric: metric,
        period: period,
      }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/analytics/trends/', { params })
      return response.data
    },
  })

  const { data: taxBreakdown, isLoading: taxLoading } = useQuery({
    queryKey: ['tax-breakdown', dateRange],
    queryFn: async () => {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        group_by: 'product',
      }
      const response = await api.get('/reports/analytics/tax/', { params })
      return response.data
    },
  })

  const trendChartData = trendAnalysis ? {
    labels: trendAnalysis.data_points?.map((d: any) => {
      try {
        const dateStr = d.period || d.date || ''
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return 'N/A'
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } catch (e) {
        return 'N/A'
      }
    }) || [],
    datasets: [
      {
        label: 'Actual',
        data: trendAnalysis.data_points?.map((d: any) => parseFloat(d.value || 0)) || [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      ...(trendAnalysis.forecast ? [{
        label: 'Forecast',
        data: [
          ...new Array(trendAnalysis.data_points?.length || 0).fill(null),
          ...trendAnalysis.forecast.map((f: any) => parseFloat(f.predicted_value || 0))
        ],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
      }] : []),
    ],
  } : null

  const branchChartData = branchComparison ? {
    labels: branchComparison.branches?.map((b: any) => b.branch_name || 'Unknown') || [],
    datasets: [
      {
        label: 'Revenue',
        data: branchComparison.branches?.map((b: any) => parseFloat(b.total_revenue || 0)) || [],
        backgroundColor: '#3498db',
        borderWidth: 0,
      },
    ],
  } : null

  const productChartData = productAnalytics?.products ? {
    labels: productAnalytics.products.slice(0, 10).map((p: any) => p.product_name || 'Unknown'),
    datasets: [
      {
        label: 'Revenue',
        data: productAnalytics.products.slice(0, 10).map((p: any) => parseFloat(p.total_revenue || 0)),
        backgroundColor: '#2ecc71',
        borderWidth: 0,
      },
    ],
  } : null

  return (
    <>
      {/* Controls */}
      <Card className="mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Metric
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="revenue">Revenue</option>
              <option value="profit">Profit</option>
              <option value="quantity">Quantity</option>
              <option value="customers">Customers</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Trend Analysis with ML Forecast */}
      <Card className="mb-3">
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
          Trend Analysis & Forecasting
          {trendAnalysis?.trend_direction && (
            <span style={{
              marginLeft: '12px',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              background: trendAnalysis.trend_direction === 'upward' ? '#2ecc71' : trendAnalysis.trend_direction === 'downward' ? '#e74c3c' : '#95a5a6',
              color: 'white',
            }}>
              {trendAnalysis.trend_direction === 'upward' ? '↑ Upward' : trendAnalysis.trend_direction === 'downward' ? '↓ Downward' : '→ Stable'}
            </span>
          )}
        </h3>
        {trendLoading ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
          </div>
        ) : trendChartData ? (
          <div style={{ height: '300px', position: 'relative' }}>
            <Line
              data={trendChartData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                devicePixelRatio: 1,
                plugins: {
                  legend: {
                    display: true,
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
            />
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            No trend data available
          </div>
        )}
        {trendAnalysis?.anomalies && trendAnalysis.anomalies.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '6px', fontSize: '13px' }}>
            <strong>⚠️ Anomalies Detected:</strong> {trendAnalysis.anomalies.length} unusual data points identified
          </div>
        )}
      </Card>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Branch Comparison */}
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            Branch Comparison
          </h3>
          {branchLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <div className="spinner" />
            </div>
          ) : branchChartData ? (
            <div style={{ height: '300px', position: 'relative' }}>
              <Bar
                data={branchChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 1.5,
                  devicePixelRatio: 1,
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
              />
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
              No branch data available
            </div>
          )}
        </Card>

        {/* Top Products */}
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            Top Products
          </h3>
          {productLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <div className="spinner" />
            </div>
          ) : productChartData ? (
            <div style={{ height: '300px', position: 'relative' }}>
              <Bar
                data={productChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 1.5,
                  devicePixelRatio: 1,
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '$' + value
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
              No product data available
            </div>
          )}
        </Card>
      </div>

      {/* Tax Breakdown Table */}
      <Card>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
          Tax Breakdown by Product
        </h3>
        {taxLoading ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" />
          </div>
        ) : taxBreakdown?.breakdown && taxBreakdown.breakdown.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Product</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Revenue</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Tax Collected</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Tax Rate</th>
                </tr>
              </thead>
              <tbody>
                {taxBreakdown.breakdown.slice(0, 10).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: '10px' }}>{item.product_name || 'Unknown'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                      ${parseFloat(item.total_revenue || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#3498db' }}>
                      ${parseFloat(item.total_tax || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {parseFloat(item.tax_rate || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            No tax data available
          </div>
        )}
      </Card>
    </>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import BranchSelector from '../components/BranchSelector'
import RecommendationSummary from '../components/RecommendationSummary'
import '../styles/dashboard.css'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DashboardStats {
  total_sales: number
  total_amount: number
  total_tax: number
  total_discount: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>('all')
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  // Helper functions to navigate and open forms
  const handleAddProduct = () => {
    navigate('/products?action=add')
  }
  
  const handleAddCustomer = () => {
    navigate('/customers?action=add')
  }
  
  const handleCreatePO = () => {
    navigate('/purchases?action=create-po')
  }

  const { data: todayStats, isLoading: todayLoading } = useQuery({
    queryKey: ['dashboard-today-stats', selectedBranch],
    queryFn: async () => {
      const params: any = { start_date: today, end_date: today }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/sales/', { params })
      return response.data.summary as DashboardStats
    }
  })

  const { data: weekStats, isLoading: weekLoading } = useQuery({
    queryKey: ['dashboard-week-stats', selectedBranch],
    queryFn: async () => {
      const params: any = { start_date: weekAgo, end_date: today }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/sales/', { params })
      return response.data.summary as DashboardStats
    }
  })

  const { data: weekDaily, isLoading: weekDailyLoading } = useQuery({
    queryKey: ['dashboard-week-daily', selectedBranch],
    queryFn: async () => {
      const params: any = { start_date: weekAgo, end_date: today }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/sales/', { params })
      return response.data.daily_breakdown || []
    }
  })

  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery({
    queryKey: ['dashboard-inventory', selectedBranch],
    queryFn: async () => {
      const params: any = {}
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/inventory/', { params })
      return {
        low_stock: response.data.low_stock_items?.length || 0,
        out_of_stock: response.data.out_of_stock_items?.length || 0
      }
    }
  })

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ['dashboard-recent-sales', selectedBranch],
    queryFn: async () => {
      const params: any = { ordering: '-date', limit: 10 }
      if (selectedBranch !== 'all') params.branch = selectedBranch
      const response = await api.get('/pos/sales/', { params })
      return response.data?.results || response.data || []
    }
  })

  const { data: profitLoss, isLoading: plLoading } = useQuery({
    queryKey: ['dashboard-pl', selectedBranch],
    queryFn: async () => {
      const params: any = { start_date: today, end_date: today }
      if (selectedBranch !== 'all') params.branch_id = selectedBranch
      const response = await api.get('/reports/profit-loss/', { params })
      return response.data
    }
  })

  const weeklyChartData = {
    labels: weekDaily?.map((d: any) => {
      try {
        const dateStr = d.date__date || d.date || ''
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        // Check if date is valid
        if (isNaN(date.getTime())) return 'N/A'
        return date.toLocaleDateString('en-US', { weekday: 'short' })
      } catch (e) {
        return 'N/A'
      }
    }) || [],
    datasets: [
      {
        label: 'Daily Sales',
        data: weekDaily?.map((d: any) => {
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

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            Dashboard
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Welcome back, {user?.first_name || user?.email || 'User'}
            {selectedBranch !== 'all' && ' • Branch View'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px' }}>
            <BranchSelector
              selectedBranch={selectedBranch}
              onBranchChange={setSelectedBranch}
              showAll={true}
              compact={true}
            />
          </div>
          <Button variant="secondary" as={Link} to="/pos">
            Open POS
          </Button>
        </div>
      </div>

      {/* Main Dashboard Grid - 4 Column Layout (Responsive) */}
      <div 
        className="dashboard-grid"
        style={{ marginBottom: '24px' }}
      >
        {/* Column 1: Key Stats (Stacked) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <StatCard
            title="Today's Sales"
            value={todayStats?.total_amount ? `$${parseFloat(todayStats.total_amount.toString()).toFixed(2)}` : '$0.00'}
            subtitle={`${todayStats?.total_sales || 0} transactions`}
            icon="💰"
            loading={todayLoading}
            color="#3498db"
          />
          <StatCard
            title="This Week"
            value={weekStats?.total_amount ? `$${parseFloat(weekStats.total_amount.toString()).toFixed(2)}` : '$0.00'}
            subtitle={`${weekStats?.total_sales || 0} transactions`}
            icon="📈"
            loading={weekLoading}
            color="#2ecc71"
          />
          <StatCard
            title="Gross Profit"
            value={profitLoss?.gross_profit ? `$${parseFloat(profitLoss.gross_profit.toString()).toFixed(2)}` : '$0.00'}
            subtitle={`${profitLoss?.gross_profit_margin || 0}% margin`}
            icon="💵"
            loading={plLoading}
            color="#27ae60"
          />
          <StatCard
            title="Low Stock"
            value={(inventoryReport?.low_stock || 0).toString()}
            subtitle={`${inventoryReport?.out_of_stock || 0} out of stock`}
            icon="⚠️"
            loading={inventoryLoading}
            color="#e74c3c"
          />
        </div>

        {/* Column 2 & 3: Recommendations (Spans 2 columns) */}
        <div className="recommendations-column" style={{ display: 'flex', flexDirection: 'column' }}>
          <RecommendationSummary maxDisplay={4} showSummary={false} collapsed={false} />
        </div>

        {/* Column 4: Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card style={{ marginBottom: '12px', padding: '14px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button as={Link} to="/pos" size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                💳 Open POS
              </Button>
              <Button variant="secondary" onClick={handleAddProduct} size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                📦 Add Product
              </Button>
              <Button variant="secondary" onClick={handleAddCustomer} size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                👥 Add Customer
              </Button>
              <Button variant="secondary" onClick={handleCreatePO} size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                📝 Create PO
              </Button>
              <Button variant="secondary" as={Link} to="/inventory" size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                📋 Stock Management
              </Button>
            </div>
          </Card>
          
          {/* Quick Stats */}
          <Card style={{ padding: '14px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
              Quick Stats
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <QuickStatItem
                label="Today's Tax"
                value={todayStats?.total_tax ? `$${parseFloat(todayStats.total_tax.toString()).toFixed(2)}` : '$0.00'}
              />
              <QuickStatItem
                label="Today's Discounts"
                value={todayStats?.total_discount ? `$${parseFloat(todayStats.total_discount.toString()).toFixed(2)}` : '$0.00'}
              />
              <QuickStatItem
                label="Avg Sale (Today)"
                value={todayStats?.total_sales && todayStats.total_sales > 0 
                  ? `$${(parseFloat(todayStats.total_amount.toString()) / todayStats.total_sales).toFixed(2)}`
                  : '$0.00'}
              />
              <QuickStatItem
                label="Avg Sale (Week)"
                value={weekStats?.total_sales && weekStats.total_sales > 0
                  ? `$${(parseFloat(weekStats.total_amount.toString()) / weekStats.total_sales).toFixed(2)}`
                  : '$0.00'}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Second Row: Charts and Recent Sales - 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Weekly Sales Chart */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              Weekly Sales Trend
            </h3>
            <Button variant="secondary" size="sm" as={Link} to="/reports">
              View Full Report
            </Button>
          </div>
          {weekDailyLoading ? (
            <div className="text-center" style={{ padding: '60px' }}>
              <div className="spinner" />
            </div>
          ) : weekDaily && weekDaily.length > 0 ? (
            <div style={{ height: '300px', position: 'relative' }}>
              <Line 
                data={weeklyChartData} 
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
            <div style={{ padding: '60px', textAlign: 'center', color: '#7f8c8d' }}>
              No sales data for this week
            </div>
          )}
        </Card>

        {/* Recent Sales */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              Recent Sales
            </h3>
            <Button variant="secondary" size="sm" as={Link} to="/sales">
              View All
            </Button>
          </div>
          {salesLoading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <div className="spinner" />
            </div>
          ) : recentSales && recentSales.length > 0 ? (
            <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
              <table className="table">
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                  <tr>
                    <th className="table-header" style={{ fontSize: '12px', padding: '8px' }}>Invoice</th>
                    <th className="table-header" style={{ fontSize: '12px', padding: '8px' }}>Amount</th>
                    <th className="table-header" style={{ fontSize: '12px', padding: '8px' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 8).map((sale: any) => (
                    <tr key={sale.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '10px', fontWeight: '600', color: '#3498db', fontFamily: 'monospace', fontSize: '12px' }}>
                        {sale.invoice_number}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#2ecc71', fontSize: '13px' }}>
                        ${parseFloat(sale.total_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px', color: '#7f8c8d', fontSize: '12px' }}>
                        {new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '40px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
              <p style={{ fontSize: '14px' }}>No recent sales</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: string
  loading: boolean
  color: string
}

function StatCard({ title, value, subtitle, icon, loading, color }: StatCardProps) {
  return (
    <Card style={{ padding: '12px 16px' }}>
      <div style={{
        borderLeft: `3px solid ${color}`,
        paddingLeft: '12px',
        marginLeft: '-16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '10px', 
              color: '#7f8c8d', 
              marginBottom: '6px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {title}
            </div>
            <div style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#2c3e50', 
              marginBottom: '4px',
              lineHeight: '1.2'
            }}>
              {loading ? (
                <div className="spinner" style={{ width: '20px', height: '20px', margin: '4px 0' }} />
              ) : (
                value
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#95a5a6' }}>{subtitle}</div>
          </div>
          <div style={{ 
            fontSize: '36px',
            opacity: 0.2,
            lineHeight: '1',
            marginLeft: '12px'
          }}>
            {icon}
          </div>
        </div>
      </div>
    </Card>
  )
}

function QuickStatItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '10px',
      background: '#f8f9fa',
      borderRadius: '6px'
    }}>
      <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{value}</span>
    </div>
  )
}

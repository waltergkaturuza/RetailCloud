import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import BranchSelector from '../components/BranchSelector'
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
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>('all')
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
      const date = new Date(d.date__date || d.date)
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }) || [],
    datasets: [
      {
        label: 'Daily Sales',
        data: weekDaily?.map((d: any) => parseFloat(d.total || 0)) || [],
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
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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

      {/* Today's Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
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

      {/* Charts and Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
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
            <Line 
              data={weeklyChartData} 
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
              height={250}
            />
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#7f8c8d' }}>
              No sales data for this week
            </div>
          )}
        </Card>

        {/* Quick Stats */}
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            Quick Stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

      {/* Recent Sales and Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Invoice</th>
                    <th className="table-header">Customer</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Amount</th>
                    <th className="table-header">Payment</th>
                    <th className="table-header">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 5).map((sale: any) => (
                    <tr key={sale.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#3498db', fontFamily: 'monospace', fontSize: '13px' }}>
                        {sale.invoice_number}
                      </td>
                      <td style={{ padding: '12px' }}>{sale.customer_name || 'Walk-in'}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2ecc71' }}>
                        ${parseFloat(sale.total_amount || 0).toFixed(2)}
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
                      <td style={{ padding: '12px', color: '#7f8c8d', fontSize: '13px' }}>
                        {new Date(sale.date).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '40px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
              <p>No recent sales</p>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button as={Link} to="/pos" style={{ width: '100%', justifyContent: 'center' }}>
              💳 Open POS
            </Button>
            <Button variant="secondary" as={Link} to="/products" style={{ width: '100%', justifyContent: 'center' }}>
              📦 Add Product
            </Button>
            <Button variant="secondary" as={Link} to="/customers" style={{ width: '100%', justifyContent: 'center' }}>
              👥 Add Customer
            </Button>
            <Button variant="secondary" as={Link} to="/purchases" style={{ width: '100%', justifyContent: 'center' }}>
              📝 Create Purchase Order
            </Button>
            <Button variant="secondary" as={Link} to="/reports" style={{ width: '100%', justifyContent: 'center' }}>
              📊 View Reports
            </Button>
            <Button variant="secondary" as={Link} to="/inventory" style={{ width: '100%', justifyContent: 'center' }}>
              📋 Stock Management
            </Button>
          </div>
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
    <Card>
      <div style={{
        borderLeft: `4px solid ${color}`,
        paddingLeft: '16px',
        marginLeft: '-24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '12px', 
              color: '#7f8c8d', 
              marginBottom: '8px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {title}
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#2c3e50', 
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {loading ? (
                <div className="spinner" style={{ width: '24px', height: '24px', margin: '8px 0' }} />
              ) : (
                value
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#95a5a6' }}>{subtitle}</div>
          </div>
          <div style={{ 
            fontSize: '48px',
            opacity: 0.2,
            lineHeight: '1',
            marginLeft: '16px'
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
      padding: '12px',
      background: '#f8f9fa',
      borderRadius: '6px'
    }}>
      <span style={{ fontSize: '14px', color: '#7f8c8d' }}>{label}</span>
      <span style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>{value}</span>
    </div>
  )
}

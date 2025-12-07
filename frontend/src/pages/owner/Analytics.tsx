/**
 * Advanced Analytics & Reporting Dashboard
 * System-wide analytics with revenue charts, growth metrics, usage stats, and custom reports
 */
import { useState, useMemo } from 'react'
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
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

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

export default function Analytics() {
  const [period, setPeriod] = useState<number>(30) // days
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'tenants' | 'usage' | 'industry'>('overview')

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['owner-analytics', period],
    queryFn: async () => {
      const response = await api.get('/owner/analytics/', { params: { period } })
      return response.data
    },
  })

  // Revenue Chart Data
  const revenueChartData = useMemo(() => ({
    labels: analytics?.revenue?.daily?.labels || [],
    datasets: [
      {
        label: 'Daily Revenue (USD)',
        data: analytics?.revenue?.daily?.values || [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  }), [analytics])

  // Transaction Chart Data
  const transactionChartData = useMemo(() => ({
    labels: analytics?.transactions?.daily?.labels || [],
    datasets: [
      {
        label: 'Daily Transactions',
        data: analytics?.transactions?.daily?.values || [],
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  }), [analytics])

  // Currency Breakdown Chart
  const currencyChartData = useMemo(() => {
    const breakdown = analytics?.revenue?.currency_breakdown || {}
    return {
      labels: Object.keys(breakdown),
      datasets: [
        {
          data: Object.values(breakdown).map(v => parseFloat(String(v))),
          backgroundColor: [
            '#3498db',
            '#27ae60',
            '#f39c12',
            '#e74c3c',
            '#9b59b6',
            '#1abc9c',
          ],
        },
      ],
    }
  }, [analytics])

  // Tenant Growth Chart
  const tenantGrowthChartData = useMemo(() => ({
    labels: analytics?.tenants?.monthly_new?.labels || [],
    datasets: [
      {
        label: 'New Tenants',
        data: analytics?.tenants?.monthly_new?.values || [],
        backgroundColor: '#3498db',
        borderRadius: 4,
      },
    ],
  }), [analytics])

  // Top Tenants Chart
  const topTenantsChartData = useMemo(() => {
    const tenants = analytics?.revenue?.top_tenants || []
    return {
      labels: tenants.slice(0, 10).map((t: any) => t.name),
      datasets: [
        {
          label: 'Revenue (USD)',
          data: tenants.slice(0, 10).map((t: any) => t.revenue),
          backgroundColor: '#3498db',
          borderRadius: 4,
        },
      ],
    }
  }, [analytics])

  // Plan Distribution Chart
  const planDistributionData = useMemo(() => {
    const distribution = analytics?.tenants?.plan_distribution || {}
    return {
      labels: Object.keys(distribution),
      datasets: [
        {
          data: Object.values(distribution).map(v => Number(v)),
          backgroundColor: [
            '#3498db',
            '#27ae60',
            '#f39c12',
            '#e74c3c',
            '#9b59b6',
            '#1abc9c',
          ],
        },
      ],
    }
  }, [analytics])

  // Payment Methods Chart
  const paymentMethodsData = useMemo(() => {
    const methods = analytics?.transactions?.payment_methods || {}
    return {
      labels: Object.keys(methods),
      datasets: [
        {
          data: Object.values(methods).map(v => Number(v)),
          backgroundColor: [
            '#3498db',
            '#27ae60',
            '#f39c12',
            '#e74c3c',
            '#9b59b6',
            '#1abc9c',
          ],
        },
      ],
    }
  }, [analytics])

  const chartOptions = {
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
          color: '#7f8c8d',
        },
        grid: {
          color: '#ecf0f1',
        },
      },
      x: {
        ticks: {
          color: '#7f8c8d',
        },
        grid: {
          display: false,
        },
      },
    },
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#2c3e50',
          padding: 15,
        },
      },
    },
  }

  const handleExport = () => {
    if (!analytics) return
    
    // Export analytics data as JSON
    const dataStr = JSON.stringify(analytics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Analytics data exported!')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const getGrowthIcon = (value: number) => {
    if (value > 0) return '📈'
    if (value < 0) return '📉'
    return '➡️'
  }

  const getGrowthColor = (value: number) => {
    if (value > 0) return '#27ae60'
    if (value < 0) return '#e74c3c'
    return '#7f8c8d'
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            📈 Analytics & Reporting
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Advanced analytics and system-wide reporting
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="input"
            style={{ padding: '8px 12px', fontSize: '14px' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
            <option value={365}>Last year</option>
          </select>
          <Button variant="outline" onClick={handleExport}>
            📥 Export Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #ecf0f1',
      }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'revenue', label: '💰 Revenue' },
          { id: 'tenants', label: '🏢 Tenants' },
          { id: 'usage', label: '📱 Usage' },
          { id: 'industry', label: '🏭 Industry' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent',
              color: activeTab === tab.id ? '#3498db' : '#7f8c8d',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" />
          <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading analytics...</p>
        </div>
      ) : !analytics ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📈</div>
            <p style={{ fontSize: '18px' }}>No analytics data available</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Growth Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '24px',
              }}>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                    Revenue Growth
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: getGrowthColor(analytics.growth?.revenue_growth || 0),
                    marginBottom: '4px',
                  }}>
                    {getGrowthIcon(analytics.growth?.revenue_growth || 0)}{' '}
                    {Math.abs(analytics.growth?.revenue_growth || 0).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {formatCurrency(analytics.growth?.current_revenue || 0)} vs {formatCurrency(analytics.growth?.previous_revenue || 0)}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                    Tenant Growth
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: getGrowthColor(analytics.growth?.tenant_growth || 0),
                    marginBottom: '4px',
                  }}>
                    {getGrowthIcon(analytics.growth?.tenant_growth || 0)}{' '}
                    {Math.abs(analytics.growth?.tenant_growth || 0).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    New tenants this period
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                    Transaction Growth
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: getGrowthColor(analytics.growth?.transaction_growth || 0),
                    marginBottom: '4px',
                  }}>
                    {getGrowthIcon(analytics.growth?.transaction_growth || 0)}{' '}
                    {Math.abs(analytics.growth?.transaction_growth || 0).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    Transaction increase
                  </div>
                </Card>
              </div>

              {/* Key Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '24px',
              }}>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Revenue</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
                    {formatCurrency(analytics.revenue?.total || 0)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                    Avg: {formatCurrency(analytics.revenue?.average_daily || 0)}/day
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Active Tenants</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60' }}>
                    {analytics.tenants?.active || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                    Total: {analytics.tenants?.total || 0}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Transactions</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#3498db' }}>
                    {analytics.transactions?.total || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                    Avg: {formatCurrency(analytics.transactions?.average_value || 0)}/transaction
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Active Users</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#f39c12' }}>
                    {analytics.usage?.active_users || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                    Total: {analytics.usage?.total_users || 0}
                  </div>
                </Card>
              </div>

              {/* Charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    Revenue Trend
                  </h3>
                  <div style={{ height: '300px' }}>
                    <Line data={revenueChartData} options={chartOptions} />
                  </div>
                </Card>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    Revenue by Currency
                  </h3>
                  <div style={{ height: '300px' }}>
                    <Doughnut data={currencyChartData} options={pieChartOptions} />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    Daily Revenue Trend
                  </h3>
                  <div style={{ height: '400px' }}>
                    <Line data={revenueChartData} options={chartOptions} />
                  </div>
                </Card>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    Top Tenants by Revenue
                  </h3>
                  <div style={{ height: '400px' }}>
                    <Bar data={topTenantsChartData} options={chartOptions} />
                  </div>
                </Card>
              </div>
              
              <Card>
                <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                  Top Tenants List
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#7f8c8d', fontWeight: '600' }}>#</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#7f8c8d', fontWeight: '600' }}>Tenant</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d', fontWeight: '600' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.revenue?.top_tenants || []).map((tenant: any, index: number) => (
                        <tr key={tenant.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                          <td style={{ padding: '12px', color: '#2c3e50' }}>{index + 1}</td>
                          <td style={{ padding: '12px', color: '#2c3e50', fontWeight: '500' }}>{tenant.name}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#2c3e50', fontWeight: '600' }}>
                            {formatCurrency(tenant.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Tenants Tab */}
          {activeTab === 'tenants' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
              }}>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Tenants</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
                    {analytics.tenants?.total || 0}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Active</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60' }}>
                    {analytics.tenants?.active || 0}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Trial</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#3498db' }}>
                    {analytics.tenants?.trial || 0}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Suspended</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#e74c3c' }}>
                    {analytics.tenants?.suspended || 0}
                  </div>
                </Card>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    New Tenants Over Time
                  </h3>
                  <div style={{ height: '400px' }}>
                    <Bar data={tenantGrowthChartData} options={chartOptions} />
                  </div>
                </Card>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    Plan Distribution
                  </h3>
                  <div style={{ height: '400px' }}>
                    <Pie data={planDistributionData} options={pieChartOptions} />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
              }}>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Users</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
                    {analytics.usage?.total_users || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                    Active: {analytics.usage?.active_users || 0}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Branches</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#3498db' }}>
                    {analytics.usage?.total_branches || 0}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Transactions</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60' }}>
                    {analytics.usage?.total_transactions || 0}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Products</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#f39c12' }}>
                    {analytics.usage?.total_products || 0}
                  </div>
                </Card>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    Daily Transactions
                  </h3>
                  <div style={{ height: '400px' }}>
                    <Line data={transactionChartData} options={chartOptions} />
                  </div>
                </Card>
                <Card>
                  <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                    Payment Methods
                  </h3>
                  <div style={{ height: '400px' }}>
                    <Doughnut data={paymentMethodsData} options={pieChartOptions} />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Industry Tab */}
          {activeTab === 'industry' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <Card>
                <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                  Industry Analytics
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#7f8c8d', fontWeight: '600' }}>#</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#7f8c8d', fontWeight: '600' }}>Industry</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d', fontWeight: '600' }}>Tenants</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d', fontWeight: '600' }}>Total Revenue</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#7f8c8d', fontWeight: '600' }}>Avg per Tenant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.industry || []).map((industry: any, index: number) => (
                        <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
                          <td style={{ padding: '12px', color: '#2c3e50' }}>{index + 1}</td>
                          <td style={{ padding: '12px', color: '#2c3e50', fontWeight: '500' }}>{industry.category}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#2c3e50' }}>{industry.tenant_count}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#2c3e50', fontWeight: '600' }}>
                            {formatCurrency(industry.revenue)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#2c3e50' }}>
                            {formatCurrency(industry.avg_revenue_per_tenant)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

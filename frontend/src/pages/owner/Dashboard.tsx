/**
 * Owner Dashboard - System-wide statistics and overview
 */
import { useQuery } from '@tanstack/react-query'
import { useOwnerAuth } from '../../contexts/OwnerAuthContext'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
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

interface DashboardStats {
  total_tenants: number
  active_tenants: number
  suspended_tenants: number
  trial_tenants: number
  total_users: number
  total_branches: number
  total_sales_today_usd: number
  total_sales_today_zwl: number
  total_transactions_today: number
  active_pos_terminals: number
  system_health_status: string
  top_tenants_by_sales: Array<{ id: number; name: string; total_sales: number }>
  industry_distribution: Record<string, number>
}

export default function OwnerDashboard() {
  const { user } = useOwnerAuth()

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['owner-dashboard'],
    queryFn: async () => {
      const response = await api.get('/owner/dashboard/')
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading dashboard...</p>
      </div>
    )
  }

  const healthColor = stats?.system_health_status === 'healthy' ? '#27ae60' :
                      stats?.system_health_status === 'warning' ? '#f39c12' : '#e74c3c'

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
          👑 Owner Dashboard
        </h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          System-wide overview and statistics
        </p>
      </div>

      {/* System Health Status */}
      <Card style={{ marginBottom: '24px', background: `linear-gradient(135deg, ${healthColor}15 0%, ${healthColor}05 100%)` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>System Status</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: healthColor }}>
              {stats?.system_health_status === 'healthy' ? '✅ Healthy' :
               stats?.system_health_status === 'warning' ? '⚠️ Warning' : '❌ Critical'}
            </div>
          </div>
          <div style={{ fontSize: '48px', opacity: 0.3 }}>📊</div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '32px'
      }}>
        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Tenants</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.total_tenants || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '4px' }}>
            {stats?.active_tenants || 0} active
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Users</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.total_users || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#3498db', marginTop: '4px' }}>
            Across all tenants
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Sales Today (USD)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            ${(stats?.total_sales_today_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '4px' }}>
            {stats?.total_transactions_today || 0} transactions
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Sales Today (ZWL)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            Z${(stats?.total_sales_today_zwl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Branches</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.total_branches || 0}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Active POS Terminals</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.active_pos_terminals || 0}
          </div>
        </Card>
      </div>

      {/* Tenant Status Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <Card title="Tenant Status">
          <Doughnut
            data={{
              labels: ['Active', 'Trial', 'Suspended'],
              datasets: [{
                data: [
                  stats?.active_tenants || 0,
                  stats?.trial_tenants || 0,
                  stats?.suspended_tenants || 0,
                ],
                backgroundColor: ['#27ae60', '#3498db', '#e74c3c'],
                borderWidth: 0,
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'bottom' }
              }
            }}
          />
        </Card>

        <Card title="Industry Distribution">
          {stats?.industry_distribution && Object.keys(stats.industry_distribution).length > 0 ? (
            <Bar
              data={{
                labels: Object.keys(stats.industry_distribution),
                datasets: [{
                  label: 'Tenants',
                  data: Object.values(stats.industry_distribution),
                  backgroundColor: '#667eea',
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
              }}
            />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
              No industry data available
            </div>
          )}
        </Card>
      </div>

      {/* Top Tenants by Sales */}
      <Card title="Top Tenants by Sales">
        {stats?.top_tenants_by_sales && stats.top_tenants_by_sales.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {stats.top_tenants_by_sales.slice(0, 10).map((tenant, index) => (
              <div
                key={tenant.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#667eea',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50' }}>{tenant.name}</div>
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#27ae60' }}>
                  ${tenant.total_sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            No sales data available
          </div>
        )}
      </Card>
    </div>
  )
}


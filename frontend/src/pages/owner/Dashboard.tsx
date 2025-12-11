/**
 * Owner Dashboard - System-wide statistics and overview
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOwnerAuth } from '../../contexts/OwnerAuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
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
  pending_trial_requests?: Array<{
    id: number
    company_name: string
    email: string
    contact_person: string
    phone: string
    created_at: string
    trial_ends_at: string | null
    business_category: string | null
  }>
  pending_trial_count?: number
}

export default function OwnerDashboard() {
  const { user } = useOwnerAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['owner-dashboard'],
    queryFn: async () => {
      const response = await api.get('/owner/dashboard/')
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })

  const approveTrialMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/owner/tenants/${id}/approve_trial/`)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['owner-tenants'] })
      toast.success(data.data?.message || 'Trial approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve trial')
    },
  })

  const handleApproveTrial = (tenantId: number) => {
    if (confirm('Approve this 7-day trial request?')) {
      approveTrialMutation.mutate(tenantId)
    }
  }

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
    <div style={{ width: '100%', padding: '30px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#2c3e50' }}>
          👑 Owner Dashboard
        </h1>
        <p style={{ margin: '6px 0 0', color: '#7f8c8d', fontSize: '13px' }}>
          System-wide overview and statistics
        </p>
      </div>

      {/* System Health Status */}
      <Card style={{ marginBottom: '16px', padding: '16px', background: `linear-gradient(135deg, ${healthColor}15 0%, ${healthColor}05 100%)` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '2px' }}>System Status</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: healthColor }}>
              {stats?.system_health_status === 'healthy' ? '✅ Healthy' :
               stats?.system_health_status === 'warning' ? '⚠️ Warning' : '❌ Critical'}
            </div>
          </div>
          <div style={{ fontSize: '32px', opacity: 0.3 }}>📊</div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '12px',
        marginBottom: '20px'
      }}>
        <Card style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>Total Tenants</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.total_tenants || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#27ae60', marginTop: '2px' }}>
            {stats?.active_tenants || 0} active
          </div>
        </Card>

        <Card style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>Total Users</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.total_users || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#3498db', marginTop: '2px' }}>
            Across all tenants
          </div>
        </Card>

        <Card style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>Sales Today (USD)</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#2c3e50' }}>
            ${(stats?.total_sales_today_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#27ae60', marginTop: '2px' }}>
            {stats?.total_transactions_today || 0} transactions
          </div>
        </Card>

        <Card style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>Sales Today (ZWL)</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#2c3e50' }}>
            Z${(stats?.total_sales_today_zwl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>Total Branches</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.total_branches || 0}
          </div>
        </Card>

        <Card style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>Active POS Terminals</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            {stats?.active_pos_terminals || 0}
          </div>
        </Card>
      </div>

      {/* Tenant Status Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <Card title="Tenant Status" style={{ padding: '16px' }}>
          <div style={{ height: '200px', position: 'relative' }}>
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
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'bottom',
                    labels: {
                      padding: 8,
                      font: { size: 11 }
                    }
                  }
                }
              }}
            />
          </div>
        </Card>

        <Card title="Industry Distribution" style={{ padding: '16px' }}>
          {stats?.industry_distribution && Object.keys(stats.industry_distribution).length > 0 ? (
            <div style={{ height: '200px', position: 'relative' }}>
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
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { 
                      beginAtZero: true, 
                      ticks: { 
                        stepSize: 1,
                        font: { size: 10 }
                      }
                    },
                    x: {
                      ticks: {
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: '#7f8c8d', fontSize: '13px' }}>
              No industry data available
            </div>
          )}
        </Card>
      </div>

      {/* Pending Trial Requests */}
      {stats?.pending_trial_requests && stats.pending_trial_requests.length > 0 && (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⏳ Pending Trial Requests ({stats.pending_trial_count || 0})</span>
              <Button 
                size="small" 
                variant="outline"
                onClick={() => navigate('/owner/tenants?status=trial')}
              >
                View All →
              </Button>
            </div>
          }
          style={{ marginBottom: '20px' }}
        >
          <div style={{ display: 'grid', gap: '12px' }}>
            {stats.pending_trial_requests.slice(0, 5).map((trial) => (
              <div
                key={trial.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  background: '#fff3cd',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '15px' }}>
                      {trial.company_name}
                    </div>
                    {trial.business_category && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        background: '#e9ecef',
                        color: '#495057'
                      }}>
                        {trial.business_category}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                    👤 {trial.contact_person} • 📧 {trial.email} • 📞 {trial.phone}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>
                    Requested: {new Date(trial.created_at).toLocaleDateString()}
                    {trial.trial_ends_at && ` • Trial ends: ${new Date(trial.trial_ends_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                  <Button
                    size="small"
                    onClick={() => handleApproveTrial(trial.id)}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    ✓ Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => navigate(`/owner/tenants?tenant=${trial.id}`)}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {stats.pending_trial_count && stats.pending_trial_count > 5 && (
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <Button
                variant="outline"
                size="small"
                onClick={() => navigate('/owner/tenants?status=trial')}
              >
                View All {stats.pending_trial_count} Pending Requests →
              </Button>
            </div>
          )}
        </Card>
      )}

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
                  padding: '12px',
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



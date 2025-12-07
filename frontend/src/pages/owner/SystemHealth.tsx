/**
 * System Health Monitoring Dashboard
 * Real-time metrics, historical charts, and alerts
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
)

interface HealthMetric {
  id: number
  metric_type: string
  metric_type_display: string
  value: number
  unit: string
  status: 'healthy' | 'warning' | 'critical'
  status_display: string
  metadata: any
  recorded_at: string
}

const METRIC_TYPES = [
  {
    value: 'api_uptime',
    label: 'API Uptime',
    icon: '🌐',
    color: '#3498db',
    unit: '%',
    threshold: { warning: 95, critical: 90 },
  },
  {
    value: 'server_load',
    label: 'Server Load',
    icon: '⚡',
    color: '#e67e22',
    unit: '%',
    threshold: { warning: 70, critical: 90 },
  },
  {
    value: 'database_connections',
    label: 'Database Connections',
    icon: '🗄️',
    color: '#9b59b6',
    unit: '',
    threshold: { warning: 80, critical: 95 },
  },
  {
    value: 'active_pos_terminals',
    label: 'Active POS Terminals',
    icon: '🖥️',
    color: '#27ae60',
    unit: '',
    threshold: { warning: 50, critical: 100 },
  },
  {
    value: 'sync_errors',
    label: 'Sync Errors',
    icon: '⚠️',
    color: '#e74c3c',
    unit: '',
    threshold: { warning: 10, critical: 50 },
  },
  {
    value: 'active_tenants',
    label: 'Active Tenants',
    icon: '🏢',
    color: '#16a085',
    unit: '',
    threshold: { warning: 0, critical: 0 },
  },
  {
    value: 'total_transactions',
    label: 'Total Transactions',
    icon: '💳',
    color: '#3498db',
    unit: '',
    threshold: { warning: 0, critical: 0 },
  },
  {
    value: 'response_time',
    label: 'Response Time',
    icon: '⏱️',
    color: '#f39c12',
    unit: 'ms',
    threshold: { warning: 500, critical: 1000 },
  },
  {
    value: 'error_rate',
    label: 'Error Rate',
    icon: '❌',
    color: '#e74c3c',
    unit: '%',
    threshold: { warning: 1, critical: 5 },
  },
  {
    value: 'storage_usage',
    label: 'Storage Usage',
    icon: '💾',
    color: '#7f8c8d',
    unit: '%',
    threshold: { warning: 80, critical: 95 },
  },
]

export default function SystemHealth() {
  const [selectedMetric, setSelectedMetric] = useState<string>('api_uptime')
  const [timeRange, setTimeRange] = useState<number>(24) // hours
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)

  // Fetch current metrics
  const { data: currentMetrics, isLoading: currentLoading } = useQuery({
    queryKey: ['system-health-current'],
    queryFn: async () => {
      const response = await api.get('/owner/health/current/')
      return response.data
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if enabled
  })

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['system-health-alerts'],
    queryFn: async () => {
      const response = await api.get('/owner/health/alerts/')
      return response.data
    },
    refetchInterval: autoRefresh ? 30000 : false,
  })

  // Fetch historical data for selected metric
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['system-health-history', selectedMetric, timeRange],
    queryFn: async () => {
      const response = await api.get('/owner/health/history/', {
        params: { metric_type: selectedMetric, hours: timeRange },
      })
      return response.data
    },
    refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#27ae60'
      case 'warning': return '#f39c12'
      case 'critical': return '#e74c3c'
      default: return '#7f8c8d'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅'
      case 'warning': return '⚠️'
      case 'critical': return '🚨'
      default: return '❓'
    }
  }

  // Chart data
  const chartData = useMemo(() => {
    if (!historyData) return null

    const metricInfo = METRIC_TYPES.find(m => m.value === selectedMetric)
    const statusColors = historyData.statuses?.map((status: string) => getStatusColor(status)) || []

    return {
      labels: historyData.labels || [],
      datasets: [
        {
          label: metricInfo?.label || selectedMetric,
          data: historyData.values || [],
          borderColor: metricInfo?.color || '#3498db',
          backgroundColor: (metricInfo?.color || '#3498db') + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    }
  }, [historyData, selectedMetric])

  // Overall system health
  const systemHealth = useMemo(() => {
    if (!currentMetrics) return 'unknown'
    
    const metrics = Object.values(currentMetrics) as HealthMetric[]
    const critical = metrics.filter(m => m.status === 'critical').length
    const warning = metrics.filter(m => m.status === 'warning').length
    
    if (critical > 0) return 'critical'
    if (warning > 2) return 'warning'
    return 'healthy'
  }, [currentMetrics])

  const currentMetricInfo = METRIC_TYPES.find(m => m.value === selectedMetric)
  const currentMetric = currentMetrics?.[selectedMetric] as HealthMetric | undefined

  return (
    <div style={{ padding: '32px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
              💚 System Health Monitoring
            </h1>
            <span style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              background: getStatusColor(systemHealth) + '20',
              color: getStatusColor(systemHealth),
            }}>
              {getStatusIcon(systemHealth)} {systemHealth.toUpperCase()}
            </span>
          </div>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Real-time monitoring of system performance and health metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', color: '#2c3e50' }}>Auto-refresh</span>
          </label>
          {autoRefresh && (
            <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
              ⏱️ Refreshing every 30s
            </span>
          )}
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <Card style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>🚨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {alerts.slice(0, 3).map((alert: HealthMetric) => alert.metric_type_display).join(', ')}
                {alerts.length > 3 && ` and ${alerts.length - 3} more`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Current Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {METRIC_TYPES.map(metricInfo => {
          const metric = currentMetrics?.[metricInfo.value] as HealthMetric | undefined
          
          return (
            <motion.div
              key={metricInfo.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card
                style={{
                  cursor: 'pointer',
                  border: selectedMetric === metricInfo.value ? `2px solid ${metricInfo.color}` : '1px solid #e9ecef',
                  transition: 'all 0.2s',
                }}
                onClick={() => setSelectedMetric(metricInfo.value)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '24px' }}>{metricInfo.icon}</div>
                  {metric && (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: getStatusColor(metric.status) + '20',
                      color: getStatusColor(metric.status),
                    }}>
                      {getStatusIcon(metric.status)} {metric.status_display}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>
                  {metricInfo.label}
                </div>
                {currentLoading ? (
                  <div className="spinner" style={{ margin: '16px 0' }} />
                ) : metric ? (
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#2c3e50',
                  }}>
                    {metric.value.toFixed(2)}
                    <span style={{ fontSize: '18px', color: '#7f8c8d', marginLeft: '4px' }}>
                      {metric.unit || metricInfo.unit}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#95a5a6' }}>No data</div>
                )}
                {metric && metric.recorded_at && (
                  <div style={{
                    fontSize: '11px',
                    color: '#95a5a6',
                    marginTop: '8px',
                  }}>
                    Updated: {new Date(metric.recorded_at).toLocaleTimeString()}
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Historical Chart */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
              {currentMetricInfo?.icon} {currentMetricInfo?.label} - Historical Trend
            </h3>
            <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '13px' }}>
              Last {timeRange} hours
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[6, 12, 24, 48, 72].map(hours => (
              <Button
                key={hours}
                variant={timeRange === hours ? 'primary' : 'outline'}
                size="small"
                onClick={() => setTimeRange(hours)}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {hours}h
              </Button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading historical data...</p>
          </div>
        ) : chartData && chartData.labels.length > 0 ? (
          <div style={{ height: '400px' }}>
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return value + (currentMetricInfo?.unit || '')
                      },
                    },
                  },
                  x: {
                    ticks: {
                      maxTicksLimit: 12,
                    },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <p style={{ fontSize: '16px' }}>No historical data available</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Data will appear here as metrics are recorded
            </p>
          </div>
        )}
      </Card>

      {/* Active Alerts List */}
      {alerts && alerts.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
            🚨 Active Alerts
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {alerts.map((alert: HealthMetric) => {
              const metricInfo = METRIC_TYPES.find(m => m.value === alert.metric_type)
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    padding: '16px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    background: getStatusColor(alert.status) + '10',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                      }}>
                        <span style={{ fontSize: '20px' }}>{metricInfo?.icon}</span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#2c3e50',
                        }}>
                          {alert.metric_type_display}
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: getStatusColor(alert.status) + '20',
                          color: getStatusColor(alert.status),
                        }}>
                          {alert.status_display.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                        Value: <strong>{alert.value.toFixed(2)} {alert.unit}</strong>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#95a5a6',
                        marginTop: '8px',
                      }}>
                        {new Date(alert.recorded_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

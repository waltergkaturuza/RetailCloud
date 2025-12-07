/**
 * Comprehensive Audit Logs Viewer
 * Advanced search, filters, date ranges, and export functionality
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface AuditLog {
  id: number
  user: number | null
  user_name: string
  user_email: string
  action_type: string
  action_type_display: string
  description: string
  tenant: number | null
  tenant_name: string | null
  ip_address: string | null
  user_agent: string
  metadata: any
  created_at: string
}

export default function AuditLogs() {
  const [filters, setFilters] = useState<any>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ['owner-audit-logs', filters, searchQuery, startDate, endDate, page],
    queryFn: async () => {
      const params: any = { page, page_size: 50 }
      if (searchQuery) params.search = searchQuery
      if (filters.action_type) params.action_type = filters.action_type
      if (filters.user) params.user = filters.user
      if (filters.tenant) params.tenant = filters.tenant
      if (startDate) params.created_after = startDate
      if (endDate) params.created_before = endDate
      
      const response = await api.get('/owner/audit-logs/', { params })
      return response.data
    },
  })

  // Fetch users and tenants for filters
  const { data: usersResponse } = useQuery({
    queryKey: ['owner-users-for-filter'],
    queryFn: async () => {
      const response = await api.get('/owner/users/', { params: { page_size: 100 } })
      return response.data.results || response.data || []
    },
  })

  const { data: tenantsResponse } = useQuery({
    queryKey: ['owner-tenants-for-filter'],
    queryFn: async () => {
      const response = await api.get('/owner/tenants/', { params: { page_size: 1000 } })
      return response.data.results || response.data || []
    },
  })

  const users = usersResponse || []
  const tenants = tenantsResponse || []
  const logs = logsResponse?.results || logsResponse || []
  const totalCount = logsResponse?.count || logs.length
  const hasNext = logsResponse?.next ? true : false
  const hasPrevious = logsResponse?.previous ? true : false

  const actionTypes = [
    { value: 'tenant_create', label: 'Tenant Created', icon: '➕', color: '#27ae60' },
    { value: 'tenant_update', label: 'Tenant Updated', icon: '✏️', color: '#3498db' },
    { value: 'tenant_delete', label: 'Tenant Deleted', icon: '🗑️', color: '#e74c3c' },
    { value: 'tenant_suspend', label: 'Tenant Suspended', icon: '⏸️', color: '#f39c12' },
    { value: 'tenant_activate', label: 'Tenant Activated', icon: '▶️', color: '#27ae60' },
    { value: 'user_create', label: 'User Created', icon: '➕', color: '#27ae60' },
    { value: 'user_update', label: 'User Updated', icon: '✏️', color: '#3498db' },
    { value: 'user_delete', label: 'User Deleted', icon: '🗑️', color: '#e74c3c' },
    { value: 'user_suspend', label: 'User Suspended', icon: '⏸️', color: '#f39c12' },
    { value: 'setting_change', label: 'Setting Changed', icon: '⚙️', color: '#9b59b6' },
    { value: 'subscription_change', label: 'Subscription Changed', icon: '💳', color: '#16a085' },
    { value: 'login', label: 'Login', icon: '🔐', color: '#27ae60' },
    { value: 'logout', label: 'Logout', icon: '🚪', color: '#7f8c8d' },
    { value: 'data_export', label: 'Data Exported', icon: '📤', color: '#3498db' },
    { value: 'data_import', label: 'Data Imported', icon: '📥', color: '#16a085' },
    { value: 'backup_created', label: 'Backup Created', icon: '💾', color: '#27ae60' },
    { value: 'system_update', label: 'System Updated', icon: '🔄', color: '#3498db' },
    { value: 'security_alert', label: 'Security Alert', icon: '🚨', color: '#e74c3c' },
    { value: 'other', label: 'Other', icon: '📋', color: '#7f8c8d' },
  ]

  const getActionIcon = (actionType: string) => {
    return actionTypes.find(a => a.value === actionType)?.icon || '📋'
  }

  const getActionColor = (actionType: string) => {
    return actionTypes.find(a => a.value === actionType)?.color || '#7f8c8d'
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Time', 'Action', 'User', 'Tenant', 'Description', 'IP Address']
    const rows = logs.map((log: AuditLog) => {
      const date = new Date(log.created_at)
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        log.action_type_display,
        log.user_name || log.user_email,
        log.tenant_name || 'N/A',
        log.description,
        log.ip_address || 'N/A',
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Audit logs exported successfully!')
  }

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setShowDetails(true)
  }

  const handleClearFilters = () => {
    setFilters({})
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length
    const byActionType: Record<string, number> = {}
    logs.forEach((log: AuditLog) => {
      byActionType[log.action_type] = (byActionType[log.action_type] || 0) + 1
    })
    return { total, byActionType }
  }, [logs])

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            📋 Audit Logs
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Complete audit trail of all owner and system actions
          </p>
        </div>
        <Button onClick={handleExport} disabled={logs.length === 0}>
          📥 Export CSV
        </Button>
      </div>

      {/* Statistics */}
      {logs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <Card>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '6px' }}>Total Logs</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
              {totalCount}
            </div>
          </Card>
          {Object.entries(stats.byActionType).slice(0, 4).map(([actionType, count]) => {
            const actionInfo = actionTypes.find(a => a.value === actionType)
            return (
              <Card key={actionType}>
                <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '6px' }}>
                  {actionInfo?.icon} {actionInfo?.label}
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: actionInfo?.color || '#2c3e50'
                }}>
                  {count}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search in descriptions, users, tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Action Type
            </label>
            <select
              value={filters.action_type || ''}
              onChange={(e) => setFilters({ ...filters, action_type: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Actions</option>
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              User
            </label>
            <select
              value={filters.user || ''}
              onChange={(e) => setFilters({ ...filters, user: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Users</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Tenant
            </label>
            <select
              value={filters.tenant || ''}
              onChange={(e) => setFilters({ ...filters, tenant: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Tenants</option>
              {tenants.map((t: any) => (
                <option key={t.id} value={t.id}>{t.company_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <Button
            variant="outline"
            onClick={handleClearFilters}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Logs List */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No audit logs found</p>
            <p style={{ fontSize: '14px' }}>
              {searchQuery || Object.keys(filters).length > 0 || startDate || endDate
                ? 'Try adjusting your search or filters'
                : 'Audit logs will appear here as actions are performed'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              {logs.map((log: AuditLog) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '20px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = getActionColor(log.action_type)
                    e.currentTarget.style.boxShadow = `0 2px 8px ${getActionColor(log.action_type)}40`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e9ecef'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  onClick={() => handleViewDetails(log)}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '16px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: '20px' }}>
                          {getActionIcon(log.action_type)}
                        </span>
                        <span
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: getActionColor(log.action_type) + '20',
                            color: getActionColor(log.action_type),
                          }}
                        >
                          {log.action_type_display}
                        </span>
                        {log.tenant_name && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            background: '#ecf0f1',
                            color: '#7f8c8d',
                          }}>
                            🏢 {log.tenant_name}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '15px',
                        color: '#2c3e50',
                        marginBottom: '12px',
                        lineHeight: '1.5',
                      }}>
                        {log.description}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '12px',
                        color: '#95a5a6',
                        flexWrap: 'wrap',
                      }}>
                        <span>
                          👤 <strong>{log.user_name || log.user_email || 'System'}</strong>
                        </span>
                        {log.ip_address && (
                          <span>
                            🌐 {log.ip_address}
                          </span>
                        )}
                        <span>
                          🕒 {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      padding: '8px',
                      color: '#7f8c8d',
                      fontSize: '18px',
                    }}>
                      →
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {(hasNext || hasPrevious) && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '24px',
                borderTop: '2px solid #ecf0f1',
              }}>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!hasPrevious}
                >
                  ← Previous
                </Button>
                <span style={{ color: '#7f8c8d', fontSize: '14px' }}>
                  Page {page} • Showing {logs.length} of {totalCount} logs
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasNext}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflow: 'auto',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                  paddingBottom: '20px',
                  borderBottom: '2px solid #ecf0f1',
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
                      📋 Audit Log Details
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '32px',
                      cursor: 'pointer',
                      color: '#7f8c8d',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ecf0f1'
                      e.currentTarget.style.color = '#2c3e50'
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#2c3e50',
                      fontSize: '14px',
                    }}>
                      Action Type
                    </label>
                    <div style={{
                      padding: '12px',
                      background: getActionColor(selectedLog.action_type) + '20',
                      borderRadius: '8px',
                      color: getActionColor(selectedLog.action_type),
                      fontWeight: '600',
                      fontSize: '15px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span style={{ fontSize: '20px' }}>
                        {getActionIcon(selectedLog.action_type)}
                      </span>
                      {selectedLog.action_type_display}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#2c3e50',
                      fontSize: '14px',
                    }}>
                      Description
                    </label>
                    <div style={{
                      padding: '12px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      color: '#2c3e50',
                      fontSize: '14px',
                      lineHeight: '1.6',
                    }}>
                      {selectedLog.description}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        fontSize: '14px',
                      }}>
                        User
                      </label>
                      <div style={{
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#2c3e50',
                      }}>
                        {selectedLog.user_name || selectedLog.user_email || 'System'}
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        fontSize: '14px',
                      }}>
                        Tenant
                      </label>
                      <div style={{
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#2c3e50',
                      }}>
                        {selectedLog.tenant_name || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        fontSize: '14px',
                      }}>
                        IP Address
                      </label>
                      <div style={{
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#2c3e50',
                        fontFamily: 'monospace',
                      }}>
                        {selectedLog.ip_address || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        fontSize: '14px',
                      }}>
                        Timestamp
                      </label>
                      <div style={{
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#2c3e50',
                      }}>
                        {new Date(selectedLog.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {selectedLog.user_agent && (
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        fontSize: '14px',
                      }}>
                        User Agent
                      </label>
                      <div style={{
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#2c3e50',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                      }}>
                        {selectedLog.user_agent}
                      </div>
                    </div>
                  )}

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        fontSize: '14px',
                      }}>
                        Metadata
                      </label>
                      <pre style={{
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#2c3e50',
                        overflow: 'auto',
                        maxHeight: '300px',
                      }}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

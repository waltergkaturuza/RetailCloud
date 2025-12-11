/**
 * Backup Management
 * Complete backup management system with create, download, restore, and automation
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import BackupForm from '../../components/owner/BackupForm'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface Backup {
  id: number
  tenant: number
  tenant_name: string
  backup_type: string
  file_path: string
  file_size: number
  file_size_mb: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  notes: string
  created_by_name: string
  created_at: string
  completed_at: string | null
}

export default function Backups() {
  const [showForm, setShowForm] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const queryClient = useQueryClient()

  const { data: backupsResponse, isLoading, refetch } = useQuery({
    queryKey: ['tenant-backups', searchQuery, filters],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (filters.tenant) params.tenant = filters.tenant
      if (filters.backup_type) params.backup_type = filters.backup_type
      if (filters.status) params.status = filters.status
      
      const response = await api.get('/owner/backups/', { params })
      return response.data
    },
  })

  const backups = backupsResponse?.results || backupsResponse || []

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/owner/backups/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] })
      toast.success('Backup deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete backup')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/owner/backups/${id}/restore/`, { confirm: true })
    },
    onSuccess: (data: any) => {
      toast.success(data.data?.message || 'Backup restore initiated')
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to restore backup')
    },
  })

  const handleDelete = (backup: Backup) => {
    if (confirm(`Are you sure you want to delete this backup?\n\nTenant: ${backup.tenant_name}\nType: ${backup.backup_type}\n\nThis action cannot be undone!`)) {
      deleteMutation.mutate(backup.id)
    }
  }

  const handleDownload = async (backup: Backup) => {
    if (backup.status !== 'completed') {
      toast.error('Backup is not completed yet')
      return
    }

    try {
      const response = await api.get(`/owner/backups/${backup.id}/download/`, {
        responseType: 'blob',
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', backup.file_path || `backup_${backup.id}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Backup downloaded successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download backup')
    }
  }

  const handleRestore = (backup: Backup) => {
    if (backup.status !== 'completed') {
      toast.error('Backup is not completed yet')
      return
    }

    if (confirm(`Are you sure you want to restore this backup?\n\nTenant: ${backup.tenant_name}\nType: ${backup.backup_type}\n\nThis will overwrite existing data for this tenant!`)) {
      restoreMutation.mutate(backup.id)
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { icon: string; color: string; label: string }> = {
      pending: { icon: '⏳', color: '#95a5a6', label: 'Pending' },
      in_progress: { icon: '🔄', color: '#3498db', label: 'In Progress' },
      completed: { icon: '✅', color: '#27ae60', label: 'Completed' },
      failed: { icon: '❌', color: '#e74c3c', label: 'Failed' },
    }
    return statuses[status] || { icon: '❓', color: '#7f8c8d', label: 'Unknown' }
  }

  const getTypeInfo = (type: string) => {
    const types: Record<string, { icon: string; label: string }> = {
      full: { icon: '💾', label: 'Full Backup' },
      database_only: { icon: '🗄️', label: 'Database Only' },
      files_only: { icon: '📁', label: 'Files Only' },
      incremental: { icon: '🔄', label: 'Incremental' },
    }
    return types[type] || { icon: '📋', label: 'Unknown' }
  }

  // Statistics
  const stats = useMemo(() => {
    const total = backups.length
    const completed = backups.filter((b: Backup) => b.status === 'completed').length
    const in_progress = backups.filter((b: Backup) => b.status === 'in_progress').length
    const failed = backups.filter((b: Backup) => b.status === 'failed').length
    const totalSize = backups
      .filter((b: Backup) => b.status === 'completed')
      .reduce((sum: number, b: Backup) => sum + (b.file_size_mb || 0), 0)
    
    return { total, completed, in_progress, failed, totalSize }
  }, [backups])

  const backupTypes = [
    { value: '', label: 'All Types' },
    { value: 'full', label: 'Full Backup' },
    { value: 'database_only', label: 'Database Only' },
    { value: 'files_only', label: 'Files Only' },
    { value: 'incremental', label: 'Incremental' },
  ]

  const statusTypes = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ]

  return (
    <div style={{ width: '100%', padding: '30px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
            💾 Backup Management
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Manage tenant backups and data exports
          </p>
        </div>
        <Button onClick={() => {
          setSelectedBackup(null)
          setShowForm(true)
        }}>
          ➕ Create Backup
        </Button>
      </div>

      {/* Statistics */}
      {backups.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Backups</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
              {stats.total}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Completed</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60' }}>
              {stats.completed}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>In Progress</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#3498db' }}>
              {stats.in_progress}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Failed</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#e74c3c' }}>
              {stats.failed}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>Total Size</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50' }}>
              {stats.totalSize.toFixed(2)} MB
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr auto',
          gap: '16px',
          alignItems: 'end',
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Search Backups
            </label>
            <input
              type="text"
              placeholder="Search by tenant name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Backup Type
            </label>
            <select
              value={filters.backup_type || ''}
              onChange={(e) => setFilters({ ...filters, backup_type: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              {backupTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="input"
              style={{ width: '100%' }}
            >
              {statusTypes.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setFilters({})
              setSearchQuery('')
            }}
            style={{ height: 'fit-content' }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Backups List */}
      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💾</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No backups found</p>
            <p style={{ fontSize: '14px' }}>
              {searchQuery || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filters'
                : 'Create your first backup to get started'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {backups.map((backup: Backup) => {
              const statusInfo = getStatusInfo(backup.status)
              const typeInfo = getTypeInfo(backup.backup_type)
              
              return (
                <motion.div
                  key={backup.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '24px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    background: backup.status === 'completed' ? '#fff' : '#f8f9fa',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '20px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: '24px' }}>{typeInfo.icon}</span>
                        <h3 style={{
                          margin: 0,
                          fontSize: '20px',
                          fontWeight: '600',
                          color: '#2c3e50',
                        }}>
                          {backup.tenant_name}
                        </h3>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: '#3498db20',
                          color: '#3498db',
                        }}>
                          {typeInfo.label}
                        </span>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: statusInfo.color + '20',
                          color: statusInfo.color,
                        }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '13px',
                        color: '#7f8c8d',
                        flexWrap: 'wrap',
                        marginBottom: '8px',
                      }}>
                        {backup.status === 'completed' && (
                          <>
                            <span>
                              📦 {backup.file_size_mb ? backup.file_size_mb.toFixed(2) : '0.00'} MB
                            </span>
                            <span>
                              📄 {backup.file_path}
                            </span>
                          </>
                        )}
                        {backup.completed_at && (
                          <span>
                            ✅ Completed: {new Date(backup.completed_at).toLocaleString()}
                          </span>
                        )}
                        <span>
                          📅 Created: {new Date(backup.created_at).toLocaleString()}
                        </span>
                        <span>
                          👤 By: {backup.created_by_name}
                        </span>
                      </div>
                      {backup.notes && (
                        <div style={{
                          fontSize: '13px',
                          color: '#2c3e50',
                          fontStyle: 'italic',
                          marginTop: '8px',
                          padding: '8px 12px',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                        }}>
                          💬 {backup.notes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                      {backup.status === 'completed' && (
                        <>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleDownload(backup)}
                            style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                          >
                            ⬇️ Download
                          </Button>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleRestore(backup)}
                            style={{
                              fontSize: '12px',
                              padding: '6px 12px',
                              whiteSpace: 'nowrap',
                              color: '#f39c12',
                              borderColor: '#f39c12',
                            }}
                          >
                            🔄 Restore
                          </Button>
                        </>
                      )}
                      {backup.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => refetch()}
                          style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                        >
                          🔄 Refresh
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleDelete(backup)}
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          whiteSpace: 'nowrap',
                          color: '#e74c3c',
                          borderColor: '#e74c3c',
                        }}
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Backup Form Modal */}
      {showForm && (
        <BackupForm
          onClose={() => {
            setShowForm(false)
            setSelectedBackup(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedBackup(null)
          }}
        />
      )}
    </div>
  )
}

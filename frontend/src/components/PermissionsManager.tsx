/**
 * Permissions Manager Component
 * Manage granular module-level permissions for users
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from './ui/Card'
import Button from './ui/Button'
import toast from 'react-hot-toast'

interface Permission {
  id?: number
  module: string
  permission: 'view' | 'create' | 'update' | 'delete'
  granted: boolean
}

interface Module {
  code: string
  name: string
  permissions: string[]
}

interface PermissionsManagerProps {
  userId: number
  userName: string
  onClose?: () => void
}

const PERMISSION_TYPES = ['view', 'create', 'update', 'delete']
const PERMISSION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
}

const MODULE_ICONS: Record<string, string> = {
  inventory: '📦',
  pos: '🛒',
  sales: '💰',
  customers: '👥',
  suppliers: '🏢',
  purchases: '🛍️',
  reports: '📊',
  analytics: '📈',
  settings: '⚙️',
  users: '👤',
}

export default function PermissionsManager({ userId, userName, onClose }: PermissionsManagerProps) {
  const queryClient = useQueryClient()
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({})
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // Fetch available modules
  const { data: modulesData } = useQuery<Module[]>({
    queryKey: ['permissions-modules'],
    queryFn: async () => {
      const response = await api.get('/auth/permissions/available_modules/')
      return response.data
    },
  })

  // Fetch user's current permissions
  const { data: userPermissions, isLoading: loadingPermissions } = useQuery<Permission[]>({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const response = await api.get(`/auth/permissions/by_user/?user_id=${userId}`)
      return response.data
    },
    enabled: !!userId,
  })

  // Fetch role templates
  const { data: templates } = useQuery({
    queryKey: ['permission-templates'],
    queryFn: async () => {
      const response = await api.get('/auth/permissions/templates/')
      return response.data
    },
  })

  // Initialize permissions state from user permissions
  useEffect(() => {
    if (userPermissions && modulesData) {
      const permsMap: Record<string, Record<string, boolean>> = {}
      
      modulesData.forEach((module: Module) => {
        permsMap[module.code] = {}
        PERMISSION_TYPES.forEach(permType => {
          const existing = userPermissions.find(
            (p: Permission) => p.module === module.code && p.permission === permType
          )
          permsMap[module.code][permType] = existing ? existing.granted : false
        })
      })
      
      setPermissions(permsMap)
    }
  }, [userPermissions, modulesData])

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { user_id: number; permissions: any[] }) => {
      return api.post('/auth/permissions/bulk-update/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
      toast.success('Permissions updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update permissions')
    },
  })

  const applyTemplateMutation = useMutation({
    mutationFn: async (data: { user_id: number; role: string }) => {
      return api.post('/auth/permissions/apply-template/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
      toast.success('Template applied successfully!')
      setSelectedTemplate('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to apply template')
    },
  })

  const handleTogglePermission = (module: string, permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: !prev[module]?.[permission],
      },
    }))
  }

  const handleToggleModule = (module: string, grant: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: PERMISSION_TYPES.reduce((acc, perm) => {
        acc[perm] = grant
        return acc
      }, {} as Record<string, boolean>),
    }))
  }

  const handleSave = () => {
    const permissionsList: any[] = []
    
    Object.entries(permissions).forEach(([module, perms]) => {
      Object.entries(perms).forEach(([permission, granted]) => {
        if (granted) {
          permissionsList.push({ module, permission, granted: true })
        }
      })
    })

    bulkUpdateMutation.mutate({
      user_id: userId,
      permissions: permissionsList,
    })
  }

  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template')
      return
    }
    
    applyTemplateMutation.mutate({
      user_id: userId,
      role: selectedTemplate,
    })
  }

  const handleSelectAll = () => {
    if (!modulesData) return
    const allPerms: Record<string, Record<string, boolean>> = {}
    modulesData.forEach((module: Module) => {
      allPerms[module.code] = {}
      PERMISSION_TYPES.forEach(permType => {
        allPerms[module.code][permType] = true
      })
    })
    setPermissions(allPerms)
  }

  const handleClearAll = () => {
    if (!modulesData) return
    const clearedPerms: Record<string, Record<string, boolean>> = {}
    modulesData.forEach((module: Module) => {
      clearedPerms[module.code] = {}
      PERMISSION_TYPES.forEach(permType => {
        clearedPerms[module.code][permType] = false
      })
    })
    setPermissions(clearedPerms)
  }

  if (loadingPermissions || !modulesData) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" />
          <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading permissions...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
          🔐 Permissions Management
        </h2>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          Manage permissions for: <strong>{userName}</strong>
        </p>
      </div>

      {/* Template Selector */}
      {templates && templates.length > 0 && (
        <div style={{
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
            Apply Role Template
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="input"
              style={{ flex: 1 }}
            >
              <option value="">Select a template...</option>
              {templates.map((template: any) => (
                <option key={template.role} value={template.role}>
                  {template.name} - {template.description} ({template.permission_count} permissions)
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || applyTemplateMutation.isPending}
            >
              {applyTemplateMutation.isPending ? 'Applying...' : 'Apply Template'}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <Button variant="outline" size="small" onClick={handleSelectAll}>
          ✅ Select All
        </Button>
        <Button variant="outline" size="small" onClick={handleClearAll}>
          ❌ Clear All
        </Button>
      </div>

      {/* Permissions Grid */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {modulesData.map((module: Module) => {
          const modulePerms = permissions[module.code] || {}
          const allGranted = PERMISSION_TYPES.every(perm => modulePerms[perm])
          const someGranted = PERMISSION_TYPES.some(perm => modulePerms[perm])

          return (
            <div
              key={module.code}
              style={{
                padding: '16px',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                background: allGranted ? '#e8f5e910' : someGranted ? '#fff9e610' : '#fff',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{MODULE_ICONS[module.code] || '📋'}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                      {module.name}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7f8c8d' }}>
                      {module.code}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleModule(module.code, true)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: '1px solid #3498db',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#3498db',
                      cursor: 'pointer',
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleModule(module.code, false)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: '1px solid #e74c3c',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#e74c3c',
                      cursor: 'pointer',
                    }}
                  >
                    None
                  </button>
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}>
                {PERMISSION_TYPES.map(permType => (
                  <label
                    key={permType}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      border: permissions[module.code]?.[permType]
                        ? '2px solid #27ae60'
                        : '1px solid #e9ecef',
                      borderRadius: '6px',
                      background: permissions[module.code]?.[permType]
                        ? '#27ae6010'
                        : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={permissions[module.code]?.[permType] || false}
                      onChange={() => handleTogglePermission(module.code, permType)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: permissions[module.code]?.[permType] ? '600' : '400',
                      color: '#2c3e50',
                    }}>
                      {PERMISSION_LABELS[permType]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        paddingTop: '24px',
        marginTop: '24px',
        borderTop: '2px solid #ecf0f1',
      }}>
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={bulkUpdateMutation.isPending}
            disabled={bulkUpdateMutation.isPending}
          >
            💾 Save Permissions
          </Button>
        </div>
      </div>
    </Card>
  )
}


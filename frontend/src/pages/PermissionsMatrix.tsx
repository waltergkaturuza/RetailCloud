/**
 * Permissions Matrix View
 * Visual matrix showing all users and their permissions
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

interface MatrixUser {
  user_id: number
  user_name: string
  user_email: string
  role: string
  role_display: string
  permissions: Record<string, boolean>
}

interface MatrixData {
  modules: Record<string, string>
  permission_types: string[]
  matrix: MatrixUser[]
}

const PERMISSION_TYPES = ['view', 'create', 'update', 'delete']
const PERMISSION_COLORS: Record<string, string> = {
  view: '#3498db',
  create: '#27ae60',
  update: '#f39c12',
  delete: '#e74c3c',
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

export default function PermissionsMatrix() {
  const [filterRole, setFilterRole] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: matrixData, isLoading } = useQuery<MatrixData>({
    queryKey: ['permissions-matrix'],
    queryFn: async () => {
      const response = await api.get('/auth/permissions/matrix/')
      return response.data
    },
  })

  const filteredUsers = matrixData?.matrix?.filter(user => {
    const matchesRole = !filterRole || user.role === filterRole
    const matchesSearch = !searchQuery || 
      user.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRole && matchesSearch
  }) || []

  const uniqueRoles = Array.from(new Set(matrixData?.matrix?.map(u => u.role) || []))

  if (isLoading) {
    return (
      <div>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading permissions matrix...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!matrixData || !matrixData.modules) {
    return (
      <div>
        <Card>
          <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔐</div>
            <p style={{ fontSize: '18px' }}>No permissions data available</p>
          </div>
        </Card>
      </div>
    )
  }

  const modules = Object.entries(matrixData.modules)

  return (
    <div>
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
            🔐 Permissions Matrix
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Visual overview of user permissions across all modules ({filteredUsers.length} users)
          </p>
        </div>
        <Button as={Link} to="/users" variant="outline">
          ← Back to Users
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr auto',
          gap: '16px',
          alignItems: 'end',
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>
                  {matrixData.matrix.find(u => u.role === role)?.role_display || role}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setFilterRole('')
              setSearchQuery('')
            }}
            style={{ height: 'fit-content' }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Matrix Table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#2c3e50',
                  position: 'sticky',
                  left: 0,
                  background: '#f8f9fa',
                  zIndex: 10,
                }}>
                  User
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#2c3e50',
                  position: 'sticky',
                  left: '200px',
                  background: '#f8f9fa',
                  zIndex: 10,
                }}>
                  Role
                </th>
                {modules.map(([moduleCode, moduleName]) => (
                  <th
                    key={moduleCode}
                    colSpan={PERMISSION_TYPES.length}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#2c3e50',
                      borderLeft: '2px solid #dee2e6',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{MODULE_ICONS[moduleCode] || '📋'}</span>
                      <span>{moduleName}</span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '4px',
                      marginTop: '8px',
                      fontSize: '11px',
                    }}>
                      {PERMISSION_TYPES.map(permType => (
                        <div
                          key={permType}
                          style={{
                            padding: '4px',
                            background: PERMISSION_COLORS[permType] + '20',
                            color: PERMISSION_COLORS[permType],
                            borderRadius: '4px',
                            fontWeight: '500',
                          }}
                        >
                          {permType.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={2 + modules.length * PERMISSION_TYPES.length} style={{
                    padding: '60px',
                    textAlign: 'center',
                    color: '#7f8c8d',
                  }}>
                    No users found matching the filters
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user.user_id} style={{
                    borderBottom: '1px solid #ecf0f1',
                    background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                  }}>
                    <td style={{
                      padding: '12px',
                      fontWeight: '500',
                      color: '#2c3e50',
                      position: 'sticky',
                      left: 0,
                      background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                      zIndex: 5,
                    }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{user.user_name}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{user.user_email}</div>
                      </div>
                    </td>
                    <td style={{
                      padding: '12px',
                      position: 'sticky',
                      left: '200px',
                      background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                      zIndex: 5,
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#3498db20',
                        color: '#3498db',
                      }}>
                        {user.role_display}
                      </span>
                    </td>
                    {modules.map(([moduleCode]) => (
                      PERMISSION_TYPES.map((permType) => {
                        const permKey = `${moduleCode}.${permType}`
                        const hasPermission = user.permissions[permKey] === true
                        return (
                          <td
                            key={`${moduleCode}-${permType}`}
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              borderLeft: '1px solid #ecf0f1',
                            }}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              margin: '0 auto',
                              borderRadius: '50%',
                              background: hasPermission
                                ? PERMISSION_COLORS[permType]
                                : '#ecf0f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: '600',
                              fontSize: '12px',
                            }}>
                              {hasPermission ? '✓' : '—'}
                            </div>
                          </td>
                        )
                      })
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <Card style={{ marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
          Legend
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Permission Types
            </div>
            {PERMISSION_TYPES.map(permType => (
              <div key={permType} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: PERMISSION_COLORS[permType],
                }} />
                <span style={{ fontSize: '13px', color: '#2c3e50' }}>
                  {permType.charAt(0).toUpperCase() + permType.slice(1)}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Symbols
            </div>
            <div style={{ fontSize: '13px', color: '#2c3e50' }}>
              <div style={{ marginBottom: '4px' }}>✓ = Permission granted</div>
              <div>— = Permission not granted</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}





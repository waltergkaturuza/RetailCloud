/**
 * System-Wide Settings Management
 * Complete settings management with create, edit, search, and category organization
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SettingForm from '../../components/owner/SettingForm'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface SystemSetting {
  id: number
  key: string
  value: string
  typed_value: any
  data_type: 'string' | 'number' | 'boolean' | 'json'
  description: string
  category: string
  is_public: boolean
  updated_by_name?: string
  updated_at: string
}

export default function SystemSettings() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: settingsByCategory, isLoading } = useQuery({
    queryKey: ['owner-settings'],
    queryFn: async () => {
      const response = await api.get('/owner/settings/by_category/')
      return response.data
    },
  })

  // Flatten all settings for search
  const allSettings = useMemo(() => {
    if (!settingsByCategory) return []
    const flat: SystemSetting[] = []
    Object.values(settingsByCategory).forEach((categorySettings: any) => {
      if (Array.isArray(categorySettings)) {
        flat.push(...categorySettings)
      }
    })
    return flat
  }, [settingsByCategory])

  // Filter settings based on category and search
  const filteredSettings = useMemo(() => {
    let settings: SystemSetting[] = []
    
    if (activeCategory === 'all') {
      settings = allSettings
    } else {
      settings = settingsByCategory?.[activeCategory] || []
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      settings = settings.filter(setting =>
        setting.key.toLowerCase().includes(query) ||
        setting.description.toLowerCase().includes(query) ||
        String(setting.value).toLowerCase().includes(query)
      )
    }

    return settings
  }, [activeCategory, settingsByCategory, allSettings, searchQuery])

  const updateMutation = useMutation({
    mutationFn: async ({ key, value, data_type }: { key: string; value: any; data_type: string }) => {
      // Format value based on type
      let formattedValue = String(value)
      if (data_type === 'boolean') {
        formattedValue = String(value === true || value === 'true' || value === '1')
      } else if (data_type === 'json') {
        formattedValue = typeof value === 'string' ? value : JSON.stringify(value)
      } else if (data_type === 'number') {
        formattedValue = String(Number(value))
      }
      
      return api.patch(`/owner/settings/${key}/`, { value: formattedValue })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-settings'] })
      setEditingKey(null)
      toast.success('Setting updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update setting')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      return api.delete(`/owner/settings/${key}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-settings'] })
      toast.success('Setting deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete setting')
    },
  })

  const categories = [
    { id: 'all', name: 'All Settings', icon: '📋' },
    { id: 'currency', name: 'Currency & Exchange Rates', icon: '💱' },
    { id: 'payment', name: 'Payment Methods', icon: '💳' },
    { id: 'tax', name: 'Tax & Compliance', icon: '📊' },
    { id: 'pos', name: 'POS Settings', icon: '🛒' },
    { id: 'integration', name: 'Integrations', icon: '🔌' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notification', name: 'Notifications', icon: '🔔' },
    { id: 'other', name: 'Other', icon: '⚙️' },
  ]

  const settings = filteredSettings
  const [editValues, setEditValues] = useState<Record<string, any>>({})

  const handleEdit = (setting: SystemSetting) => {
    setEditingKey(setting.key)
    setEditValues({ ...editValues, [setting.key]: setting.typed_value })
  }

  const handleSave = (key: string, data_type: string) => {
    const value = editValues[key]
    updateMutation.mutate({ key, value, data_type })
  }

  const handleCancel = (key: string) => {
    setEditingKey(null)
    setEditValues({ ...editValues, [key]: undefined })
  }

  const handleDelete = (setting: SystemSetting) => {
    if (confirm(`Are you sure you want to delete the setting "${setting.key}"?\n\nThis action cannot be undone!`)) {
      deleteMutation.mutate(setting.key)
    }
  }

  const handleCreate = () => {
    setSelectedSetting(null)
    setShowForm(true)
  }

  const handleEditFull = async (setting: SystemSetting) => {
    setSelectedSetting(setting)
    setShowForm(true)
  }

  const formatValue = (setting: SystemSetting): string => {
    if (setting.data_type === 'boolean') {
      return setting.typed_value ? '✅ Enabled' : '❌ Disabled'
    } else if (setting.data_type === 'json') {
      try {
        return JSON.stringify(setting.typed_value, null, 2).substring(0, 100)
      } catch {
        return String(setting.value).substring(0, 100)
      }
    } else if (setting.data_type === 'number') {
      return String(setting.typed_value || setting.value)
    }
    return String(setting.value || '').substring(0, 100)
  }

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
            ⚙️ System Settings
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Manage system-wide settings that apply to all tenants
          </p>
        </div>
        <Button onClick={handleCreate}>
          ➕ Create Setting
        </Button>
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search settings by key, description, or value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
        {/* Categories Sidebar */}
        <Card>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            Categories
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setSearchQuery('') // Clear search when changing category
                }}
                style={{
                  padding: '12px 16px',
                  background: activeCategory === cat.id ? '#667eea' : 'transparent',
                  color: activeCategory === cat.id ? 'white' : '#2c3e50',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: activeCategory === cat.id ? '600' : '400',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (activeCategory !== cat.id) {
                    e.currentTarget.style.background = '#f8f9fa'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeCategory !== cat.id) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                {activeCategory === cat.id && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.8 }}>
                    {activeCategory === 'all'
                      ? allSettings.length
                      : (settingsByCategory?.[cat.id]?.length || 0)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Settings List */}
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
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
                {categories.find(c => c.id === activeCategory)?.icon}{' '}
                {categories.find(c => c.id === activeCategory)?.name}
              </h3>
              <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '13px' }}>
                {settings.length} {settings.length === 1 ? 'setting' : 'settings'}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" />
              <p style={{ marginTop: '16px', color: '#7f8c8d' }}>Loading settings...</p>
            </div>
          ) : settings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚙️</div>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                {searchQuery ? 'No settings found' : 'No settings in this category'}
              </p>
              <p style={{ fontSize: '14px' }}>
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first setting to get started'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {settings.map((setting: SystemSetting) => (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '20px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    background: '#fff',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e9ecef'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '12px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        flexWrap: 'wrap',
                      }}>
                        <code style={{
                          padding: '6px 12px',
                          background: '#f0f0f0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#667eea',
                          fontFamily: 'monospace',
                        }}>
                          {setting.key}
                        </code>
                        <span style={{
                          padding: '4px 10px',
                          background: '#e9ecef',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#495057',
                          textTransform: 'uppercase',
                        }}>
                          {setting.data_type}
                        </span>
                        {setting.is_public && (
                          <span style={{
                            padding: '4px 10px',
                            background: '#e3f2fd',
                            color: '#1976d2',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                          }}>
                            Public
                          </span>
                        )}
                      </div>
                      {setting.description && (
                        <p style={{
                          fontSize: '13px',
                          color: '#7f8c8d',
                          margin: '8px 0',
                          lineHeight: '1.5',
                        }}>
                          {setting.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {editingKey === setting.key ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'start', marginTop: '16px' }}>
                      {setting.data_type === 'boolean' ? (
                        <select
                          value={editValues[setting.key] ? 'true' : 'false'}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            [setting.key]: e.target.value === 'true',
                          })}
                          className="input"
                          style={{ flex: 1 }}
                        >
                          <option value="false">❌ False</option>
                          <option value="true">✅ True</option>
                        </select>
                      ) : setting.data_type === 'number' ? (
                        <input
                          type="number"
                          value={editValues[setting.key] || ''}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            [setting.key]: parseFloat(e.target.value) || 0,
                          })}
                          className="input"
                          style={{ flex: 1 }}
                        />
                      ) : setting.data_type === 'json' ? (
                        <textarea
                          value={typeof editValues[setting.key] === 'string'
                            ? editValues[setting.key]
                            : JSON.stringify(editValues[setting.key] || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value)
                              setEditValues({ ...editValues, [setting.key]: parsed })
                            } catch {
                              setEditValues({ ...editValues, [setting.key]: e.target.value })
                            }
                          }}
                          className="input"
                          style={{
                            flex: 1,
                            minHeight: '120px',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                          }}
                          placeholder='{"key": "value"}'
                        />
                      ) : (
                        <input
                          type="text"
                          value={editValues[setting.key] || ''}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            [setting.key]: e.target.value,
                          })}
                          className="input"
                          style={{ flex: 1 }}
                        />
                      )}
                      <Button
                        size="small"
                        onClick={() => handleSave(setting.key, setting.data_type)}
                        disabled={updateMutation.isPending}
                      >
                        💾 Save
                      </Button>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleCancel(setting.key)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f0f0f0',
                    }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#2c3e50',
                        fontFamily: setting.data_type === 'json' ? 'monospace' : 'inherit',
                        whiteSpace: setting.data_type === 'json' ? 'pre-wrap' : 'normal',
                        maxWidth: '70%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {formatValue(setting)}
                        {formatValue(setting).length >= 100 && '...'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleEdit(setting)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Quick Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleEditFull(setting)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleDelete(setting)}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            color: '#e74c3c',
                            borderColor: '#e74c3c',
                          }}
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </div>
                  )}

                  {setting.updated_by_name && (
                    <div style={{
                      fontSize: '11px',
                      color: '#95a5a6',
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #f8f9fa',
                    }}>
                      Last updated by <strong>{setting.updated_by_name}</strong> on{' '}
                      {new Date(setting.updated_at).toLocaleString()}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Setting Form Modal */}
      {showForm && (
        <SettingForm
          setting={selectedSetting || undefined}
          onClose={() => {
            setShowForm(false)
            setSelectedSetting(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedSetting(null)
            setEditingKey(null)
          }}
        />
      )}
    </div>
  )
}

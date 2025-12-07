/**
 * Settings Page - Manage tenant settings including business category
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import BusinessCategorySelector from '../components/BusinessCategorySelector'
import ModuleActivationList from '../components/ModuleActivationList'
import SubscriptionManagement from '../components/SubscriptionManagement'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'general' | 'category' | 'modules' | 'subscription'>('general')

  // Fetch current tenant category
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['tenant-category'],
    queryFn: async () => {
      try {
        const response = await api.get('/business-categories/tenant/category/')
        return response.data
      } catch {
        return null
      }
    },
  })

  // Extract current category early so it can be used in other queries
  const currentCategory = categoryData?.category

  // Fetch enabled modules
  const { data: modulesData } = useQuery({
    queryKey: ['tenant-modules'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/modules/')
        return response.data || []
      } catch (error: any) {
        console.error('Error fetching modules:', error)
        return []
      }
    },
  })

  // Fetch recommended modules
  const { data: recommendedModulesData } = useQuery({
    queryKey: ['recommended-modules'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions/tenant-modules/recommended/')
        return response.data
      } catch (error: any) {
        console.error('Error fetching recommended modules:', error)
        return { recommended: [], category: null }
      }
    },
    enabled: !!currentCategory, // Only fetch if category is selected
  })

  const enabledModules = Array.isArray(modulesData) ? modulesData : []
  const recommendedModules = recommendedModulesData?.recommended || []

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
          Settings
        </h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          Manage your business profile and preferences
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #ecf0f1',
        }}
      >
        {[
          { id: 'general', label: 'General', icon: '⚙️' },
          { id: 'category', label: 'Business Category', icon: '🏪' },
          { id: 'modules', label: 'Modules', icon: '📦' },
          { id: 'subscription', label: 'Subscription & Billing', icon: '💳' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === tab.id ? '#667eea' : '#7f8c8d',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card title="General Settings">
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Company Name
              </label>
              <input
                type="text"
                className="input"
                value={user?.tenant_name || 'Not set'}
                disabled
                style={{ width: '100%', opacity: 0.7 }}
              />
              <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                Company name is managed by your tenant administrator
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Your Role
              </label>
              <input
                type="text"
                className="input"
                value={user?.role_display || user?.role || 'N/A'}
                disabled
                style={{ width: '100%', opacity: 0.7 }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Business Category */}
      {activeTab === 'category' && (
        <div>
          {categoryLoading ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
            </Card>
          ) : (
            <>
              {currentCategory && (
                <Card title="Current Business Category" style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      color: 'white',
                    }}
                  >
                    <span style={{ fontSize: '48px' }}>{currentCategory.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                        {currentCategory.name}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>
                        {currentCategory.description}
                      </div>
                      {currentCategory.module_count > 0 && (
                        <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px' }}>
                          ✓ {currentCategory.module_count} module(s) configured for this category
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              <BusinessCategorySelector
                selectedCategoryId={currentCategory?.id}
                autoActivateModules={false}
                showRecommendations={true}
              />
            </>
          )}
        </div>
      )}

      {/* Modules */}
      {activeTab === 'modules' && (
        <div>
          {/* Enabled Modules */}
          <Card title="Enabled Modules" style={{ marginBottom: '24px' }}>
            {enabledModules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No modules enabled yet
                </div>
                <div style={{ fontSize: '14px' }}>
                  {currentCategory 
                    ? 'Select recommended modules below to activate them.'
                    : 'Select a business category first to see recommended modules.'}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '16px',
                }}
              >
                {enabledModules.map((module: any) => (
                  <div
                    key={module.id}
                    style={{
                      padding: '16px',
                      background: module.status === 'active' ? '#d4edda' : '#fff3cd',
                      borderRadius: '8px',
                      border: `1px solid ${module.status === 'active' ? '#c3e6cb' : '#ffeaa7'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '600' }}>{module.module_name}</div>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: module.status === 'active' ? '#28a745' : '#ffc107',
                          color: 'white',
                          textTransform: 'uppercase',
                        }}
                      >
                        {module.status || 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {module.module_category}
                    </div>
                    {module.enabled_at && (
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        Activated: {new Date(module.enabled_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recommended Modules */}
          {currentCategory && (
            <Card title="Recommended Modules">
              <p style={{ marginBottom: '16px', color: '#7f8c8d', fontSize: '14px' }}>
                These modules are recommended for your business category. Select modules to request activation.
              </p>
              {recommendedModules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                  No recommended modules available for this category.
                </div>
              ) : (
                <ModuleActivationList 
                  recommendedModules={recommendedModules}
                  enabledModules={enabledModules}
                  onActivationRequest={() => {
                    queryClient.invalidateQueries({ queryKey: ['tenant-modules'] })
                    queryClient.invalidateQueries({ queryKey: ['recommended-modules'] })
                  }}
                />
              )}
            </Card>
          )}
        </div>
      )}

      {/* Subscription & Billing */}
      {activeTab === 'subscription' && (
        <SubscriptionManagement />
      )}
    </div>
  )
}


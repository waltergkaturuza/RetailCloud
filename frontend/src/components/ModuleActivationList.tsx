/**
 * Module Activation List Component
 * Allows tenants to request activation of recommended modules
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Button from './ui/Button'
import toast from 'react-hot-toast'

interface RecommendedModule {
  module_id?: number
  module_code: string
  module_name: string
  is_required?: boolean
  priority?: number
  is_requested?: boolean
  can_request?: boolean
}

interface EnabledModule {
  id: number
  module_code: string
  module_name: string
  status: string
}

interface Props {
  recommendedModules: RecommendedModule[]
  enabledModules: EnabledModule[]
  onActivationRequest?: () => void
}

export default function ModuleActivationList({ recommendedModules, enabledModules, onActivationRequest }: Props) {
  const queryClient = useQueryClient()
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [periodMonths, setPeriodMonths] = useState<number>(1) // 1 = monthly, 12 = yearly

  // Request activation mutation
  const requestActivationMutation = useMutation({
    mutationFn: async (moduleCodes: string[]) => {
      const response = await api.post('/subscriptions/tenant-modules/request_activation/', {
        module_codes: moduleCodes,
        period_months: periodMonths,
        payment_type: 'trial', // Default to trial, owner can change later
      })
      return response.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Module activation requested successfully')
      queryClient.invalidateQueries({ queryKey: ['tenant-modules'] })
      queryClient.invalidateQueries({ queryKey: ['recommended-modules'] })
      setSelectedModules([])
      if (onActivationRequest) {
        onActivationRequest()
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to request module activation')
    },
  })

  // Check if module is already enabled/requested
  const isModuleEnabled = (moduleCode: string) => {
    return enabledModules.some((m: EnabledModule) => m.module_code === moduleCode)
  }

  // Toggle module selection
  const toggleModule = (moduleCode: string) => {
    const enabled = isModuleEnabled(moduleCode)
    if (enabled) {
      toast.info('This module is already enabled or requested')
      return
    }
    
    setSelectedModules((prev) => {
      if (prev.includes(moduleCode)) {
        return prev.filter((code) => code !== moduleCode)
      } else {
        return [...prev, moduleCode]
      }
    })
  }

  // Handle bulk activation request
  const handleBulkActivate = async () => {
    if (selectedModules.length === 0) {
      toast.error('Please select at least one module')
      return
    }

    setLoading(true)
    try {
      await requestActivationMutation.mutateAsync(selectedModules)
    } finally {
      setLoading(false)
    }
  }

  // Filter out already enabled modules
  const availableModules = recommendedModules.filter(
    (mod) => !isModuleEnabled(mod.module_code) && !mod.is_requested
  )

  if (availableModules.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
        All recommended modules are already enabled or requested.
      </div>
    )
  }

  return (
    <div>
      {/* Period Selection */}
      <div style={{ marginBottom: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
          Activation Period
        </label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              value={1}
              checked={periodMonths === 1}
              onChange={(e) => setPeriodMonths(parseInt(e.target.value))}
            />
            <span>Monthly</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              value={12}
              checked={periodMonths === 12}
              onChange={(e) => setPeriodMonths(parseInt(e.target.value))}
            />
            <span>Yearly (Save 20%)</span>
          </label>
        </div>
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          {periodMonths === 12 
            ? 'Yearly subscription includes 20% discount and is billed annually.'
            : 'Monthly subscription is billed each month.'}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {availableModules.map((module) => {
          const isSelected = selectedModules.includes(module.module_code)
          return (
            <div
              key={module.module_code}
              style={{
                padding: '16px',
                background: isSelected ? '#e3f2fd' : '#f8f9fa',
                borderRadius: '8px',
                border: `2px solid ${isSelected ? '#2196f3' : '#e9ecef'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => toggleModule(module.module_code)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div style={{ fontWeight: '600', fontSize: '15px', flex: 1 }}>{module.module_name}</div>
                {module.is_required && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      background: '#ff9800',
                      color: 'white',
                      textTransform: 'uppercase',
                    }}
                  >
                    Required
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                Code: {module.module_code}
              </div>
              {/* Pricing Display (estimated, will be confirmed upon approval) */}
              <div style={{ marginBottom: '12px', padding: '8px', background: '#fff', borderRadius: '4px', fontSize: '12px' }}>
                <div style={{ color: '#666', marginBottom: '4px' }}>Estimated Cost:</div>
                <div style={{ fontWeight: '600', color: '#667eea' }}>
                  USD {periodMonths === 12 ? '96.00' : '10.00'} / {periodMonths === 12 ? 'year' : 'month'}
                </div>
                {periodMonths === 12 && (
                  <div style={{ fontSize: '11px', color: '#28a745', marginTop: '4px' }}>
                    Save 20% vs monthly
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleModule(module.module_code)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#666' }}>Select to activate</span>
              </div>
            </div>
          )
        })}
      </div>

      {selectedModules.length > 0 && (
        <div style={{ padding: '20px', background: '#e7f3ff', borderRadius: '8px', marginTop: '24px', border: '2px solid #2196f3' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              {selectedModules.length} module(s) selected for activation
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Period: <strong>{periodMonths === 12 ? 'Yearly' : 'Monthly'}</strong>
            </div>
          </div>
          
          {/* Cost Summary */}
          <div style={{ marginBottom: '16px', padding: '12px', background: '#fff', borderRadius: '6px' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Estimated Total Cost:</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
              USD {(selectedModules.length * (periodMonths === 12 ? 96 : 10)).toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {periodMonths === 12 
                ? `${selectedModules.length} modules × USD 96.00/year = USD ${(selectedModules.length * 96).toFixed(2)}/year`
                : `${selectedModules.length} modules × USD 10.00/month = USD ${(selectedModules.length * 10).toFixed(2)}/month`}
            </div>
            {periodMonths === 12 && (
              <div style={{ fontSize: '12px', color: '#28a745', marginTop: '8px' }}>
                💰 Save {(selectedModules.length * 10 * 12 - selectedModules.length * 96).toFixed(2)} per year vs monthly billing
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => setSelectedModules([])}
              disabled={loading || requestActivationMutation.isPending}
            >
              Clear Selection
            </Button>
            <Button
              onClick={handleBulkActivate}
              disabled={loading || requestActivationMutation.isPending}
              style={{ minWidth: '180px' }}
            >
              {loading || requestActivationMutation.isPending ? 'Requesting...' : 'Request Activation'}
            </Button>
          </div>
          <p style={{ marginTop: '12px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            * Pricing is estimated. Final pricing and payment terms will be confirmed upon owner approval.
          </p>
        </div>
      )}
    </div>
  )
}


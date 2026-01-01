/**
 * Comprehensive Tax Management Page
 * Zimbabwe Tax Management System
 */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

interface TaxConfiguration {
  id: number
  vat_registered: boolean
  vat_number: string
  standard_vat_rate: string
  vat_filing_frequency: string
  income_tax_filing_frequency: string
  auto_calculate_tax: boolean
  tax_inclusive_pricing: boolean
  aids_levy_rate: string
  nssa_enabled: boolean
  nssa_employee_rate: string
  nssa_employer_rate: string
  zimdef_enabled: boolean
  zimdef_rate: string
  income_tax_brackets: any[]
}

interface TaxPeriod {
  id: number
  period_type: string
  period_start: string
  period_end: string
  period_label: string
  filing_status: string
  filing_due_date: string
  payment_due_date?: string
  tax_payable: string
  tax_paid: string
  outstanding_amount: string
  is_overdue: boolean
}

export default function TaxManagement() {
  const [activeTab, setActiveTab] = useState<'config' | 'periods' | 'calendar' | 'reports'>('config')
  const queryClient = useQueryClient()

  // Fetch tax configuration
  const { data: taxConfig, isLoading: configLoading } = useQuery({
    queryKey: ['tax-configuration'],
    queryFn: async () => {
      const response = await api.get('/accounting/tax-configuration/current/')
      return response.data as TaxConfiguration
    },
  })

  // Fetch tax periods
  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['tax-periods'],
    queryFn: async () => {
      const response = await api.get('/accounting/tax-periods/')
      return (response.data?.results || response.data || []) as TaxPeriod[]
    },
  })

  // Fetch tax calendar
  const { data: taxCalendar } = useQuery({
    queryKey: ['tax-calendar'],
    queryFn: async () => {
      const response = await api.get('/accounting/tax-calendar/')
      return response.data
    },
  })

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<TaxConfiguration>) => {
      if (taxConfig?.id) {
        return api.patch(`/accounting/tax-configuration/${taxConfig.id}/`, data)
      } else {
        return api.post('/accounting/tax-configuration/', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-configuration'] })
      toast.success('Tax configuration updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update tax configuration')
    },
  })

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
          🇿🇼 Tax Management System
        </h1>
        <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
          Comprehensive tax management for Zimbabwe businesses (ZIMRA compliance)
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #ecf0f1' }}>
        {[
          { id: 'config', label: '⚙️ Configuration', icon: '⚙️' },
          { id: 'periods', label: '📅 Tax Periods', icon: '📅' },
          { id: 'calendar', label: '📆 Calendar', icon: '📆' },
          { id: 'reports', label: '📊 Reports', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent',
              color: activeTab === tab.id ? '#3498db' : '#7f8c8d',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <TaxConfigurationTab
          taxConfig={taxConfig}
          isLoading={configLoading}
          onSave={(data) => updateConfigMutation.mutate(data)}
          isSaving={updateConfigMutation.isPending}
        />
      )}

      {/* Periods Tab */}
      {activeTab === 'periods' && (
        <TaxPeriodsTab periods={periods} isLoading={periodsLoading} />
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <TaxCalendarTab calendar={taxCalendar} />
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <TaxReportsTab />
      )}
    </div>
  )
}

// Tax Configuration Tab Component
function TaxConfigurationTab({
  taxConfig,
  isLoading,
  onSave,
  isSaving,
}: {
  taxConfig: TaxConfiguration | undefined
  isLoading: boolean
  onSave: (data: Partial<TaxConfiguration>) => void
  isSaving: boolean
}) {
  const [formData, setFormData] = useState<Partial<TaxConfiguration>>({
    vat_registered: taxConfig?.vat_registered || false,
    vat_number: taxConfig?.vat_number || '',
    standard_vat_rate: taxConfig?.standard_vat_rate || '14.50',
    vat_filing_frequency: taxConfig?.vat_filing_frequency || 'monthly',
    income_tax_filing_frequency: taxConfig?.income_tax_filing_frequency || 'annually',
    auto_calculate_tax: taxConfig?.auto_calculate_tax ?? true,
    tax_inclusive_pricing: taxConfig?.tax_inclusive_pricing || false,
    aids_levy_rate: taxConfig?.aids_levy_rate || '3.00',
    nssa_enabled: taxConfig?.nssa_enabled ?? true,
    nssa_employee_rate: taxConfig?.nssa_employee_rate || '4.00',
    nssa_employer_rate: taxConfig?.nssa_employer_rate || '4.50',
    zimdef_enabled: taxConfig?.zimdef_enabled ?? true,
    zimdef_rate: taxConfig?.zimdef_rate || '0.50',
  })

  // Update form data when taxConfig loads
  React.useEffect(() => {
    if (taxConfig) {
      setFormData({
        vat_registered: taxConfig.vat_registered,
        vat_number: taxConfig.vat_number || '',
        standard_vat_rate: taxConfig.standard_vat_rate,
        vat_filing_frequency: taxConfig.vat_filing_frequency,
        income_tax_filing_frequency: taxConfig.income_tax_filing_frequency,
        auto_calculate_tax: taxConfig.auto_calculate_tax,
        tax_inclusive_pricing: taxConfig.tax_inclusive_pricing,
        aids_levy_rate: taxConfig.aids_levy_rate,
        nssa_enabled: taxConfig.nssa_enabled,
        nssa_employee_rate: taxConfig.nssa_employee_rate,
        nssa_employer_rate: taxConfig.nssa_employer_rate,
        zimdef_enabled: taxConfig.zimdef_enabled,
        zimdef_rate: taxConfig.zimdef_rate,
      })
    }
  }, [taxConfig])

  if (isLoading) {
    return <Card><div style={{ padding: '40px', textAlign: 'center' }}>Loading configuration...</div></Card>
  }

  return (
    <Card>
      <div style={{ padding: '24px' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '20px' }}>Tax Configuration</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData) }}>
          {/* VAT Configuration */}
          <div style={{ marginBottom: '32px', borderBottom: '1px solid #eee', paddingBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>VAT Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.vat_registered}
                    onChange={(e) => setFormData({ ...formData, vat_registered: e.target.checked })}
                  />
                  <span style={{ fontWeight: '600' }}>VAT Registered</span>
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>VAT Number</label>
                <input
                  type="text"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  placeholder="ZIMRA VAT registration number"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Standard VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.standard_vat_rate}
                  onChange={(e) => setFormData({ ...formData, standard_vat_rate: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>VAT Filing Frequency</label>
                <select
                  value={formData.vat_filing_frequency}
                  onChange={(e) => setFormData({ ...formData, vat_filing_frequency: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
          </div>

          {/* Zimbabwe-Specific Taxes */}
          <div style={{ marginBottom: '32px', borderBottom: '1px solid #eee', paddingBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Zimbabwe-Specific Taxes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>AIDS Levy Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.aids_levy_rate}
                  onChange={(e) => setFormData({ ...formData, aids_levy_rate: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.nssa_enabled}
                    onChange={(e) => setFormData({ ...formData, nssa_enabled: e.target.checked })}
                  />
                  <span style={{ fontWeight: '600' }}>NSSA Enabled</span>
                </label>
                {formData.nssa_enabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.nssa_employee_rate}
                      onChange={(e) => setFormData({ ...formData, nssa_employee_rate: e.target.value })}
                      placeholder="Employee %"
                      style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.nssa_employer_rate}
                      onChange={(e) => setFormData({ ...formData, nssa_employer_rate: e.target.value })}
                      placeholder="Employer %"
                      style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.zimdef_enabled}
                  onChange={(e) => setFormData({ ...formData, zimdef_enabled: e.target.checked })}
                />
                <span style={{ fontWeight: '600' }}>ZIMDEF Enabled</span>
              </label>
              {formData.zimdef_enabled && (
                <input
                  type="number"
                  step="0.01"
                  value={formData.zimdef_rate}
                  onChange={(e) => setFormData({ ...formData, zimdef_rate: e.target.value })}
                  placeholder="ZIMDEF Rate %"
                  style={{ width: '200px', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px' }}
                />
              )}
            </div>
          </div>

          {/* General Settings */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>General Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.auto_calculate_tax}
                  onChange={(e) => setFormData({ ...formData, auto_calculate_tax: e.target.checked })}
                />
                <span>Automatically calculate tax on sales and purchases</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.tax_inclusive_pricing}
                  onChange={(e) => setFormData({ ...formData, tax_inclusive_pricing: e.target.checked })}
                />
                <span>Prices include tax (tax-inclusive pricing)</span>
              </label>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Income Tax Filing Frequency</label>
              <select
                value={formData.income_tax_filing_frequency}
                onChange={(e) => setFormData({ ...formData, income_tax_filing_frequency: e.target.value })}
                style={{ width: '200px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button type="submit" isLoading={isSaving}>
              Save Configuration
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}

// Tax Periods Tab Component
function TaxPeriodsTab({ periods, isLoading }: { periods: TaxPeriod[]; isLoading: boolean }) {
  if (isLoading) {
    return <Card><div style={{ padding: '40px', textAlign: 'center' }}>Loading periods...</div></Card>
  }

  return (
    <div>
      <Card>
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '20px' }}>Tax Periods</h2>
          {periods.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
              <div>No tax periods found</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Period</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Due Date</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Tax Payable</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Tax Paid</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{period.period_label}</td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{period.period_type.replace('_', ' ')}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {new Date(period.filing_due_date).toLocaleDateString()}
                        {period.is_overdue && <span style={{ color: '#e74c3c', marginLeft: '8px' }}>⚠️ Overdue</span>}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        ${parseFloat(period.tax_payable).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ${parseFloat(period.tax_paid).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: period.filing_status === 'paid' ? '#d4edda' :
                                     period.filing_status === 'filed' ? '#cfe2ff' :
                                     period.filing_status === 'overdue' ? '#f8d7da' : '#fff3cd',
                          color: period.filing_status === 'paid' ? '#155724' :
                                 period.filing_status === 'filed' ? '#084298' :
                                 period.filing_status === 'overdue' ? '#721c24' : '#856404'
                        }}>
                          {period.filing_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// Tax Calendar Tab Component
function TaxCalendarTab({ calendar }: { calendar: any }) {
  if (!calendar) {
    return <Card><div style={{ padding: '40px', textAlign: 'center' }}>Loading calendar...</div></Card>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      {/* Upcoming */}
      <Card>
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '20px' }}>Upcoming Due Dates</h2>
          {calendar.upcoming?.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No upcoming due dates</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {calendar.upcoming?.map((item: any) => (
                <div key={item.id} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.period_label}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Due: {new Date(item.filing_due_date).toLocaleDateString()} ({item.days_until_due} days)
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    Amount: ${parseFloat(item.tax_payable).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Overdue */}
      <Card>
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '20px', color: '#e74c3c' }}>Overdue Periods</h2>
          {calendar.overdue?.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No overdue periods ✅</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {calendar.overdue?.map((item: any) => (
                <div key={item.id} style={{ padding: '12px', border: '1px solid #f8d7da', borderRadius: '6px', background: '#fff5f5' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e74c3c' }}>{item.period_label}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Overdue: {item.days_overdue} days
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    Outstanding: ${parseFloat(item.outstanding_amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// Tax Reports Tab Component
function TaxReportsTab() {
  const [selectedPeriod, setSelectedPeriod] = useState<{ start: string; end: string } | null>(null)
  
  const { data: taxReport, isLoading } = useQuery({
    queryKey: ['tax-report', selectedPeriod],
    queryFn: async () => {
      const params: any = {}
      if (selectedPeriod) {
        params.period_start = selectedPeriod.start
        params.period_end = selectedPeriod.end
      }
      const response = await api.get('/accounting/tax-reporting/', { params })
      return response.data
    },
    enabled: !!selectedPeriod,
  })

  const today = new Date()
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

  React.useEffect(() => {
    if (!selectedPeriod) {
      setSelectedPeriod({ start: thisMonthStart, end: thisMonthEnd })
    }
  }, [])

  return (
    <Card>
      <div style={{ padding: '24px' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '20px' }}>Tax Reports</h2>
        
        <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Period Start</label>
            <input
              type="date"
              value={selectedPeriod?.start || ''}
              onChange={(e) => setSelectedPeriod({ ...selectedPeriod!, start: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Period End</label>
            <input
              type="date"
              value={selectedPeriod?.end || ''}
              onChange={(e) => setSelectedPeriod({ ...selectedPeriod!, end: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <Button onClick={() => {}}>Generate Report</Button>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading report...</div>
        ) : taxReport ? (
          <div>
            {taxReport.vat_return && (
              <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '6px' }}>
                <h3 style={{ margin: '0 0 16px' }}>VAT Return Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>VAT Output (Sales)</div>
                    <div style={{ fontSize: '20px', fontWeight: '600' }}>
                      ${parseFloat(taxReport.vat_return.vat_output).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>VAT Input (Purchases)</div>
                    <div style={{ fontSize: '20px', fontWeight: '600' }}>
                      ${parseFloat(taxReport.vat_return.vat_input).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>VAT Payable</div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: taxReport.vat_return.vat_payable < 0 ? '#e74c3c' : '#2ecc71' }}>
                      ${Math.abs(parseFloat(taxReport.vat_return.vat_payable)).toFixed(2)}
                      {taxReport.vat_return.vat_payable < 0 && ' (Refund)'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

// Add React import
import React from 'react'


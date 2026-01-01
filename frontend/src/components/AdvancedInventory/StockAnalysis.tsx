/**
 * Stock Analysis Component
 * ABC/XYZ Analysis, Dead Stock Detection, Stock Aging Reports
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { Pie, Bar } from 'react-chartjs-2'

interface ABCAnalysis {
  id: number
  product_name: string
  product_sku: string
  abc_class: string
  xyz_class?: string
  combined_class?: string
  annual_usage_value: number
  recommendation: string
}

interface DeadStock {
  id: number
  product_name: string
  product_sku: string
  current_quantity: number
  current_value: number
  days_since_last_sale: number
  classification: string
  recommendation: string
}

interface StockAging {
  id: number
  product_name: string
  product_sku: string
  total_quantity: number
  total_value: number
  quantity_0_30_days: number
  quantity_31_60_days: number
  quantity_61_90_days: number
  quantity_91_180_days: number
  quantity_181_365_days: number
  quantity_over_365_days: number
}

export default function StockAnalysis() {
  const [activeTab, setActiveTab] = useState<'abc' | 'dead' | 'aging'>('abc')
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Fetch branches
  const { data: branches } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/core/branches/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch ABC Analysis
  const { data: abcAnalysis } = useQuery<ABCAnalysis[]>({
    queryKey: ['abc-analysis', selectedBranch],
    queryFn: async () => {
      const params: any = {}
      if (selectedBranch) params.branch_id = selectedBranch
      const response = await api.get('/inventory/abc-analysis/', { params })
      return response.data?.results || response.data || []
    },
  })

  // Fetch Dead Stock
  const { data: deadStock } = useQuery<DeadStock[]>({
    queryKey: ['dead-stock', selectedBranch],
    queryFn: async () => {
      const params: any = {}
      if (selectedBranch) params.branch_id = selectedBranch
      const response = await api.get('/inventory/dead-stock/', { params })
      return response.data?.results || response.data || []
    },
  })

  // Fetch Stock Aging
  const { data: stockAging } = useQuery<StockAging[]>({
    queryKey: ['stock-aging', selectedBranch],
    queryFn: async () => {
      const params: any = {}
      if (selectedBranch) params.branch_id = selectedBranch
      const response = await api.get('/inventory/stock-aging/', { params })
      return response.data?.results || response.data || []
    },
  })

  // Run ABC Analysis mutation
  const runABCAnalysisMutation = useMutation({
    mutationFn: async (data: { analysis_type: string; branch_id?: number }) => {
      return api.post('/inventory/abc-analysis/run_analysis/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abc-analysis'] })
      toast.success('ABC Analysis completed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to run ABC analysis')
    },
  })

  // Identify Dead Stock mutation
  const identifyDeadStockMutation = useMutation({
    mutationFn: async (data: { branch_id?: number; days_threshold?: number }) => {
      return api.post('/inventory/dead-stock/identify/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dead-stock'] })
      toast.success('Dead stock identification completed')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to identify dead stock')
    },
  })

  // Run Stock Aging Analysis mutation
  const runAgingAnalysisMutation = useMutation({
    mutationFn: async (data: { branch_id?: number }) => {
      return api.post('/inventory/stock-aging/analyze/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-aging'] })
      toast.success('Stock aging analysis completed')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to run aging analysis')
    },
  })

  // ABC Analysis Chart Data
  const abcChartData = abcAnalysis ? {
    labels: ['A Items', 'B Items', 'C Items'],
    datasets: [
      {
        data: [
          abcAnalysis.filter((a) => a.abc_class === 'A').length,
          abcAnalysis.filter((a) => a.abc_class === 'B').length,
          abcAnalysis.filter((a) => a.abc_class === 'C').length,
        ],
        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
      },
    ],
  } : null

  // Dead Stock Chart Data
  const deadStockChartData = deadStock ? {
    labels: ['Active', 'Slow Moving', 'Very Slow', 'Dead', 'Obsolete'],
    datasets: [
      {
        label: 'Number of Products',
        data: [
          deadStock.filter((d) => d.classification === 'active').length,
          deadStock.filter((d) => d.classification === 'slow_moving').length,
          deadStock.filter((d) => d.classification === 'very_slow').length,
          deadStock.filter((d) => d.classification === 'dead').length,
          deadStock.filter((d) => d.classification === 'obsolete').length,
        ],
        backgroundColor: '#667eea',
      },
    ],
  } : null

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Stock Analysis</h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            ABC/XYZ Analysis, Dead Stock Detection, and Stock Aging Reports
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="input"
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value ? parseInt(e.target.value) : null)}
            style={{ minWidth: '200px' }}
          >
            <option value="">All Branches</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #dee2e6' }}>
        {(['abc', 'dead', 'aging'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === tab ? '#667eea' : '#6c757d',
              fontWeight: activeTab === tab ? '600' : '400',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'abc' ? 'ABC/XYZ Analysis' : tab === 'dead' ? 'Dead Stock' : 'Stock Aging'}
          </button>
        ))}
      </div>

      {/* ABC/XYZ Analysis Tab */}
      {activeTab === 'abc' && (
        <>
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>ABC/XYZ Analysis</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  onClick={() => runABCAnalysisMutation.mutate({ analysis_type: 'abc', branch_id: selectedBranch || undefined })}
                  disabled={runABCAnalysisMutation.isPending}
                >
                  {runABCAnalysisMutation.isPending ? 'Running...' : 'Run ABC Analysis'}
                </Button>
                <Button
                  onClick={() => runABCAnalysisMutation.mutate({ analysis_type: 'xyz', branch_id: selectedBranch || undefined })}
                  disabled={runABCAnalysisMutation.isPending}
                  style={{ background: '#6c757d' }}
                >
                  Run XYZ Analysis
                </Button>
                <Button
                  onClick={() => runABCAnalysisMutation.mutate({ analysis_type: 'combined', branch_id: selectedBranch || undefined })}
                  disabled={runABCAnalysisMutation.isPending}
                  style={{ background: '#28a745' }}
                >
                  Run Combined Analysis
                </Button>
              </div>
            </div>

            {abcChartData && (
              <div style={{ marginBottom: '24px', height: '300px' }}>
                <Pie data={abcChartData} />
              </div>
            )}

            {abcAnalysis && abcAnalysis.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>SKU</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>ABC Class</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>XYZ Class</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Combined</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Annual Value</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abcAnalysis.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>{item.product_name}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{item.product_sku}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background:
                                item.abc_class === 'A' ? '#28a745' : item.abc_class === 'B' ? '#ffc107' : '#dc3545',
                              color: 'white',
                            }}
                          >
                            {item.abc_class}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {item.xyz_class && (
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                background: '#667eea',
                                color: 'white',
                              }}
                            >
                              {item.xyz_class}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '600' }}>
                          {item.combined_class || '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          ${parseFloat(item.annual_usage_value.toString()).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#6c757d' }}>{item.recommendation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                No ABC analysis data available. Run an analysis to get started.
              </div>
            )}
          </Card>
        </>
      )}

      {/* Dead Stock Tab */}
      {activeTab === 'dead' && (
        <>
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Dead Stock Identification</h2>
              <Button
                onClick={() => identifyDeadStockMutation.mutate({ branch_id: selectedBranch || undefined, days_threshold: 90 })}
                disabled={identifyDeadStockMutation.isPending}
              >
                {identifyDeadStockMutation.isPending ? 'Identifying...' : 'Identify Dead Stock'}
              </Button>
            </div>

            {deadStockChartData && (
              <div style={{ marginBottom: '24px', height: '300px' }}>
                <Bar data={deadStockChartData} />
              </div>
            )}

            {deadStock && deadStock.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>SKU</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Quantity</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Value</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Days Since Last Sale</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Classification</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadStock.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>{item.product_name}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{item.product_sku}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{item.current_quantity}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          ${parseFloat(item.current_value.toString()).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {item.days_since_last_sale !== null ? item.days_since_last_sale : 'Never'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background:
                                item.classification === 'active'
                                  ? '#28a745'
                                  : item.classification === 'slow_moving'
                                  ? '#ffc107'
                                  : item.classification === 'dead'
                                  ? '#dc3545'
                                  : '#6c757d',
                              color: 'white',
                            }}
                          >
                            {item.classification.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#6c757d' }}>{item.recommendation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                No dead stock identified. Run identification to analyze inventory.
              </div>
            )}
          </Card>
        </>
      )}

      {/* Stock Aging Tab */}
      {activeTab === 'aging' && (
        <>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Stock Aging Report</h2>
              <Button
                onClick={() => runAgingAnalysisMutation.mutate({ branch_id: selectedBranch || undefined })}
                disabled={runAgingAnalysisMutation.isPending}
              >
                {runAgingAnalysisMutation.isPending ? 'Analyzing...' : 'Run Aging Analysis'}
              </Button>
            </div>

            {stockAging && stockAging.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Total Qty</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>0-30 Days</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>31-60 Days</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>61-90 Days</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>91-180 Days</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>181-365 Days</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>365+ Days</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAging.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>{item.product_name}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{item.total_quantity}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity_0_30_days}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity_31_60_days}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity_61_90_days}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity_91_180_days}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity_181_365_days}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: item.quantity_over_365_days > 0 ? '#dc3545' : 'inherit' }}>
                          {item.quantity_over_365_days}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          ${parseFloat(item.total_value.toString()).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                No stock aging data available. Run analysis to generate report.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}



/**
 * Accounting Reports Page
 * Premium Feature - Financial Reports
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function AccountingReports() {
  const [activeTab, setActiveTab] = useState<'trial-balance' | 'balance-sheet' | 'cash-flow' | 'aging'>('trial-balance')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch Trial Balance
  const { data: trialBalance, isLoading: loadingTB } = useQuery({
    queryKey: ['trial-balance', reportDate],
    queryFn: async () => {
      const response = await api.get('/accounting/reports/trial-balance/', {
        params: { as_of_date: reportDate }
      })
      return response.data
    },
    enabled: activeTab === 'trial-balance',
  })

  // Fetch Balance Sheet
  const { data: balanceSheet, isLoading: loadingBS } = useQuery({
    queryKey: ['balance-sheet', reportDate],
    queryFn: async () => {
      const response = await api.get('/accounting/reports/balance-sheet/', {
        params: { as_of_date: reportDate }
      })
      return response.data
    },
    enabled: activeTab === 'balance-sheet',
  })

  // Fetch Cash Flow
  const { data: cashFlow, isLoading: loadingCF } = useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/accounting/reports/cash-flow/', {
        params: { start_date: startDate, end_date: endDate }
      })
      return response.data
    },
    enabled: activeTab === 'cash-flow',
  })

  // Fetch Aging Reports
  const { data: aging, isLoading: loadingAging } = useQuery({
    queryKey: ['account-aging', reportDate],
    queryFn: async () => {
      const response = await api.get('/accounting/reports/account-aging/', {
        params: { as_of_date: reportDate }
      })
      return response.data
    },
    enabled: activeTab === 'aging',
  })

  const handleExport = () => {
    toast.info('Export functionality coming soon')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#2c3e50' }}>
          📊 Accounting Reports
        </h1>
        <p style={{ margin: '8px 0 0', color: '#6c757d', fontSize: '14px' }}>
          Financial reports for double-entry bookkeeping
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #ecf0f1' }}>
        {[
          { id: 'trial-balance', label: 'Trial Balance', icon: '⚖️' },
          { id: 'balance-sheet', label: 'Balance Sheet', icon: '📋' },
          { id: 'cash-flow', label: 'Cash Flow', icon: '💵' },
          { id: 'aging', label: 'Account Aging', icon: '⏰' },
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

      {/* Date Selection */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeTab === 'cash-flow' ? (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6c757d' }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6c757d' }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6c757d' }}>
                {activeTab === 'trial-balance' ? 'As of Date' : activeTab === 'balance-sheet' ? 'Report Date' : 'As of Date'}
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <Button onClick={handleExport} variant="secondary">
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Content */}
      <Card>
        <div style={{ padding: '24px' }}>
          {activeTab === 'trial-balance' && (
            <div>
              {loadingTB ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>Loading trial balance...</div>
              ) : trialBalance ? (
                <div>
                  <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Trial Balance</h2>
                    <p style={{ margin: '4px 0', color: '#6c757d' }}>As of {new Date(reportDate).toLocaleDateString()}</p>
                    <p style={{ margin: '4px 0', color: trialBalance.is_balanced ? '#27ae60' : '#e74c3c', fontWeight: '600' }}>
                      {trialBalance.is_balanced ? '✓ Balanced' : '✗ Unbalanced'}
                    </p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Account Code</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Account Name</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Debit</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance.entries?.map((entry: any, index: number) => (
                          <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '10px', fontFamily: 'monospace' }}>{entry.account_code}</td>
                            <td style={{ padding: '10px' }}>{entry.account_name}</td>
                            <td style={{ padding: '10px', fontSize: '13px', color: '#6c757d' }}>{entry.account_type}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                              ${parseFloat(entry.debit || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                              ${parseFloat(entry.credit || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8f9fa', fontWeight: '600', borderTop: '2px solid #dee2e6' }}>
                          <td colSpan={3} style={{ padding: '12px', textAlign: 'right' }}>Total:</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                            ${parseFloat(trialBalance.total_debits || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                            ${parseFloat(trialBalance.total_credits || 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#6c757d' }}>
                  No trial balance data available
                </div>
              )}
            </div>
          )}

          {activeTab === 'balance-sheet' && (
            <div>
              {loadingBS ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>Loading balance sheet...</div>
              ) : balanceSheet ? (
                <div>
                  <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Balance Sheet</h2>
                    <p style={{ margin: '4px 0', color: '#6c757d' }}>As of {new Date(reportDate).toLocaleDateString()}</p>
                    <p style={{ margin: '4px 0', color: balanceSheet.is_balanced ? '#27ae60' : '#e74c3c', fontWeight: '600' }}>
                      {balanceSheet.is_balanced ? '✓ Balanced' : '✗ Unbalanced'}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Assets</h3>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginTop: '16px' }}>
                        Total Assets: ${parseFloat(balanceSheet.total_assets || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Liabilities & Equity</h3>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginTop: '16px' }}>
                        Total Liabilities: ${parseFloat(balanceSheet.total_liabilities || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginTop: '8px' }}>
                        Total Equity: ${parseFloat(balanceSheet.total_equity || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#6c757d' }}>
                  No balance sheet data available
                </div>
              )}
            </div>
          )}

          {activeTab === 'cash-flow' && (
            <div>
              {loadingCF ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>Loading cash flow...</div>
              ) : cashFlow ? (
                <div>
                  <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Cash Flow Statement</h2>
                    <p style={{ margin: '4px 0', color: '#6c757d' }}>{cashFlow.report_period}</p>
                  </div>
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '16px', padding: '16px', background: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Opening Cash Balance</div>
                      <div style={{ fontSize: '20px', fontWeight: '600' }}>
                        ${parseFloat(cashFlow.opening_cash_balance || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Operating Activities</div>
                      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Net Cash from Operations</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#3498db' }}>
                        ${parseFloat(cashFlow.operating_activities?.net_cash || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Investing Activities</div>
                      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Net Cash from Investing</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#9b59b6' }}>
                        ${parseFloat(cashFlow.investing_activities?.net_cash || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Financing Activities</div>
                      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Net Cash from Financing</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#e67e22' }}>
                        ${parseFloat(cashFlow.financing_activities?.net_cash || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ marginTop: '24px', padding: '16px', background: '#e8f5e9', borderRadius: '6px' }}>
                      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Closing Cash Balance</div>
                      <div style={{ fontSize: '24px', fontWeight: '600', color: '#27ae60' }}>
                        ${parseFloat(cashFlow.closing_cash_balance || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#6c757d' }}>
                  No cash flow data available
                </div>
              )}
            </div>
          )}

          {activeTab === 'aging' && (
            <div>
              {loadingAging ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>Loading aging reports...</div>
              ) : aging ? (
                <div>
                  <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Account Aging Report</h2>
                    <p style={{ margin: '4px 0', color: '#6c757d' }}>As of {new Date(reportDate).toLocaleDateString()}</p>
                  </div>
                  <div style={{ color: '#6c757d', fontStyle: 'italic', marginBottom: '16px' }}>
                    Full aging reports require invoice-level tracking. This is a simplified report based on account balances.
                  </div>
                  {/* Add aging report display here */}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: '#6c757d' }}>
                  No aging data available
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}


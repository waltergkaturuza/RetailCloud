/**
 * Trading Profit & Loss Statement Grid Component
 * Displays comprehensive P&L statement in accounting format
 */
import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import Card from './ui/Card'
import Button from './ui/Button'
import api from '../lib/api'
import toast from 'react-hot-toast'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface PLStatementGridProps {
  plData: any
  dateRange: { start: string; end: string }
  branchId?: number | 'all'
}

export default function PLStatementGrid({ plData, dateRange, branchId }: PLStatementGridProps) {
  const [exporting, setExporting] = useState(false)

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      }
      if (branchId && branchId !== 'all') params.branch_id = branchId

      const response = await api.post('/reports/profit-loss/', params, {
        responseType: 'blob',
      })

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `P&L_${dateRange.start}_${dateRange.end}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('PDF exported successfully')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.response?.data?.error || 'Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `$${Math.abs(num).toFixed(2)}`
  }

  const trading = plData?.trading_account || {}
  const operatingExpenses = plData?.operating_expenses || {}
  const taxes = plData?.taxes || {}
  const summary = plData?.summary || {}

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
      {/* Left: Detailed P&L Statement Grid */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Trading Profit & Loss Statement
          </h3>
          <Button 
            onClick={handleExportPDF} 
            disabled={exporting}
            variant="secondary"
            size="sm"
          >
            {exporting ? 'Exporting...' : '📄 Export PDF'}
          </Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#34495e', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              {/* Trading Account Section */}
              <tr>
                <td colSpan={2} style={{ padding: '10px', background: '#ecf0f1', fontWeight: '600', fontSize: '15px' }}>
                  TRADING ACCOUNT
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px' }}>Sales Revenue</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(trading.revenue || 0)}</td>
              </tr>
              <tr style={{ background: '#f9f9f9' }}>
                <td style={{ padding: '10px', paddingLeft: '20px' }}>Less: Sales Discounts</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#e74c3c' }}>
                  ({formatCurrency(trading.sales_discounts || 0)})
                </td>
              </tr>
              <tr style={{ background: '#f9f9f9' }}>
                <td style={{ padding: '10px', paddingLeft: '20px' }}>Less: Returns</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#e74c3c' }}>
                  ({formatCurrency(trading.returns_value || 0)})
                </td>
              </tr>
              <tr style={{ background: '#e8f8f5', borderTop: '2px solid #2ecc71', borderBottom: '2px solid #2ecc71' }}>
                <td style={{ padding: '10px', fontWeight: '600' }}>Net Revenue</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                  {formatCurrency(trading.net_revenue || 0)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px' }}>Cost of Goods Sold</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(trading.cost_of_goods_sold || 0)}</td>
              </tr>
              {trading.returns_adjustment && (
                <>
                  <tr style={{ background: '#f9f9f9' }}>
                    <td style={{ padding: '10px', paddingLeft: '20px' }}>Less: COGS Reversed (Returns)</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#2ecc71' }}>
                      ({formatCurrency(trading.returns_adjustment.cogs_reversed || 0)})
                    </td>
                  </tr>
                  <tr style={{ background: '#f9f9f9' }}>
                    <td style={{ padding: '10px', paddingLeft: '20px' }}>Add: Write-offs</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#e74c3c' }}>
                      {formatCurrency(trading.returns_adjustment.write_offs || 0)}
                    </td>
                  </tr>
                </>
              )}
              <tr style={{ background: '#ffe8e8', borderTop: '2px solid #e74c3c', borderBottom: '2px solid #e74c3c' }}>
                <td style={{ padding: '10px', fontWeight: '600' }}>Total COGS</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                  {formatCurrency(trading.cost_of_goods_sold || 0)}
                </td>
              </tr>
              <tr style={{ background: '#d5f4e6', borderTop: '3px solid #2ecc71', borderBottom: '3px solid #2ecc71' }}>
                <td style={{ padding: '12px', fontWeight: '700', fontSize: '15px' }}>GROSS PROFIT</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '15px' }}>
                  {formatCurrency(trading.gross_profit || 0)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px', fontSize: '12px', color: '#7f8c8d' }}>
                  Gross Profit Margin: {trading.gross_profit_margin?.toFixed(2) || '0.00'}%
                </td>
                <td></td>
              </tr>

              {/* Operating Expenses Section */}
              <tr>
                <td colSpan={2} style={{ padding: '10px', background: '#ecf0f1', fontWeight: '600', fontSize: '15px', marginTop: '10px' }}>
                  OPERATING EXPENSES
                </td>
              </tr>
              {operatingExpenses.categories && operatingExpenses.categories.length > 0 ? (
                operatingExpenses.categories.map((cat: any, idx: number) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                    <td style={{ padding: '10px', paddingLeft: '20px' }}>{cat.name}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#e74c3c' }}>
                      {formatCurrency(cat.amount || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'center', color: '#7f8c8d', fontStyle: 'italic' }}>
                    No operating expenses recorded
                  </td>
                </tr>
              )}
              <tr style={{ background: '#ffe8e8', borderTop: '2px solid #e74c3c', borderBottom: '2px solid #e74c3c' }}>
                <td style={{ padding: '10px', fontWeight: '600' }}>Total Operating Expenses</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                  {formatCurrency(operatingExpenses.total || 0)}
                </td>
              </tr>
              <tr style={{ background: '#d5f4e6', borderTop: '3px solid #2ecc71' }}>
                <td style={{ padding: '12px', fontWeight: '700', fontSize: '15px' }}>OPERATING PROFIT</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '15px' }}>
                  {formatCurrency(summary.operating_profit || 0)}
                </td>
              </tr>

              {/* Taxes Section */}
              <tr>
                <td colSpan={2} style={{ padding: '10px', background: '#ecf0f1', fontWeight: '600', fontSize: '15px', marginTop: '10px' }}>
                  TAXES
                </td>
              </tr>
              {taxes.categories && taxes.categories.length > 0 ? (
                taxes.categories.map((tax: any, idx: number) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                    <td style={{ padding: '10px', paddingLeft: '20px' }}>{tax.name}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#e74c3c' }}>
                      {formatCurrency(tax.amount || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'center', color: '#7f8c8d', fontStyle: 'italic' }}>
                    No tax transactions recorded
                  </td>
                </tr>
              )}
              <tr style={{ background: '#ffe8e8', borderTop: '2px solid #e74c3c', borderBottom: '2px solid #e74c3c' }}>
                <td style={{ padding: '10px', fontWeight: '600' }}>Total Taxes</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                  {formatCurrency(taxes.total || 0)}
                </td>
              </tr>

              {/* Net Profit */}
              <tr style={{ background: '#c8e6c9', borderTop: '4px solid #27ae60', borderBottom: '4px solid #27ae60', marginTop: '20px' }}>
                <td style={{ padding: '15px', fontWeight: '700', fontSize: '16px' }}>NET PROFIT</td>
                <td style={{ padding: '15px', textAlign: 'right', fontWeight: '700', fontSize: '16px' }}>
                  {formatCurrency(summary.net_profit || 0)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: '10px', fontSize: '12px', color: '#7f8c8d' }}>
                  <div>Operating Profit Margin: {summary.margins?.operating_profit_margin?.toFixed(2) || '0.00'}%</div>
                  <div>Net Profit Margin: {summary.margins?.net_profit_margin?.toFixed(2) || '0.00'}%</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Right: Chart */}
      <Card>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
          Revenue vs COGS
        </h3>
        {plData?.trading_account?.revenue > 0 && (
          <div style={{ height: '350px', position: 'relative' }}>
            <Bar
              data={{
                labels: ['Revenue', 'COGS', 'Gross Profit'],
                datasets: [{
                  label: 'Amount',
                  data: [
                    parseFloat(plData.trading_account.revenue || 0),
                    parseFloat(plData.trading_account.cost_of_goods_sold || 0),
                    parseFloat(plData.trading_account.gross_profit || 0),
                  ],
                  backgroundColor: ['#2ecc71', '#e74c3c', '#3498db'],
                  borderWidth: 0,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                devicePixelRatio: 1,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + value
                      }
                    }
                  }
                }
              }}
            />
          </div>
        )}
      </Card>
    </div>
  )
}


import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface CLVRecord {
  id: number
  customer: number
  customer_name: string
  historical_clv: string
  predictive_clv?: string
  total_revenue: string
  total_cost: string
  total_profit: string
  average_order_value: string
  purchase_frequency: string
  customer_age_days: number
  calculation_date: string
  period_start: string
  period_end: string
}

export default function CLVDashboard() {
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const queryClient = useQueryClient()

  const { data: clvRecords = [], isLoading } = useQuery({
    queryKey: ['customer-clv'],
    queryFn: async () => {
      const response = await api.get('/customers/clv/')
      return response.data.results || response.data
    },
  })

  const calculateAllMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {}
      if (periodStart) payload.period_start = periodStart
      if (periodEnd) payload.period_end = periodEnd
      const response = await api.post('/customers/clv/calculate_all/', payload)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-clv'] })
      toast.success(
        `CLV calculation complete: ${data.processed} customers, Average CLV: $${data.average_clv?.toFixed(2)}`
      )
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to calculate CLV')
    },
  })

  // Calculate statistics
  const totalCLV = clvRecords.reduce((sum: number, record: CLVRecord) => {
    return sum + parseFloat(record.historical_clv || '0')
  }, 0)

  const avgCLV = clvRecords.length > 0 ? totalCLV / clvRecords.length : 0
  const topCustomers = [...clvRecords]
    .sort((a: CLVRecord, b: CLVRecord) => parseFloat(b.historical_clv) - parseFloat(a.historical_clv))
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Lifetime Value</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track and analyze customer lifetime value for strategic decision making
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Customers Analyzed</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{clvRecords.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total CLV</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${totalCLV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average CLV</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${avgCLV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
      </div>

      {/* Calculate Actions */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period Start (Optional)
            </label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period End (Optional)
            </label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => calculateAllMutation.mutate()}
              disabled={calculateAllMutation.isPending}
            >
              {calculateAllMutation.isPending ? 'Calculating...' : 'Calculate All CLV'}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Leave dates empty to use customer creation date to today. CLV includes revenue, costs, and profit analysis.
        </p>
      </Card>

      {/* Top Customers by CLV */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top 10 Customers by CLV</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Historical CLV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Predictive CLV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Frequency
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading CLV data...
                  </td>
                </tr>
              ) : topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No CLV data found. Calculate CLV to get started.
                  </td>
                </tr>
              ) : (
                topCustomers.map((record: CLVRecord) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {record.customer_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        ${parseFloat(record.historical_clv).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {record.predictive_clv
                          ? `$${parseFloat(record.predictive_clv).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        ${parseFloat(record.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        ${parseFloat(record.average_order_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {parseFloat(record.purchase_frequency).toFixed(2)} / 30 days
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}


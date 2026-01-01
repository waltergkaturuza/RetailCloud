import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import toast from 'react-hot-toast'

interface RFMScore {
  id: number
  customer: number
  customer_name: string
  recency_score: number
  frequency_score: number
  monetary_score: number
  recency_days: number
  frequency_count: number
  monetary_value: string
  rfm_score: string
  suggested_segment: string
  analysis_period_start: string
  analysis_period_end: string
  calculated_at: string
}

export default function RFMAnalysis() {
  const [calculateDays, setCalculateDays] = useState(365)
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: rfmScores = [], isLoading } = useQuery({
    queryKey: ['rfm-scores'],
    queryFn: async () => {
      const response = await api.get('/customers/rfm-scores/')
      return response.data.results || response.data
    },
  })

  const calculateAllMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await api.post('/customers/rfm-scores/calculate_all/', { days })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfm-scores'] })
      toast.success(`RFM analysis complete: ${data.processed} customers processed`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to calculate RFM scores')
    },
  })

  const calculateCustomerMutation = useMutation({
    mutationFn: async ({ customerId, days }: { customerId: number; days: number }) => {
      const response = await api.post('/customers/rfm-scores/calculate_customer/', {
        customer_id: customerId,
        days,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfm-scores'] })
      toast.success('RFM score calculated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to calculate RFM score')
    },
  })

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600 dark:text-green-400'
    if (score >= 3) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getRFMLabel = (rfmScore: string) => {
    const labels: Record<string, string> = {
      '555': 'Champions',
      '554': 'Champions',
      '544': 'Loyal Customers',
      '444': 'Loyal Customers',
      '455': 'Potential Loyalists',
      '345': 'Potential Loyalists',
      '445': 'At Risk',
      '155': 'New Customers',
      '111': 'Lost',
    }
    return labels[rfmScore] || 'Regular'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">RFM Analysis</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Recency, Frequency, Monetary value analysis for customer segmentation
          </p>
        </div>
      </div>

      {/* Calculate Actions */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Analysis Period (Days)
            </label>
            <Input
              type="number"
              value={calculateDays}
              onChange={(e) => setCalculateDays(parseInt(e.target.value) || 365)}
              min={30}
              max={3650}
            />
          </div>
          <div className="flex items-end space-x-2">
            <Button
              onClick={() => calculateAllMutation.mutate(calculateDays)}
              disabled={calculateAllMutation.isPending}
            >
              {calculateAllMutation.isPending ? 'Calculating...' : 'Calculate All Customers'}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          RFM scores range from 1-5. Higher scores indicate better performance.
        </p>
      </Card>

      {/* RFM Scores Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  RFM Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Monetary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Segment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading RFM scores...
                  </td>
                </tr>
              ) : rfmScores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No RFM scores found. Calculate RFM scores to get started.
                  </td>
                </tr>
              ) : (
                rfmScores.map((score: RFMScore) => (
                  <tr key={score.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {score.customer_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {score.rfm_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className={`font-semibold ${getScoreColor(score.recency_score)}`}>
                          {score.recency_score}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({score.recency_days} days)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className={`font-semibold ${getScoreColor(score.frequency_score)}`}>
                          {score.frequency_score}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({score.frequency_count} purchases)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className={`font-semibold ${getScoreColor(score.monetary_score)}`}>
                          {score.monetary_score}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          (${parseFloat(score.monetary_value).toLocaleString()})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                        {score.suggested_segment || getRFMLabel(score.rfm_score)}
                      </span>
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


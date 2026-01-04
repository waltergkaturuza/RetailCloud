import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'

interface JourneyStage {
  id: number
  customer: number
  customer_name: string
  stage: string
  entered_at: string
  exited_at?: string
  engagement_score: number
  converted: boolean
  conversion_date?: string
}

const STAGE_LABELS: Record<string, string> = {
  awareness: 'Awareness',
  consideration: 'Consideration',
  purchase: 'Purchase',
  post_purchase: 'Post-Purchase',
  loyalty: 'Loyalty',
  advocacy: 'Advocacy',
  churned: 'Churned',
}

export default function CustomerJourney() {
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['journey-stages'],
    queryFn: async () => {
      const response = await api.get('/customers/journey-stages/')
      return response.data.results || response.data
    },
  })

  // Group stages by customer
  const customerStages: Record<number, JourneyStage[]> = {}
  stages.forEach((stage: JourneyStage) => {
    if (!customerStages[stage.customer]) {
      customerStages[stage.customer] = []
    }
    customerStages[stage.customer].push(stage)
  })

  // Get current stage for each customer
  const currentStages = Object.entries(customerStages).map(([customerId, stageList]) => {
    const current = stageList.find((s) => !s.exited_at) || stageList[stageList.length - 1]
    return { customerId: parseInt(customerId), customerName: current.customer_name, stage: current }
  })

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      awareness: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      consideration: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      purchase: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      post_purchase: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      loyalty: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      advocacy: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      churned: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }
    return colors[stage] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  const stageDistribution = stages.reduce((acc: Record<string, number>, stage: JourneyStage) => {
    const stageKey = stage.stage
    acc[stageKey] = (acc[stageKey] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Journey Map</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track customer journey stages and engagement levels
          </p>
        </div>
      </div>

      {/* Stage Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(STAGE_LABELS).map(([key, label]) => (
          <Card key={key} className="p-4 text-center">
            <div className={`text-xs px-2 py-1 rounded mb-2 inline-block ${getStageColor(key)}`}>
              {label}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stageDistribution[key] || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">customers</div>
          </Card>
        ))}
      </div>

      {/* Current Stages Table */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Customer Stages</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Engagement Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entered At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading journey data...
                  </td>
                </tr>
              ) : currentStages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No journey data found
                  </td>
                </tr>
              ) : (
                currentStages.map(({ customerId, customerName, stage }) => (
                  <tr key={customerId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded ${getStageColor(stage.stage)}`}>
                        {STAGE_LABELS[stage.stage] || stage.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${stage.engagement_score}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">{stage.engagement_score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(stage.entered_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stage.converted ? (
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                          Converted
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                          In Progress
                        </span>
                      )}
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



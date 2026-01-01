import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'

interface Customer {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email?: string
  phone: string
  total_purchases?: string
  loyalty_points_balance?: number
}

export default function Customer360() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const navigate = useNavigate()

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: async () => {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      const response = await api.get('/customers/customers/', { params })
      return response.data.results || response.data
    },
  })

  const { data: rfmScore } = useQuery({
    queryKey: ['rfm-score', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return null
      const response = await api.get(`/customers/rfm-scores/?customer=${selectedCustomer.id}`)
      const data = response.data.results || response.data
      return Array.isArray(data) && data.length > 0 ? data[0] : null
    },
    enabled: !!selectedCustomer,
  })

  const { data: clvRecord } = useQuery({
    queryKey: ['clv-record', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return null
      const response = await api.get(`/customers/clv/?customer=${selectedCustomer.id}`)
      const data = response.data.results || response.data
      return Array.isArray(data) && data.length > 0 ? data[0] : null
    },
    enabled: !!selectedCustomer,
  })

  const { data: touchpoints = [] } = useQuery({
    queryKey: ['touchpoints', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return []
      const response = await api.get(`/customers/touchpoints/?customer=${selectedCustomer.id}&ordering=-interaction_date`)
      return response.data.results || response.data
    },
    enabled: !!selectedCustomer,
  })

  const { data: journeyStages = [] } = useQuery({
    queryKey: ['journey-stages', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return []
      const response = await api.get(`/customers/journey-stages/?customer=${selectedCustomer.id}&ordering=-entered_at`)
      return response.data.results || response.data
    },
    enabled: !!selectedCustomer,
  })

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  if (selectedCustomer) {
    const currentStage = journeyStages.find((s: any) => !s.exited_at) || journeyStages[journeyStages.length - 1]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
              ← Back to Search
            </Button>
          </div>
        </div>

        {/* Customer Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedCustomer.full_name}
              </h2>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>📧 {selectedCustomer.email || 'No email'}</div>
                <div>📞 {selectedCustomer.phone}</div>
              </div>
            </div>
            <Button onClick={() => navigate(`/customers?action=view&id=${selectedCustomer.id}`)}>
              View Full Profile
            </Button>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Purchases</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${selectedCustomer.total_purchases ? parseFloat(selectedCustomer.total_purchases).toFixed(2) : '0.00'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Loyalty Points</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {selectedCustomer.loyalty_points_balance || 0}
            </div>
          </Card>
          {rfmScore && (
            <Card className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">RFM Score</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {rfmScore.rfm_score}
              </div>
            </Card>
          )}
          {clvRecord && (
            <Card className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lifetime Value</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${parseFloat(clvRecord.historical_clv).toFixed(2)}
              </div>
            </Card>
          )}
        </div>

        {/* Journey Stage */}
        {currentStage && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Journey Stage</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {currentStage.stage.replace('_', ' ')}
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Entered: {new Date(currentStage.entered_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">Engagement</div>
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {currentStage.engagement_score}/100
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Touchpoints */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Interactions</h3>
          <div className="space-y-3">
            {touchpoints.slice(0, 10).map((touchpoint: any) => (
              <div key={touchpoint.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{touchpoint.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {touchpoint.touchpoint_type} • {touchpoint.channel} • {new Date(touchpoint.interaction_date).toLocaleDateString()}
                  </div>
                </div>
                {touchpoint.outcome_value && (
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ${parseFloat(touchpoint.outcome_value).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
            {touchpoints.length === 0 && (
              <div className="text-center text-gray-500 py-8">No interactions found</div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer 360 View</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comprehensive view of customer data, journey, and interactions
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Customer List */}
      <Card>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading customers...</div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No customers found</div>
          ) : (
            customers.map((customer: Customer) => (
              <button
                key={customer.id}
                onClick={() => handleCustomerSelect(customer)}
                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{customer.full_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {customer.phone} {customer.email && `• ${customer.email}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${customer.total_purchases ? parseFloat(customer.total_purchases).toFixed(2) : '0.00'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {customer.loyalty_points_balance || 0} points
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}


import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Modal from '../ui/Modal'
import toast from 'react-hot-toast'

interface LoyaltyTier {
  id: number
  name: string
  level: number
  description: string
  min_points: number
  min_spend: string
  min_purchases: number
  benefits: any
  points_earn_rate: string
  points_expiry_days?: number
  is_active: boolean
}

interface LoyaltyReward {
  id: number
  name: string
  description: string
  points_cost: number
  monetary_value?: string
  tier_required?: number
  tier_required_name?: string
  is_active: boolean
  stock_quantity?: number
  redemption_count: number
}

export default function LoyaltyProgram() {
  const [activeSubTab, setActiveSubTab] = useState<'tiers' | 'rewards' | 'memberships'>('tiers')
  const [showTierForm, setShowTierForm] = useState(false)
  const [showRewardForm, setShowRewardForm] = useState(false)
  const [selectedTier, setSelectedTier] = useState<LoyaltyTier | null>(null)
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null)
  const queryClient = useQueryClient()

  const { data: tiers = [] } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: async () => {
      const response = await api.get('/customers/loyalty-tiers/')
      return response.data.results || response.data
    },
  })

  const { data: rewards = [] } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => {
      const response = await api.get('/customers/loyalty-rewards/')
      return response.data.results || response.data
    },
  })

  const { data: memberships = [] } = useQuery({
    queryKey: ['loyalty-memberships'],
    queryFn: async () => {
      const response = await api.get('/customers/loyalty-memberships/')
      return response.data.results || response.data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loyalty Program</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage tiered loyalty programs, rewards, and customer memberships
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'tiers' as const, label: 'Tiers', icon: '⭐' },
            { id: 'rewards' as const, label: 'Rewards', icon: '🎁' },
            { id: 'memberships' as const, label: 'Memberships', icon: '👥' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeSubTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tiers Tab */}
      {activeSubTab === 'tiers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedTier(null); setShowTierForm(true) }}>
              Create Tier
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier: LoyaltyTier) => (
              <Card key={tier.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{tier.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Level {tier.level}</span>
                  </div>
                  {tier.is_active ? (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{tier.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Min Points:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{tier.min_points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Min Spend:</span>
                    <span className="font-medium text-gray-900 dark:text-white">${parseFloat(tier.min_spend).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Points Rate:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{parseFloat(tier.points_earn_rate).toFixed(2)}x</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedTier(tier); setShowTierForm(true) }}>
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeSubTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedReward(null); setShowRewardForm(true) }}>
              Create Reward
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward: LoyaltyReward) => (
              <Card key={reward.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{reward.name}</h3>
                  {reward.is_active ? (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{reward.description}</p>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Points Cost:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{reward.points_cost}</span>
                  </div>
                  {reward.monetary_value && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Value:</span>
                      <span className="font-medium text-gray-900 dark:text-white">${parseFloat(reward.monetary_value).toFixed(2)}</span>
                    </div>
                  )}
                  {reward.tier_required_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tier Required:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{reward.tier_required_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Redemptions:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{reward.redemption_count}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => { setSelectedReward(reward); setShowRewardForm(true) }}>
                  Edit
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Memberships Tab */}
      {activeSubTab === 'memberships' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Points Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lifetime Earned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Enrolled
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {memberships.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No memberships found
                    </td>
                  </tr>
                ) : (
                  memberships.map((membership: any) => (
                    <tr key={membership.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{membership.customer_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">{membership.tier_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{membership.points_balance}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{membership.points_earned_lifetime}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(membership.enrolled_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}


import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

// Import CRM components (will create these)
import CustomerSegmentation from '../components/CRM/CustomerSegmentation'
import RFMAnalysis from '../components/CRM/RFMAnalysis'
import CLVDashboard from '../components/CRM/CLVDashboard'
import CustomerJourney from '../components/CRM/CustomerJourney'
import LoyaltyProgram from '../components/CRM/LoyaltyProgram'
import Customer360 from '../components/CRM/Customer360'

type Tab = 'segmentation' | 'rfm' | 'clv' | 'journey' | 'loyalty' | 'customer360'

export default function CustomerCRM() {
  const [activeTab, setActiveTab] = useState<Tab>('segmentation')

  const tabs = [
    { id: 'segmentation' as Tab, label: 'Segmentation', icon: '📊' },
    { id: 'rfm' as Tab, label: 'RFM Analysis', icon: '🎯' },
    { id: 'clv' as Tab, label: 'Lifetime Value', icon: '💰' },
    { id: 'journey' as Tab, label: 'Journey Map', icon: '🗺️' },
    { id: 'loyalty' as Tab, label: 'Loyalty Program', icon: '⭐' },
    { id: 'customer360' as Tab, label: 'Customer 360', icon: '👤' },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'segmentation':
        return <CustomerSegmentation />
      case 'rfm':
        return <RFMAnalysis />
      case 'clv':
        return <CLVDashboard />
      case 'journey':
        return <CustomerJourney />
      case 'loyalty':
        return <LoyaltyProgram />
      case 'customer360':
        return <Customer360 />
      default:
        return <CustomerSegmentation />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer CRM</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Advanced customer segmentation, analytics, and loyalty management
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
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

        <div className="mt-6">
          {renderTabContent()}
        </div>
      </Card>
    </div>
  )
}



import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import toast from 'react-hot-toast'

interface CustomerSegment {
  id: number
  name: string
  description: string
  segment_type: string
  rfm_recency_min?: number
  rfm_recency_max?: number
  rfm_frequency_min?: number
  rfm_frequency_max?: number
  rfm_monetary_min?: number
  rfm_monetary_max?: number
  behavioral_criteria?: any
  auto_assign: boolean
  is_active: boolean
}

interface SegmentMembership {
  id: number
  customer: number
  customer_name: string
  segment: number
  segment_name: string
  assigned_at: string
}

export default function CustomerSegmentation() {
  const [showForm, setShowForm] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null)
  const [formData, setFormData] = useState<Partial<CustomerSegment>>({
    name: '',
    description: '',
    segment_type: 'custom',
    auto_assign: false,
    is_active: true,
  })

  const queryClient = useQueryClient()

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const response = await api.get('/customers/segments/')
      return response.data.results || response.data
    },
  })

  const { data: memberships = [] } = useQuery({
    queryKey: ['segment-memberships'],
    queryFn: async () => {
      const response = await api.get('/customers/segment-memberships/')
      return response.data.results || response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CustomerSegment>) => {
      const response = await api.post('/customers/segments/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] })
      toast.success('Segment created successfully')
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create segment')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CustomerSegment> }) => {
      const response = await api.patch(`/customers/segments/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] })
      toast.success('Segment updated successfully')
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update segment')
    },
  })

  const assignMutation = useMutation({
    mutationFn: async (segmentId: number) => {
      const response = await api.post(`/customers/segments/${segmentId}/assign_customers/`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['segment-memberships'] })
      toast.success(data.message || 'Customers assigned successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to assign customers')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      segment_type: 'custom',
      auto_assign: false,
      is_active: true,
    })
    setSelectedSegment(null)
  }

  const handleEdit = (segment: CustomerSegment) => {
    setSelectedSegment(segment)
    setFormData(segment)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSegment) {
      updateMutation.mutate({ id: selectedSegment.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleAssign = (segmentId: number) => {
    if (confirm('Assign customers to this segment based on criteria?')) {
      assignMutation.mutate(segmentId)
    }
  }

  const getSegmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rfm: 'RFM Analysis',
      behavioral: 'Behavioral',
      demographic: 'Demographic',
      value: 'Value-Based',
      custom: 'Custom',
    }
    return labels[type] || type
  }

  const getMembershipCount = (segmentId: number) => {
    return memberships.filter((m: SegmentMembership) => m.segment === segmentId).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Segments</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage customer segments for targeted marketing
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          Create Segment
        </Button>
      </div>

      {/* Segments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Loading segments...</div>
        ) : segments.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No segments found. Create your first segment to get started.
          </div>
        ) : (
          segments.map((segment: CustomerSegment) => (
            <Card key={segment.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{segment.name}</h3>
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    {getSegmentTypeLabel(segment.segment_type)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  segment.is_active 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {segment.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {segment.description || 'No description'}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>{getMembershipCount(segment.id)} customers</span>
                {segment.auto_assign && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                    Auto-assign
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(segment)}
                >
                  Edit
                </Button>
                {segment.segment_type === 'rfm' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssign(segment.id)}
                    disabled={assignMutation.isPending}
                  >
                    Assign Customers
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetForm() }}
        title={selectedSegment ? 'Edit Segment' : 'Create Segment'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Segment Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Segment Type
            </label>
            <select
              value={formData.segment_type}
              onChange={(e) => setFormData({ ...formData, segment_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="custom">Custom</option>
              <option value="rfm">RFM Analysis</option>
              <option value="behavioral">Behavioral</option>
              <option value="demographic">Demographic</option>
              <option value="value">Value-Based</option>
            </select>
          </div>

          {formData.segment_type === 'rfm' && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded">
              <h4 className="font-medium text-gray-900 dark:text-white">RFM Criteria</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Recency Min</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rfm_recency_min || ''}
                    onChange={(e) => setFormData({ ...formData, rfm_recency_min: parseInt(e.target.value) || undefined })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Recency Max</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rfm_recency_max || ''}
                    onChange={(e) => setFormData({ ...formData, rfm_recency_max: parseInt(e.target.value) || undefined })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Frequency Min</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rfm_frequency_min || ''}
                    onChange={(e) => setFormData({ ...formData, rfm_frequency_min: parseInt(e.target.value) || undefined })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Frequency Max</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rfm_frequency_max || ''}
                    onChange={(e) => setFormData({ ...formData, rfm_frequency_max: parseInt(e.target.value) || undefined })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monetary Min</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rfm_monetary_min || ''}
                    onChange={(e) => setFormData({ ...formData, rfm_monetary_min: parseInt(e.target.value) || undefined })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monetary Max</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rfm_monetary_max || ''}
                    onChange={(e) => setFormData({ ...formData, rfm_monetary_max: parseInt(e.target.value) || undefined })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.auto_assign}
                onChange={(e) => setFormData({ ...formData, auto_assign: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Auto-assign customers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowForm(false); resetForm() }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {selectedSegment ? 'Update' : 'Create'} Segment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


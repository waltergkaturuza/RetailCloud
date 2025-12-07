/**
 * Advanced Business Category Selector Component
 * Allows tenants to select their business category with AI-powered suggestions
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from './ui/Card'
import Button from './ui/Button'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface BusinessCategory {
  id: number
  code: string
  name: string
  description: string
  icon: string
  module_count: number
  is_active: boolean
}

interface CategoryRecommendation {
  category: BusinessCategory
  relevance_score: number
  matched_keywords: string[]
}

interface BusinessCategorySelectorProps {
  selectedCategoryId?: number | null
  onCategorySelect?: (categoryId: number) => void
  showRecommendations?: boolean
  autoActivateModules?: boolean
  compact?: boolean
}

export default function BusinessCategorySelector({
  selectedCategoryId,
  onCategorySelect,
  showRecommendations = true,
  autoActivateModules = true,
  compact = false,
}: BusinessCategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null)
  const [localSelectedId, setLocalSelectedId] = useState<number | null | undefined>(selectedCategoryId)
  const queryClient = useQueryClient()

  // Fetch all business categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['business-categories'],
    queryFn: async () => {
      const response = await api.get('/business-categories/categories/')
      // Handle paginated response or direct array
      const data = response.data
      if (Array.isArray(data)) {
        return data
      }
      // If paginated, return results array
      if (data && Array.isArray(data.results)) {
        return data.results
      }
      // Fallback to empty array
      return []
    },
  })

  // Fetch current tenant's category
  const { data: currentCategoryData } = useQuery({
    queryKey: ['tenant-category'],
    queryFn: async () => {
      try {
        const response = await api.get('/business-categories/tenant/category/')
        return response.data
      } catch {
        return null
      }
    },
  })

  // AI-powered category suggestions
  const { data: suggestions, refetch: refetchSuggestions } = useQuery({
    queryKey: ['category-suggestions', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { suggestions: [] }
      const response = await api.post('/business-categories/categories/suggest/', {
        keywords: searchQuery,
        description: searchQuery,
      })
      return response.data
    },
    enabled: showSuggestions && searchQuery.length > 2,
  })

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { business_category_id: number; auto_activate_modules: boolean; custom_category_name?: string }) => {
      try {
        const response = await api.post('/business-categories/tenant/category/', data)
        return response
      } catch (error: any) {
        // Only throw if it's a real error, not a validation error
        if (error.response?.status >= 500) {
          throw error
        }
        // For client errors (400-499), return the error response
        throw error
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-category'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-modules'] })
      
      // Show a single consolidated message
      const modulesActivated = response.data?.modules_activated
      let message = response.data?.message || 'Business category updated successfully!'
      
      // Enhance message with module details if available
      if (modulesActivated && modulesActivated.activated && modulesActivated.activated.length > 0) {
        const moduleNames = modulesActivated.activated
          .map((m: any) => m.module_name || m.module_code)
          .slice(0, 3) // Show max 3 module names
          .join(', ')
        const moreCount = modulesActivated.activated.length > 3 
          ? ` and ${modulesActivated.activated.length - 3} more` 
          : ''
        message += ` ${modulesActivated.activated.length} module(s) activated${moduleNames ? `: ${moduleNames}${moreCount}` : ''}.`
      }
      
      // Show single success toast
      toast.success(message, { duration: 4000 })
      
      if (onCategorySelect) {
        onCategorySelect(response.data?.category?.id)
      }
      
      // Force refetch modules after a short delay to ensure they're saved
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['tenant-modules'] })
        queryClient.refetchQueries({ queryKey: ['tenant-modules'] })
      }, 1000)
    },
    onError: (error: any) => {
      // Only show error if it's not a duplicate of a success message
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to update business category'
      
      // Check if error contains validation errors
      if (error.response?.data && typeof error.response.data === 'object') {
        const errors = error.response.data
        if (errors.non_field_errors) {
          toast.error(Array.isArray(errors.non_field_errors) ? errors.non_field_errors[0] : errors.non_field_errors)
          return
        }
        // If it's a field validation error, show the first one
        const firstError = Object.values(errors)[0]
        if (Array.isArray(firstError) && firstError.length > 0) {
          toast.error(firstError[0] as string)
          return
        }
      }
      
      toast.error(errorMsg)
    },
  })

  // Set selected category from current tenant data
  useEffect(() => {
    if (currentCategoryData?.category) {
      setSelectedCategory(currentCategoryData.category)
    } else if (selectedCategoryId && Array.isArray(categories) && categories.length > 0) {
      const category = categories.find((c: BusinessCategory) => c.id === selectedCategoryId)
      if (category) setSelectedCategory(category)
    }
  }, [currentCategoryData, selectedCategoryId, categories])

  // Ensure categories is always an array
  const categoriesArray = Array.isArray(categories) ? categories : []
  const filteredCategories = categoriesArray.filter((cat: BusinessCategory) =>
    cat?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat?.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCategorySelect = (category: BusinessCategory) => {
    // Prevent double-clicks or rapid selections
    if (updateCategoryMutation.isPending) {
      return
    }
    
    setSelectedCategory(category)
    setSearchQuery('')
    setShowSuggestions(false)

    // Update tenant's category
    updateCategoryMutation.mutate({
      business_category_id: category.id,
      auto_activate_modules: autoActivateModules,
      custom_category_name: category.code === 'other' ? '' : undefined,
    })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(value.length > 2)
  }

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search business category..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          className="input"
          style={{ width: '100%' }}
        />
        {showSuggestions && (
          <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
            {suggestions?.suggestions?.map((rec: CategoryRecommendation) => (
              <div
                key={rec.category.id}
                onClick={() => handleCategorySelect(rec.category)}
                style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{rec.category.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{rec.category.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{rec.category.description}</div>
                  </div>
                  {rec.relevance_score > 0 && (
                    <span style={{ fontSize: '12px', color: '#27ae60' }}>
                      {Math.round((rec.relevance_score / 5) * 100)}% match
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card title="Select Your Business Category">
      {/* AI Search */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          <span style={{ marginRight: '8px' }}>🤖</span>
          Don't know your category? Tell us what you sell
        </label>
        <input
          type="text"
          placeholder="e.g., I sell hair products, groceries, electronics..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="input"
          style={{ width: '100%', padding: '12px', fontSize: '14px' }}
        />
        {showSuggestions && suggestions?.suggestions?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '12px',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
            }}
          >
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', fontWeight: '500' }}>
              💡 AI Suggestions (Top matches):
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {suggestions.suggestions.slice(0, 3).map((rec: CategoryRecommendation) => (
                <motion.div
                  key={rec.category.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleCategorySelect(rec.category)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid #e9ecef',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{rec.category.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{rec.category.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{rec.category.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#27ae60' }}>
                        {Math.round((rec.relevance_score / 5) * 100)}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>match</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Current Selection */}
      {selectedCategory && (
        <div
          style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            marginBottom: '24px',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>{selectedCategory.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                {selectedCategory.name}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>{selectedCategory.description}</div>
              {selectedCategory.module_count > 0 && (
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                  {selectedCategory.module_count} recommended module(s)
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setSelectedCategory(null)
                setSearchQuery('')
              }}
              variant="outline"
              style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              Change
            </Button>
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ marginBottom: '16px', fontWeight: '500', color: '#555' }}>
          Or browse all categories:
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            maxHeight: compact ? '300px' : '600px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          <AnimatePresence>
            {(searchQuery ? filteredCategories : (Array.isArray(categories) ? categories : [])).map((category: BusinessCategory) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.02, y: -2 }}
                onClick={() => handleCategorySelect(category)}
                style={{
                  padding: '20px',
                  background: selectedCategory?.id === category.id ? '#667eea' : 'white',
                  border: `2px solid ${selectedCategory?.id === category.id ? '#667eea' : '#e9ecef'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: selectedCategory?.id === category.id ? 'white' : '#333',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '4px' }}>{category.icon}</div>
                  <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                    {category.name}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      opacity: selectedCategory?.id === category.id ? 0.9 : 0.7,
                      lineHeight: '1.4',
                      marginBottom: '8px',
                    }}
                  >
                    {category.description}
                  </div>
                  {category.module_count > 0 && (
                    <div
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: selectedCategory?.id === category.id
                          ? 'rgba(255,255,255,0.2)'
                          : '#f0f0f0',
                        borderRadius: '4px',
                        display: 'inline-block',
                        width: 'fit-content',
                      }}
                    >
                      {category.module_count} module{category.module_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {updateCategoryMutation.isPending && (
        <div style={{ marginTop: '16px', textAlign: 'center', color: '#666' }}>
          Updating category and activating modules...
        </div>
      )}
    </Card>
  )
}


/**
 * Serial Pattern Management Component
 * CRUD interface for managing serial number patterns with testing
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface SerialPattern {
  id: number
  name: string
  pattern_type: string
  pattern_config: any
  description: string
  is_active: boolean
  product?: number
  product_name?: string
}

export default function SerialPatternManagement() {
  const [showForm, setShowForm] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<SerialPattern | null>(null)
  const [testPattern, setTestPattern] = useState<SerialPattern | null>(null)
  const queryClient = useQueryClient()

  // Fetch patterns
  const { data: patterns = [], isLoading } = useQuery({
    queryKey: ['serial-patterns'],
    queryFn: async () => {
      const response = await api.get('/inventory/bulk/serial-patterns/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-patterns'],
    queryFn: async () => {
      const response = await api.get('/inventory/products/', { params: { limit: 100 } })
      return response.data?.results || response.data || []
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/inventory/bulk/serial-patterns/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serial-patterns'] })
      toast.success('Pattern deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete pattern')
    },
  })

  const patternTypes = [
    { value: 'prefix_suffix', label: 'Prefix + Suffix with Range' },
    { value: 'regex', label: 'Regular Expression' },
    { value: 'sequential', label: 'Sequential Numbers' },
    { value: 'alphanumeric', label: 'Alphanumeric Pattern' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🔢 Serial Number Patterns</h2>
          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Define patterns for intelligent serial number recognition and generation
          </p>
        </div>
        <Button onClick={() => { setSelectedPattern(null); setShowForm(true) }}>
          ➕ Add Pattern
        </Button>
      </div>

      {/* Patterns List */}
      {isLoading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading patterns...</div>
        </Card>
      ) : patterns.length === 0 ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔢</div>
            <div>No patterns configured</div>
            <Button onClick={() => { setSelectedPattern(null); setShowForm(true) }} style={{ marginTop: '16px' }}>
              Create First Pattern
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Pattern Config</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patterns.map((pattern: SerialPattern) => (
                  <tr key={pattern.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{pattern.name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: '#e3f2fd',
                        color: '#1976d2'
                      }}>
                        {patternTypes.find(t => t.value === pattern.pattern_type)?.label || pattern.pattern_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
                      {pattern.pattern_type === 'prefix_suffix' ? (
                        <span>
                          {pattern.pattern_config.prefix || ''}
                          <span style={{ color: '#666' }}>[{pattern.pattern_config.padding || 0} digits]</span>
                          {pattern.pattern_config.suffix || ''}
                        </span>
                      ) : pattern.pattern_type === 'regex' ? (
                        <span style={{ color: '#1976d2' }}>{pattern.pattern_config.regex || ''}</span>
                      ) : (
                        <span style={{ color: '#666' }}>{JSON.stringify(pattern.pattern_config).substring(0, 50)}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {pattern.product_name || 'All Products'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: pattern.is_active ? '#d4edda' : '#f8d7da',
                        color: pattern.is_active ? '#155724' : '#721c24'
                      }}>
                        {pattern.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => { setSelectedPattern(pattern); setShowForm(true) }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setTestPattern(pattern)}
                        >
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete pattern "${pattern.name}"?`)) {
                              deleteMutation.mutate(pattern.id)
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pattern Form Modal */}
      {showForm && (
        <PatternForm
          pattern={selectedPattern}
          products={products}
          patternTypes={patternTypes}
          onClose={() => { setShowForm(false); setSelectedPattern(null) }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedPattern(null)
            queryClient.invalidateQueries({ queryKey: ['serial-patterns'] })
          }}
        />
      )}

      {/* Pattern Testing Modal */}
      {testPattern && (
        <PatternTestModal
          pattern={testPattern}
          onClose={() => setTestPattern(null)}
        />
      )}
    </div>
  )
}

interface PatternFormProps {
  pattern: SerialPattern | null
  products: any[]
  patternTypes: { value: string; label: string }[]
  onClose: () => void
  onSuccess: () => void
}

function PatternForm({ pattern, products, patternTypes, onClose, onSuccess }: PatternFormProps) {
  const [formData, setFormData] = useState({
    name: pattern?.name || '',
    pattern_type: pattern?.pattern_type || 'prefix_suffix',
    pattern_config: pattern?.pattern_config || { prefix: '', suffix: '', padding: 4, start: 1, end: 1000 },
    description: pattern?.description || '',
    is_active: pattern?.is_active ?? true,
    product: pattern?.product || null,
  })

  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (pattern) {
        return api.patch(`/inventory/bulk/serial-patterns/${pattern.id}/`, data)
      } else {
        return api.post('/inventory/bulk/serial-patterns/', data)
      }
    },
    onSuccess: () => {
      toast.success(pattern ? 'Pattern updated successfully' : 'Pattern created successfully')
      queryClient.invalidateQueries({ queryKey: ['serial-patterns'] })
      onSuccess()
    },
    onError: (error: any) => {
      const errorDetail = error.response?.data
      if (errorDetail?.pattern_config) {
        toast.error(`Pattern config error: ${JSON.stringify(errorDetail.pattern_config)}`)
      } else {
        toast.error(errorDetail?.detail || `Failed to ${pattern ? 'update' : 'create'} pattern`)
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      product: formData.product || null,
    }
    saveMutation.mutate(submitData)
  }

  const updateConfig = (key: string, value: any) => {
    setFormData({
      ...formData,
      pattern_config: {
        ...formData.pattern_config,
        [key]: value
      }
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <Card
        style={{
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>{pattern ? 'Edit Pattern' : 'Create Pattern'}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Name <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Serial Pattern"
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Pattern Type <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <select
                  value={formData.pattern_type}
                  onChange={(e) => {
                    const newType = e.target.value
                    let newConfig: any = {}
                    if (newType === 'prefix_suffix') {
                      newConfig = { prefix: 'SN-', suffix: '', padding: 4, start: 1, end: 10000 }
                    } else if (newType === 'regex') {
                      newConfig = { regex: '^SN-[0-9]{4}$' }
                    }
                    setFormData({ ...formData, pattern_type: newType, pattern_config: newConfig })
                  }}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  {patternTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Pattern Config Fields */}
              {formData.pattern_type === 'prefix_suffix' && (
                <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '16px' }}>Prefix/Suffix Configuration</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Prefix <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.pattern_config.prefix || ''}
                        onChange={(e) => updateConfig('prefix', e.target.value)}
                        placeholder="e.g., SN-"
                        required
                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Suffix (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.pattern_config.suffix || ''}
                        onChange={(e) => updateConfig('suffix', e.target.value)}
                        placeholder="e.g., -A"
                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Number Padding
                      </label>
                      <input
                        type="number"
                        value={formData.pattern_config.padding || 0}
                        onChange={(e) => updateConfig('padding', parseInt(e.target.value) || 0)}
                        placeholder="e.g., 4 (for 0001, 0002, ...)"
                        min="0"
                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                        Example: Padding 4 → SN-0001, SN-0002, ...
                      </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                          Start Range
                        </label>
                        <input
                          type="number"
                          value={formData.pattern_config.start || 1}
                          onChange={(e) => updateConfig('start', parseInt(e.target.value) || 1)}
                          min="0"
                          style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                          End Range
                        </label>
                        <input
                          type="number"
                          value={formData.pattern_config.end || 10000}
                          onChange={(e) => updateConfig('end', parseInt(e.target.value) || 10000)}
                          min="1"
                          style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.pattern_type === 'regex' && (
                <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '16px' }}>Regular Expression</h4>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Regex Pattern <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pattern_config.regex || ''}
                      onChange={(e) => updateConfig('regex', e.target.value)}
                      placeholder="e.g., ^SN-[0-9]{4}$"
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'monospace' }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                      Example: ^SN-[0-9]{4}$ matches SN-1000, SN-1234, etc.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Product (Optional - leave blank for all products)
                </label>
                <select
                  value={formData.product || ''}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value ? parseInt(e.target.value) : null })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">All Products</option>
                  {products.map((product: any) => (
                    <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Pattern description..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saveMutation.isPending}>
                {pattern ? 'Update' : 'Create'} Pattern
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

interface PatternTestModalProps {
  pattern: SerialPattern
  onClose: () => void
}

function PatternTestModal({ pattern, onClose }: PatternTestModalProps) {
  const [testInput, setTestInput] = useState('')
  const [testResults, setTestResults] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    if (!testInput.trim()) {
      toast.error('Please enter test input')
      return
    }

    setIsTesting(true)
    try {
      const response = await api.post('/inventory/bulk/extract_serials/', {
        input_text: testInput,
        product_id: pattern.product || null,
      })
      setTestResults(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Test failed')
      setTestResults(null)
    } finally {
      setIsTesting(false)
    }
  }

  const handleGenerateRange = async () => {
    if (pattern.pattern_type !== 'prefix_suffix' || !pattern.pattern_config.start || !pattern.pattern_config.end) {
      toast.error('Range generation only works with prefix_suffix patterns')
      return
    }

    setIsTesting(true)
    try {
      const response = await api.post('/inventory/bulk/generate_serials_from_pattern/', {
        pattern_id: pattern.id,
        start: pattern.pattern_config.start,
        end: pattern.pattern_config.end,
        step: 1,
      })
      setTestResults({
        extracted_serials: response.data.serials,
        statistics: {
          total_extracted: response.data.count,
          pattern_matched_count: response.data.count,
        },
      })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Generation failed')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <Card
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: 0 }}>🧪 Test Pattern: {pattern.name}</h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666' }}>
                Test serial number extraction with this pattern
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Test Input
            </label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter serial numbers to test (e.g., SN-1000, SN-1001, SN-1002 to SN-1010)"
              rows={4}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button onClick={handleTest} isLoading={isTesting}>
                🔍 Test Extraction
              </Button>
              {pattern.pattern_type === 'prefix_suffix' && (
                <Button onClick={handleGenerateRange} variant="secondary" isLoading={isTesting}>
                  🔢 Generate Range
                </Button>
              )}
            </div>
          </div>

          {testResults && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '16px' }}>Results</h4>
              
              {/* Statistics */}
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <strong>Total Extracted:</strong> {testResults.statistics?.total_extracted || 0}
                  </div>
                  <div>
                    <strong>High Confidence:</strong> {testResults.statistics?.high_confidence_count || 0}
                  </div>
                  <div>
                    <strong>Avg Confidence:</strong> {(testResults.statistics?.average_confidence || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Extracted Serials */}
              {testResults.extracted_serials && testResults.extracted_serials.length > 0 && (
                <div>
                  <h5 style={{ marginBottom: '12px' }}>Extracted Serials ({testResults.extracted_serials.length}):</h5>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '12px',
                    background: 'white',
                  }}>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {testResults.extracted_serials.slice(0, 100).map((serial: string, index: number) => (
                        <div key={index} style={{
                          padding: '8px',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                        }}>
                          {serial}
                        </div>
                      ))}
                      {testResults.extracted_serials.length > 100 && (
                        <div style={{ padding: '8px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                          ... and {testResults.extracted_serials.length - 100} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {testResults.suggestions && testResults.suggestions.length > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '6px' }}>
                  <strong>💡 Suggestions:</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                    {testResults.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} style={{ fontSize: '13px' }}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}



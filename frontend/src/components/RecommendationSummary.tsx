import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import Card from './ui/Card'
import Button from './ui/Button'
import { useState } from 'react'

interface Recommendation {
  type: string
  title: string
  description: string
  priority: number // 1-5 (5 = critical)
  impact_score: number
  action: string
  action_url: string
  category: string
  [key: string]: any
}

interface RecommendationSummaryProps {
  maxDisplay?: number
  showSummary?: boolean
  collapsed?: boolean
}

export default function RecommendationSummary({ 
  maxDisplay = 5, 
  showSummary = true,
  collapsed: initialCollapsed = false 
}: RecommendationSummaryProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const response = await api.get('/reports/recommendations/')
      return response.data
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <Card className="mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div className="spinner" style={{ borderTopColor: 'white' }} />
          <p style={{ marginTop: '10px', opacity: 0.9 }}>Loading recommendations...</p>
        </div>
      </Card>
    )
  }

  if (error || !data) {
    return null // Don't show error state for recommendations
  }

  const recommendations: Recommendation[] = data.recommendations || []
  const summary = data.summary || {}
  const topRecommendations = recommendations.slice(0, maxDisplay)

  if (topRecommendations.length === 0) {
    return (
      <Card className="mb-4" style={{ 
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        border: 'none'
      }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
          <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '20px', fontWeight: '600' }}>
            All Good!
          </h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            No critical recommendations at this time. Keep up the great work!
          </p>
        </div>
      </Card>
    )
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return '#e74c3c' // Critical - Red
      case 4: return '#f39c12' // High - Orange
      case 3: return '#3498db' // Medium - Blue
      case 2: return '#95a5a6' // Low - Gray
      default: return '#7f8c8d'
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5: return 'Critical'
      case 4: return 'High Priority'
      case 3: return 'Medium Priority'
      case 2: return 'Low Priority'
      default: return 'Info'
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      inventory: '📦',
      sales: '💰',
      products: '🛍️',
      pricing: '💵',
      branch: '🏢',
      customers: '👥',
      financial: '📊'
    }
    return icons[category] || '💡'
  }

  return (
    <div className="mb-4">
      {/* Summary Card - Always Visible */}
      {showSummary && (
        <Card 
          className="mb-3" 
          style={{ 
            background: summary.critical_count > 0 
              ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
              : summary.high_priority_count > 0
              ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '32px' }}>🎯</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                      Business Recommendations
                    </h3>
                    <p style={{ margin: 0, opacity: 0.9, fontSize: '13px', marginTop: '4px' }}>
                      {summary.key_insights?.join(' • ') || 'Actionable insights for your business'}
                    </p>
                  </div>
                </div>
                
                {!collapsed && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '16px',
                    marginTop: '16px',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}>
                    {summary.critical_count > 0 && (
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: '700' }}>{summary.critical_count}</div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>Critical</div>
                      </div>
                    )}
                    {summary.high_priority_count > 0 && (
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: '700' }}>{summary.high_priority_count}</div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>High Priority</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700' }}>{summary.total_recommendations || 0}</div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Total</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ 
                fontSize: '24px',
                opacity: 0.8,
                transition: 'transform 0.2s',
                transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)'
              }}>
                {collapsed ? '▼' : '▲'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations List - Compact Grid Layout (Responsive) */}
      {!collapsed && (
        <div className="recommendations-grid" style={{ gap: '12px' }}>
          {topRecommendations.map((rec, index) => (
            <Card
              key={index}
              style={{
                borderLeft: `3px solid ${getPriorityColor(rec.priority)}`,
                transition: 'all 0.2s',
                boxShadow: rec.priority >= 4 ? '0 1px 4px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                padding: '10px'
              }}
            >
              <div style={{ padding: '0' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  {/* Icon */}
                  <div style={{ 
                    fontSize: '18px',
                    flexShrink: 0,
                    opacity: 0.9
                  }}>
                    {getCategoryIcon(rec.category)}
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '12px', 
                        fontWeight: '600',
                        color: '#2c3e50',
                        lineHeight: '1.3'
                      }}>
                        {rec.title}
                      </h4>
                      <span style={{
                        padding: '1px 4px',
                        borderRadius: '6px',
                        fontSize: '7px',
                        fontWeight: '600',
                        background: getPriorityColor(rec.priority),
                        color: 'white',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.2'
                      }}>
                        {getPriorityLabel(rec.priority)}
                      </span>
                    </div>
                    
                    <p style={{ 
                      margin: 0,
                      marginBottom: '6px',
                      color: '#7f8c8d',
                      fontSize: '10px',
                      lineHeight: '1.4'
                    }}>
                      {rec.description}
                    </p>
                    
                    {/* Action Button */}
                    {rec.action_url && (
                      <Button
                        size="sm"
                        variant={rec.priority >= 4 ? 'primary' : 'secondary'}
                        onClick={() => {
                          navigate(rec.action_url)
                        }}
                        style={{
                          marginTop: '4px',
                          fontSize: '10px',
                          padding: '3px 8px',
                          height: 'auto'
                        }}
                      >
                        {rec.action === 'restock' && '📦 Restock'}
                        {rec.action === 'review_stock' && '📊 Review'}
                        {rec.action === 'review_pricing' && '💵 Review'}
                        {rec.action === 'create_promotion' && '🎉 Promote'}
                        {rec.action === 'view_details' && '👁️ Details'}
                        {rec.action === 'view_products' && '🛍️ Products'}
                        {rec.action === 'view_customers' && '👥 Customers'}
                        {rec.action === 'view_comparison' && '📈 Compare'}
                        {rec.action === 'check_system' && '🔧 Check'}
                        {rec.action === 'review_costs' && '💰 Review'}
                        {rec.action === 'add_products' && '➕ Add'}
                        {rec.action === 'view_settings' && '⚙️ Settings'}
                        {rec.action === 'create_loyalty_program' && '🎁 Loyalty'}
                        {!rec.action.match(/restock|review|create|view|check|add/) && 'Action'}
                      </Button>
                    )}
                    
                    {/* Additional Info - Compact */}
                    {(rec.count !== undefined || rec.change_percentage || (rec.products && Array.isArray(rec.products) && rec.products.length > 0)) && (
                      <div style={{ 
                        marginTop: '5px',
                        fontSize: '9px',
                        color: '#7f8c8d',
                        lineHeight: '1.3'
                      }}>
                        {rec.count !== undefined && (
                          <span><strong>{rec.count}</strong> items</span>
                        )}
                        {rec.count !== undefined && rec.change_percentage !== undefined && ' • '}
                        {rec.change_percentage !== undefined && (
                          <span>Change: <strong>{rec.change_percentage.toFixed(1)}%</strong></span>
                        )}
                        {rec.products && Array.isArray(rec.products) && rec.products.length > 0 && (
                          <div style={{ marginTop: '2px', fontSize: '8px', opacity: 0.8, lineHeight: '1.2' }}>
                            {rec.products.slice(0, 2).map((p: any) => typeof p === 'object' ? (p.name || p.product_name || p) : p).join(', ')}
                            {rec.products.length > 2 && ` +${rec.products.length - 2}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {/* View All Button */}
          {recommendations.length > maxDisplay && (
            <Card style={{ textAlign: 'center', padding: '10px', gridColumn: 'span 4' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigate('/reports')
                }}
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                View All {recommendations.length} Recommendations →
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}


/**
 * Enhanced Module Detail Card Component
 * Shows comprehensive module information with features, benefits, and use cases
 */
import { useState } from 'react'
import Card from './ui/Card'

interface Module {
  id: number
  name: string
  code: string
  description?: string
  detailed_description?: string
  category: 'core' | 'advanced' | 'specialized' | 'bonus'
  icon?: string
  features?: string[]
  benefits?: string[]
  use_cases?: string[]
  target_business_types?: string[]
  highlight_color?: string
  is_featured?: boolean
  video_demo_url?: string
  documentation_url?: string
}

interface Props {
  module: Module
  isSelected?: boolean
  isEnabled?: boolean
  onToggle?: (moduleCode: string) => void
  showActions?: boolean
}

export default function ModuleDetailCard({ 
  module, 
  isSelected = false, 
  isEnabled = false,
  onToggle,
  showActions = true 
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const categoryColors: Record<string, { bg: string; text: string }> = {
    core: { bg: '#667eea', text: 'white' },
    advanced: { bg: '#16a085', text: 'white' },
    specialized: { bg: '#f39c12', text: 'white' },
    bonus: { bg: '#e91e63', text: 'white' },
  }

  const categoryColor = categoryColors[module.category] || { bg: '#95a5a6', text: 'white' }
  const highlightColor = module.highlight_color || categoryColor.bg

  return (
    <Card
      style={{
        border: isSelected ? `2px solid ${highlightColor}` : '1px solid #e9ecef',
        position: 'relative',
        background: isSelected ? `${highlightColor}08` : 'white',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Featured Badge */}
      {module.is_featured && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 10px',
            background: highlightColor,
            color: 'white',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
          }}
        >
          ⭐ Featured
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '16px',
          cursor: showActions ? 'pointer' : 'default',
        }}
        onClick={() => showActions && setExpanded(!expanded)}
      >
        {/* Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: `${highlightColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            flexShrink: 0,
          }}
        >
          {module.icon || '📦'}
        </div>

        {/* Title and Category */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
              {module.name}
            </h3>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                background: categoryColor.bg,
                color: categoryColor.text,
                textTransform: 'uppercase',
              }}
            >
              {module.category}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
            {module.description || module.detailed_description?.substring(0, 100) + '...' || 'No description available'}
          </p>
        </div>
      </div>

      {/* Status Badges */}
      {showActions && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {isEnabled && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                background: '#27ae60',
                color: 'white',
              }}
            >
              ✓ Enabled
            </span>
          )}
          {isSelected && !isEnabled && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                background: highlightColor,
                color: 'white',
              }}
            >
              Selected
            </span>
          )}
        </div>
      )}

      {/* Expandable Detailed Content */}
      {expanded && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e9ecef' }}>
          {/* Detailed Description */}
          {module.detailed_description && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                Overview
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
                {module.detailed_description}
              </p>
            </div>
          )}

          {/* Key Features */}
          {module.features && module.features.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                Key Features
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {module.features.map((feature, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: highlightColor, fontSize: '14px', marginTop: '2px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {module.benefits && module.benefits.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                Benefits
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {module.benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px',
                      background: '#e8f5e9',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#27ae60', fontSize: '14px', marginTop: '2px' }}>💡</span>
                    <span style={{ fontSize: '13px', color: '#2c3e50', lineHeight: '1.5', fontWeight: '500' }}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Use Cases */}
          {module.use_cases && module.use_cases.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                Use Cases
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {module.use_cases.map((useCase, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px',
                      background: '#e3f2fd',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#3498db', fontSize: '14px', marginTop: '2px' }}>📌</span>
                    <span style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>{useCase}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Business Types */}
          {module.target_business_types && module.target_business_types.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                Ideal For
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {module.target_business_types.map((type, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      background: '#fff3cd',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#856404',
                      fontWeight: '500',
                    }}
                  >
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e9ecef' }}>
            {module.video_demo_url && (
              <a
                href={module.video_demo_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  background: highlightColor,
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ▶️ Watch Demo
              </a>
            )}
            {module.documentation_url && (
              <a
                href={module.documentation_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  background: '#f0f0f0',
                  color: '#333',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📖 Documentation
              </a>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && !isEnabled && (
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onToggle) onToggle(module.code)
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: isSelected ? highlightColor : '#f0f0f0',
              color: isSelected ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
          >
            {isSelected ? '✓ Selected' : 'Select Module'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            style={{
              padding: '10px 16px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {expanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      )}
    </Card>
  )
}


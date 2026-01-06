import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large' | 'full'
}

export default function Modal({ isOpen, onClose, title, children, className = '', size = 'md' }: ModalProps) {
  if (!isOpen) return null

  // Normalize size prop (support both old and new naming)
  const normalizedSize = size === 'small' || size === 'sm' ? 'sm' :
                         size === 'medium' || size === 'md' ? 'md' :
                         size === 'large' || size === 'lg' ? 'lg' :
                         size === 'full' || size === 'xl' ? 'xl' : 'md'

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${sizeClasses[normalizedSize]} ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button className="modal-close" onClick={onClose} aria-label="Close modal">
              ×
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

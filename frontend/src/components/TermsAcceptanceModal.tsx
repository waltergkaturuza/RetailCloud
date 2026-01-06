/**
 * Terms and Conditions Acceptance Modal
 * Shown to first-time users who haven't accepted Terms and Privacy Policy
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Button from './ui/Button'
import LegalDocumentModal from './LegalDocumentModal'
import './TermsAcceptanceModal.css'

interface TermsAcceptanceModalProps {
  isOpen: boolean
  onAccept: () => void
}

export default function TermsAcceptanceModal({ isOpen, onAccept }: TermsAcceptanceModalProps) {
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const queryClient = useQueryClient()

  const acceptMutation = useMutation({
    mutationFn: async (data: { accept_terms: boolean; accept_privacy: boolean }) => {
      return api.post('/accounts/agreement/', {
        accept_terms: data.accept_terms,
        accept_privacy: data.accept_privacy,
        terms_version: 'December 2024',
        privacy_version: 'December 2024',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agreement'] })
      onAccept()
    },
    onError: (error: any) => {
      setErrors(error.response?.data || { error: 'Failed to accept agreements' })
    },
  })

  const handleAccept = () => {
    if (!acceptTerms || !acceptPrivacy) {
      setErrors({ general: 'You must accept both Terms and Conditions and Privacy Policy to continue.' })
      return
    }

    setErrors({})
    acceptMutation.mutate({
      accept_terms: acceptTerms,
      accept_privacy: acceptPrivacy,
    })
  }

  const handleCheckboxChange = (type: 'terms' | 'privacy', checked: boolean) => {
    setErrors({})
    if (type === 'terms') {
      setAcceptTerms(checked)
    } else {
      setAcceptPrivacy(checked)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
    >
      <div
        className="terms-acceptance-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: 0,
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #e9ecef' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
            Terms and Conditions & Privacy Policy
          </h2>
        </div>
        
        <div className="terms-acceptance-content" style={{ padding: '24px' }}>
          <div className="terms-acceptance-header">
            <h2>Welcome to RetailCloud</h2>
            <p>Before you can continue, please review and accept our Terms and Conditions and Privacy Policy.</p>
          </div>

          {errors.general && (
            <div className="terms-error" role="alert">
              {errors.general}
            </div>
          )}

          <div className="terms-checkboxes">
            <label className="terms-checkbox-label">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => handleCheckboxChange('terms', e.target.checked)}
                className="terms-checkbox-input"
                required
              />
              <span className="terms-checkbox-text">
                I have read and accept the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowTermsModal(true)
                  }}
                  className="terms-link-button"
                >
                  Terms and Conditions
                </button>
                {' '}*
              </span>
            </label>

            <label className="terms-checkbox-label">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => handleCheckboxChange('privacy', e.target.checked)}
                className="terms-checkbox-input"
                required
              />
              <span className="terms-checkbox-text">
                I have read and accept the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowPrivacyModal(true)
                  }}
                  className="terms-link-button"
                >
                  Privacy Policy
                </button>
                {' '}*
              </span>
            </label>
          </div>

          <div className="terms-note">
            <p>
              <strong>Note:</strong> You can review these documents at any time from the footer on any page.
            </p>
          </div>

          <div className="terms-actions">
            <Button
              variant="primary"
              onClick={handleAccept}
              disabled={!acceptTerms || !acceptPrivacy || acceptMutation.isPending}
              style={{ minWidth: '150px' }}
            >
              {acceptMutation.isPending ? 'Processing...' : 'Accept and Continue'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Legal Document Modals */}
      <LegalDocumentModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        documentType="terms"
      />
      <LegalDocumentModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        documentType="privacy"
      />
    </div>
  )
}

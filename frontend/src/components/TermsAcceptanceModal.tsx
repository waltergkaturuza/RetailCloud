/**
 * Terms and Conditions Acceptance Modal
 * Shown to first-time users who haven't accepted Terms and Privacy Policy
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Modal from './ui/Modal'
import Button from './ui/Button'
import './TermsAcceptanceModal.css'

interface TermsAcceptanceModalProps {
  isOpen: boolean
  onAccept: () => void
}

export default function TermsAcceptanceModal({ isOpen, onAccept }: TermsAcceptanceModalProps) {
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing without acceptance - users must accept
      title="Terms and Conditions & Privacy Policy"
      className="terms-acceptance-modal"
    >
      <div className="terms-acceptance-content">
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
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="terms-link">
                Terms and Conditions
              </a>
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
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="terms-link">
                Privacy Policy
              </a>
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
    </Modal>
  )
}


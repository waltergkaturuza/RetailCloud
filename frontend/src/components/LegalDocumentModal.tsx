/**
 * Legal Document Modal - Shows Terms or Privacy Policy in a modal overlay
 */
import { useEffect } from 'react'
import Modal from './ui/Modal'
import './LegalDocumentModal.css'

interface LegalDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documentType: 'terms' | 'privacy'
}

export default function LegalDocumentModal({ isOpen, onClose, documentType }: LegalDocumentModalProps) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const title = documentType === 'terms' 
    ? 'Terms and Conditions' 
    : 'Privacy Policy'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="large"
      className="legal-document-modal"
    >
      <div className="legal-document-content">
        {documentType === 'terms' ? (
          <div className="legal-content">
            <h1>Terms and Conditions</h1>
            <p><strong>Last Updated: December 2024</strong></p>
            
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using RetailCloud ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2>2. Use License</h2>
              <p>
                Permission is granted to temporarily use RetailCloud for personal and commercial purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul>
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained in RetailCloud</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2>3. User Account</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2>4. Payment Terms</h2>
              <p>
                Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law.
              </p>
            </section>

            <section>
              <h2>5. Limitation of Liability</h2>
              <p>
                In no event shall RetailCloud or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use RetailCloud.
              </p>
            </section>

            <section>
              <h2>6. Revisions</h2>
              <p>
                RetailCloud may revise these terms of service at any time without notice. By using this Service you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>
          </div>
        ) : (
          <div className="legal-content">
            <h1>Privacy Policy</h1>
            <p><strong>Last Updated: December 2024</strong></p>
            
            <section>
              <h2>1. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul>
                <li>Account information (name, email, phone number)</li>
                <li>Business information (company name, address, tax information)</li>
                <li>Transaction data (sales, purchases, inventory)</li>
                <li>Usage data (how you interact with our Service)</li>
              </ul>
            </section>

            <section>
              <h2>2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our Service</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends and usage</li>
              </ul>
            </section>

            <section>
              <h2>3. Information Sharing</h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share your information only:
              </p>
              <ul>
                <li>With your consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist us in operating our Service</li>
              </ul>
            </section>

            <section>
              <h2>4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2>5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h2>6. Cookies</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2>7. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </p>
            </section>
          </div>
        )}
      </div>
    </Modal>
  )
}


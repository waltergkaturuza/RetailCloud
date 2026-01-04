/**
 * Terms and Conditions Page
 */
import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card'
import './LegalPages.css'

export default function TermsAndConditions() {
  const [lastUpdated] = useState('December 2024')
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    document.title = 'Terms and Conditions - RetailCloud'
  }, [])

  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Terms and Conditions of Service</h1>
        <p className="last-updated">Last Updated: {lastUpdated}</p>

        <div className="important-notice">
          <strong>IMPORTANT:</strong> Please read these Terms and Conditions carefully before using RetailCloud ("Service", "Platform", "System", "we", "us", or "our"). By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access the Service.
        </div>

        <Card>
          <h2>1. Acceptance of Terms</h2>
          <p>By registering for, accessing, or using RetailCloud (the "Service"), you ("User", "Customer", "Tenant", or "you") acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms") and our Privacy Policy, which is incorporated herein by reference. These Terms constitute a legally binding agreement between you and RetailCloud ("Company", "we", "us", or "our").</p>
          <p>If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms, in which case the terms "User", "Customer", "Tenant", or "you" shall refer to such entity.</p>
        </Card>

        <Card>
          <h2>2. Description of Service</h2>
          <p>RetailCloud is a cloud-based retail management software-as-a-service (SaaS) platform that provides:</p>
          <ul>
            <li>Point of Sale (POS) systems</li>
            <li>Inventory management</li>
            <li>Sales and customer relationship management</li>
            <li>Financial reporting and accounting features</li>
            <li>Multi-branch management</li>
            <li>Supplier and purchase management</li>
            <li>Additional features and modules as described in your subscription plan</li>
          </ul>
          <p>We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice, at our sole discretion. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.</p>
        </Card>

        <Card>
          <h2>3. Account Registration and Security</h2>
          <h3>3.1 Registration Requirements</h3>
          <p>To access the Service, you must:</p>
          <ul>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your registration information</li>
            <li>Be at least 18 years old or have legal capacity to enter into contracts in your jurisdiction</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept full responsibility for all activities that occur under your account</li>
          </ul>

          <h3>3.2 Account Security</h3>
          <p>You are solely responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account password and login credentials</li>
            <li>All activities and actions that occur under your account</li>
            <li>Ensuring that all persons who access the Service through your account are aware of and comply with these Terms</li>
            <li>Notifying us immediately of any unauthorized use of your account or any other breach of security</li>
          </ul>
          <p>We are not liable for any loss or damage arising from your failure to comply with this security obligation.</p>
        </Card>

        <Card>
          <h2>4. Subscription Plans and Payment Terms</h2>
          <h3>4.1 Subscription Plans</h3>
          <p>We offer various subscription plans with different features, limitations, and pricing. The specific features, limitations, and pricing for your selected plan are set forth in your subscription agreement or as displayed on our website at the time of purchase.</p>

          <h3>4.2 Payment Terms</h3>
          <ul>
            <li><strong>Billing Cycle:</strong> Subscription fees are billed in advance on a monthly or annual basis, as selected by you.</li>
            <li><strong>Payment Method:</strong> You must provide a valid payment method and authorize us to charge it for all subscription fees.</li>
            <li><strong>Price Changes:</strong> We reserve the right to modify our pricing at any time. Price changes will be communicated to you at least 30 days in advance and will apply to your next billing cycle, unless you cancel your subscription before the change takes effect.</li>
            <li><strong>Currency:</strong> All fees are stated in the currency specified at the time of purchase. You are responsible for any currency conversion fees or charges imposed by your payment provider.</li>
          </ul>

          <h3>4.3 Failed Payments</h3>
          <p>If payment fails or your payment method is declined, we may:</p>
          <ul>
            <li>Suspend or terminate your access to the Service</li>
            <li>Charge applicable late fees or interest</li>
            <li>Engage collection agencies or legal action to recover amounts due</li>
            <li>Charge you for all costs of collection, including reasonable attorneys' fees</li>
          </ul>

          <h3>4.4 Refunds</h3>
          <p>Subscription fees are non-refundable except as required by law or as explicitly stated in your subscription agreement. Refund requests must be made within 14 days of the initial subscription purchase and will be evaluated on a case-by-case basis.</p>
        </Card>

        <Card>
          <h2>5. Limitation of Liability</h2>
          <div className="important-notice">
            <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL RETAILCLOUD, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:</strong></p>
            <ul>
              <li>LOSS OF PROFITS, REVENUE, DATA, OR USE</li>
              <li>BUSINESS INTERRUPTION</li>
              <li>LOSS OF GOODWILL OR REPUTATION</li>
              <li>COST OF PROCUREMENT OF SUBSTITUTE SERVICES</li>
              <li>ANY OTHER PECUNIARY OR NON-PECUNIARY LOSS OR DAMAGE</li>
            </ul>
            <p><strong>ARISING OUT OF OR RELATING TO YOUR USE OF OR INABILITY TO USE THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</strong></p>
          </div>
          <p>Our total liability to you for all claims arising out of or relating to these Terms or the Service shall not exceed the amount you paid to us in the twelve (12) months preceding the event giving rise to the liability, or $100, whichever is greater.</p>
        </Card>

        <Card>
          <h2>6. Indemnification</h2>
          <p>You agree to defend, indemnify, and hold harmless RetailCloud, its officers, directors, employees, agents, licensors, and suppliers from and against any and all claims, damages, obligations, losses, liabilities, costs, debts, and expenses (including but not limited to attorneys' fees) arising from:</p>
          <ul>
            <li>Your use of and access to the Service</li>
            <li>Your violation of any term of these Terms</li>
            <li>Your violation of any third-party right, including but not limited to any copyright, property, or privacy right</li>
            <li>Any claim that Your Data caused damage to a third party</li>
            <li>Your violation of any applicable law or regulation</li>
          </ul>
        </Card>

        <Card>
          <h2>7. Contact Information</h2>
          <div className="contact-info">
            <p>If you have any questions about these Terms and Conditions, please contact us:</p>
            <p><strong>RetailCloud</strong><br />
            Email: legal@retailcloud.com<br />
            Address: [Your Business Address]<br />
            Phone: [Your Phone Number]</p>
          </div>
        </Card>

        <Card>
          <h2>8. Acknowledgment</h2>
          <p>BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS AND CONDITIONS, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT USE THE SERVICE.</p>
        </Card>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />
        <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '0.9em' }}>
          © {currentYear} RetailCloud. All rights reserved.
        </p>
      </div>
    </div>
  )
}


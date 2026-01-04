/**
 * Privacy Policy Page
 */
import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card'
import './LegalPages.css'

export default function PrivacyPolicy() {
  const [lastUpdated] = useState('December 2024')
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    document.title = 'Privacy Policy - RetailCloud'
  }, [])

  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: {lastUpdated}</p>

        <div className="important-notice">
          <strong>IMPORTANT:</strong> This Privacy Policy describes how RetailCloud ("we", "us", or "our") collects, uses, shares, and protects your personal information when you use our Service. Please read this Privacy Policy carefully to understand our practices regarding your personal data and how we will treat it.
        </div>

        <Card>
          <h2>1. Introduction</h2>
          <p>RetailCloud ("Company", "we", "us", or "our") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our retail management software-as-a-service (SaaS) platform (the "Service").</p>
          <p>By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, you should not use our Service.</p>
        </Card>

        <Card>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide to Us</h3>
          <p><strong>Account Information:</strong></p>
          <ul>
            <li>Name, email address, phone number, and contact information</li>
            <li>Company name, business address, and business registration details</li>
            <li>Billing and payment information (processed securely through third-party payment processors)</li>
            <li>User credentials (username, password - stored in encrypted form)</li>
            <li>Profile information and preferences</li>
          </ul>

          <p><strong>Business Data:</strong></p>
          <ul>
            <li>Customer information (names, contact details, purchase history)</li>
            <li>Sales transactions and records</li>
            <li>Inventory data and product information</li>
            <li>Financial records and accounting data</li>
            <li>Supplier information</li>
            <li>Employee data (if applicable)</li>
            <li>Any other data you choose to upload or enter into the Service</li>
          </ul>
        </Card>

        <Card>
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>To provide, maintain, and improve the Service</li>
            <li>To process your registration and manage your account</li>
            <li>To process payments and manage subscriptions</li>
            <li>To provide customer support and respond to inquiries</li>
            <li>To send service-related communications (notifications, updates, alerts)</li>
            <li>To customize and personalize your experience</li>
            <li>To analyze usage patterns and improve Service functionality</li>
            <li>To detect, prevent, and address technical issues and security threats</li>
            <li>To comply with legal obligations and regulatory requirements</li>
          </ul>
        </Card>

        <Card>
          <h2>4. Data Security</h2>
          <div className="info-notice">
            <p><strong>We implement industry-standard security measures to protect your information:</strong></p>
            <ul>
              <li>Encryption of data in transit (SSL/TLS) and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Firewall protection and intrusion detection systems</li>
              <li>Regular data backups and disaster recovery procedures</li>
            </ul>
          </div>
          <p><strong>However, no method of transmission over the internet or electronic storage is 100% secure.</strong> While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.</p>
        </Card>

        <Card>
          <h2>5. Your Privacy Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal information:</p>
          <ul>
            <li><strong>Access:</strong> Request access to your personal information</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal limitations)</li>
            <li><strong>Objection:</strong> Object to processing of your personal information</li>
            <li><strong>Restriction:</strong> Request restriction of processing</li>
            <li><strong>Portability:</strong> Request transfer of your data to another service</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
          </ul>
        </Card>

        <Card>
          <h2>6. Contact Us</h2>
          <div className="contact-info">
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:</p>
            <p><strong>RetailCloud Data Protection Officer</strong><br />
            Email: privacy@retailcloud.com<br />
            Address: [Your Business Address]<br />
            Phone: [Your Phone Number]</p>
            <p>For GDPR-related inquiries from EU/EEA residents:<br />
            Email: gdpr@retailcloud.com</p>
          </div>
        </Card>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />
        <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '0.9em' }}>
          © {currentYear} RetailCloud. All rights reserved.
        </p>
      </div>
    </div>
  )
}


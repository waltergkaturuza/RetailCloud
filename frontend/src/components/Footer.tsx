/**
 * Footer Component - Appears on all pages
 */
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-links">
          <Link to="/terms" className="footer-link">Terms and Conditions</Link>
          <span className="footer-separator">|</span>
          <Link to="/privacy" className="footer-link">Privacy Policy</Link>
        </div>
        <div className="footer-copyright">
          © {currentYear} RetailCloud. All rights reserved.
        </div>
      </div>
    </footer>
  )
}


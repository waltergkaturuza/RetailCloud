import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TwoFactorAuthLogin from '../components/TwoFactorAuthLogin'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFaError, setTwoFaError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTwoFaError('')
    setRequires2FA(false)
    setLoading(true)

    try {
      const result = await login(email, password, tenantSlug || undefined)
      
      // Check if 2FA is required
      if (result && 'requires_2fa' in result && result.requires_2fa) {
        setRequires2FA(true)
        setLoading(false)
        return
      }
      
      // Check if password is expired
      if (result && 'password_expired' in result && result.password_expired) {
        // Redirect to change password page
        navigate('/change-password?expired=true')
        setLoading(false)
        return
      }
      
      // Normal login success
      navigate('/')
    } catch (err: any) {
      // Handle rate limiting and account lockout
      if (err.message?.includes('locked') || err.message?.includes('attempts')) {
        setError(err.message || 'Account temporarily locked. Please try again later.')
      } else {
        setError(err.message || 'Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handle2FAVerify = async (token: string, backupCode?: string) => {
    setTwoFaError('')
    setLoading(true)

    try {
      const result = await login(email, password, tenantSlug || undefined, token || undefined, backupCode)
      
      // Should not require 2FA again if token is correct
      if (result && 'requires_2fa' in result && result.requires_2fa) {
        setTwoFaError('Invalid 2FA code. Please try again.')
        setLoading(false)
        return
      }
      
      // Login success
      navigate('/')
    } catch (err: any) {
      setTwoFaError(err.message || 'Invalid 2FA code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handle2FACancel = () => {
    setRequires2FA(false)
    setPassword('')
    setTwoFaError('')
  }

  // Show 2FA form if required
  if (requires2FA) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <TwoFactorAuthLogin
          onVerify={handle2FAVerify}
          onCancel={handle2FACancel}
          loading={loading}
          error={twoFaError}
        />
      </div>
    )
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <form 
        onSubmit={handleSubmit} 
        style={{ 
          width: '400px', 
          padding: '30px', 
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center', color: '#333' }}>
          RetailCloud Login
        </h2>
        
        {error && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            background: '#fee',
            color: '#c33',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>
            Tenant Slug (Optional)
          </label>
          <input
            type="text"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="your-tenant-slug"
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#007bff', textDecoration: 'none', fontWeight: '600' }}>
            Sign up here
          </Link>
        </div>
      </form>
    </div>
  )
}


/**
 * Owner/Super Admin Login Page
 * Separate from tenant login
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOwnerAuth } from '../../contexts/OwnerAuthContext'

export default function OwnerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useOwnerAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/owner/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
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
          width: '420px', 
          padding: '40px', 
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👑</div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>
            RetailCloud Owner Portal
          </h1>
          <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
            Super Admin Access Only
          </p>
        </div>
        
        {error && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '20px',
            background: '#fee',
            color: '#c33',
            borderRadius: '8px',
            fontSize: '14px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@yourapp.com"
            required
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              border: '2px solid #e9ecef', 
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
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
              padding: '12px 16px', 
              border: '2px solid #e9ecef', 
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          {loading ? 'Logging in...' : 'Access Owner Portal'}
        </button>

        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          🔒 This portal is restricted to system owners only.
        </div>
      </form>
    </div>
  )
}


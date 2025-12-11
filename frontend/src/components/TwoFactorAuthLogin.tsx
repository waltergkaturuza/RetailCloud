/**
 * Two-Factor Authentication Login Component
 * Prompts user for 2FA code during login
 */
import { useState } from 'react'

interface Props {
  onVerify: (token: string, backupCode?: string) => void
  onCancel?: () => void
  loading?: boolean
  error?: string
}

export default function TwoFactorAuthLogin({ onVerify, onCancel, loading = false, error }: Props) {
  const [totpToken, setTotpToken] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (useBackupCode) {
      if (backupCode.length >= 8) {
        onVerify('', backupCode)
      }
    } else {
      if (totpToken.length === 6) {
        onVerify(totpToken)
      }
    }
  }

  return (
    <div style={{
      padding: '24px',
      background: 'white',
      borderRadius: '8px',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600', textAlign: 'center' }}>
        Two-Factor Authentication
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
        Enter the 6-digit code from your authenticator app, or use a backup code.
      </p>

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: '#fee',
          color: '#c33',
          borderRadius: '6px',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!useBackupCode ? (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>
              Authentication Code
            </label>
            <input
              type="text"
              value={totpToken}
              onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '20px',
                letterSpacing: '8px',
                textAlign: 'center',
                fontFamily: 'monospace',
                marginBottom: '12px',
              }}
            />
            <button
              type="button"
              onClick={() => setUseBackupCode(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '13px',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Use backup code instead
            </button>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>
              Backup Code
            </label>
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              placeholder="XXXXXXXX"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                textAlign: 'center',
                fontFamily: 'monospace',
                marginBottom: '12px',
                textTransform: 'uppercase',
              }}
            />
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(false)
                setBackupCode('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '13px',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Use authenticator code instead
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || (!useBackupCode && totpToken.length !== 6) || (useBackupCode && backupCode.length < 8)}
            style={{ flex: 1 }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </form>
    </div>
  )
}


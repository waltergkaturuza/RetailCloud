/**
 * Two-Factor Authentication Setup Component
 * Allows users to enable 2FA using authenticator apps
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Button from './ui/Button'
import Card from './ui/Card'
import toast from 'react-hot-toast'

interface TwoFactorAuthData {
  id: number
  is_enabled: boolean
  sms_enabled: boolean
  qr_code: string | null
  totp_uri: string | null
  backup_codes: string[]
  enabled_at: string | null
  last_used_at: string | null
}

export default function TwoFactorAuthSetup() {
  const queryClient = useQueryClient()
  const [totpToken, setTotpToken] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [password, setPassword] = useState('')

  // Fetch 2FA status
  const { data: twoFaData, isLoading } = useQuery<TwoFactorAuthData>({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const response = await api.get('/accounts/security/2fa/status/')
      return response.data
    },
  })

  // Setup 2FA (generate secret and QR code)
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/accounts/security/2fa/setup/')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] })
      toast.success('2FA setup initialized. Scan the QR code with your authenticator app.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to setup 2FA')
    },
  })

  // Verify setup (enable 2FA)
  const verifySetupMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post('/accounts/security/2fa/verify_setup/', {
        totp_token: token,
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] })
      setShowBackupCodes(true)
      toast.success('2FA enabled successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Invalid code. Please try again.')
    },
  })

  // Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async (pwd: string) => {
      const response = await api.post('/accounts/security/2fa/disable/', {
        password: pwd,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] })
      setPassword('')
      toast.success('2FA disabled successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA')
    },
  })

  // Regenerate backup codes
  const regenerateCodesMutation = useMutation({
    mutationFn: async (pwd: string) => {
      const response = await api.post('/accounts/security/2fa/regenerate_backup_codes/', {
        password: pwd,
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] })
      setPassword('')
      setShowBackupCodes(true)
      toast.success('Backup codes regenerated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate backup codes')
    },
  })

  const handleSetup = () => {
    setupMutation.mutate()
  }

  const handleVerify = () => {
    if (!totpToken || totpToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    verifySetupMutation.mutate(totpToken)
  }

  const handleDisable = () => {
    if (!password) {
      toast.error('Please enter your password to disable 2FA')
      return
    }
    if (window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      disableMutation.mutate(password)
    }
  }

  const handleRegenerateCodes = () => {
    if (!password) {
      toast.error('Please enter your password to regenerate backup codes')
      return
    }
    regenerateCodesMutation.mutate(password)
  }

  if (isLoading) {
    return <Card><div style={{ textAlign: 'center', padding: '40px' }}>Loading 2FA settings...</div></Card>
  }

  const isEnabled = twoFaData?.is_enabled || false
  const hasQrCode = twoFaData?.qr_code && !isEnabled

  return (
    <Card title="Two-Factor Authentication (2FA)">
      {!isEnabled && !hasQrCode && (
        <div>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Two-Factor Authentication adds an extra layer of security to your account. 
            After enabling 2FA, you'll need to enter a code from your authenticator app 
            (like Google Authenticator or Authy) in addition to your password when logging in.
          </p>
          <Button
            onClick={handleSetup}
            disabled={setupMutation.isPending}
            style={{ minWidth: '200px' }}
            isLoading={setupMutation.isPending}
          >
            Enable 2FA
          </Button>
        </div>
      )}

      {hasQrCode && !isEnabled && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Step 1: Scan QR Code
            </h3>
            <p style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
            </p>
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {twoFaData?.qr_code && (
                <img 
                  src={`data:image/png;base64,${twoFaData.qr_code}`} 
                  alt="2FA QR Code"
                  style={{ maxWidth: '250px', height: 'auto' }}
                />
              )}
            </div>
            {twoFaData?.totp_uri && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#fff3cd', borderRadius: '6px', fontSize: '12px' }}>
                <strong>Manual Entry:</strong> If you can't scan, enter this code manually: <br />
                <code style={{ wordBreak: 'break-all', fontSize: '11px' }}>{twoFaData.totp_uri}</code>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Step 2: Verify Setup
            </h3>
            <p style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
              Enter the 6-digit code from your authenticator app to verify and enable 2FA:
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '18px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <Button
                onClick={handleVerify}
                disabled={verifySetupMutation.isPending || totpToken.length !== 6}
                isLoading={verifySetupMutation.isPending}
              >
                Verify & Enable
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEnabled && (
        <div>
          <div style={{ 
            padding: '16px', 
            background: '#d4edda', 
            borderRadius: '8px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>✓</span>
            <div>
              <div style={{ fontWeight: '600', color: '#155724', marginBottom: '4px' }}>
                2FA is Enabled
              </div>
              <div style={{ fontSize: '13px', color: '#155724' }}>
                Your account is protected with two-factor authentication.
                {twoFaData?.enabled_at && (
                  <span> Enabled on {new Date(twoFaData.enabled_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>

          {showBackupCodes && twoFaData?.backup_codes && twoFaData.backup_codes.length > 0 && (
            <div style={{ 
              padding: '20px', 
              background: '#fff3cd', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '2px solid #ffc107'
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#856404', fontSize: '14px', fontWeight: '600' }}>
                ⚠️ Save These Backup Codes
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#856404' }}>
                These codes can be used to access your account if you lose access to your authenticator app. 
                Save them in a secure location. They will not be shown again.
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                gap: '8px',
                marginBottom: '16px'
              }}>
                {twoFaData.backup_codes.map((code, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: '600',
                      textAlign: 'center',
                      border: '1px solid #ffc107'
                    }}
                  >
                    {code}
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowBackupCodes(false)}
              >
                I've Saved These Codes
              </Button>
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Regenerate Backup Codes
              </h4>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                Generate new backup codes. Your old codes will no longer work.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={handleRegenerateCodes}
                  disabled={regenerateCodesMutation.isPending || !password}
                  isLoading={regenerateCodesMutation.isPending}
                >
                  Regenerate
                </Button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#dc3545' }}>
                Disable 2FA
              </h4>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                Disabling 2FA will make your account less secure. You'll only need your password to log in.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password to confirm"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <Button
                  variant="danger"
                  onClick={handleDisable}
                  disabled={disableMutation.isPending || !password}
                  isLoading={disableMutation.isPending}
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}


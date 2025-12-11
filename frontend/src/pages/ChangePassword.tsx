/**
 * Change Password Page - Forced password change when expired
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function ChangePassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isExpired, setIsExpired] = useState(false)

  // Check if password is expired
  useEffect(() => {
    api.get('/accounts/security/password-expiration/status/')
      .then(response => {
        setIsExpired(response.data.is_expired || false)
      })
      .catch(() => {
        // If endpoint fails, assume not expired (graceful degradation)
        setIsExpired(false)
      })
  }, [])

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { old_password: string; new_password: string; confirm_password: string }) => {
      return await api.post('/accounts/auth/change_password/', data)
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
      // Redirect based on whether password was expired
      if (isExpired || searchParams.get('expired') === 'true') {
        // Password was expired, redirect to login
        navigate('/login')
      } else {
        // Regular password change, redirect to dashboard
        navigate('/')
      }
    },
    onError: (error: any) => {
      const errorData = error.response?.data || {}
      if (errorData.error) {
        setErrors({ general: errorData.error })
      } else if (errorData.errors) {
        setErrors(errorData.errors)
      } else {
        setErrors({ general: 'Failed to change password. Please try again.' })
      }
      toast.error('Failed to change password')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!oldPassword) {
      setErrors({ old_password: 'Current password is required' })
      return
    }

    if (!newPassword) {
      setErrors({ new_password: 'New password is required' })
      return
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirm_password: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 8) {
      setErrors({ new_password: 'Password must be at least 8 characters long' })
      return
    }

    changePasswordMutation.mutate({
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        padding: '40px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ margin: 0, marginBottom: '8px', color: '#333' }}>
            {isExpired || searchParams.get('expired') === 'true' ? 'Password Expired' : 'Change Password'}
          </h2>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            {isExpired || searchParams.get('expired') === 'true'
              ? 'Your password has expired. Please create a new password to continue.'
              : 'Update your password to keep your account secure.'}
          </p>
        </div>

        {errors.general && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '6px',
            fontSize: '14px',
          }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
              Current Password {!isExpired && searchParams.get('expired') !== 'true' && <span style={{ color: '#e74c3c' }}>*</span>}
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              required={!isExpired && searchParams.get('expired') !== 'true'}
              disabled={isExpired || searchParams.get('expired') === 'true'}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${errors.old_password ? '#dc3545' : '#ddd'}`,
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                opacity: (isExpired || searchParams.get('expired') === 'true') ? 0.6 : 1,
              }}
            />
            {errors.old_password && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.old_password}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
              New Password <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${errors.new_password ? '#dc3545' : '#ddd'}`,
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
            {errors.new_password && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.new_password}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Password must be at least 8 characters and meet complexity requirements.
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
              Confirm New Password <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${errors.confirm_password ? '#dc3545' : '#ddd'}`,
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
            {errors.confirm_password && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.confirm_password}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            style={{
              width: '100%',
              padding: '14px',
              background: changePasswordMutation.isPending ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: changePasswordMutation.isPending ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}


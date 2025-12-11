/**
 * Security Settings Component
 * Manages 2FA, sessions, and security preferences
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from './ui/Card'
import Button from './ui/Button'
import TwoFactorAuthSetup from './TwoFactorAuthSetup'
import IPWhitelistManagement from './IPWhitelistManagement'
import toast from 'react-hot-toast'

interface UserSession {
  id: number
  user_email: string
  device_name: string
  device_type: string
  ip_address: string
  browser: string
  os: string
  location: string
  is_active: boolean
  last_activity: string
  created_at: string
  is_expired: boolean
}

interface SecurityEvent {
  id: number
  event_type: string
  ip_address: string
  description: string
  severity: string
  created_at: string
}

export default function SecuritySettings() {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<'2fa' | 'sessions' | 'events' | 'ip-whitelist'>('2fa')

  // Fetch active sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<UserSession[]>({
    queryKey: ['user-sessions'],
    queryFn: async () => {
      const response = await api.get('/accounts/security/sessions/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch recent security events
  const { data: eventsData, isLoading: eventsLoading } = useQuery<SecurityEvent[]>({
    queryKey: ['security-events'],
    queryFn: async () => {
      const response = await api.get('/accounts/security/events/recent/')
      return response.data || []
    },
  })

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await api.post(`/accounts/security/sessions/${sessionId}/terminate/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] })
      toast.success('Session terminated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to terminate session')
    },
  })

  // Terminate all other sessions
  const terminateAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/accounts/security/sessions/terminate_all/')
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] })
      toast.success(`Terminated ${data.terminated_count || 0} session(s)`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to terminate sessions')
    },
  })

  const sessions = sessionsData || []
  const events = eventsData || []
  const activeSessions = sessions.filter(s => s.is_active && !s.is_expired)

  return (
    <div>
      {/* Section Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          borderBottom: '2px solid #ecf0f1',
        }}
      >
        {[
          { id: '2fa', label: 'Two-Factor Authentication', icon: '🔐' },
          { id: 'sessions', label: 'Active Sessions', icon: '💻', badge: activeSessions.length },
          { id: 'events', label: 'Security Events', icon: '📋' },
          { id: 'ip-whitelist', label: 'IP Access Control', icon: '🛡️' },
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeSection === section.id ? '3px solid #667eea' : '3px solid transparent',
              color: activeSection === section.id ? '#667eea' : '#7f8c8d',
              fontWeight: activeSection === section.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
            {section.badge !== undefined && section.badge > 0 && (
              <span
                style={{
                  background: '#667eea',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {section.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 2FA Section */}
      {activeSection === '2fa' && (
        <div>
          <TwoFactorAuthSetup />
        </div>
      )}

      {/* Sessions Section */}
      {activeSection === 'sessions' && (
        <Card title="Active Sessions">
          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading sessions...</div>
          ) : activeSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No active sessions
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, color: '#7f8c8d', fontSize: '14px' }}>
                  Manage your active sessions. Terminate suspicious or unwanted sessions.
                </p>
                {activeSessions.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Terminate all other sessions? Your current session will remain active.')) {
                        terminateAllMutation.mutate()
                      }
                    }}
                    disabled={terminateAllMutation.isPending}
                    isLoading={terminateAllMutation.isPending}
                  >
                    Terminate All Others
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      background: '#f8f9fa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '24px' }}>
                            {session.device_type === 'mobile' ? '📱' : session.device_type === 'tablet' ? '📱' : '💻'}
                          </span>
                          <div>
                            <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '15px' }}>
                              {session.device_name || 'Unknown Device'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                              {session.browser} on {session.os}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: '#7f8c8d' }}>IP Address:</span>{' '}
                            <span style={{ fontWeight: '500' }}>{session.ip_address}</span>
                          </div>
                          <div>
                            <span style={{ color: '#7f8c8d' }}>Location:</span>{' '}
                            <span style={{ fontWeight: '500' }}>{session.location || 'Unknown'}</span>
                          </div>
                          <div>
                            <span style={{ color: '#7f8c8d' }}>Last Activity:</span>{' '}
                            <span style={{ fontWeight: '500' }}>
                              {new Date(session.last_activity).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#7f8c8d' }}>Session Started:</span>{' '}
                            <span style={{ fontWeight: '500' }}>
                              {new Date(session.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Terminate this session?')) {
                            terminateSessionMutation.mutate(session.id)
                          }
                        }}
                        disabled={terminateSessionMutation.isPending}
                        isLoading={terminateSessionMutation.isPending}
                      >
                        Terminate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Security Events Section */}
      {activeSection === 'events' && (
        <Card title="Recent Security Events">
          {eventsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading events...</div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No security events found
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 20px', color: '#7f8c8d', fontSize: '14px' }}>
                View recent security-related events for your account.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                        Event
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                        IP Address
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                        Severity
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>
                        Date & Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const severityColors: { [key: string]: string } = {
                        low: '#28a745',
                        medium: '#ffc107',
                        high: '#fd7e14',
                        critical: '#dc3545',
                      }
                      const severityLabels: { [key: string]: string } = {
                        low: 'Low',
                        medium: 'Medium',
                        high: 'High',
                        critical: 'Critical',
                      }
                      
                      return (
                        <tr
                          key={event.id}
                          style={{
                            borderBottom: '1px solid #e9ecef',
                            '&:hover': { background: '#f8f9fa' },
                          }}
                        >
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            <div style={{ fontWeight: '500', color: '#2c3e50', marginBottom: '4px' }}>
                              {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                              {event.description}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#495057' }}>
                            {event.ip_address || 'N/A'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600',
                                background: `${severityColors[event.severity] || '#6c757d'}20`,
                                color: severityColors[event.severity] || '#6c757d',
                                textTransform: 'uppercase',
                              }}
                            >
                              {severityLabels[event.severity] || event.severity}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#495057' }}>
                            {new Date(event.created_at).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* IP Whitelist/Blacklist Section */}
      {activeSection === 'ip-whitelist' && (
        <div>
          <IPWhitelistManagement />
        </div>
      )}
    </div>
  )
}


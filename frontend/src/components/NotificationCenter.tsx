/**
 * Notification Center Component
 * Real-time notification system with WebSocket integration
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useWebSocket } from '../hooks/useWebSocket'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  action_url?: string
  action_text?: string
  icon?: string
  is_read: boolean
  created_at: string
  metadata?: Record<string, any>
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications/notifications/')
      return response.data?.results || response.data || []
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch unread count
  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/notifications/unread_count/')
      return response.data?.count || 0
    },
  })

  useEffect(() => {
    if (countData !== undefined) {
      setUnreadCount(countData)
    }
  }, [countData])

  // WebSocket connection for real-time updates
  const { lastMessage, readyState } = useWebSocket({
    url: '/ws/notifications/',
    reconnect: true,
    reconnectInterval: 3000,
  })

  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data)
      
      if (data.type === 'notification') {
        // New notification received
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['notification-count'] })
        
        // Show toast for high priority notifications
        if (data.data.priority === 'high' || data.data.priority === 'urgent') {
          toast(data.data.title, {
            icon: data.data.icon || '🔔',
            duration: 5000,
          })
        }
      } else if (data.type === 'notification_count') {
        // Update unread count
        setUnreadCount(data.count)
      }
    }
  }, [lastMessage, queryClient])

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds?: number[]) => {
      if (notificationIds && notificationIds.length > 0) {
        return api.post('/notifications/notifications/mark_as_read/', {
          notification_ids: notificationIds,
        })
      } else {
        return api.post('/notifications/notifications/mark_as_read/', {})
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  // Mark single notification as read
  const markSingleAsRead = async (notificationId: number) => {
    try {
      await api.post(`/notifications/notifications/${notificationId}/mark_single_as_read/`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const unreadNotifications = notifications.filter((n: Notification) => !n.is_read)
  const readNotifications = notifications.filter((n: Notification) => n.is_read)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#e74c3c'
      case 'high':
        return '#f39c12'
      case 'normal':
        return '#3498db'
      case 'low':
        return '#95a5a6'
      default:
        return '#95a5a6'
    }
  }

  const getTypeIcon = (type: string, icon?: string) => {
    if (icon) return icon
    
    const icons: Record<string, string> = {
      sale: '💰',
      inventory: '📦',
      customer: '👤',
      purchase: '🛒',
      system: '⚙️',
      security: '🔒',
      marketing: '📢',
      payment: '💳',
      report: '📊',
      other: '🔔',
    }
    return icons[type] || '🔔'
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          fontSize: '24px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: '#e74c3c',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              width: '400px',
              maxHeight: '600px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              zIndex: 1000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #ecf0f1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8f9fa',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Notifications
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: '8px',
                      background: '#e74c3c',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsReadMutation.mutate()}
                    style={{
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: '#7f8c8d',
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                  <div>No notifications</div>
                </div>
              ) : (
                <>
                  {/* Unread Notifications */}
                  {unreadNotifications.length > 0 && (
                    <div>
                      <div
                        style={{
                          padding: '8px 16px',
                          background: '#fff3cd',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#856404',
                        }}
                      >
                        NEW ({unreadNotifications.length})
                      </div>
                      {unreadNotifications.map((notification: Notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={() => markSingleAsRead(notification.id)}
                          getPriorityColor={getPriorityColor}
                          getTypeIcon={getTypeIcon}
                        />
                      ))}
                    </div>
                  )}

                  {/* Read Notifications */}
                  {readNotifications.length > 0 && (
                    <div>
                      {unreadNotifications.length > 0 && (
                        <div
                          style={{
                            padding: '8px 16px',
                            background: '#f8f9fa',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6c757d',
                          }}
                        >
                          EARLIER
                        </div>
                      )}
                      {readNotifications.slice(0, 10).map((notification: Notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={() => markSingleAsRead(notification.id)}
                          getPriorityColor={getPriorityColor}
                          getTypeIcon={getTypeIcon}
                          isRead
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: () => void
  getPriorityColor: (priority: string) => string
  getTypeIcon: (type: string, icon?: string) => string
  isRead?: boolean
}

function NotificationItem({
  notification,
  onMarkAsRead,
  getPriorityColor,
  getTypeIcon,
  isRead = false,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead()
    }
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleClick}
      style={{
        padding: '16px',
        borderBottom: '1px solid #ecf0f1',
        cursor: notification.action_url ? 'pointer' : 'default',
        background: isRead ? 'white' : '#f8f9fa',
        transition: 'background 0.2s',
      }}
      whileHover={{ background: '#f0f0f0' }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <div
          style={{
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {getTypeIcon(notification.type, notification.icon)}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                fontWeight: isRead ? '500' : '600',
                fontSize: '14px',
                color: '#2c3e50',
              }}
            >
              {notification.title}
            </div>
            {!isRead && (
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getPriorityColor(notification.priority),
                  marginTop: '4px',
                }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#7f8c8d',
              marginBottom: '8px',
              lineHeight: '1.4',
            }}
          >
            {notification.message}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#95a5a6',
              }}
            >
              {new Date(notification.created_at).toLocaleString()}
            </div>
            {notification.action_text && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#3498db',
                  fontWeight: '500',
                }}
              >
                {notification.action_text} →
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}


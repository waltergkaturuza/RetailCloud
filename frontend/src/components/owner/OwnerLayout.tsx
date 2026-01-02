/**
 * Owner Portal Layout - Separate from tenant layout
 */
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useOwnerAuth } from '../../contexts/OwnerAuthContext'

export default function OwnerLayout() {
  const { user, logout } = useOwnerAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Load sidebar state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('ownerSidebarCollapsed')
    return saved !== null ? JSON.parse(saved) : true // Default to collapsed
  })

  // Responsive icon size based on screen width
  const [iconSize, setIconSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth
      if (width >= 1920) return 24 // Large screens
      if (width >= 1440) return 22 // Desktop
      if (width >= 1024) return 20 // Tablet
      return 18 // Mobile
    }
    return 18
  })

  // Update icon size on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width >= 1920) setIconSize(24)
      else if (width >= 1440) setIconSize(22)
      else if (width >= 1024) setIconSize(20)
      else setIconSize(18)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('ownerSidebarCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const handleLogout = () => {
    logout()
    navigate('/owner/login')
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const navItems = [
    { path: '/owner/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/owner/tenants', label: 'Tenants', icon: '🏢' },
    { path: '/owner/module-activations', label: 'Module Activations', icon: '📦' },
    { path: '/owner/subscriptions', label: 'Subscriptions', icon: '💳' },
    { path: '/owner/settings', label: 'System Settings', icon: '⚙️' },
    { path: '/owner/business-categories', label: 'Business Categories', icon: '📂' },
    { path: '/owner/users', label: 'Users', icon: '👥' },
    { path: '/owner/audit-logs', label: 'Audit Logs', icon: '📋' },
    { path: '/owner/health', label: 'System Health', icon: '💚' },
    { path: '/owner/announcements', label: 'Announcements', icon: '📢' },
    { path: '/owner/backups', label: 'Backups', icon: '💾' },
    { path: '/owner/analytics', label: 'Analytics', icon: '📈' },
  ]
  
  // Ensure all navigation items are rendered

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>
      <aside style={{ 
        width: isCollapsed ? '70px' : '280px', 
        background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        transition: 'width 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>

        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingRight: '50px' }}>
          {!isCollapsed && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px' }}>👑</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Owner Portal</h2>
                  <div style={{ fontSize: '11px', color: '#bdc3c7', marginTop: '2px' }}>
                    Super Admin
                  </div>
                </div>
              </div>
              {user && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#bdc3c7' }}>
                  {user.email}
                </div>
              )}
            </>
          )}
          {isCollapsed && (
            <div style={{ fontSize: '32px', textAlign: 'center' }}>👑</div>
          )}
        </div>
        
        <nav style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: isCollapsed ? '14px' : '14px 24px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  color: isActive ? 'white' : '#bdc3c7',
                  background: isActive ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: isActive ? '4px solid #667eea' : '4px solid transparent',
                  marginLeft: isCollapsed ? '0' : (isActive ? '0' : '4px')
                }}
                title={isCollapsed ? item.label : ''}
              >
                <span style={{ fontSize: `${iconSize}px`, minWidth: `${iconSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                {!isCollapsed && (
                  <span style={{ marginLeft: '12px', fontWeight: isActive ? '600' : '400', whiteSpace: 'nowrap', opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div style={{ 
          padding: '20px', 
          marginTop: 'auto', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          position: 'absolute',
          bottom: 0,
          width: isCollapsed ? '70px' : '280px',
          transition: 'width 0.3s ease'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: isCollapsed ? '12px' : '12px',
              background: 'rgba(231, 76, 60, 0.2)',
              color: 'white',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: isCollapsed ? '20px' : '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'center',
              gap: isCollapsed ? '0' : '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.2)'
            }}
            title={isCollapsed ? 'Logout' : ''}
          >
            🚪
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '0', overflow: 'auto', background: '#f5f7fa' }}>
        <Outlet />
      </main>
    </div>
  )
}


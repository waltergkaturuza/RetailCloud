import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getAllowedNavItems } from '../lib/permissions'
import Button from './ui/Button'
import NotificationCenter from './NotificationCenter'

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, effectiveTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Load sidebar state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
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
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Get allowed navigation items based on user role
  const navItems = getAllowedNavItems(user?.role as any)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      <aside style={{ 
        width: isCollapsed ? '70px' : '250px', 
        background: '#2c3e50', 
        color: 'white',
        padding: '0',
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

        <div style={{ padding: '20px', borderBottom: '1px solid #34495e', paddingRight: '50px' }}>
          {!isCollapsed && (
            <>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>RetailCloud</h2>
              {user && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#bdc3c7' }}>
                  {user.email}
                </div>
              )}
            </>
          )}
          {isCollapsed && (
            <div style={{ fontSize: '24px', textAlign: 'center' }}>R</div>
          )}
        </div>
        
        <nav style={{ padding: '10px 0', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: isCollapsed ? '12px' : '12px 20px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  color: isActive ? 'white' : '#bdc3c7',
                  background: isActive ? '#3498db' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: isActive ? '3px solid white' : '3px solid transparent',
                  position: 'relative'
                }}
                title={isCollapsed ? item.label : ''}
              >
                <span style={{ fontSize: `${iconSize}px`, minWidth: `${iconSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                {!isCollapsed && (
                  <span style={{ marginLeft: '10px', whiteSpace: 'nowrap', opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
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
          borderTop: '1px solid #34495e',
          position: 'absolute',
          bottom: 0,
          width: isCollapsed ? '70px' : '250px',
          transition: 'width 0.3s ease'
        }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              padding: isCollapsed ? '8px' : '8px',
              marginBottom: '10px',
              background: '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: isCollapsed ? '16px' : '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'center',
              gap: isCollapsed ? '0' : '8px'
            }}
            title={isCollapsed ? `${effectiveTheme === 'dark' ? 'Dark' : 'Light'} Mode` : 'Toggle dark mode'}
          >
            {effectiveTheme === 'dark' ? '🌙' : '☀️'}
            {!isCollapsed && <span>{effectiveTheme === 'dark' ? 'Dark' : 'Light'} Mode</span>}
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: isCollapsed ? '10px' : '10px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: isCollapsed ? '16px' : '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'center',
              gap: isCollapsed ? '0' : '6px'
            }}
            title={isCollapsed ? 'Logout' : ''}
          >
            🚪
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '30px', overflow: 'auto', position: 'relative' }}>
        {/* Header Bar with Notifications */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'white',
          padding: '12px 20px',
          margin: '-30px -30px 20px -30px',
          borderBottom: '1px solid #ecf0f1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationCenter />
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
              {user?.first_name || user?.email || 'User'}
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}


import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getAllowedNavItems } from '../lib/permissions'
import NotificationCenter from './NotificationCenter'
import Footer from './Footer'
import TermsAcceptanceModal from './TermsAcceptanceModal'
import api from '../lib/api'

export default function Layout() {
  const { user, logout } = useAuth()
  const { toggleTheme, effectiveTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Detect screen size
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })
  
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024
    }
    return false
  })
  
  // Load sidebar state from localStorage (only for desktop)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return true // Always collapsed on mobile
    }
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved !== null ? JSON.parse(saved) : true
  })
  
  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Update screen size on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      // Auto-close drawer on mobile when resizing to desktop
      if (width >= 768) {
        setIsDrawerOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    if (isMobile) {
      setIsDrawerOpen(!isDrawerOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }
  
  // Close drawer when clicking outside on mobile
  useEffect(() => {
    if (isMobile && isDrawerOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('aside') && !target.closest('button[aria-label="Toggle menu"]')) {
          setIsDrawerOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobile, isDrawerOpen])

  // Check if user has accepted terms and privacy policy
  const { data: agreementData, isLoading: agreementLoading } = useQuery({
    queryKey: ['user-agreement'],
    queryFn: async () => {
      try {
        const response = await api.get('/accounts/agreement/')
        return response.data
      } catch (error: any) {
        // If 404, user hasn't accepted yet
        if (error.response?.status === 404) {
          return { terms_accepted: false, privacy_accepted: false, has_accepted_all: false }
        }
        throw error
      }
    },
    enabled: !!user, // Only check if user is logged in
    retry: false,
  })
  
  const [showTermsModal, setShowTermsModal] = useState(false)
  
  // Show terms modal if user hasn't accepted
  useEffect(() => {
    if (user && agreementData && !agreementData.has_accepted_all && !agreementLoading) {
      setShowTermsModal(true)
    }
  }, [user, agreementData, agreementLoading])
  
  const handleTermsAccepted = () => {
    setShowTermsModal(false)
  }
  
  // Get allowed navigation items based on user role
  const navItems = getAllowedNavItems(user?.role as any)

  // Determine sidebar width based on screen size
  const getSidebarWidth = () => {
    if (isMobile) {
      return isDrawerOpen ? '280px' : '0px'
    }
    if (isTablet) {
      return isCollapsed ? '70px' : '220px'
    }
    return isCollapsed ? '70px' : '250px'
  }
  
  const sidebarWidth = getSidebarWidth()
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5', position: 'relative' }}>
      {/* Mobile Overlay */}
      {isMobile && isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
          }}
        />
      )}
      
      <aside style={{ 
        width: sidebarWidth,
        background: '#2c3e50', 
        color: 'white',
        padding: '0',
        transition: isMobile ? 'transform 0.3s ease, width 0.3s ease' : 'width 0.3s ease',
        position: isMobile ? 'fixed' : 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        zIndex: 999,
        transform: isMobile ? (isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        boxShadow: isMobile && isDrawerOpen ? '2px 0 10px rgba(0,0,0,0.3)' : 'none'
      }}>
        {/* Toggle Button - Inside Sidebar */}
        {!isMobile && (
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
        )}
        
        {/* Mobile Close Button */}
        {isMobile && isDrawerOpen && (
          <button
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              width: '36px',
              height: '36px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              zIndex: 10,
            }}
          >
            ×
          </button>
        )}

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
        
        <nav style={{ padding: '10px 0', flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
          width: '100%',
          flexShrink: 0
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

      <main style={{ 
        flex: 1, 
        padding: isMobile ? '16px' : isTablet ? '20px' : '30px', 
        overflow: 'auto', 
        position: 'relative',
        marginLeft: isMobile ? '0' : '0',
        width: isMobile ? '100%' : 'auto'
      }}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Toggle menu"
            style={{
              position: 'fixed',
              top: '16px',
              left: '16px',
              background: '#2c3e50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              cursor: 'pointer',
              zIndex: 997,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            ☰
          </button>
        )}
        
        {/* Header Bar with Notifications */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'white',
          padding: isMobile ? '12px 16px 12px 60px' : '12px 20px',
          margin: isMobile ? '-16px -16px 16px -16px' : '-30px -30px 20px -30px',
          borderBottom: '1px solid #ecf0f1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', flexWrap: 'wrap' }}>
            <NotificationCenter />
            {!isMobile && (
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                {user?.first_name || user?.email || 'User'}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
        <Footer />
      </main>
      <TermsAcceptanceModal isOpen={showTermsModal} onAccept={handleTermsAccepted} />
    </div>
  )
}


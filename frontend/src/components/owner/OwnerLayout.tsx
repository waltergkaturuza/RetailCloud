/**
 * Owner Portal Layout - Separate from tenant layout
 */
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useOwnerAuth } from '../../contexts/OwnerAuthContext'

export default function OwnerLayout() {
  const { user, logout } = useOwnerAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/owner/login')
  }

  const navItems = [
    { path: '/owner/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/owner/tenants', label: 'Tenants', icon: '🏢' },
    { path: '/owner/module-activations', label: 'Module Activations', icon: '📦' },
    { path: '/owner/subscriptions', label: 'Subscriptions', icon: '💳' },
    { path: '/owner/settings', label: 'System Settings', icon: '⚙️' },
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
        width: '280px', 
        background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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
        </div>
        
        <nav style={{ padding: '16px 0' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 24px',
                  color: isActive ? 'white' : '#bdc3c7',
                  background: isActive ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: isActive ? '4px solid #667eea' : '4px solid transparent',
                  marginLeft: isActive ? '0' : '4px'
                }}
              >
                <span style={{ marginRight: '12px', fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontWeight: isActive ? '600' : '400' }}>{item.label}</span>
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
          width: '280px'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(231, 76, 60, 0.2)',
              color: 'white',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.2)'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '0', overflow: 'auto', background: '#f5f7fa' }}>
        <Outlet />
      </main>
    </div>
  )
}


import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getAllowedNavItems } from '../lib/permissions'
import Button from './ui/Button'

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, effectiveTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Get allowed navigation items based on user role
  const navItems = getAllowedNavItems(user?.role as any)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      <aside style={{ 
        width: '250px', 
        background: '#2c3e50', 
        color: 'white',
        padding: '0'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #34495e' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>RetailCloud</h2>
          {user && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#bdc3c7' }}>
              {user.email}
            </div>
          )}
        </div>
        
        <nav style={{ padding: '10px 0' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 20px',
                  color: isActive ? 'white' : '#bdc3c7',
                  background: isActive ? '#3498db' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: isActive ? '3px solid white' : '3px solid transparent'
                }}
              >
                <span style={{ marginRight: '10px', fontSize: '18px' }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '20px', marginTop: 'auto', borderTop: '1px solid #34495e' }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '10px',
              background: '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            title="Toggle dark mode"
          >
            {effectiveTheme === 'dark' ? '🌙' : '☀️'} {effectiveTheme === 'dark' ? 'Dark' : 'Light'} Mode
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '30px', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}


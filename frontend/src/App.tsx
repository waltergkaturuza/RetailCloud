import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { OwnerAuthProvider } from './contexts/OwnerAuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Signup from './pages/Signup'
import POS from './pages/POS'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Sales from './pages/Sales'
import Reports from './pages/Reports'
import Purchases from './pages/Purchases'
import Returns from './pages/Returns'
import Inventory from './pages/Inventory'
import WarehouseManagement from './components/AdvancedInventory/WarehouseManagement'
import DemandForecasting from './components/AdvancedInventory/DemandForecasting'
import StockAnalysis from './components/AdvancedInventory/StockAnalysis'
import BulkOperations from './components/AdvancedInventory/BulkOperations'
import Suppliers from './pages/Suppliers'
import Users from './pages/Users'
import PermissionsMatrix from './pages/PermissionsMatrix'
import Settings from './pages/Settings'
import Expenses from './pages/Expenses'
import Taxes from './pages/Taxes'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import OwnerLogin from './pages/owner/Login'
import OwnerDashboard from './pages/owner/Dashboard'
import OwnerTenants from './pages/owner/Tenants'
import OwnerModuleActivations from './pages/owner/ModuleActivations'
import OwnerSubscriptions from './pages/owner/Subscriptions'
import SystemSettings from './pages/owner/SystemSettings'
import AuditLogs from './pages/owner/AuditLogs'
import SystemHealth from './pages/owner/SystemHealth'
import Announcements from './pages/owner/Announcements'
import Backups from './pages/owner/Backups'
import Analytics from './pages/owner/Analytics'
import OwnerUsers from './pages/owner/Users'
import OwnerLayout from './components/owner/OwnerLayout'
import OwnerProtectedRoute from './components/owner/OwnerProtectedRoute'
import AppShortcuts from './components/AppShortcuts'
import GlobalSearch from './components/GlobalSearch'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { registerServiceWorker, registerNetworkListener } from './lib/offline'
import { useEffect } from 'react'
import './styles/dark-mode.css'
import './styles/light-mode.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  useEffect(() => {
    // Register service worker for offline support
    registerServiceWorker()
    
    // Register network status listener
    registerNetworkListener((online) => {
      if (online) {
        console.log('Back online - syncing offline sales...')
        // Trigger sync will be handled by POS component
      } else {
        console.log('Offline mode activated')
      }
    })
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <OwnerAuthProvider>
              <BrowserRouter>
              <AppShortcuts />
              <GlobalSearch />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="pos" element={
                    <RoleProtectedRoute requiredPermission="canAccessPOS">
                      <POS />
                    </RoleProtectedRoute>
                  } />
                  <Route path="products" element={
                    <RoleProtectedRoute requiredPermission="canAccessProducts">
                      <Products />
                    </RoleProtectedRoute>
                  } />
                  <Route path="customers" element={
                    <RoleProtectedRoute requiredPermission="canAccessCustomers">
                      <Customers />
                    </RoleProtectedRoute>
                  } />
                  <Route path="sales" element={
                    <RoleProtectedRoute requiredPermission="canAccessSales">
                      <Sales />
                    </RoleProtectedRoute>
                  } />
                  <Route path="reports" element={
                    <RoleProtectedRoute requiredPermission="canAccessReports">
                      <Reports />
                    </RoleProtectedRoute>
                  } />
                  <Route path="purchases" element={
                    <RoleProtectedRoute requiredPermission="canAccessPurchases">
                      <Purchases />
                    </RoleProtectedRoute>
                  } />
                  <Route path="returns" element={
                    <RoleProtectedRoute requiredPermission="canAccessReturns">
                      <Returns />
                    </RoleProtectedRoute>
                  } />
                  <Route path="inventory" element={
                    <RoleProtectedRoute requiredPermission="canAccessInventory">
                      <Inventory />
                    </RoleProtectedRoute>
                  } />
                  <Route path="warehouse-management" element={
                    <RoleProtectedRoute requiredPermission="canAccessInventory">
                      <WarehouseManagement />
                    </RoleProtectedRoute>
                  } />
                  <Route path="demand-forecasting" element={
                    <RoleProtectedRoute requiredPermission="canAccessInventory">
                      <DemandForecasting />
                    </RoleProtectedRoute>
                  } />
                  <Route path="stock-analysis" element={
                    <RoleProtectedRoute requiredPermission="canAccessInventory">
                      <StockAnalysis />
                    </RoleProtectedRoute>
                  } />
                  <Route path="bulk-operations" element={
                    <RoleProtectedRoute requiredPermission="canAccessInventory">
                      <BulkOperations />
                    </RoleProtectedRoute>
                  } />
                  <Route path="suppliers" element={
                    <RoleProtectedRoute requiredPermission="canAccessSuppliers">
                      <Suppliers />
                    </RoleProtectedRoute>
                  } />
                  <Route path="users" element={
                    <RoleProtectedRoute requiredPermission="canAccessUsers">
                      <Users />
                    </RoleProtectedRoute>
                  } />
                  <Route path="permissions-matrix" element={
                    <RoleProtectedRoute requiredPermission="canAccessUsers">
                      <PermissionsMatrix />
                    </RoleProtectedRoute>
                  } />
                  <Route path="settings" element={
                    <RoleProtectedRoute requiredPermission="canAccessSettings">
                      <Settings />
                    </RoleProtectedRoute>
                  } />
                  <Route path="expenses" element={
                    <RoleProtectedRoute requiredPermission="canAccessReports">
                      <Expenses />
                    </RoleProtectedRoute>
                  } />
                  <Route path="taxes" element={
                    <RoleProtectedRoute requiredPermission="canAccessReports">
                      <Taxes />
                    </RoleProtectedRoute>
                  } />
                </Route>
                
                {/* Owner Routes */}
                <Route path="/owner/login" element={<OwnerLogin />} />
                <Route
                  path="/owner"
                  element={
                    <OwnerProtectedRoute>
                      <OwnerLayout />
                    </OwnerProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<OwnerDashboard />} />
                  <Route path="tenants" element={<OwnerTenants />} />
                  <Route path="module-activations" element={<OwnerModuleActivations />} />
                  <Route path="subscriptions" element={<OwnerSubscriptions />} />
                  <Route path="settings" element={<SystemSettings />} />
                  <Route path="users" element={<OwnerUsers />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="health" element={<SystemHealth />} />
                  <Route path="announcements" element={<Announcements />} />
                  <Route path="backups" element={<Backups />} />
                  <Route path="analytics" element={<Analytics />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            </OwnerAuthProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App


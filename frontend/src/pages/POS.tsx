import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import BarcodeScanner from '../components/BarcodeScanner'
import Receipt from '../components/Receipt'
import CurrencySelector from '../components/CurrencySelector'
import SplitPaymentModal from '../components/SplitPaymentModal'
import PromotionModal from '../components/PromotionModal'
import SerialCaptureModal from '../components/BulkInventory/SerialCaptureModal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'
import { useHotkeys } from 'react-hotkeys-hook'
import { saveOfflineSale, syncOfflineSales, getUnsyncedSales } from '../lib/offline'

interface CartItem {
  product: any
  quantity: number
  unit_price: number
  discount: number
  total: number
  serial_numbers?: string[]  // For products requiring serial tracking
}

interface Product {
  id: number
  name: string
  sku: string
  barcode: string
  rfid_tag?: string
  selling_price: string
  discount_price?: string
  current_price: string
  stock_levels?: Array<{ quantity: number; branch_name: string }>
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanMode, setScanMode] = useState<'barcode' | 'rfid'>('barcode')
  const [showReceipt, setShowReceipt] = useState<any>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [quickProducts, setQuickProducts] = useState<Product[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD')
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null)
  const [paymentSplits, setPaymentSplits] = useState<any[]>([])
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine)
  const [showSerialCapture, setShowSerialCapture] = useState<{product: Product, quantity: number} | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false)
      // Auto-sync when back online
      syncOfflineSales().then((result) => {
        if (result.success > 0) {
          toast.success(`Synced ${result.success} offline sale(s)`)
          queryClient.invalidateQueries({ queryKey: ['sales'] })
        }
        if (result.failed > 0) {
          toast.error(`${result.failed} sale(s) failed to sync`)
        }
      })
    }
    const handleOffline = () => setIsOfflineMode(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  // Check for unsynced sales on mount
  useEffect(() => {
    if (navigator.onLine) {
      // Delay to ensure IndexedDB is ready
      const timer = setTimeout(() => {
        getUnsyncedSales()
          .then((sales) => {
            if (sales.length > 0) {
              return syncOfflineSales()
            }
            return { success: 0, failed: 0 }
          })
          .then((result) => {
            if (result.success > 0) {
              queryClient.invalidateQueries({ queryKey: ['sales'] })
            }
          })
          .catch((err) => {
            console.warn('Error syncing offline sales:', err)
            // Silently fail - offline sync is optional
          })
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [queryClient])

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Keyboard shortcuts
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault()
    searchInputRef.current?.focus()
  })

  useHotkeys('escape', () => {
    setSearchQuery('')
    setShowScanner(false)
  })

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products', searchQuery],
    queryFn: async () => {
      const params: any = { is_active: true, limit: 50 }
      if (searchQuery) {
        params.search = searchQuery
      }
      const response = await api.get('/inventory/products/', { params })
      return response.data.results || response.data || []
    },
    enabled: searchQuery.length >= 2 || searchQuery.length === 0
  })

  // Fetch quick access products (recently sold or featured)
  useQuery({
    queryKey: ['pos-quick-products'],
    queryFn: async () => {
      const response = await api.get('/inventory/products/', {
        params: { is_active: true, limit: 20, ordering: '-updated_at' }
      })
      const products = response.data.results || response.data || []
      setQuickProducts(products.slice(0, 12))
      return products
    }
  })

  // Fetch customers
  const { data: customersResponse } = useQuery({
    queryKey: ['pos-customers'],
    queryFn: async () => {
      const response = await api.get('/customers/customers/', {
        params: { is_active: true, limit: 100 }
      })
      return response.data?.results || response.data || []
    }
  })

  const customers = customersResponse || []

  // Fetch branches
  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.get('/core/branches/')
        return response.data || []
      } catch {
        return [{ id: 1, name: 'Main Branch' }]
      }
    }
  })

  const branches = branchesResponse || [{ id: 1, name: 'Main Branch' }]
  const [selectedBranch] = useState(branches[0] || { id: 1, name: 'Main Branch' })

  // Fetch enabled currencies
  const { data: currenciesResponse } = useQuery({
    queryKey: ['tenant-currencies-enabled'],
    queryFn: async () => {
      try {
        const response = await api.get('/currency/tenant-currencies/enabled/')
        return response.data
      } catch {
        return [{ code: 'USD', symbol: '$', name: 'US Dollar', is_default: true }]
      }
    }
  })

  const enabledCurrencies = currenciesResponse || []
  const defaultCurrency = enabledCurrencies.find((c: any) => c.is_default)?.code || 'USD'

  // Set default currency on mount
  useEffect(() => {
    if (!selectedCurrency && defaultCurrency) {
      setSelectedCurrency(defaultCurrency)
    }
  }, [defaultCurrency])

  // Fetch exchange rates
  const { data: exchangeRates } = useQuery({
    queryKey: ['exchange-rates-current', selectedCurrency],
    queryFn: async () => {
      try {
        const response = await api.get(`/currency/exchange-rates/current/?from=${selectedCurrency}`)
        return response.data
      } catch {
        return { rates: {} }
      }
    },
    enabled: !!selectedCurrency
  })

  const getCurrencySymbol = (code: string) => {
    const currency = enabledCurrencies.find((c: any) => c.code === code)
    return currency?.symbol || '$'
  }

  // Handle barcode/RFID scan
  const handleScan = useCallback(async (scannedCode: string, type: 'barcode' | 'rfid' = 'barcode') => {
    setShowScanner(false)
    setSearchQuery('')
    
    try {
      const params: any = { is_active: true }
      if (type === 'rfid') {
        params.rfid_tag = scannedCode
      } else {
        params.barcode = scannedCode
      }

      const response = await api.get('/inventory/products/', { params })
      const foundProducts = response.data.results || response.data || []
      
      if (foundProducts.length > 0) {
        const product = foundProducts[0]
        addToCart(product)
        toast.success(`Added: ${product.name}`)
      } else {
        toast.error(`Product not found for ${type === 'rfid' ? 'RFID' : 'barcode'}: ${scannedCode}`)
        setSearchQuery(scannedCode) // Show in search for manual selection
      }
    } catch (error: any) {
      toast.error('Failed to search product')
    }
  }, [])

  // Add product to cart (with serial capture if needed)
  const addToCart = useCallback((product: Product, serialNumbers?: string[]) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    const price = parseFloat(product.current_price || product.selling_price)
    
    // Check if product requires serial tracking (you can customize this check based on product attributes)
    const requiresSerialTracking = product.requires_serial_tracking || product.track_serial_numbers || false
    
    if (requiresSerialTracking && !serialNumbers) {
      // Show serial capture modal
      setShowSerialCapture({ product, quantity: 1 })
      return
    }

    if (existingItem) {
      // Merge serial numbers if provided
      const mergedSerials = serialNumbers 
        ? [...(existingItem.serial_numbers || []), ...serialNumbers]
        : existingItem.serial_numbers
      
      setCart(cart.map(item =>
        item.product.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              total: (item.quantity + 1) * item.unit_price - item.discount,
              serial_numbers: mergedSerials
            }
          : item
      ))
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unit_price: price,
        discount: 0,
        total: price,
        serial_numbers: serialNumbers || []
      }])
    }
    setSearchQuery('')
    searchInputRef.current?.focus()
  }, [cart])
  
  // Handle serial capture completion
  const handleSerialCapture = (serials: string[]) => {
    if (showSerialCapture) {
      addToCart(showSerialCapture.product, serials)
      setShowSerialCapture(null)
    }
  }

  // Update cart item
  const updateCartItem = (index: number, updates: Partial<CartItem>) => {
    const updated = [...cart]
    updated[index] = { ...updated[index], ...updates }
    if (updates.quantity !== undefined || updates.unit_price !== undefined || updates.discount !== undefined) {
      updated[index].total = updated[index].quantity * updated[index].unit_price - updated[index].discount
    }
    setCart(updated)
  }

  // Remove from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Calculate totals (convert to selected currency if needed)
  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount
    const rate = exchangeRates?.rates?.[toCurrency]?.rate
    if (rate) return amount * rate
    return amount // Fallback if rate not found
  }

  const baseCurrency = defaultCurrency || 'USD'
  const subtotalBase = cart.reduce((sum, item) => sum + item.total, 0)
  const subtotal = selectedCurrency === baseCurrency 
    ? subtotalBase 
    : convertAmount(subtotalBase, baseCurrency, selectedCurrency)
  
  const taxRate = 0.15 // 15% tax - you can get this from tenant settings
  const tax = subtotal * taxRate
  const discountAmountConverted = selectedCurrency === baseCurrency
    ? discountAmount
    : convertAmount(discountAmount, baseCurrency, selectedCurrency)
  const total = subtotal + tax - discountAmountConverted
  const change = parseFloat(amountPaid || '0') - total

  // Checkout
  const saleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      // If offline, save to IndexedDB instead of API call
      if (isOfflineMode || !navigator.onLine) {
        const localId = await saveOfflineSale({
          ...saleData,
          subtotal: subtotalBase,
          tax_amount: tax,
          total_amount: total
        } as any)
        return { data: { local_id: localId, invoice_number: `OFFLINE-${localId.substring(0, 12)}`, is_offline: true, date: new Date().toISOString(), currency: selectedCurrency } }
      }
      return api.post('/pos/sales/', saleData)
    },
    onSuccess: (response: any) => {
      const sale = response.data
      setCart([])
      setAmountPaid('')
      setDiscountAmount(0)
      setAppliedPromotion(null)
      setPaymentSplits([])
      setSelectedCustomer(null)
      setSearchQuery('')
      setPaymentMethod('cash')
      
      if (sale.is_offline) {
        toast.success(`Sale saved offline! Will sync when online. ID: ${sale.local_id}`)
        setShowReceipt({ ...sale, invoice_number: sale.invoice_number || sale.local_id })
      } else {
        queryClient.invalidateQueries({ queryKey: ['dashboard-sales-stats'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-recent-sales'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        toast.success(`Sale completed! Invoice: ${sale.invoice_number}`)
        setShowReceipt(sale)
      }
      searchInputRef.current?.focus()
    },
    onError: (error: any) => {
      // If offline, try saving to IndexedDB as fallback
      if (isOfflineMode || !navigator.onLine) {
        saveOfflineSale({
          branch_id: selectedBranch?.id || 1,
          customer_id: selectedCustomer?.id,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount || 0
          })),
          payment_method: paymentSplits.length > 0 ? 'split' : paymentMethod,
          currency: selectedCurrency,
          payment_splits: paymentSplits,
          amount_paid: parseFloat(amountPaid || '0'),
          discount_amount: discountAmountConverted,
          subtotal: subtotalBase,
          tax_amount: tax,
          total_amount: total
        } as any).then((localId) => {
          toast.success(`Sale saved offline! ID: ${localId}`)
          setShowReceipt({ 
            local_id: localId, 
            invoice_number: `OFFLINE-${localId.substring(0, 12)}`,
            is_offline: true,
            date: new Date().toISOString(),
            currency: selectedCurrency,
            items: cart.map(item => ({ ...item, product_name: item.product.name })),
            subtotal: subtotalBase,
            tax_amount: tax,
            total_amount: total,
            discount_amount: discountAmountConverted,
            payment_method: paymentMethod,
            payment_splits: paymentSplits
          })
          setCart([])
          setAmountPaid('')
          setDiscountAmount(0)
          setAppliedPromotion(null)
          setPaymentSplits([])
          setSelectedCustomer(null)
          setSearchQuery('')
          setPaymentMethod('cash')
        }).catch((err) => {
          toast.error('Failed to save offline sale: ' + err.message)
        })
        return
      }
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to complete sale'
      toast.error(errorMsg)
    }
  })

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!selectedBranch) {
      toast.error('Please select a branch')
      return
    }

    if (paymentMethod === 'cash' && (!amountPaid || parseFloat(amountPaid) < total)) {
      toast.error('Amount paid must be greater than or equal to total')
      return
    }

    // Prepare sale data with currency and splits
    const saleData: any = {
      branch_id: selectedBranch?.id || 1,
      customer_id: selectedCustomer?.id || null,
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount || 0,
        serial_numbers: item.serial_numbers || []  // Include serial numbers
      })),
      payment_method: paymentSplits.length > 0 ? 'split' : paymentMethod,
      currency: selectedCurrency,
      exchange_rate: exchangeRates?.rates ? Object.values(exchangeRates.rates)[0]?.rate : null,
      amount_paid: paymentMethod === 'cash' ? parseFloat(amountPaid || '0') : total,
      discount_amount: discountAmountConverted
    }

    // Add payment splits if exists
    if (paymentSplits.length > 0) {
      saleData.payment_splits = paymentSplits.map(split => ({
        payment_method: split.payment_method,
        currency: split.currency,
        amount: split.amount,
        reference: split.reference || ''
      }))
    }

    saleMutation.mutate(saleData)
  }

  // Handle Enter key in search
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && products && products.length > 0) {
      addToCart(products[0])
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      gap: '20px', 
      height: 'calc(100vh - 60px)',
      padding: '0',
      background: '#f5f7fa'
    }}>
      {/* Left Panel - Product Search & Selection (60%) */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search Bar */}
        <Card style={{ padding: '20px', margin: 0 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="🔍 Search by name, SKU, barcode, or RFID... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  fontSize: '18px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '12px',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#95a5a6',
                    padding: '4px 8px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                onClick={() => {
                  setScanMode('barcode')
                  setShowScanner(true)
                }}
                variant="secondary"
                style={{ 
                  whiteSpace: 'nowrap',
                  padding: '16px 24px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📷 Barcode
              </Button>
              <Button
                onClick={() => {
                  setScanMode('rfid')
                  setShowScanner(true)
                }}
                variant="secondary"
                style={{ 
                  whiteSpace: 'nowrap',
                  padding: '16px 24px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📡 RFID
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && products && products.length > 0 && (
            <div style={{
              marginTop: '16px',
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #e1e8ed',
              borderRadius: '8px',
              background: 'white'
            }}>
              {products.slice(0, 10).map((product: Product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8f9fa'
                    e.currentTarget.style.borderLeft = '4px solid #3498db'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.borderLeft = '4px solid transparent'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px', color: '#2c3e50' }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', display: 'flex', gap: '12px' }}>
                      <span>SKU: {product.sku}</span>
                      {product.barcode && <span>Barcode: {product.barcode}</span>}
                      {product.rfid_tag && <span>RFID: {product.rfid_tag.substring(0, 12)}...</span>}
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: '700', 
                    fontSize: '18px', 
                    color: '#2ecc71',
                    marginLeft: '16px'
                  }}>
                    ${parseFloat(product.current_price || product.selling_price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && products && products.length === 0 && !productsLoading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#95a5a6',
              marginTop: '16px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
              <div>No products found</div>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                Try searching by name, SKU, barcode, or RFID tag
              </div>
            </div>
          )}
        </Card>

        {/* Quick Access Products */}
        <Card style={{ flex: 1, padding: '20px', margin: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: '600' }}>
              Quick Add Products
            </h3>
            <span style={{ fontSize: '13px', color: '#7f8c8d' }}>
              {quickProducts.length} products
            </span>
          </div>
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
            paddingRight: '8px'
          }}>
            {quickProducts.map((product: Product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                style={{
                  padding: '16px',
                  background: 'white',
                  border: '2px solid #e1e8ed',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3498db'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e1e8ed'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '14px', 
                  marginBottom: '6px',
                  color: '#2c3e50',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {product.name}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>
                  {product.sku}
                </div>
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '16px', 
                  color: '#2ecc71'
                }}>
                  ${parseFloat(product.current_price || product.selling_price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right Panel - Cart & Checkout (40%) */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card style={{ flex: 1, padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '22px', color: '#2c3e50', fontWeight: '600' }}>
              Shopping Cart
            </h3>
            {cart.length > 0 && (
              <span style={{ 
                background: '#3498db',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#95a5a6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '72px', marginBottom: '16px' }}>🛒</div>
              <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px', color: '#7f8c8d' }}>
                Cart is empty
              </div>
              <div style={{ fontSize: '14px' }}>
                Search and add products to get started
              </div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '8px' }}>
                {cart.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      background: '#f8f9fa',
                      border: '1px solid #e1e8ed',
                      borderRadius: '10px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px', color: '#2c3e50' }}>
                          {item.product.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          SKU: {item.product.sku}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        style={{
                          background: '#fee',
                          border: 'none',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontSize: '20px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fdd'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fee'}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1
                          updateCartItem(index, {
                            quantity: qty,
                            total: qty * item.unit_price - item.discount
                          })
                        }}
                        style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '16px',
                          textAlign: 'center',
                          fontWeight: '600'
                        }}
                      />
                      <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                        @ ${item.unit_price.toFixed(2)}
                      </div>
                      <div style={{ 
                        textAlign: 'right', 
                        fontWeight: '700', 
                        fontSize: '18px',
                        color: '#2ecc71'
                      }}>
                        ${item.total.toFixed(2)}
                      </div>
                    </div>

                    {/* Item discount */}
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.total}
                        value={item.discount}
                        onChange={(e) => {
                          const disc = parseFloat(e.target.value) || 0
                          updateCartItem(index, {
                            discount: disc,
                            total: item.quantity * item.unit_price - disc
                          })
                        }}
                        placeholder="Discount"
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Summary */}
              <div style={{
                borderTop: '2px solid #e1e8ed',
                paddingTop: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#7f8c8d' }}>Subtotal:</span>
                  <span style={{ fontWeight: '500', fontSize: '16px' }}>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#7f8c8d' }}>Tax (15%):</span>
                  <span style={{ fontWeight: '500', fontSize: '16px' }}>${tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ color: '#7f8c8d' }}>Discount:</span>
                    {appliedPromotion ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          padding: '4px 8px', 
                          background: '#e8f5e9', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          flex: 1
                        }}>
                          <strong>{appliedPromotion.name}</strong>
                          <button
                            onClick={() => {
                              setAppliedPromotion(null)
                              setDiscountAmount(0)
                            }}
                            style={{
                              marginLeft: '8px',
                              background: 'none',
                              border: 'none',
                              color: '#e74c3c',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowPromotionModal(true)}
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100px',
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          placeholder="0.00"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowPromotionModal(true)}
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                        >
                          🎁 Promo
                        </Button>
                      </>
                    )}
                  </div>
                  <span style={{ fontWeight: '500', fontSize: '16px', color: '#e74c3c' }}>
                    -{getCurrencySymbol(selectedCurrency)}{discountAmountConverted.toFixed(2)}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '24px',
                  fontWeight: '700',
                  paddingTop: '12px',
                  borderTop: '2px solid #e1e8ed',
                  color: '#2c3e50'
                }}>
                  <span>Total:</span>
                  <span style={{ color: '#2ecc71' }}>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Customer (Optional)
                </label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customerId = e.target.value
                    if (customerId) {
                      const customer = customers.find((c: any) => c.id === parseInt(customerId))
                      setSelectedCustomer(customer || null)
                    } else {
                      setSelectedCustomer(null)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name} - {customer.phone}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '10px', 
                    background: '#e8f5e9', 
                    borderRadius: '6px', 
                    fontSize: '13px' 
                  }}>
                    <div><strong>Credit:</strong> ${parseFloat(selectedCustomer.credit_available || '0').toFixed(2)}</div>
                    <div><strong>Loyalty Points:</strong> {selectedCustomer.loyalty_points || 0}</div>
                  </div>
                )}
              </div>

              {/* Currency Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Transaction Currency
                </label>
                <CurrencySelector
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={(currency, rate) => {
                    setSelectedCurrency(currency)
                    if (rate) setExchangeRate(rate)
                    // Clear splits when currency changes
                    if (paymentSplits.length > 0) {
                      setPaymentSplits([])
                      setPaymentMethod('cash')
                    }
                  }}
                  showRates={true}
                />
              </div>

              {/* Payment Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '500', fontSize: '14px' }}>
                    Payment Method
                  </label>
                  {total > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowSplitModal(true)}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      💳 Split Payment
                    </Button>
                  )}
                </div>
                {paymentSplits.length > 0 ? (
                  <div style={{ 
                    padding: '12px', 
                    background: '#e8f5e9', 
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                      Split Payments:
                    </div>
                    {paymentSplits.map((split, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        marginBottom: '4px'
                      }}>
                        <span>{split.payment_method} ({split.currency})</span>
                        <span style={{ fontWeight: '600' }}>
                          {getCurrencySymbol(split.currency)}{split.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setPaymentSplits([])
                        setPaymentMethod('cash')
                      }}
                      style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: '#fee',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove Split
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {['cash', 'ecocash', 'card', 'onemoney', 'zipit', 'credit'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        style={{
                          padding: '12px',
                          border: `2px solid ${paymentMethod === method ? '#3498db' : '#ddd'}`,
                          borderRadius: '8px',
                          background: paymentMethod === method ? '#ebf5fb' : 'white',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: paymentMethod === method ? '600' : '400',
                          textTransform: 'capitalize',
                          transition: 'all 0.2s'
                        }}
                      >
                        {method === 'ecocash' ? 'EcoCash' : method === 'onemoney' ? 'OneMoney' : method}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {paymentMethod === 'cash' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && parseFloat(amountPaid || '0') >= total) {
                        handleCheckout()
                      }
                    }}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '14px',
                      border: '2px solid #3498db',
                      borderRadius: '8px',
                      fontSize: '20px',
                      fontWeight: '600',
                      boxSizing: 'border-box',
                      textAlign: 'right'
                    }}
                    autoFocus={paymentMethod === 'cash' && cart.length > 0}
                  />
                  {change > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '10px', 
                      background: '#d4edda', 
                      borderRadius: '6px', 
                      color: '#155724',
                      fontWeight: '600',
                      fontSize: '16px',
                      textAlign: 'center'
                    }}>
                      Change: ${change.toFixed(2)}
                    </div>
                  )}
                  {parseFloat(amountPaid || '0') < total && amountPaid && (
                    <div style={{ marginTop: '8px', color: '#e74c3c', fontSize: '13px', textAlign: 'center' }}>
                      Short by: ${(total - parseFloat(amountPaid || '0')).toFixed(2)}
                    </div>
                  )}
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAmountPaid(total.toFixed(2))}
                      style={{ flex: 1 }}
                    >
                      Exact
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAmountPaid(Math.ceil(total).toFixed(2))}
                      style={{ flex: 1 }}
                    >
                      Round Up
                    </Button>
                  </div>
                </div>
              )}

              {paymentMethod !== 'cash' && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '12px', 
                  background: '#fff3cd', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  color: '#856404',
                  textAlign: 'center'
                }}>
                  Amount will be set to total: <strong>${total.toFixed(2)}</strong>
                </div>
              )}

              <Button
                onClick={handleCheckout}
                disabled={saleMutation.isPending || cart.length === 0 || (paymentMethod === 'cash' && parseFloat(amountPaid || '0') < total)}
                isLoading={saleMutation.isPending}
                style={{
                  width: '100%',
                  padding: '18px',
                  fontSize: '20px',
                  fontWeight: '700',
                  borderRadius: '10px',
                  background: cart.length === 0 || (paymentMethod === 'cash' && parseFloat(amountPaid || '0') < total)
                    ? '#bdc3c7'
                    : '#2ecc71'
                }}
              >
                {saleMutation.isPending 
                  ? 'Processing...' 
                  : paymentMethod === 'cash'
                    ? `Complete Sale - Change: $${change.toFixed(2)}`
                    : `Complete Sale - $${total.toFixed(2)}`}
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* Barcode/RFID Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          mode={scanMode}
          onScan={(code) => handleScan(code, scanMode)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Split Payment Modal */}
      {showSplitModal && (
        <SplitPaymentModal
          total={total}
          baseCurrency={selectedCurrency}
          availableCurrencies={enabledCurrencies.map((c: any) => ({
            code: c.code,
            symbol: c.symbol,
            name: c.name
          }))}
          exchangeRates={exchangeRates?.rates || {}}
          onConfirm={(splits) => {
            setPaymentSplits(splits)
            setPaymentMethod('split')
            setShowSplitModal(false)
            setAmountPaid('') // Clear amount paid when using split
          }}
          onClose={() => setShowSplitModal(false)}
        />
      )}

      {/* Promotion Modal */}
      {showPromotionModal && (
        <PromotionModal
          cartItems={cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            category_id: item.product.category
          }))}
          subtotal={subtotalBase}
          onApply={(promotion, discount) => {
            setAppliedPromotion(promotion)
            setDiscountAmount(discount)
            setShowPromotionModal(false)
          }}
          onClose={() => setShowPromotionModal(false)}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <Receipt
          sale={showReceipt}
          onClose={() => {
            setShowReceipt(null)
            setPaymentSplits([])
            searchInputRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

/**
 * Mobile-optimized POS interface for iOS and Android
 * Features: Touch-friendly UI, camera barcode scanning, offline mode, quick actions
 */
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Button from './ui/Button'
import Card from './ui/Card'
import toast from 'react-hot-toast'
import { saveOfflineSale, syncOfflineSales } from '../lib/offline'

interface CartItem {
  product: any
  quantity: number
  unit_price: number
  discount: number
  total: number
}

export default function MobilePOS() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showPayment, setShowPayment] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const queryClient = useQueryClient()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      syncOfflineSales().then((result) => {
        if (result.success > 0) {
          toast.success(`Synced ${result.success} offline sale(s)`)
          queryClient.invalidateQueries({ queryKey: ['sales'] })
        }
      })
    }
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['products-mobile', searchQuery],
    queryFn: async () => {
      const response = await api.get('/inventory/products/', {
        params: { search: searchQuery, page_size: 50 }
      })
      return response.data.results || response.data
    },
    enabled: !showScanner,
  })

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers-mobile'],
    queryFn: async () => {
      const response = await api.get('/customers/customers/', { params: { page_size: 100 } })
      return response.data.results || response.data
    },
  })

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = subtotal * 0.15 // Example 15% tax
  const total = subtotal + taxAmount

  // Add product to cart
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      ))
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unit_price: product.selling_price || product.price || 0,
        discount: 0,
        total: product.selling_price || product.price || 0
      }])
    }
    toast.success(`${product.name} added to cart`)
  }

  // Update quantity
  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta)
        if (newQuantity === 0) {
          return null
        }
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.unit_price
        }
      }
      return item
    }).filter(Boolean) as CartItem[])
  }

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  // Start barcode scanner
  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setShowScanner(true)
      }
    } catch (error) {
      toast.error('Camera access denied. Please enable camera permissions.')
    }
  }

  // Stop scanner
  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setShowScanner(false)
  }

  // Handle barcode scan (using ZXing library if available)
  useEffect(() => {
    if (!showScanner || !videoRef.current) return

    // In production, use ZXing library for barcode scanning
    // This is a placeholder - implement actual barcode scanning
    const interval = setInterval(() => {
      // Barcode scanning logic would go here
    }, 1000)

    return () => clearInterval(interval)
  }, [showScanner])

  // Complete sale
  const completeSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isOffline) {
        // Save offline
        await saveOfflineSale(data)
        return { success: true, offline: true }
      }
      const response = await api.post('/pos/sales/', data)
      return response.data
    },
    onSuccess: (data) => {
      if (data.offline) {
        toast.success('Sale saved offline. Will sync when online.')
      } else {
        toast.success('Sale completed successfully!')
      }
      setCart([])
      setAmountPaid('')
      setSelectedCustomer(null)
      setShowPayment(false)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete sale')
    }
  })

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    const saleData = {
      items: cart.map(item => ({
        product: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total
      })),
      customer: selectedCustomer?.id || null,
      payment_method: paymentMethod,
      amount_paid: parseFloat(amountPaid) || total,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      change_amount: Math.max(0, (parseFloat(amountPaid) || total) - total)
    }

    completeSaleMutation.mutate(saleData)
  }

  return (
    <div className="mobile-pos" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>POS</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isOffline && (
            <span style={{ fontSize: '12px', opacity: 0.9 }}>Offline</span>
          )}
          <Button
            variant="ghost"
            onClick={startScanner}
            style={{ color: 'white', padding: '6px 12px' }}
          >
            📷 Scan
          </Button>
        </div>
      </div>

      {/* Barcode Scanner */}
      {showScanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'black',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px',
            backgroundColor: 'rgba(0,0,0,0.7)'
          }}>
            <Button onClick={stopScanner} style={{ width: '100%', marginBottom: '10px' }}>
              Close Scanner
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search Bar */}
        <div style={{ padding: '12px', backgroundColor: 'white', borderBottom: '1px solid #e5e5e5' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px'
            }}
          />
        </div>

        {/* Products Grid */}
        {!showPayment && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            {products?.map((product: any) => (
              <Card
                key={product.id}
                onClick={() => addToCart(product)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'white'
                }}
              >
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  />
                )}
                <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                  {product.name}
                </div>
                <div style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '16px' }}>
                  ${(product.selling_price || product.price || 0).toFixed(2)}
                </div>
                {product.stock_quantity !== undefined && (
                  <div style={{ fontSize: '12px', color: product.stock_quantity > 0 ? '#10b981' : '#ef4444' }}>
                    Stock: {product.stock_quantity}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Payment Screen */}
        {showPayment && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: 'white'
          }}>
            {/* Cart Items */}
            <div style={{ marginBottom: '20px' }}>
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderBottom: '1px solid #e5e5e5'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.product.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                      ${item.unit_price.toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      ${item.total.toFixed(2)}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => removeFromCart(item.product.id)}
                      style={{ padding: '4px 8px' }}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {/* Amount Paid */}
            {paymentMethod === 'cash' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Amount Paid</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`${total.toFixed(2)}`}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px'
                  }}
                />
                {amountPaid && parseFloat(amountPaid) >= total && (
                  <div style={{ marginTop: '8px', color: '#10b981', fontWeight: 'bold' }}>
                    Change: ${(parseFloat(amountPaid) - total).toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* Complete Sale Button */}
            <Button
              onClick={handleCompleteSale}
              disabled={completeSaleMutation.isPending}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              {completeSaleMutation.isPending ? 'Processing...' : `Complete Sale - $${total.toFixed(2)}`}
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Bar - Cart Summary */}
      {!showPayment && (
        <div style={{
          backgroundColor: 'white',
          borderTop: '1px solid #e5e5e5',
          padding: '12px 16px',
          boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Items: {cart.length}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                ${total.toFixed(2)}
              </div>
            </div>
            <Button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Checkout
            </Button>
          </div>
          
          {/* Cart Preview */}
          {cart.length > 0 && (
            <div style={{ maxHeight: '80px', overflowX: 'auto', display: 'flex', gap: '8px' }}>
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    minWidth: 'fit-content'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.product.name}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>×{item.quantity}</span>
                  <Button
                    variant="ghost"
                    onClick={() => updateQuantity(item.product.id, -1)}
                    style={{ padding: '2px 6px', fontSize: '12px' }}
                  >
                    −
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => updateQuantity(item.product.id, 1)}
                    style={{ padding: '2px 6px', fontSize: '12px' }}
                  >
                    +
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Back Button for Payment Screen */}
      {showPayment && (
        <div style={{
          backgroundColor: 'white',
          borderTop: '1px solid #e5e5e5',
          padding: '12px 16px'
        }}>
          <Button
            variant="ghost"
            onClick={() => setShowPayment(false)}
            style={{ width: '100%' }}
          >
            ← Back to Products
          </Button>
        </div>
      )}
    </div>
  )
}


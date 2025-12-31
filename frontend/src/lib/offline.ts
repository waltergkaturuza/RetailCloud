/**
 * Offline mode utilities using IndexedDB
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface OfflineSale {
  id?: number
  local_id: string
  branch_id: number
  customer_id?: number
  items: Array<{
    product_id: number
    quantity: number
    unit_price: number
    discount_amount: number
  }>
  payment_method: string
  currency: string
  exchange_rate?: number
  payment_splits?: Array<{
    payment_method: string
    currency: string
    amount: number
    reference: string
  }>
  amount_paid: number
  discount_amount: number
  subtotal: number
  tax_amount: number
  total_amount: number
  created_at: string
  synced: boolean
  sync_error?: string
}

interface OfflineProduct {
  id: number
  name: string
  sku: string
  barcode: string
  rfid_tag?: string
  selling_price: string
  current_price: string
  cached_at: string
}

interface OfflineDB extends DBSchema {
  sales: {
    key: string
    value: OfflineSale
    indexes: { 'by-synced': boolean; 'by-date': string }
  }
  products: {
    key: number
    value: OfflineProduct
    indexes: { 'by-sku': string; 'by-barcode': string; 'by-rfid': string }
  }
  syncQueue: {
    key: string
    value: { id: string; type: string; data: any; created_at: string }
  }
}

let db: IDBPDatabase<OfflineDB> | null = null

export async function initOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (db) return db

  db = await openDB<OfflineDB>('retail-pos-offline', 1, {
    upgrade(db) {
      // Sales store
      if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { keyPath: 'local_id' })
        salesStore.createIndex('by-synced', 'synced')
        salesStore.createIndex('by-date', 'created_at')
      }

      // Products cache store
      if (!db.objectStoreNames.contains('products')) {
        const productsStore = db.createObjectStore('products', { keyPath: 'id' })
        productsStore.createIndex('by-sku', 'sku')
        productsStore.createIndex('by-barcode', 'barcode')
        if (!productsStore.indexNames.contains('by-rfid')) {
          productsStore.createIndex('by-rfid', 'rfid_tag', { unique: false })
        }
      }

      // Sync queue
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' })
      }
    },
  })

  return db
}

// Sales operations
export async function saveOfflineSale(sale: OfflineSale): Promise<string> {
  const database = await initOfflineDB()
  const localId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const offlineSale: OfflineSale = {
    ...sale,
    local_id: localId,
    created_at: new Date().toISOString(),
    synced: false
  }

  await database.put('sales', offlineSale)
  await database.put('syncQueue', {
    id: localId,
    type: 'sale',
    data: sale,
    created_at: new Date().toISOString()
  })

  return localId
}

export async function getOfflineSales(): Promise<OfflineSale[]> {
  const database = await initOfflineDB()
  return database.getAll('sales')
}

export async function getUnsyncedSales(): Promise<OfflineSale[]> {
  try {
    const database = await initOfflineDB()
    // Use getAll and filter instead of index for better compatibility
    const allSales = await database.getAll('sales')
    return allSales.filter(sale => !sale.synced)
  } catch (error) {
    console.error('Error getting unsynced sales:', error)
    return []
  }
}

export async function markSaleSynced(localId: string) {
  const database = await initOfflineDB()
  const sale = await database.get('sales', localId)
  if (sale) {
    sale.synced = true
    await database.put('sales', sale)
    await database.delete('syncQueue', localId)
  }
}

export async function markSaleSyncError(localId: string, error: string) {
  const database = await initOfflineDB()
  const sale = await database.get('sales', localId)
  if (sale) {
    sale.sync_error = error
    await database.put('sales', sale)
  }
}

// Product cache operations
export async function cacheProduct(product: OfflineProduct) {
  const database = await initOfflineDB()
  await database.put('products', {
    ...product,
    cached_at: new Date().toISOString()
  })
}

export async function getCachedProduct(productId: number): Promise<OfflineProduct | undefined> {
  const database = await initOfflineDB()
  return database.get('products', productId)
}

export async function searchCachedProducts(query: string): Promise<OfflineProduct[]> {
  const database = await initOfflineDB()
  const products = await database.getAll('products')
  
  const lowerQuery = query.toLowerCase()
  return products.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.sku.toLowerCase().includes(lowerQuery) ||
    p.barcode.toLowerCase().includes(lowerQuery) ||
    (p.rfid_tag && p.rfid_tag.toLowerCase().includes(lowerQuery))
  )
}

// Sync operations
export async function syncOfflineSales(): Promise<{ success: number; failed: number }> {
  const database = await initOfflineDB()
  const unsynced = await getUnsyncedSales()
  
  let success = 0
  let failed = 0

  for (const sale of unsynced) {
    try {
      // Convert offline sale to API format
      const saleData = {
        branch_id: sale.branch_id,
        customer_id: sale.customer_id,
        items: sale.items,
        payment_method: sale.payment_method,
        currency: sale.currency,
        exchange_rate: sale.exchange_rate,
        payment_splits: sale.payment_splits,
        amount_paid: sale.amount_paid,
        discount_amount: sale.discount_amount,
        is_offline: true
      }

      // Attempt to sync (this should use api.post from api.ts)
      const response = await fetch('/api/pos/sales/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(saleData)
      })

      if (response.ok) {
        await markSaleSynced(sale.local_id)
        success++
      } else {
        const error = await response.text()
        await markSaleSyncError(sale.local_id, error)
        failed++
      }
    } catch (error: any) {
      await markSaleSyncError(sale.local_id, error.message)
      failed++
    }
  }

  return { success, failed }
}

// Network status
export function isOnline(): boolean {
  return navigator.onLine
}

export function registerNetworkListener(callback: (online: boolean) => void) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }
  return null
}


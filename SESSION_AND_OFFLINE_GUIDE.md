# Session Persistence & Offline Functionality Guide

## Session Persistence

### How It Works

1. **Token Storage**: 
   - Access tokens and refresh tokens are stored in `localStorage`
   - Persists across page refreshes and browser restarts

2. **Token Lifetimes**:
   - **Access Token**: 1 hour (auto-refreshes when expired)
   - **Refresh Token**: 7 days
   - **Idle Timeout**: 30 minutes of inactivity

3. **Page Refresh Behavior**:
   - On page refresh, the app checks if tokens exist in localStorage
   - If tokens exist, it calls `/auth/auth/me/` to verify and refresh user data
   - If access token is expired, it automatically uses refresh token to get a new one
   - **You will NOT be logged out on refresh** unless:
     - Token is expired AND refresh token is also expired (after 7 days)
     - You've been idle for 30+ minutes
     - You manually log out

4. **Automatic Token Refresh**:
   - When API returns 401 (Unauthorized), the interceptor automatically:
     1. Uses refresh token to get new access token
     2. Retries the original request with new token
     3. Only logs out if refresh token is also expired

### Idle Timeout (30 Minutes)

- **Monitors**: Mouse movements, clicks, keyboard input, scrolling, touch events
- **Action**: After 30 minutes of no activity, automatically logs out
- **Tab Switching**: If you switch tabs and come back after 30+ minutes, you'll be logged out
- **Reset**: Any user activity resets the 30-minute timer

## Offline Functionality

### ✅ Fully Implemented

The system has **complete offline support** for POS operations:

### 1. **IndexedDB Storage**
- **Database Name**: `retail-pos-offline`
- **Stores**:
  - **Sales**: Offline sales with full transaction details
  - **Products**: Cached product data for offline search
  - **Sync Queue**: Pending operations to sync when online

### 2. **Service Worker (PWA)**
- **Registered**: Automatically on app load
- **Caching Strategy**:
  - **Static Assets**: Cached for offline access
  - **API Calls**: Network-first (tries network, falls back to cache)
  - **Fonts**: Cache-first (1 year expiration)

### 3. **Offline POS Features**

#### Sales Processing:
- ✅ Save sales to IndexedDB when offline
- ✅ Generate local invoice numbers (`OFFLINE-{timestamp}`)
- ✅ Full transaction details preserved (items, payments, discounts, taxes)
- ✅ Serial number tracking works offline
- ✅ Payment splits supported offline

#### Product Search:
- ✅ Cached products available offline
- ✅ Search by name, SKU, barcode, RFID
- ✅ Last fetched products remain accessible

#### Auto-Sync:
- ✅ Automatically detects when connection is restored
- ✅ Syncs all unsynced sales in background
- ✅ Shows success/error notifications
- ✅ Retries failed syncs on next connection

### 4. **How Offline Mode Works**

#### When Going Offline:
1. System detects `navigator.onLine === false`
2. POS switches to offline mode
3. Sales are saved to IndexedDB instead of API
4. User sees "Offline Mode" indicator

#### When Coming Back Online:
1. System detects `navigator.onLine === true`
2. Automatically triggers sync process
3. All unsynced sales are sent to server
4. Success/error notifications shown
5. POS switches back to online mode

### 5. **Offline Data Structure**

```typescript
interface OfflineSale {
  local_id: string              // Unique offline ID
  branch_id: number
  customer_id?: number
  items: Array<{
    product_id: number
    quantity: number
    unit_price: number
    discount_amount: number
    serial_numbers?: string[]   // Serial tracking
  }>
  payment_method: string
  currency: string
  payment_splits?: Array<{...}>  // Split payments
  amount_paid: number
  discount_amount: number
  subtotal: number
  tax_amount: number
  total_amount: number
  created_at: string
  synced: boolean                // Sync status
  sync_error?: string            // Error if sync failed
}
```

### 6. **Limitations**

**What Works Offline:**
- ✅ Process sales
- ✅ Search cached products
- ✅ Generate receipts
- ✅ Track serial numbers
- ✅ Handle split payments

**What Doesn't Work Offline:**
- ❌ Fetch new products (uses cached data)
- ❌ Real-time inventory updates
- ❌ Customer lookup (uses cached data)
- ❌ Reports generation
- ❌ Settings changes

### 7. **Testing Offline Mode**

1. **Chrome DevTools**:
   - Open DevTools → Network tab
   - Select "Offline" from throttling dropdown
   - Try processing a sale

2. **Disable Network**:
   - Turn off WiFi/network
   - Process sales
   - Turn network back on
   - Watch auto-sync happen

3. **Check IndexedDB**:
   - Chrome DevTools → Application → IndexedDB
   - View `retail-pos-offline` database
   - See stored sales and products

## Summary

### Session Persistence ✅
- ✅ Tokens persist across refreshes
- ✅ Auto token refresh on expiration
- ✅ 30-minute idle timeout
- ✅ 7-day refresh token lifetime

### Offline Functionality ✅
- ✅ Full POS offline support
- ✅ IndexedDB storage
- ✅ Service worker (PWA)
- ✅ Auto-sync when online
- ✅ Offline sales tracking
- ✅ Product caching

**You can safely refresh the page - you'll stay logged in unless you've been idle for 30+ minutes or your refresh token expired (7 days).**



# Returns and Role-Based Operations Implementation

## Overview
This document describes the implementation of return handling for both customer sales and supplier purchases, along with role-based permissions for cashiers and supervisors.

## Features Implemented

### 1. Customer Returns (Sale Returns)
- **Models**: `SaleReturn`, `SaleReturnItem`
- **Features**:
  - Return items from completed sales
  - Track return reasons (defective, wrong item, changed mind, etc.)
  - Process refunds (cash, mobile money, store credit, exchange)
  - Supervisor approval workflow
  - Automatic stock restoration
  - Return number generation (RET-YYYYMMDD-XXXX)

### 2. Supplier Returns (Purchase Returns)
- **Models**: `PurchaseReturn`, `PurchaseReturnItem`
- **Features**:
  - Return goods to suppliers
  - Link to purchase orders and GRNs
  - Supervisor approval workflow
  - Stock deduction upon processing
  - Supplier acknowledgment tracking
  - Return number generation (PRET-YYYYMMDD-XXXX)

### 3. Role-Based Permissions

#### Cashier Role
**Capabilities:**
- ✅ Create sales (POS)
- ✅ View sales history
- ✅ Create sale returns (pending supervisor approval)
- ✅ Process approved returns
- ❌ Approve returns
- ❌ Reject returns
- ❌ Create purchase returns
- ❌ Modify inventory directly

**Approval Requirements:**
- Returns over $100
- Defective/expired product returns
- Any return created by cashier

#### Supervisor Role
**Capabilities:**
- ✅ All cashier capabilities
- ✅ Approve/reject returns
- ✅ Create purchase returns
- ✅ Process purchase returns
- ✅ Override prices (with reason)
- ✅ Access reports
- ✅ Modify inventory
- ✅ Approve void transactions

**Approval Workflow:**
- Can approve cashier-created returns
- Can create returns that don't need approval (self-approved)
- Can reject returns with reason

#### Stock Controller Role
- ✅ Create purchase returns
- ✅ Process approved purchase returns
- ✅ Manage inventory
- ❌ Approve returns (supervisor approval needed)

#### Manager/Tenant Admin Role
- ✅ All supervisor capabilities
- ✅ Full system access
- ✅ No approval needed for own actions

## API Endpoints

### Sale Returns
- `GET /api/pos/sale-returns/` - List all sale returns
- `POST /api/pos/sale-returns/` - Create a sale return
- `GET /api/pos/sale-returns/{id}/` - Get return details
- `POST /api/pos/sale-returns/{id}/approve/` - Approve return (supervisor)
- `POST /api/pos/sale-returns/{id}/reject/` - Reject return (supervisor)
- `POST /api/pos/sale-returns/{id}/process/` - Process approved return

### Purchase Returns
- `GET /api/pos/purchase-returns/` - List all purchase returns
- `POST /api/pos/purchase-returns/` - Create a purchase return
- `GET /api/pos/purchase-returns/{id}/` - Get return details
- `POST /api/pos/purchase-returns/{id}/approve/` - Approve return (supervisor)
- `POST /api/pos/purchase-returns/{id}/process/` - Process approved return

## Workflow Examples

### Customer Return Workflow
1. **Cashier** creates return for a sale
   - Selects sale and items to return
   - Enters return reason
   - System calculates refund amount
   - Status: `pending` (if needs approval) or `approved` (if supervisor)

2. **Supervisor** reviews and approves
   - Views pending returns
   - Can approve or reject with reason
   - Status: `approved` or `rejected`

3. **Cashier** processes approved return
   - System restores stock
   - Updates sale status if fully returned
   - Status: `processed`

### Supplier Return Workflow
1. **Stock Controller/Supervisor** creates return
   - Selects purchase order and items
   - Enters return reason
   - Status: `pending` (if stock controller) or `approved` (if supervisor)

2. **Supervisor** approves (if needed)
   - Status: `approved`

3. **Stock Controller/Supervisor** processes return
   - System deducts stock
   - Status: `processed`

4. **Optional**: Supplier acknowledgment
   - Mark as `received_by_supplier`
   - Add supplier credit note number

## Database Models

### SaleReturn
- Links to original Sale
- Tracks refund method and amount
- Approval workflow fields
- Stock restoration on process

### PurchaseReturn
- Links to PurchaseOrder
- Tracks supplier acknowledgment
- Stock deduction on process

## Security Considerations
- Role-based permission checks in all views
- Transaction atomicity for data consistency
- Stock quantity validation before returns
- Approval audit trail (who approved, when)

## Next Steps
1. Frontend UI components for returns
2. Notifications for pending approvals
3. Return reports and analytics
4. Return policy configuration
5. Automated return expiration




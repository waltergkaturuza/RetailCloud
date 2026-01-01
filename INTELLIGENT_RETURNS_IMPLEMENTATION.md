# Intelligent Returns Handling Implementation

## Overview
This document describes the intelligent returns processing system that handles condition-based inventory restoration, financial impact tracking, and write-offs for both customer and supplier returns.

## Key Features

### 1. Condition-Based Inventory Handling

#### Customer Returns (Sale Returns)
The system intelligently handles returned goods based on their condition:

**Restorable Conditions** (goods go back to inventory):
- `new` - Unopened, in original packaging
- `opened` - Opened but still sellable

**Non-Restorable Conditions** (goods are disposed/written off):
- `damaged` - Physically damaged, cannot be sold
- `defective` - Product defect, cannot be sold
- `expired` - Past expiry date

**Processing Logic:**
- ✅ Restorable items: Stock is restored to inventory
- ❌ Non-restorable items: Stock is NOT restored (write-off)
- 📊 Both scenarios create proper stock movement records
- 💰 Financial impact is calculated differently for each

### 2. Financial Impact Tracking

#### For Restorable Returns:
- **COGS Reversed**: Cost of goods can be recovered
- **Profit Impact**: Loss of profit (revenue - cost)
- **Net Impact**: -(profit) = Loss of profit margin only

#### For Damaged/Defective Returns:
- **Write-off Amount**: Full cost of goods lost
- **Revenue Loss**: Full refund given to customer
- **Net Impact**: -(revenue + cost) = Total loss (no recovery possible)

#### Example Calculation:
```
Scenario 1: Good condition return
- Product cost: $10
- Selling price: $20
- Profit loss: $10 (revenue - cost)
- COGS recovered: $10
- Net loss: $10

Scenario 2: Damaged return
- Product cost: $10
- Selling price: $20
- Revenue loss: $20 (refund)
- Write-off: $10 (cost lost)
- Net loss: $30 (total)
```

### 3. Refund Processing & Cash Tracking

Returns are automatically linked to cash transactions:
- **Cash Refunds**: Recorded as `cash_out` transactions
- **Mobile Money/Card Refunds**: Tracked for reconciliation
- **Store Credit**: No cash transaction (account-based)
- **Large Refunds**: Require supervisor approval (>$100)

Refund transactions are automatically:
- Linked to the till float (if available)
- Tagged with return number for audit trail
- Include return reason and method for reporting

### 4. Supplier Returns (Purchase Returns)

#### Standard Return Flow:
- Goods removed from inventory
- Stock deducted immediately
- Supplier acknowledgment tracked
- Credit note recording

#### Write-Off Handling (Cannot Return to Supplier):
When goods cannot be returned to supplier (e.g., supplier won't accept, too old, etc.):
- Stock is still removed from inventory
- Full cost is written off
- Movement type: `purchase_return_disposed`
- Notes clearly indicate write-off reason

**Example Scenario:**
- Received defective goods from supplier
- Supplier policy: No returns after 30 days
- Goods sit in warehouse for 45 days
- System marks as write-off when processing return

### 5. Stock Movement Types

New movement types added:
- `return_restored` - Customer return restored to inventory
- `return_disposed` - Customer return disposed (damaged)
- `return_to_supplier` - Standard supplier return
- `purchase_return_disposed` - Supplier return write-off

Each movement includes:
- Quantity before/after
- Reference to return document
- Condition and notes
- User who processed

## API Endpoints

### Enhanced Sale Return Processing
```
POST /api/pos/sale-returns/{id}/process/
```

**Request Body (optional):**
```json
{
  "till_float_id": 123  // Optional: Link to till float for cash tracking
}
```

**Response:**
```json
{
  "id": 1,
  "return_number": "RET-20241201-0001",
  "status": "processed",
  "processing_results": {
    "inventory_restored": 5,
    "inventory_damaged": 2,
    "total_refund": 150.00,
    "write_off_amount": 20.00,
    "cogs_reversed": 50.00,
    "profit_loss_impact": -80.00,
    "items_processed": [...]
  },
  "financial_summary": {
    "total_refund": 150.00,
    "total_cost_impact": 50.00,
    "total_write_off": 20.00,
    "net_loss": 170.00,
    "items": [...]
  }
}
```

### Financial Summary Endpoint
```
GET /api/pos/sale-returns/{id}/financial_summary/
```

Returns detailed financial breakdown including:
- Refund amounts per item
- Cost impacts
- Write-offs
- Profit/loss calculations
- Restoration eligibility

### Supplier Return Processing
```
POST /api/pos/purchase-returns/{id}/process/
```

**Request Body:**
```json
{
  "can_return_to_supplier": false  // Set to false for write-off
}
```

## Database Models

### Enhanced Return Models
- `SaleReturnItem.condition` - Tracks item condition
- `SaleReturnItem.condition_notes` - Additional condition details
- `PurchaseReturnItem.condition` - Same for supplier returns

### Stock Movement Enhancements
- New movement types for return scenarios
- Complete audit trail with before/after quantities
- Reference linking to return documents

## Business Logic Flow

### Customer Return Processing:
1. **Create Return** → Cashier creates return with condition assessment
2. **Supervisor Approval** → If required (amount > $100, damaged goods)
3. **Process Return** → System automatically:
   - Checks condition of each item
   - Restores inventory if condition allows
   - Creates write-off if damaged/defective
   - Processes refund payment
   - Records cash transaction
   - Updates sale status if fully returned

### Supplier Return Processing:
1. **Create Return** → Stock controller creates return
2. **Supervisor Approval** → Required for all purchase returns
3. **Determine Returnability** → Can goods be returned to supplier?
4. **Process Return** → System automatically:
   - Removes stock from inventory
   - If can return: Normal supplier return flow
   - If cannot return: Write-off with full cost loss
   - Records appropriate stock movements

## Profit & Loss Impact

Returns affect P&L in several ways:

### Customer Returns:
- **Revenue Reduction**: Refund reduces total revenue
- **COGS Adjustment**: Reversed for restorable items
- **Write-offs**: Expense for damaged items
- **Net Effect**: Negative impact on gross profit

### Supplier Returns:
- **Inventory Reduction**: Decreases inventory asset
- **Cost Recovery**: If supplier accepts return (credit/refund)
- **Write-offs**: Expense if cannot return
- **Net Effect**: Improves cash flow if returned, loss if written off

## Reporting & Analytics

### Return Analytics (Future Enhancement):
- Return rate by product/category
- Return reasons analysis
- Condition-based return statistics
- Write-off tracking and trends
- Profit impact analysis

### Financial Reports:
- Returns affect:
  - Sales reports (net sales after returns)
  - Inventory valuation
  - Cost of goods sold
  - Profit & loss statements
  - Cash flow reports

## Security & Permissions

- **Cashiers**: Can create returns, process approved returns
- **Supervisors**: Can approve/reject returns, process all returns
- **Stock Controllers**: Can create purchase returns
- **Managers/Admins**: Full access to all return operations

## Best Practices

1. **Always Assess Condition**: Don't automatically restore all returns
2. **Document Damaged Goods**: Use condition notes for audit trail
3. **Process Promptly**: Handle returns quickly to maintain cash flow
4. **Review Write-offs**: Regularly review write-offs to identify trends
5. **Supplier Communication**: Clearly document why goods can't be returned

## Future Enhancements

- [ ] Return policy configuration (time limits, conditions)
- [ ] Automated condition assessment workflows
- [ ] Integration with quality control systems
- [ ] Advanced return analytics dashboard
- [ ] Email notifications for high-value write-offs
- [ ] Return trend forecasting
- [ ] Supplier return credit tracking




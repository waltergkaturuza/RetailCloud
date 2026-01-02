# Module Visibility Explanation

## Current Behavior

### Owner Side (Module Activations Page)
The **Module Activations** page shows **activation requests from tenants**, not all available modules. This is why you see "No module activations found" - it's correct if no tenants have requested modules yet.

**This page shows:**
- Tenant module activation requests (pending, active, etc.)
- Allows owner to approve/reject requests

**This page does NOT show:**
- List of all available modules in the system

### Tenant Side (Settings → Modules Tab)
Tenants see modules based on their **business category recommendations**. Modules only appear if:
1. Tenant has selected a business category
2. The module is mapped/recommended for that category

## Solution: Make Modules Visible

To make modules (including accounting) visible, you have two options:

### Option 1: Add Accounting to Business Categories (Recommended)
Add the accounting module to business category recommendations so tenants see it:

```python
# This would need to be done in Django admin or via management command
# The accounting module should be recommended for categories that need accounting
```

### Option 2: Show All Modules (Not Just Recommended)
Modify the frontend/backend to show all available modules, not just recommended ones.

## Current Status

✅ **Accounting module exists** in database (code: `accounting`)
✅ **Accounting module is active**
❌ **Accounting module is NOT mapped to any business categories** (so tenants won't see it)

## Quick Fix

To make the accounting module visible to tenants:
1. Go to Django Admin → Business Categories
2. Edit each category that should have accounting
3. Add "accounting" module to the recommended modules
4. OR run a management command to add accounting to relevant categories

## API Endpoints

- **GET `/api/core/modules/`** - Returns ALL active modules (including accounting)
- **GET `/api/subscriptions/tenant-modules/recommended/`** - Returns recommended modules for tenant's category
- **GET `/api/subscriptions/tenant-modules/`** - Returns tenant's activated modules

The accounting module will appear in `/api/core/modules/` but NOT in `/api/subscriptions/tenant-modules/recommended/` unless it's mapped to the tenant's business category.


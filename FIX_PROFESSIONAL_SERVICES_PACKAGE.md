# Fix: Professional Services Pack Not Showing

## Issue
The Professional Services Pack package was not appearing in the package list.

## Root Cause
The `setup_modules` management command used `get_or_create()` which only creates packages if they don't exist. If a package already exists, it was skipped and not updated with new modules.

## Solution
Updated the `setup_modules` command to:
1. Create new packages if they don't exist
2. **Update existing packages** with new data and modules if they do exist

## How to Fix

### Option 1: Run Setup Command (Recommended)
Run the setup command to update all packages:
```bash
python manage.py setup_modules
```

This will:
- Create the Professional Services Pack if it doesn't exist
- Update it with the correct modules if it already exists
- Update all other packages as well

### Option 2: Manual Update via Django Admin
1. Go to Django Admin
2. Navigate to **Packages**
3. Find "Professional Services Pack"
4. Edit it and ensure:
   - `is_active` is checked
   - Modules include:
     - Quotations & Invoicing
     - Sales & Customer Management
     - Financial Reporting
     - Double-Entry Accounting
     - Multi-Branch Management
     - User Roles & Permissions
     - Inventory Management
5. Save

### Option 3: Manual Update via API (for owners)
```bash
# Get package ID
GET /api/subscriptions/packages/

# Update package
PATCH /api/subscriptions/packages/{id}/
{
  "is_active": true,
  "module_ids": [1, 2, 3, ...]  # IDs of modules to include
}
```

## Professional Services Pack Details

- **Name**: Professional Services Pack
- **Code**: `professional_services`
- **Price**: $35/month or $350/year
- **Max Users**: 15
- **Max Branches**: 5
- **Modules**:
  - Quotations & Invoicing
  - Sales & Customer Management
  - Financial Reporting
  - Double-Entry Accounting
  - Multi-Branch Management
  - User Roles & Permissions
  - Inventory Management

## Verification

After running the setup command, verify the package exists:
```bash
# In Django shell
from core.models import Package
pkg = Package.objects.get(code='professional_services')
print(f"Package: {pkg.name}")
print(f"Active: {pkg.is_active}")
print(f"Modules: {[m.name for m in pkg.modules.all()]}")
```

Or check via API:
```bash
GET /api/subscriptions/packages/?code=professional_services
```


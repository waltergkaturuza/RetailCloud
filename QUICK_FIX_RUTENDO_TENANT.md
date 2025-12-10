# 🔧 Quick Fix: Assign Tenant to "rutendo" User

## Problem
The user "rutendo" exists in the database but doesn't appear on the Users page because they have **no tenant assigned**.

Looking at Django admin:
- ✅ `admin@shopmanagementsys.com` → Tenant: **"Default Shop"**
- ❌ `rutendo@shopmanagementsys.com` → Tenant: **"-"** (none)

## Quick Fix (Choose One Method)

### Method 1: Django Admin (Easiest)
1. Go to: `http://localhost:8000/admin/accounts/user/`
2. Find and click on user "rutendo"
3. Scroll to "Tenant Info" section
4. Select **"Default Shop"** from the Tenant dropdown
5. Click "Save"
6. ✅ Rutendo will now appear on Users page!

### Method 2: Django Shell
```python
python manage.py shell
```

Then run:
```python
from accounts.models import User
from core.models import Tenant

# Get user and tenant
rutendo = User.objects.get(email='rutendo@shopmanagementsys.com')
tenant = Tenant.objects.filter(company_name__icontains='Default').first()  # or get by ID

# Assign tenant
rutendo.tenant = tenant
rutendo.save()

print(f"✅ Assigned {rutendo.email} to tenant: {tenant.company_name}")
```

### Method 3: SQL Direct (If needed)
```sql
UPDATE users 
SET tenant_id = (SELECT id FROM tenants WHERE company_name = 'Default Shop' LIMIT 1)
WHERE email = 'rutendo@shopmanagementsys.com';
```

## After Fix
Once rutendo has a tenant assigned:
- ✅ They will appear in the Users page
- ✅ They will be visible to tenant admins
- ✅ All filtering will work correctly

## Prevention
I've already fixed the user creation logic so future users created through the API will automatically get assigned to the creator's tenant.

---

**Next Step:** Assign tenant to rutendo using Method 1 (Django Admin) - it's the quickest! 🚀



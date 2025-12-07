# 🔧 Fix: Users Not Appearing - Missing Tenant Assignment

## Problem
The user "rutendo" exists in the database but doesn't appear on the Users page because they have **no tenant assigned**.

From Django admin:
- ✅ `admin@shopmanagementsys.com` → Tenant: **"Default Shop"**
- ❌ `rutendo@shopmanagementsys.com` → Tenant: **"-"** (none)

## Why This Happens
The filtering logic correctly filters by tenant. Users without a tenant won't appear because:
- Tenant admins only see users in their tenant
- Users without tenants don't match any tenant filter

## Quick Fix Options

### Option 1: Django Admin (Easiest - 2 minutes)
1. Go to: `http://localhost:8000/admin/accounts/user/`
2. Click on user "rutendo" (`rutendo@shopmanagementsys.com`)
3. In "Tenant Info" section, select **"Default Shop"**
4. Click "Save"
5. ✅ Refresh Users page - rutendo will appear!

### Option 2: Management Command (Best for bulk fixes)
I've created a management command:

```bash
# Assign specific user to tenant
python manage.py assign_user_tenant --user-email rutendo@shopmanagementsys.com --tenant-name "Default Shop"

# Or assign ALL users without tenants to a tenant
python manage.py assign_user_tenant --all-unassigned --tenant-name "Default Shop"
```

### Option 3: Django Shell
```python
python manage.py shell

from accounts.models import User
from core.models import Tenant

rutendo = User.objects.get(email='rutendo@shopmanagementsys.com')
tenant = Tenant.objects.get(company_name='Default Shop')  # or filter by ID/name

rutendo.tenant = tenant
rutendo.save()

print(f"✅ Assigned {rutendo.email} to {tenant.company_name}")
```

## Prevention (Already Fixed)
I've updated the user creation logic so:
- ✅ New users created by tenant admin automatically get assigned to the admin's tenant
- ✅ Uses `user.tenant` as primary source (most reliable)
- ✅ Future users won't have this issue

## After Fix
Once rutendo (and any other users) have tenants assigned:
- ✅ They will appear on the Users page
- ✅ Tenant admins can see and manage them
- ✅ All filtering and permissions work correctly

---

**Recommended:** Use Option 1 (Django Admin) for immediate fix, or Option 2 (Management Command) if you have multiple users to fix! 🚀


# 🔧 Fix 400 Errors - Tenant Association Issue

## Problem

All API endpoints are returning 400 errors with message:
```
"No tenant found. Please ensure you are associated with a tenant."
```

This happens when:
- The logged-in user doesn't have a `tenant` relationship
- The user is a system owner (super_admin) without a tenant
- The user's tenant field is `NULL`

## Quick Diagnosis

The 400 errors occur because:
1. User is authenticated (can login)
2. But user doesn't have a tenant associated
3. Reports endpoints require a tenant to filter data

## Solution 1: Check Your User's Tenant (Render Console)

### Step 1: Connect to Render Console

1. Go to your Render Dashboard
2. Click on your **Backend Web Service**
3. Go to **Shell** tab
4. Or use **View Logs** and run commands

### Step 2: Check User's Tenant Status

Run this in Django shell:

```bash
python manage.py shell
```

Then in the shell:

```python
from accounts.models import User
from core.models import Tenant

# Check your user (replace 'your-email@example.com' with your actual email)
user = User.objects.get(email='your-email@example.com')

# Check tenant status
print(f"User: {user.email}")
print(f"Tenant: {user.tenant}")
print(f"Role: {user.role}")
print(f"Is Super Admin: {user.role == 'super_admin'}")

# If tenant is None, that's the problem!
if user.tenant is None:
    print("❌ PROBLEM: User has no tenant!")
    
    # Check if you're a super_admin
    if user.role == 'super_admin':
        print("⚠️  You are a super_admin - you cannot access tenant endpoints directly")
        print("   You need to create/login as a tenant user instead")
    else:
        print("⚠️  You are a tenant user but missing tenant association")
        print("   Need to associate user with a tenant")
```

## Solution 2: Create/Assign Tenant (If Missing)

### Option A: If You're a Super Admin (System Owner)

**Super admins don't have tenants** - they manage the system, not individual tenants.

To access tenant features, you need to:
1. **Create a tenant account** (regular user role)
2. **Or login as a tenant user** (not super_admin)

### Option B: Associate User with Tenant

If your user should have a tenant but doesn't:

```python
from accounts.models import User
from core.models import Tenant

# Get your user
user = User.objects.get(email='your-email@example.com')

# Get or create a tenant
tenant, created = Tenant.objects.get_or_create(
    company_name="Your Company Name",
    defaults={
        'slug': 'your-company-slug',
        'is_active': True,
    }
)

# Associate user with tenant
user.tenant = tenant
user.role = 'tenant_admin'  # or 'manager', 'sales_person', etc.
user.save()

print(f"✅ User {user.email} now associated with tenant: {tenant.company_name}")
```

## Solution 3: Create a New Tenant User (Recommended)

If you're currently logged in as a super_admin, create a new tenant user:

### Step 1: Create Tenant (if doesn't exist)

```python
from core.models import Tenant

tenant, created = Tenant.objects.get_or_create(
    company_name="My Company",
    defaults={
        'slug': 'my-company',
        'is_active': True,
    }
)

if created:
    print(f"✅ Created tenant: {tenant.company_name}")
else:
    print(f"✅ Using existing tenant: {tenant.company_name}")
```

### Step 2: Create Tenant User

```python
from accounts.models import User

# Create user for tenant
tenant_user, created = User.objects.get_or_create(
    email='tenant@example.com',  # Change to your preferred email
    defaults={
        'username': 'tenant_user',
        'first_name': 'Tenant',
        'last_name': 'User',
        'tenant': tenant,
        'role': 'tenant_admin',
        'is_active': True,
    }
)

# Set password
if created:
    tenant_user.set_password('YourSecurePassword123!')
    tenant_user.save()
    print(f"✅ Created tenant user: {tenant_user.email}")
else:
    print(f"✅ User already exists: {tenant_user.email}")
    tenant_user.set_password('YourSecurePassword123!')
    tenant_user.save()
    print(f"✅ Updated password for: {tenant_user.email}")
```

### Step 3: Login with Tenant User

1. Logout from current session
2. Login with the new tenant user credentials
3. All API endpoints should now work!

## Solution 4: Check Existing Tenants

See what tenants exist:

```python
from core.models import Tenant

tenants = Tenant.objects.all()
print(f"Total tenants: {tenants.count()}")

for tenant in tenants:
    user_count = tenant.users.count()
    print(f"\nTenant: {tenant.company_name}")
    print(f"  Slug: {tenant.slug}")
    print(f"  Active: {tenant.is_active}")
    print(f"  Users: {user_count}")
    
    # List users
    for user in tenant.users.all():
        print(f"    - {user.email} ({user.role})")
```

## Solution 5: Fix User Role

If your user has a tenant but wrong role:

```python
from accounts.models import User

user = User.objects.get(email='your-email@example.com')

# Check current role
print(f"Current role: {user.role}")
print(f"Tenant: {user.tenant}")

# Fix role (if needed)
if user.tenant and user.role == 'super_admin':
    user.role = 'tenant_admin'  # Change to appropriate role
    user.save()
    print(f"✅ Updated role to: {user.role}")
```

## Quick Fix Script (All-in-One)

Run this to diagnose and fix:

```python
from accounts.models import User
from core.models import Tenant

# Your email
EMAIL = 'your-email@example.com'

try:
    user = User.objects.get(email=EMAIL)
    
    print(f"User: {user.email}")
    print(f"Role: {user.role}")
    print(f"Tenant: {user.tenant}")
    
    if user.tenant is None:
        print("\n❌ User has no tenant!")
        
        # Option 1: If super_admin, create tenant user instead
        if user.role == 'super_admin':
            print("\n⚠️  You are super_admin - create a tenant user instead")
            print("   Run the tenant user creation steps above")
        else:
            # Option 2: Associate with existing tenant or create new
            tenant = Tenant.objects.first()  # Get first tenant
            if tenant:
                user.tenant = tenant
                user.save()
                print(f"✅ Associated with tenant: {tenant.company_name}")
            else:
                print("❌ No tenants exist. Create one first.")
    else:
        print(f"\n✅ User has tenant: {user.tenant.company_name}")
        if user.role == 'super_admin':
            print("⚠️  Warning: super_admin role shouldn't have tenant")
            print("   Consider changing role to tenant_admin")
            
except User.DoesNotExist:
    print(f"❌ User {EMAIL} not found")
```

## Common Scenarios

### Scenario 1: System Owner (Super Admin)

**Problem:** Logged in as super_admin (system owner)
**Solution:** Create a tenant user and login with that instead

### Scenario 2: Tenant User Missing Tenant

**Problem:** User exists but `tenant` field is `NULL`
**Solution:** Associate user with a tenant using Solution 2

### Scenario 3: Wrong Role

**Problem:** User has tenant but role is `super_admin`
**Solution:** Change role to `tenant_admin`, `manager`, etc.

## Verify Fix

After fixing, verify:

```python
from accounts.models import User

user = User.objects.get(email='your-email@example.com')
print(f"✅ Tenant: {user.tenant}")
print(f"✅ Role: {user.role}")
print(f"✅ Active: {user.is_active}")

# Should output:
# ✅ Tenant: <Tenant: Your Company>
# ✅ Role: tenant_admin
# ✅ Active: True
```

Then login again and the 400 errors should be gone!

## Next Steps

1. ✅ Check your user's tenant status
2. ✅ Fix tenant association (if needed)
3. ✅ Login again
4. ✅ Verify API endpoints work

---

**The 400 errors will disappear once your user is properly associated with a tenant!** ✅



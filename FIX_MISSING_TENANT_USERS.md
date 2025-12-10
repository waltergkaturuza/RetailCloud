# Fix: Users Not Appearing - Missing Tenant Assignment

## Problem
Users exist in the database but don't appear on the Users page because they don't have a tenant assigned.

## Root Cause
The user "rutendo" (and possibly others) was created without a tenant assignment. The filtering logic correctly filters by tenant, so users without a tenant don't appear.

## Solution

### Option 1: Fix in Django Admin (Quick Fix)
1. Go to Django Admin: `/admin/accounts/user/`
2. Find the user "rutendo"
3. Edit the user
4. Assign them to the same tenant as the admin user ("Default Shop")
5. Save

### Option 2: Use Debug Endpoint (Diagnostic)
Created a debug endpoint to check tenant assignments:
- `GET /api/auth/debug/user-tenant-info/`

This shows:
- Current user's tenant
- All users and their tenant assignments
- Users without tenants
- What filtered users a tenant admin should see

### Option 3: Fix User Creation Logic (Preventive)
Updated the `create` method in `UserViewSet` to:
- **Always assign users to the creator's tenant**
- Use `user.tenant` as primary source (most reliable)
- Fallback to `request.tenant` if needed

### Option 4: Bulk Fix (If many users need fixing)
Create a Django management command or use Django shell to bulk-assign users to tenants.

## Updated Create Logic

```python
# Tenant admin creates users in their own tenant
if user_role == 'tenant_admin':
    tenant = user.tenant  # Primary source
    # Automatically assigns new users to creator's tenant
```

## Prevention
- New users created by tenant admin are automatically assigned to the admin's tenant
- Users created through the API will always get a tenant (if creator has one)



# 🔍 Verify Database Reset Cause

## Understanding "backend/ $" in Pre-Deploy Command

If Render shows "backend/ $" and it's auto-set when Root Directory is "backend/", this is likely just a **display indicator** showing commands run from that directory, NOT an actual command.

## Real Causes of Database Reset

Since the Dockerfile is safe (only uses `migrate`), the database reset must be from:

### 1. Database Service Being Recreated

**Check if database was recreated:**
- Go to Render Dashboard → PostgreSQL service (retailcloud-db)
- Check the **created date** or **updated date**
- If it shows it was created recently, that's the cause (new database = empty)

**Verify database is persistent:**
- The database service should be the same one across deployments
- Check the database service name/ID hasn't changed

### 2. Database Connection Pointing to Wrong Database

**Check environment variables:**
- Go to Backend Service → Environment tab
- Verify these match your actual database:
  - `DB_HOST`
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`

**Verify connection:**
- If these point to a different database, that's the issue

### 3. Migrations That Delete Data

**Check recent migrations:**
- Review migrations that were added recently
- Look for migrations that use `migrations.RunPython` to delete data
- Check for `migrations.DeleteModel` or field removals

### 4. Manual Database Reset

**Check if someone manually reset:**
- Check Render logs for manual commands
- Check if database service was deleted/recreated

## Verification Steps

### Step 1: Check Database Service Status

1. Go to Render Dashboard → **retailcloud-db** (PostgreSQL service)
2. Check **Settings** tab
3. Note the **Created** date
4. Check if it matches when you first set it up

**If Created date is recent (today/yesterday):**
- ❌ Database was recreated = data lost
- ✅ This is the cause

**If Created date is old:**
- ✅ Database is persistent
- ❌ Reset is from another cause

### Step 2: Check Backend Logs

1. Go to Backend Service → **Logs** tab
2. Look for recent deployment logs
3. Search for:
   - `flush`
   - `reset`
   - `drop`
   - `DELETE`
   - `TRUNCATE`

**What to look for:**
- If you see any of these commands in logs → that's the cause
- If you only see `migrate` → Dockerfile is fine, check other causes

### Step 3: Verify Environment Variables

1. Go to Backend Service → **Environment** tab
2. Verify database connection variables:
   ```
   DB_HOST=xxx
   DB_NAME=xxx
   DB_USER=xxx
   DB_PASSWORD=xxx
   ```
3. Make sure these point to the correct database service

**If DB_NAME changed:**
- ❌ Backend is connecting to a different database
- ✅ This is the cause

### Step 4: Check Migration History

Run this in Render Shell:
```bash
cd backend
python manage.py shell
```

```python
from django.db import connection
from django.contrib.contenttypes.models import ContentType
from core.models import Tenant

# Check current database
print(f"Database: {connection.settings_dict['NAME']}")

# Check if there's any data
tenant_count = Tenant.objects.count()
print(f"Tenants in database: {tenant_count}")

# Check migration history
from django.db.migrations.recorder import MigrationRecorder
migrations = MigrationRecorder.Migration.objects.all().order_by('-applied')
print(f"\nRecent migrations:")
for m in migrations[:10]:
    print(f"  {m.applied} - {m.app} - {m.name}")
```

## Most Likely Cause

Based on your setup:

**Most Likely: Database Service Was Recreated**
- If the PostgreSQL service was deleted and recreated
- New database = empty database
- All data is lost

**How to Prevent:**
- Never delete the database service
- Always use the same database service
- Enable automatic backups

## What "backend/ $" Means

Since you can't edit it and it was auto-set:

1. **It's likely just a display indicator** - Shows commands run from backend/ directory
2. **Not an actual command** - Render might use this to show context
3. **The actual command is from Dockerfile CMD** - Which is safe

## Action Items

1. ✅ **Verify database service hasn't been recreated**
2. ✅ **Check backend logs for any reset commands**
3. ✅ **Verify environment variables point to correct database**
4. ✅ **Check if database connection changed**
5. ✅ **Enable automatic backups on database service**

## Next Steps

**Please check:**
1. When was the database service (retailcloud-db) created?
2. Was it recreated recently?
3. What do the backend logs show during deployment?

This will help identify the exact cause!


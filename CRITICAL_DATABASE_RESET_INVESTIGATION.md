# 🚨 CRITICAL: Database Reset Investigation

## Problem

**ALL tenants and ALL users (including superuser) are being deleted.**

This indicates a **complete database reset**, not just data deletion.

## Critical Questions

### 1. Database Service Recreation

**CHECK IMMEDIATELY:**

1. Go to Render Dashboard → **retailcloud-db** (PostgreSQL service)
2. Click **Settings** tab
3. Check **"Created"** date
4. **Is it being recreated?** (Does the date change each time?)

**If database service is being deleted/recreated:**
- ❌ That's the cause - new database = empty database
- ✅ **Solution:** Never delete the database service

### 2. Database Connection Variables

**CHECK ENVIRONMENT VARIABLES:**

1. Go to Backend Service → **Environment** tab
2. Verify these are **CONSTANT** (don't change):
   - `DB_HOST`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`

**If these change:**
- ❌ Backend is connecting to different databases
- ✅ **Solution:** Ensure they point to the same database always

### 3. Database Name Generation

**CHECK IF DB_NAME IS DYNAMIC:**

If `DB_NAME` is something like:
- `retailcloud-${RANDOM}`
- `retailcloud-${TIMESTAMP}`
- Any variable that changes

**This would create new databases each time!**

**Should be:**
- `retailcloud-db` (fixed name)
- Or the actual database name from Render

### 4. Render Database Service Behavior

**CHECK RENDER DATABASE SETTINGS:**

1. Go to PostgreSQL service → **Settings**
2. Check:
   - **Database Name** - Should be fixed, not changing
   - **Auto-backup** - Should be enabled
   - **Plan** - Should be persistent (not free/trial that gets deleted)

## Most Likely Causes

### Cause 1: Database Service Being Deleted/Recreated ⚠️ MOST LIKELY

**Symptom:**
- Database service "Created" date changes
- All data disappears
- Happens on deployments or manually

**Check:**
- Go to Render Dashboard → PostgreSQL service
- Check creation date
- Check if it was manually deleted/recreated

**Solution:**
- **Never delete the database service**
- Use the same database service for all deployments
- Enable automatic backups

### Cause 2: Database Connection Changing

**Symptom:**
- DB_NAME or DB_HOST environment variables change
- Backend connects to different database

**Check:**
- Go to Backend Service → Environment tab
- Verify DB_NAME is constant
- Check if it's using a variable that changes

**Solution:**
- Use fixed database name
- Never use variables in DB_NAME that could change

### Cause 3: Database Service Auto-Deletion (Free/Trial Plan)

**Symptom:**
- Free tier database gets deleted after inactivity
- Data disappears after period of inactivity

**Check:**
- What plan is your database on?
- Is it free tier?
- Does it have auto-deletion?

**Solution:**
- Upgrade to paid plan
- Ensure database persists

## Immediate Action Required

### Step 1: Check Database Service Status

```bash
# Check in Render Dashboard:
1. PostgreSQL service → Settings
2. Note the "Created" date
3. Check if it matches when you first set it up
```

### Step 2: Verify Environment Variables

**In Render Backend Service → Environment tab:**

Check these values:
```
DB_HOST=dpg-xxxxx-a.oregon-postgres.render.com
DB_NAME=retailcloud_db_xxxx  <-- MUST BE FIXED, NOT CHANGING
DB_USER=retailcloud_db_user
DB_PASSWORD=xxxxx
```

**Critical:** `DB_NAME` must be **FIXED** and **CONSTANT**

### Step 3: Check Database Service Plan

1. Go to PostgreSQL service → **Settings** → **Plan**
2. Verify it's a **persistent plan** (not free tier that auto-deletes)
3. Check if backups are enabled

### Step 4: Verify Database Connection

Run this in Render Shell:

```bash
cd backend
python manage.py shell
```

```python
from django.conf import settings
from django.db import connection

# Check current database connection
db_settings = settings.DATABASES['default']
print(f"DB Name: {db_settings['NAME']}")
print(f"DB Host: {db_settings['HOST']}")
print(f"DB User: {db_settings['USER']}")

# Check if database exists and has tables
cursor = connection.cursor()
cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
table_count = cursor.fetchone()[0]
print(f"\nTables in database: {table_count}")

# Check if there's any data
from core.models import Tenant
from accounts.models import User
print(f"\nTenants: {Tenant.objects.count()}")
print(f"Users: {User.objects.count()}")
```

## Prevention Measures

### 1. Lock Down Database Service

- ✅ **Never delete the database service**
- ✅ **Use the same database service ID/name always**
- ✅ **Enable automatic backups**

### 2. Lock Down Environment Variables

- ✅ **Use fixed DB_NAME** (not variables)
- ✅ **Document the exact database connection values**
- ✅ **Don't change DB_NAME after setup**

### 3. Enable Backups

1. Go to PostgreSQL service → **Settings**
2. Enable **Automatic Backups**
3. Set backup frequency (daily recommended)

### 4. Monitor Database Service

- ✅ Check database service status regularly
- ✅ Verify creation date doesn't change
- ✅ Monitor for any deletions

## What to Do RIGHT NOW

1. ✅ **Check database service creation date** - Has it changed?
2. ✅ **Check DB_NAME environment variable** - Is it fixed or changing?
3. ✅ **Verify database service plan** - Is it persistent?
4. ✅ **Check if database was manually deleted/recreated**
5. ✅ **Enable automatic backups immediately**

## Summary

**The deployment process is SAFE** ✅ (logs confirm only safe migrations)

**If ALL data is being lost, it's because:**
1. Database service is being recreated (most likely)
2. Database connection is changing
3. Database service is being deleted manually

**The code is NOT resetting the database** - this is a Render/infrastructure issue.

---

**Please check the database service creation date and DB_NAME environment variable - that will tell us the cause!**


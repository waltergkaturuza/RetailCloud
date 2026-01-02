# 🚨 URGENT: Database Protection - Verify Deployment Commands

## Current Status Check

### ✅ SAFE Commands in Dockerfile

**Current Dockerfile commands:**
```dockerfile
CMD sh -c "python manage.py migrate && gunicorn ..."
```

**This is SAFE** ✅ - Only runs `migrate` (no flush/reset)

### ⚠️ CRITICAL: Check Render Settings

**You MUST verify these Render settings:**

1. **Backend Web Service → Settings**
   - ❌ **Pre-deploy Command**: Should be EMPTY (not set)
   - ❌ **Start Command**: Should be EMPTY (uses Dockerfile CMD)
   - ✅ **Dockerfile Path**: Should be `Dockerfile.render` (or `Dockerfile`)

2. **Database Service → Settings**
   - ✅ Verify it's a persistent PostgreSQL (not ephemeral)
   - ✅ Check backup settings are enabled

## Immediate Action Required

### Step 1: Check Render Settings NOW

1. Go to **Render Dashboard**
2. Click on your **Backend Web Service**
3. Go to **Settings** tab
4. Check these fields:

   **Pre-deploy Command:**
   - ❌ Should be **EMPTY** or **NOT SET**
   - ❌ If it contains `flush`, `reset_db`, `dropdb`, or `migrate --run-syncdb` → **REMOVE IT**

   **Start Command:**
   - ❌ Should be **EMPTY** or **NOT SET**
   - ❌ Should say "Use Dockerfile CMD" or similar
   - ❌ If it overrides the Dockerfile → **REMOVE IT**

   **Build Command:**
   - ✅ Should use Dockerfile (automatic)

### Step 2: Verify Current Dockerfile CMD

The Dockerfile should ONLY contain:
```dockerfile
CMD sh -c "python manage.py migrate && gunicorn ..."
```

**NEVER should contain:**
- ❌ `python manage.py flush`
- ❌ `python manage.py reset_db`
- ❌ `python manage.py migrate --run-syncdb`
- ❌ `dropdb` or `deletedb`
- ❌ `python manage.py migrate app_name zero`

### Step 3: Check for Environment Variables

Check if any environment variables are set that might trigger resets:
- ❌ `RESET_DB=true`
- ❌ `FLUSH_DB=true`
- ❌ `MIGRATE_SYNCDB=true`

## What Could Cause Database Reset?

### Scenario 1: Pre-deploy Command in Render

**If Render has a "Pre-deploy Command" set:**
```bash
# ❌ DANGEROUS - Would reset database
python manage.py flush
python manage.py migrate
```

**Fix:** Clear the Pre-deploy Command field in Render settings

### Scenario 2: Start Command Override

**If Render has a "Start Command" that overrides Dockerfile:**
```bash
# ❌ DANGEROUS
python manage.py flush && python manage.py migrate && gunicorn ...
```

**Fix:** Clear the Start Command field (let Dockerfile CMD run)

### Scenario 3: Migration Command Issue

**If using wrong migrate command:**
```bash
# ❌ DANGEROUS
python manage.py migrate --run-syncdb
```

**Fix:** Only use `python manage.py migrate` (no flags)

### Scenario 4: Database Service Reset

**If database service was recreated:**
- New database = fresh database (all data lost)
- Check if database service was deleted/recreated

**Fix:** Use existing database, don't create new one

## Verification Checklist

Before deploying, verify:

- [ ] ✅ Dockerfile CMD only uses `python manage.py migrate` (no flush/reset)
- [ ] ✅ Render "Pre-deploy Command" is EMPTY
- [ ] ✅ Render "Start Command" is EMPTY (uses Dockerfile)
- [ ] ✅ No environment variables trigger resets
- [ ] ✅ Database service is persistent (not ephemeral)
- [ ] ✅ Database backups are enabled
- [ ] ✅ No custom scripts run flush/reset commands

## Emergency: If Database Was Reset

### Option 1: Restore from Backup (If Available)

1. Go to Render Dashboard → Database Service
2. Click **Backups** tab
3. Find the latest backup before reset
4. Restore from backup

### Option 2: Check if Data Still Exists

Run this in Render Shell:
```bash
cd backend
python manage.py shell
```

```python
from core.models import Tenant
from accounts.models import User

# Check if data exists
print(f"Tenants: {Tenant.objects.count()}")
print(f"Users: {User.objects.count()}")

# If counts are 0, database was reset
if Tenant.objects.count() == 0:
    print("❌ Database appears to be reset - no tenants found")
else:
    print("✅ Data still exists")
```

## Prevention: Lock Down Settings

### 1. Document Current Safe Configuration

Save this as your deployment standard:

**Dockerfile CMD (ONLY THIS):**
```dockerfile
CMD sh -c "python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile -"
```

**Render Settings:**
- Pre-deploy Command: **EMPTY**
- Start Command: **EMPTY** (use Dockerfile CMD)
- Build Command: **Docker** (automatic)

### 2. Add Deployment Safety Checks

Create a script to verify before deployment:
```bash
# check_deployment_safety.sh
if grep -q "flush\|reset_db\|dropdb" backend/Dockerfile*; then
    echo "❌ DANGER: Database reset command found in Dockerfile!"
    exit 1
fi
echo "✅ Dockerfile is safe"
```

## Next Steps

1. **IMMEDIATELY** check Render settings (Pre-deploy Command, Start Command)
2. **VERIFY** Dockerfile CMD is safe (only `migrate`)
3. **CHECK** if database still has data (run shell commands above)
4. **RESTORE** from backup if data was lost
5. **LOCK DOWN** Render settings to prevent future resets

## Summary

**The Dockerfile is SAFE** ✅ - It only uses `migrate`

**BUT** if Render has custom commands in:
- Pre-deploy Command
- Start Command

These could override the safe Dockerfile CMD and cause resets!

**Action Required:** Check Render settings NOW and remove any custom commands!


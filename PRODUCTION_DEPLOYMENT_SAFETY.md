# 🛡️ Production Deployment Safety Guide

## ⚠️ CRITICAL: Protecting Tenant Data

This guide ensures safe deployments without losing tenant data.

---

## ✅ Safe Deployment Practices

### 1. **Migrations Are Safe - Always Use Them**

✅ **DO THIS:**
```bash
python manage.py migrate
```

✅ **What it does:**
- Only applies new migrations that haven't been run
- Does NOT delete existing data
- Only modifies schema (adds tables, columns, indexes)
- Safe for production

❌ **NEVER DO THIS:**
```bash
python manage.py flush              # DELETES ALL DATA
python manage.py migrate --run-syncdb  # Can cause issues
python manage.py reset_db            # DELETES ALL DATA (if exists)
```

### 2. **Current Deployment Process (Safe)**

Our current deployment process is **SAFE**:

#### Backend Dockerfile (Current - Safe ✅)
```dockerfile
CMD sh -c "python manage.py migrate && gunicorn ..."
```

This is **SAFE** because:
- Only runs `migrate` (not flush or reset)
- Migrations are incremental and reversible
- Does not touch existing data
- Only applies new schema changes

---

## 🔒 Database Protection Measures

### Migration Safety Checklist

Before deploying, verify:

1. ✅ **Migrations are reversible** (can be rolled back)
   - Use `python manage.py migrate app_name migration_number` to rollback if needed

2. ✅ **No data deletion in migrations**
   - Never use `migrations.RunPython` to delete data in production migrations
   - Only use data migrations for safe transformations

3. ✅ **Backup before major migrations**
   - For large schema changes, backup database first
   - Use Django's migration plan: `python manage.py migrate --plan`

4. ✅ **Test migrations in staging first**
   - Always test migrations on a copy of production data first

---

## 📋 Safe Deployment Workflow

### Step 1: Check Migration Plan (Pre-Deployment)

```bash
cd backend
python manage.py migrate --plan
```

This shows what migrations will run without actually running them.

### Step 2: Backup Database (For Major Changes)

**On Render:**
1. Go to your PostgreSQL database service
2. Click "Manual Backup" or use Render's automatic backups
3. Verify backup exists before deploying

**Local/Manual Backup:**
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Deploy (Safe Process)

Our current deployment process is safe:
1. Code is pushed to Git
2. Render builds the Docker image
3. Render runs: `python manage.py migrate` (SAFE ✅)
4. Render starts Gunicorn

**No data is lost** because:
- Migrations only add/modify schema
- No flush or reset commands
- Existing data remains intact

### Step 4: Verify After Deployment

```bash
# Check migration status
python manage.py showmigrations

# Verify data still exists
python manage.py shell -c "from core.models import Tenant; print(f'Tenants: {Tenant.objects.count()}')"
```

---

## 🚨 Commands That DELETE Data (NEVER USE IN PRODUCTION)

### ❌ DANGEROUS Commands (Data Loss)

```bash
# NEVER run these in production:
python manage.py flush                    # Deletes ALL data
python manage.py migrate --run-syncdb     # Can cause data loss
python manage.py reset_db                 # Deletes database (if exists)
dropdb                                    # PostgreSQL command - DELETES DATABASE
```

### ⚠️ Use With Caution

```bash
# Only use when you REALLY know what you're doing:
python manage.py migrate app_name zero    # Rolls back ALL migrations (can lose data)
python manage.py sqlflush                 # Shows SQL to delete data (doesn't execute)
```

---

## 📝 Database Reset Scenarios

### When Would You Reset Database?

**Only acceptable scenarios:**
1. 🧪 **Development/Testing** - Fresh start for testing
2. 🏗️ **Pre-production** - Setting up initial production environment
3. 🔄 **Complete restart** - Starting fresh (with tenant consent/notice)

### How to Safely Reset (Development Only)

**ONLY for development/testing:**

```bash
# Option 1: Flush (keeps tables, deletes data)
python manage.py flush

# Option 2: Reset database completely (development only)
# This is ONLY for local development, NEVER production
dropdb your_db_name
createdb your_db_name
python manage.py migrate
```

---

## 🔐 Protecting Production Data

### Current Safety Measures (Already in Place)

1. ✅ **Dockerfile only uses `migrate`** - No flush/reset
2. ✅ **Migrations are incremental** - Only add changes
3. ✅ **No data deletion commands** - Safe schema changes only
4. ✅ **Rollback capability** - Can revert migrations if needed

### Additional Recommendations

1. **Enable Render Automatic Backups**
   - Go to PostgreSQL service → Settings → Enable Backups
   - Set backup frequency (daily recommended)

2. **Use Migration Squashing (When Appropriate)**
   - After many migrations, squash them for efficiency
   - `python manage.py squashmigrations app_name`
   - Test squashed migrations thoroughly first

3. **Monitor Migration Status**
   - Add health check endpoint that verifies migrations
   - Alert if migrations fail or are pending

4. **Document Breaking Changes**
   - If a migration removes a field, document it
   - Give tenants advance notice for breaking changes

---

## 📊 Migration Best Practices

### Creating Safe Migrations

**✅ Good Migration (Safe):**
```python
class Migration(migrations.Migration):
    operations = [
        migrations.AddField(
            model_name='Tenant',
            name='new_field',
            field=models.CharField(max_length=100, blank=True, null=True),
        ),
    ]
```

**❌ Bad Migration (Data Loss Risk):**
```python
class Migration(migrations.Migration):
    operations = [
        migrations.RemoveField(
            model_name='Tenant',
            name='critical_field',  # Data loss if not handled properly
        ),
    ]
```

**If removing fields:**
1. Add field as nullable first
2. Migrate data to new location (if needed)
3. Remove field in separate migration
4. Communicate with tenants

---

## 🎯 Summary

### ✅ Safe Deployment (Current Setup)

**Your current deployment process is SAFE:**
- Uses `python manage.py migrate` only
- No data deletion commands
- Incremental schema changes
- Reversible migrations

### ❌ What to Avoid

**NEVER add these to deployment:**
- `python manage.py flush`
- `python manage.py reset_db`
- `dropdb` commands
- Any script that deletes data

### 📋 Deployment Checklist

Before deploying:
- [ ] Check migration plan: `python manage.py migrate --plan`
- [ ] Test migrations on staging first
- [ ] Backup database (for major changes)
- [ ] Verify no flush/reset commands in scripts
- [ ] Deploy and verify data integrity

---

## 🚀 Going Forward

### Recommended Actions

1. ✅ **Current setup is safe** - No changes needed
2. 📦 **Enable automatic backups** on Render
3. 📝 **Document migration strategy** for team
4. 🔍 **Monitor migration logs** after deployment
5. ⚠️ **Train team** on safe deployment practices

---

**Your production database is protected! The current deployment process only runs safe migrations that preserve all tenant data.** ✅


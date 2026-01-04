# 🔍 Check Which Database Django Is Using

## Method 1: Using Render Shell (Recommended)

### Step 1: Open Render Shell

1. Go to Render Dashboard → **RetailCloud_backend** service
2. Click **Shell** tab (or use "Open Shell" button)
3. This opens an interactive shell in the container

### Step 2: Run Database Check Commands

```bash
cd backend
python manage.py shell
```

Then in the Python shell, run:

```python
import os
from django.conf import settings
from django.db import connection

# Check environment variables
print("=" * 60)
print("ENVIRONMENT VARIABLES:")
print("=" * 60)
db_name = os.getenv('DB_NAME')
db_host = os.getenv('DB_HOST')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_port = os.getenv('DB_PORT')

print(f"DB_NAME: {db_name}")
print(f"DB_HOST: {db_host}")
print(f"DB_USER: {db_user}")
print(f"DB_PASSWORD: {'***' if db_password else 'NOT SET'}")
print(f"DB_PORT: {db_port}")

# Check Django database configuration
print("\n" + "=" * 60)
print("DJANGO DATABASE CONFIGURATION:")
print("=" * 60)
db_config = settings.DATABASES['default']
print(f"ENGINE: {db_config['ENGINE']}")
print(f"NAME: {db_config['NAME']}")
print(f"HOST: {db_config.get('HOST', 'N/A')}")
print(f"USER: {db_config.get('USER', 'N/A')}")
print(f"PORT: {db_config.get('PORT', 'N/A')}")

# Determine what database is being used
print("\n" + "=" * 60)
print("DIAGNOSIS:")
print("=" * 60)

if 'sqlite' in db_config['ENGINE']:
    print("❌ PROBLEM: Using SQLite!")
    print("   - SQLite files are NOT persistent on Render")
    print("   - Data is lost on each deployment")
    print("   - This is why all your data disappears")
    print("\n   REASON: DB_NAME environment variable is NOT SET")
    print("   FIX: Add DB_NAME, DB_HOST, DB_USER, DB_PASSWORD to backend service")
elif 'postgresql' in db_config['ENGINE']:
    print("✅ Using PostgreSQL")
    print(f"   - Database: {db_config['NAME']}")
    print(f"   - Host: {db_config.get('HOST', 'N/A')}")
    
    # Try to actually connect and check
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT current_database(), version();")
        result = cursor.fetchone()
        actual_db = result[0]
        pg_version = result[1].split(',')[0]
        
        print(f"\n✅ Successfully connected to PostgreSQL:")
        print(f"   - Actual database: {actual_db}")
        print(f"   - PostgreSQL version: {pg_version}")
        
        # Check table count
        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        table_count = cursor.fetchone()[0]
        print(f"   - Tables in database: {table_count}")
        
        # Check if there's data
        from core.models import Tenant
        from accounts.models import User
        
        tenant_count = Tenant.objects.count()
        user_count = User.objects.count()
        
        print(f"\n📊 Current Data:")
        print(f"   - Tenants: {tenant_count}")
        print(f"   - Users: {user_count}")
        
        if tenant_count == 0 and user_count == 0:
            print("\n⚠️  WARNING: Database is empty (no tenants, no users)")
            print("   This could mean:")
            print("   1. Database was just created/reset")
            print("   2. Data was deleted")
            print("   3. Connected to wrong database")
        else:
            print("\n✅ Database has data - connection is working!")
            
    except Exception as e:
        print(f"\n❌ Connection test failed: {e}")
        print("   This means Django can't connect to PostgreSQL")
        print("   Check database connection variables")
else:
    print(f"⚠️  Unknown database engine: {db_config['ENGINE']}")

print("\n" + "=" * 60)
exit()
```

## Method 2: Using Render CLI (Command Line)

If you have Render CLI installed locally:

```bash
# Check environment variables
render env list --service RetailCloud_backend | grep DB_

# Connect to shell and check
render shell RetailCloud_backend
# Then run the Python commands above
```

## Method 3: Quick One-Liner Check

In Render Shell (Backend Service):

```bash
cd backend && python manage.py shell -c "from django.conf import settings; db = settings.DATABASES['default']; print('ENGINE:', db['ENGINE']); print('NAME:', db['NAME']); print('Using SQLite!' if 'sqlite' in db['ENGINE'] else 'Using PostgreSQL')"
```

## Expected Output

### If Using SQLite (PROBLEM):
```
ENGINE: django.db.backends.sqlite3
NAME: /app/db.sqlite3
❌ PROBLEM: Using SQLite!
```

### If Using PostgreSQL (CORRECT):
```
ENGINE: django.db.backends.postgresql
NAME: retailcloud
HOST: dpg-d5ajqgjuibrs73btjn50-a.ohio-postgres.render.com
✅ Using PostgreSQL
```

## What to Do Based on Results

### If Using SQLite:

**Problem:** Backend service doesn't have database connection variables.

**Fix:**
1. Go to Backend Service → Environment tab
2. Add these variables:
   - `DB_NAME` = `retailcloud`
   - `DB_HOST` = `dpg-d5ajqgjuibrs73btjn50-a.ohio-postgres.render.com`
   - `DB_USER` = `retailcloud`
   - `DB_PASSWORD` = `7p9GF7wHAORFUykIqcHGZESuyjiiskSJ`
   - `DB_PORT` = `5432`

### If Using PostgreSQL but Empty:

**Problem:** Connected to PostgreSQL but database is empty.

**Possible causes:**
- Database was recently reset
- Connected to wrong database
- Data was manually deleted

**Check:** Verify you're connected to the correct database name.

## Quick Test Script

Save this as a file and run it in Render Shell:

```bash
# check_db.sh
cd backend
python manage.py shell << EOF
from django.conf import settings
import os

db = settings.DATABASES['default']
print("Engine:", db['ENGINE'])
print("Name:", db['NAME'])

if 'sqlite' in db['ENGINE']:
    print("❌ USING SQLITE - This is the problem!")
    print("DB_NAME env var:", os.getenv('DB_NAME'))
else:
    print("✅ Using PostgreSQL")
    print("DB_NAME env var:", os.getenv('DB_NAME'))
EOF
```

---

**Run the check and share the output - this will confirm if you're using SQLite or PostgreSQL!**



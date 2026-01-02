# 🔧 Seed Business Categories - Quick Fix

## Problem
The database table exists but is empty, showing "No categories available" in the dropdown.

## Solution: Run Seed Command

### Option 1: Via Render Shell (Recommended)

1. Go to your **Backend Service** on Render
2. Click **Shell** tab (or use Render CLI)
3. Run:
   ```bash
   python manage.py seed_business_categories
   ```

### Option 2: Via Render CLI (If you have it set up)

```bash
render exec retailcloud-backend -- python manage.py seed_business_categories
```

### Option 3: Add to Startup (Temporary)

If you want categories auto-seeded on first deployment, you could temporarily add to your Dockerfile CMD:

```dockerfile
CMD sh -c "python manage.py seed_business_categories || true && python manage.py migrate && gunicorn ..."
```

**⚠️ Note:** The `|| true` ensures it doesn't fail if categories already exist.

## What the Command Does

- Seeds 20 business categories (Grocery, Motor Spares, Clothing, etc.)
- Creates module mappings for each category
- Sets up recommended modules and features

## After Seeding

1. Categories will appear in dropdown
2. Tenants can select their industry type
3. Auto-module activation will work

---

**This is a one-time setup. Once seeded, categories persist in the database.**


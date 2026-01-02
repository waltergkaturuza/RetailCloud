# 🔧 Fix: Seed Business Categories

## Immediate Problem
Categories table exists but is empty → "No categories available" in dropdown.

## Quick Fix: Seed Categories

### On Render:

1. **Go to Backend Service** → **Shell** tab (or use Render CLI)
2. Run:
   ```bash
   python manage.py seed_business_categories
   ```
3. You should see output like:
   ```
   Created category: Grocery / Supermarket / Convenience Store
   Created category: Motor Spares / Hardware Shops
   ...
   ```

**That's it!** Categories will now appear in the dropdown.

---

## Optional: Auto-Seed on First Deployment

If you want categories auto-seeded, you could add to your Dockerfile CMD (temporarily):

```dockerfile
CMD sh -c "python manage.py seed_business_categories || true && python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile -"
```

The `|| true` ensures it doesn't fail if categories already exist.

---

**After seeding, categories will persist. This is a one-time setup!**


# 🔧 Fix Railway Deploy Settings

## Issues Found

### ❌ Issue 1: Pre-deploy Command
**Current**: `npm run migrate`  
**Problem**: This is for Node.js/npm, but you're using Python/Django!

**Fix**: **Clear/Delete this field** (leave it empty)

### ❌ Issue 2: Custom Start Command  
**Current**: `python manage.py migrate && gunicorn retail_saas.wsgi:application`

**Problems**:
- Missing PORT variable: `--bind 0.0.0.0:${PORT:-8000}`
- Missing other Gunicorn options (workers, timeout, logs)

**Fix Options**:

**Option A (Recommended)**: **Clear the Custom Start Command field**
- Leave it empty
- This will use the CMD from your Dockerfile (which is correct)
- Your Dockerfile already has the proper command

**Option B**: Use this corrected command:
```
python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile -
```

## How to Fix

1. Go to Railway Dashboard → RetailCloud service → **Settings** tab → **Deploy** section

2. **Pre-deploy Command**: 
   - Delete/clear the value: `npm run migrate`
   - Leave it **empty**

3. **Custom Start Command**:
   - **Recommended**: Delete/clear it (leave empty) to use Dockerfile CMD
   - **OR** if you want to keep it, replace with:
     ```
     python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile -
     ```

4. **Save** the settings

5. Railway will automatically redeploy

## Why This Matters

- The `npm run migrate` command is trying to run a Node.js command, which fails in a Python container
- The Custom Start Command was overriding your Dockerfile CMD, but without the PORT variable, Gunicorn wouldn't bind to the correct port
- Clearing these fields lets your Dockerfile handle the startup (which is correct)

---

**After fixing**: Railway will redeploy and Gunicorn should start properly!


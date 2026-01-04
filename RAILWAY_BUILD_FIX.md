# 🔧 Railway Build Fix

## Problem
Railway is trying to use Railpack (automatic detection) instead of Docker because it's looking at the repo root instead of the `backend/` directory.

## Solution

You need to configure Railway to:
1. **Use Docker** (not Railpack)
2. **Set Root Directory** to `backend`

### Steps to Fix:

1. **Go to Railway Dashboard** → Your Backend Service
2. **Click on Settings** tab
3. **Scroll to "Build & Deploy"** section
4. **Set these options:**
   - **Build Command**: Leave empty (Docker handles this)
   - **Root Directory**: `backend` (should already be set, but verify)
   - **Dockerfile Path**: `Dockerfile` (relative to root directory)
   - **Docker Build Context**: `.` (current directory)

5. **Alternative: Force Docker Build**
   - In Settings → Deploy
   - Under "Build Method", select **"Dockerfile"** (not "Nixpacks")
   - Make sure Dockerfile Path is set correctly

6. **If the option doesn't exist**, create a `railway.json` file at the repo root (see below)

## Alternative: Create railway.json

If Railway settings don't work, create this file at the repo root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Then commit and push:
```bash
git add railway.json
git commit -m "Configure Railway to use Docker"
git push
```

## Quick Fix Steps:

1. **Verify Root Directory**:
   - Railway Dashboard → Service → Settings → Root Directory = `backend`

2. **Force Docker Build**:
   - Settings → Deploy → Build Method → Select "Dockerfile"

3. **Redeploy**:
   - Go to Deployments tab
   - Click "Redeploy" or trigger a new deployment

The build should now use Docker instead of Railpack!



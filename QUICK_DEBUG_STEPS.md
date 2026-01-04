# 🔍 Quick Debug Steps for 404 Error

## Option 1: Check Logs via Railway Web Dashboard (Easiest)

### Step 1: View Logs
1. Go to Railway Dashboard: https://railway.app
2. Click on your **RetailCloud** service
3. Click on **"Logs"** tab at the top
4. Scroll to the **bottom** (most recent logs)

### Step 2: What to Look For

Look for messages **after** the migrations. You should see:

✅ **Good signs:**
- "Booting worker"
- "Listening at: http://0.0.0.0:8000" or similar
- "Starting gunicorn"
- HTTP request logs when you visit the site

❌ **Bad signs:**
- Error messages after migrations
- "Application startup failed"
- No "Listening" or "Booting worker" message
- Container exited or crashed

### Step 3: Test URLs in Browser

While checking logs, try these URLs:

1. **Root**: `https://retailcloud.railway.app/`
2. **API**: `https://retailcloud.railway.app/api/`
3. **Admin**: `https://retailcloud.railway.app/admin/`

### Step 4: Check Service Status

In Railway Dashboard → **Architecture** view:
- Is RetailCloud service **green** (Running)?
- Or is it gray/stopped?
- Any error indicators?

---

## Option 2: Install Railway CLI (Alternative)

If you want to use CLI, install via npm:

```bash
npm install -g @railway/cli
```

Then:
```bash
railway login
railway link -p 4b62e6cc-2256-4b73-ab56-2b7ae85f8100
railway logs
```

---

## Most Likely Issues

### Issue 1: Gunicorn Not Starting
**Symptom**: Logs show migrations completed but no "Booting worker"
**Fix**: Check for errors in logs after migrations

### Issue 2: ALLOWED_HOSTS
**Symptom**: App starts but returns 404/400
**Fix**: Set `ALLOWED_HOSTS=retailcloud.railway.app,*.railway.app`

### Issue 3: Port Configuration
**Symptom**: App starts on wrong port
**Fix**: Railway uses PORT env var automatically

### Issue 4: Static Files
**Symptom**: Admin loads but looks broken
**Fix**: Check if collectstatic ran during build

---

## What to Share

Please share:
1. **Last 30-50 lines of Railway logs** (from Logs tab)
2. **Service status** (from Architecture view)
3. **What happens** when you visit the URLs above

This will help me diagnose the exact issue!



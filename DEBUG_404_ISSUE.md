# 🔍 Debugging 404 Error on Admin Panel

## Quick Checks

### 1. Check Railway Logs First
Go to Railway Dashboard → RetailCloud service → **Logs** tab

Look for:
- ✅ "Starting gunicorn" or "Booting worker"
- ✅ "Listening at: http://0.0.0.0:8000" (or similar)
- ❌ Any error messages
- ❌ "Application startup failed"
- ❌ Database connection errors

### 2. Test Different URLs

Try these URLs in your browser:

1. **Root URL**: `https://retailcloud.railway.app/`
   - Should redirect to `/admin/`
   - If this also 404s, the app isn't routing correctly

2. **API Endpoint**: `https://retailcloud.railway.app/api/`
   - Should return something (even an error is good - means app is running)
   - If this 404s too, the app isn't running at all

3. **Admin with trailing slash**: `https://retailcloud.railway.app/admin/`
   - Make sure there's a trailing slash!

4. **Admin without trailing slash**: `https://retailcloud.railway.app/admin`
   - Django might redirect this

### 3. Verify Environment Variables

In Railway → Variables, make sure you have:

```
ALLOWED_HOSTS=retailcloud.railway.app,*.railway.app
DEBUG=False
```

**Important**: The variable should be exactly `ALLOWED_HOSTS` (not `ALLOWED_HOST`)

### 4. Check Service Status

In Railway Dashboard → Architecture view:
- Is the RetailCloud service showing "Running" or "Completed"?
- Any error indicators?
- Is the service actually deployed and active?

### 5. Common Issues

#### Issue: App Not Starting
**Symptoms**: No logs, service shows as "Completed" but not running
**Solution**: Check logs for startup errors

#### Issue: Wrong Port
**Symptoms**: Service starts but doesn't respond
**Solution**: Railway uses PORT environment variable - check if Gunicorn is using it

#### Issue: Static Files Error
**Symptoms**: App starts but admin doesn't load
**Solution**: Check if `collectstatic` ran during build

#### Issue: Database Connection
**Symptoms**: App crashes on startup
**Solution**: Check database environment variables

## What to Share for Debugging

Please share:
1. **Railway Logs** - The last 50-100 lines from the Logs tab
2. **Service Status** - What does the Architecture view show?
3. **Environment Variables** - What variables are set? (you can blur sensitive values)
4. **What URLs you tried** - And what response you got

## Quick Test

Run this in your browser console (F12 → Console):
```javascript
fetch('https://retailcloud.railway.app/api/')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error)
```

This will show if the app is responding at all.


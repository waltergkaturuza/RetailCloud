# 🧪 Testing Your Backend Deployment

## Correct URLs

Based on your URL configuration, these should work:

1. **Admin Panel**: `https://retailcloud.railway.app/admin/`
2. **Root URL** (redirects to admin): `https://retailcloud.railway.app/`
3. **API Root**: `https://retailcloud.railway.app/api/`

## Troubleshooting the 404 Error

If you're getting a 404 on `/admin/`, try these:

### 1. Test the Root URL First
Try: `https://retailcloud.railway.app/`
- This should redirect to `/admin/`
- If this also gives 404, the app might not be running

### 2. Test an API Endpoint
Try: `https://retailcloud.railway.app/api/`
- This will show if the app is running at all
- Should return some response (even if it's an error, it means the app is up)

### 3. Check Railway Logs
1. Go to Railway Dashboard → Your RetailCloud service
2. Click on "Logs" tab
3. Look for any errors or warnings
4. Check if Gunicorn is running and listening on the port

### 4. Check Environment Variables
Make sure these are set in Railway → Variables:
- `ALLOWED_HOSTS` should include `retailcloud.railway.app` or `*.railway.app`
- `DEBUG=False` (in production)
- Database variables are set correctly

### 5. Verify the Service is Running
In Railway Dashboard:
- Check that the RetailCloud service shows "Completed" status
- Check the deployment logs for any startup errors
- Verify the service is actually running (not just built)

### 6. Common Issues

**Issue: ALLOWED_HOSTS not configured**
- Django will reject requests if the host isn't in ALLOWED_HOSTS
- Solution: Add `retailcloud.railway.app` or `*.railway.app` to ALLOWED_HOSTS

**Issue: Static files not configured**
- Admin panel needs static files to work
- But this usually shows broken styling, not 404
- Check if `collectstatic` ran during build

**Issue: Gunicorn not running**
- Check logs for "Starting gunicorn" or similar
- If migrations ran but then nothing, Gunicorn might have crashed

## Quick Diagnostic Steps

1. ✅ Check Railway service status (should be "Completed")
2. ✅ Check Railway logs for errors
3. ✅ Try root URL: `https://retailcloud.railway.app/`
4. ✅ Try API: `https://retailcloud.railway.app/api/`
5. ✅ Verify ALLOWED_HOSTS includes your domain
6. ✅ Check that Gunicorn started successfully

## Expected Behavior

- **Root URL** (`/`): Should redirect to `/admin/`
- **Admin URL** (`/admin/`): Should show Django admin login page
- **API URL** (`/api/`): Should show API response or 404 (depends on API structure)

---

**If you're still getting 404s**, share the Railway logs and I can help debug further!


# 🔧 Fix Redirect Loop on /admin/

## Error
```
The page isn't redirecting properly
Firefox has detected that the server is redirecting the request for this address in a way that will never complete.
```

## Problem
Accessing `/admin/` causes an infinite redirect loop.

## Common Causes

### 1. SECURE_SSL_REDIRECT Issue
If `SECURE_SSL_REDIRECT = True` and there's a proxy/load balancer that's not properly configured, it can cause redirect loops.

**However:** Render handles HTTPS automatically, so this is less likely.

### 2. Home View Redirect
The home view (`/`) redirects to `admin:index`. If there's a conflict, this could cause issues.

### 3. APPEND_SLASH + Redirect
If there's a trailing slash mismatch combined with redirects.

## Quick Checks

### Check 1: Verify ALLOWED_HOSTS
The `ALLOWED_HOSTS` must include the exact domain.

**In Render → Backend → Environment:**
- Key: `ALLOWED_HOSTS`
- Value: `retailcloud-backend.onrender.com,retailcloud.onrender.com` (no space after comma)

### Check 2: Check Backend Logs
Look at the Render logs when accessing `/admin/`:
- What status codes do you see? (301, 302, etc.)
- Are there multiple redirects happening?
- What's the redirect location?

### Check 3: Try Different URL
Try accessing the root URL:
```
https://retailcloud-backend.onrender.com/
```

This should redirect to `/admin/`. If this also loops, the issue is in the home view.

## Most Likely Fix

The redirect loop is often caused by `SECURE_SSL_REDIRECT` when behind a proxy. Since Render handles HTTPS, we might need to disable it or configure it properly.

**However**, the code already has `SECURE_SSL_REDIRECT = True` only when `DEBUG = False`, which is correct.

## Solution to Try

Since Render handles HTTPS termination, we might need to tell Django that it's behind a proxy. However, this is usually automatic.

**Check:** Make sure `ALLOWED_HOSTS` is set correctly (comma-separated, no brackets, no quotes).

If the loop persists, we might need to check if there's a middleware or view causing the issue.

---

**The redirect loop suggests something is repeatedly redirecting. Check the logs to see what's happening!**


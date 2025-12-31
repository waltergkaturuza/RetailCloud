# 🔧 Fix Frontend-Backend Connection

## Problem
Frontend at `retailcloud.onrender.com` is getting:
- "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
- 404 errors in console
- Login not working

## Root Cause
The frontend is trying to call the backend API, but:
1. **API URL not configured** - Frontend doesn't know where the backend is
2. **CORS not configured** - Backend doesn't allow requests from frontend domain

## Solution

### Step 1: Configure Frontend API URL (Render Environment Variables)

In your **Frontend Static Site** on Render:

1. Go to **Environment** tab
2. Add this environment variable:

   **Key:** `VITE_API_URL`
   **Value:** `https://retailcloud-backend.onrender.com/api`

3. **Save** (Render will rebuild frontend)

### Step 2: Configure Backend CORS (Render Environment Variables)

In your **Backend Web Service** on Render:

1. Go to **Environment** tab
2. Find or add `CORS_ALLOWED_ORIGINS`
3. Set it to:
   ```
   https://retailcloud.onrender.com
   ```
   
   (If you need both, comma-separated, no spaces after comma:)
   ```
   https://retailcloud.onrender.com,https://retailcloud-backend.onrender.com
   ```

4. **Save** (Render will redeploy backend)

## How It Works

### Frontend API Configuration
The frontend uses `VITE_API_URL` environment variable (set at build time):
- Location: `frontend/src/lib/api.ts`
- Code: `const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'`
- If not set, it defaults to `/api` (relative path) which won't work in production

### Backend CORS Configuration
The backend needs to explicitly allow the frontend domain:
- Location: `backend/retail_saas/settings.py`
- Code: `CORS_ALLOWED_ORIGINS` environment variable
- Must include the frontend's domain

## After Configuration

1. **Frontend rebuilds** (2-3 minutes)
2. **Backend redeploys** (1-2 minutes)
3. **Test login** at `https://retailcloud.onrender.com/login`
4. **Should work!** ✅

## Verify Configuration

After both redeploy:

1. **Open browser DevTools** → Network tab
2. **Try to login**
3. **Check the API request:**
   - Should go to: `https://retailcloud-backend.onrender.com/api/auth/auth/login/`
   - Should NOT be 404
   - Should get proper response (200 or error with JSON)

## Troubleshooting

### Still getting 404?
- Check `VITE_API_URL` is set correctly in frontend env vars
- Check frontend has been rebuilt after setting the variable
- Check browser console shows correct API URL in requests

### Still getting CORS errors?
- Check `CORS_ALLOWED_ORIGINS` includes frontend domain (no trailing slash)
- Check backend has been redeployed
- Check browser console for exact CORS error message

### Still getting "Unexpected end of JSON input"?
- Usually means the API returned empty response or error page (HTML instead of JSON)
- Check backend logs for errors
- Check API endpoint is correct: `/api/auth/auth/login/`

---

**Both environment variables are required for frontend and backend to communicate!**


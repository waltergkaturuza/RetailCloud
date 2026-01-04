# 🔧 Fix ALLOWED_HOSTS Configuration

## ❌ Current (Incorrect) Value
```
retailcloud-backend.onrender.com/,https://retailcloud.onrender.com
```

## ✅ Correct Value
```
retailcloud-backend.onrender.com,retailcloud.onrender.com
```

## Issues with Current Value

1. **Trailing slash**: `retailcloud-backend.onrender.com/` should be `retailcloud-backend.onrender.com`
2. **Protocol included**: `https://retailcloud.onrender.com` should be `retailcloud.onrender.com`
3. **ALLOWED_HOSTS format**: Django expects just hostnames, not URLs

## How to Fix in Render

1. **Go to Render Dashboard** → Your Backend Service → **Environment** tab
2. **Find `ALLOWED_HOSTS`** environment variable
3. **Click the Edit icon** (pencil icon)
4. **Change the value to:**
   ```
   retailcloud-backend.onrender.com,retailcloud.onrender.com
   ```
5. **Save** the changes
6. **Render will automatically redeploy** your service

## What ALLOWED_HOSTS Does

Django's `ALLOWED_HOSTS` is a security feature that specifies which host/domain names the Django site can serve. It:
- Prevents HTTP Host header attacks
- Is required in production (when `DEBUG=False`)
- Should contain only hostnames (no protocols, no trailing slashes, no paths)

## Format Rules

- ✅ **Correct**: `example.com,www.example.com,api.example.com`
- ✅ **Correct**: `localhost,127.0.0.1`
- ❌ **Wrong**: `https://example.com` (no protocol)
- ❌ **Wrong**: `example.com/` (no trailing slash)
- ❌ **Wrong**: `example.com/api` (no paths)

---

**After fixing, your backend will properly accept requests from both domains!**



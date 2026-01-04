# 🔧 Quick Fix: CORS Trailing Slash Error

## Error
```
SystemCheckError: System check identified some issues:
ERRORS:
?: (corsheaders.E014) Origin 'https://retailcloud.onrender.com/' in CORS_ALLOWED_ORIGINS should not have path
```

## Problem
The `CORS_ALLOWED_ORIGINS` environment variable has a trailing slash `/`, but Django's CORS middleware requires origins to be just the domain without any path.

## Fix

**In Render → Backend Web Service → Environment:**

**Key:** `CORS_ALLOWED_ORIGINS`  
**Current (WRONG):**
```
https://retailcloud.onrender.com/
```

**Should be (CORRECT):**
```
https://retailcloud.onrender.com
```

**Just remove the trailing slash!**

## After Fix

1. Save the environment variable
2. Render will automatically redeploy
3. Service should start successfully ✅

---

**Note:** This applies to ALL origins in CORS_ALLOWED_ORIGINS - they should never have trailing slashes, paths, or protocols other than https:// (or http:// for localhost).



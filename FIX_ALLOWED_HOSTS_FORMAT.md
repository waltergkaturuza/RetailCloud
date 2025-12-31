# 🔧 Fix ALLOWED_HOSTS Format Error

## Error
```
ERROR Invalid HTTP_HOST header: 'retailcloud-backend.onrender.com'. You may need to add 'retailcloud-backend.onrender.com' to ALLOWED_HOSTS.
```

## Problem
`ALLOWED_HOSTS` is set as a JSON array string:
```
["retailcloud-backend.onrender.com", "retailcloud.onrender.com"]
```

But Django expects a **comma-separated string** that it will split internally.

The code does:
```python
ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if host.strip()]
```

When you use JSON array format, `.split(',')` produces invalid hostnames like:
- `'["retailcloud-backend.onrender.com"'` (has brackets and quotes)
- `' "retailcloud.onrender.com"]'` (has brackets, quotes, and spaces)

## Fix

**In Render → Backend Web Service → Environment:**

**Key:** `ALLOWED_HOSTS`  
**Current (WRONG - JSON array format):**
```
["retailcloud-backend.onrender.com", "retailcloud.onrender.com"]
```

**Should be (CORRECT - comma-separated string):**
```
retailcloud-backend.onrender.com,retailcloud.onrender.com
```

**Rules:**
- ✅ No brackets `[]`
- ✅ No quotes `"` or `'`
- ✅ No spaces after comma (optional, code handles it, but cleaner without)
- ✅ Just domains separated by commas

## Examples

✅ **Correct:**
```
retailcloud-backend.onrender.com,retailcloud.onrender.com
```

✅ **Also correct (spaces handled automatically):**
```
retailcloud-backend.onrender.com, retailcloud.onrender.com
```

❌ **Wrong (JSON array):**
```
["retailcloud-backend.onrender.com", "retailcloud.onrender.com"]
```

❌ **Wrong (single domain in brackets):**
```
["retailcloud-backend.onrender.com"]
```

❌ **Wrong (Python list syntax):**
```
['retailcloud-backend.onrender.com', 'retailcloud.onrender.com']
```

## After Fix

1. Save the environment variable
2. Render will automatically redeploy
3. Service should start successfully ✅
4. DisallowedHost errors will stop

---

**Note:** This is a common mistake - environment variables are strings, not JSON. Django will parse the string internally.


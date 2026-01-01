# 🔍 Using Railway CLI to Debug 404 Issue

## Step 1: Install Railway CLI

On Windows PowerShell:
```powershell
iwr https://railway.com/install.sh | iex
```

Or if that doesn't work:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://railway.com/install.sh'))
```

## Step 2: Login to Railway

```bash
railway login
```

This will open a browser window for authentication.

## Step 3: Link to Your Project

```bash
railway link -p 4b62e6cc-2256-4b73-ab56-2b7ae85f8100
```

## Step 4: Check Logs

```bash
railway logs
```

This will show you the current logs from your deployment. Look for:
- ✅ "Booting worker" or "Starting gunicorn"
- ✅ "Listening at: http://0.0.0.0..."
- ❌ Any errors after migrations
- ❌ Application crashes

## Step 5: Check Environment Variables

```bash
railway variables
```

This will show all your environment variables. Verify:
- `ALLOWED_HOSTS` is set correctly
- Database variables are present
- `SECRET_KEY` is set

## Step 6: Run Commands in the Container

To check if the app is running inside the container:

```bash
railway run python manage.py check
```

This will run Django's system check.

## Step 7: Check Service Status

```bash
railway status
```

This shows the current deployment status.

## Common Commands for Debugging

```bash
# View logs in real-time
railway logs --follow

# Check environment variables
railway variables

# Run a command in the container
railway run <command>

# Check service status
railway status

# Open Railway dashboard
railway open
```

## What to Look For

After running `railway logs`, check:

1. **Did migrations complete?** ✅ (We know they did)
2. **Did Gunicorn start?** Look for "Booting worker" or "Listening at"
3. **Any errors?** Look for tracebacks or error messages
4. **Is the app running?** Should see HTTP request logs if it's working

---

**Next**: Once you have the logs, share them and we can diagnose the issue!


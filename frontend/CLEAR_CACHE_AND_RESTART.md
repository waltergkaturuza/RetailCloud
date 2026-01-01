# 🚀 Quick Fix: Clear Cache and Restart

## Windows PowerShell Commands

Run these commands in order:

```powershell
# Navigate to frontend directory
cd frontend

# Stop your dev server (Ctrl+C if running)

# Clear Vite cache
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Write-Host "✅ Vite cache cleared"

# Clear npm cache
npm cache clean --force
Write-Host "✅ npm cache cleared"

# Restart dev server
npm run dev
```

## All-in-One Command (Copy & Paste)

```powershell
cd frontend; Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue; npm cache clean --force; npm run dev
```

## If That Doesn't Work

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
npm run dev
```

---

**The error should be fixed after clearing the Vite cache and restarting the dev server!** ✅





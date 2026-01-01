# ⚡ Quick Fix for React Hooks Error

## 🎯 The Problem
"Invalid hook call" error caused by multiple React instances in the bundle.

## ✅ The Solution (3 Steps)

### Step 1: Stop Your Dev Server
Press `Ctrl+C` in the terminal running `npm run dev`

### Step 2: Clear Vite Cache
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules\.vite
```

### Step 3: Restart Dev Server
```powershell
npm run dev
```

## 🚀 All-in-One Command
```powershell
cd frontend; Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue; npm run dev
```

---

**That's it!** The error should be gone after clearing the cache and restarting. ✅

## If It Still Doesn't Work

Try a full clean install:
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
npm run dev
```





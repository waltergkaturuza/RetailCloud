# 🔧 Fix React Hooks Error - Multiple React Instances

This error occurs when there are multiple instances of React in your bundle. Follow these steps to fix it:

## Quick Fix (Recommended)

### Step 1: Stop the Dev Server
Press `Ctrl+C` in your terminal where the dev server is running.

### Step 2: Clear Vite Cache
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

Or if using Git Bash or WSL:
```bash
cd frontend
rm -rf node_modules/.vite
```

### Step 3: Clear Node Modules Cache (Optional but Recommended)
```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

Or:
```bash
rm -rf node_modules
npm install
```

### Step 4: Restart Dev Server
```powershell
npm run dev
```

## Alternative Fix: Force Clean Install

If the above doesn't work, do a complete clean install:

```powershell
cd frontend

# Remove all caches and modules
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item yarn.lock -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Start dev server
npm run dev
```

## Verify React Installation

Check for duplicate React installations:

```powershell
npm list react react-dom
```

You should see React only once. If you see multiple versions or paths, there's a conflict.

## Check Vite Config

Ensure your `vite.config.ts` has:

```typescript
export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // ... rest of config
})
```

This is already configured in your project.

## Why This Happens

1. **Vite Cache**: Old cached dependencies may have duplicate React
2. **Multiple Installs**: Some packages may have bundled React
3. **Node Modules Corruption**: Corrupted node_modules folder

## Still Having Issues?

1. **Check Browser Cache**: Clear browser cache or use incognito mode
2. **Check React Versions**: Ensure all React packages use the same version
3. **Rebuild Everything**:
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Recurse -Force node_modules\.vite
   npm cache clean --force
   npm install
   npm run dev
   ```

---

**Most Common Solution**: Just clear the Vite cache and restart the dev server (Steps 1-4 above).

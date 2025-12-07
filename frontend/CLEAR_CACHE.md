# Quick Fix: React Hooks Error

## The Problem
You're seeing "Invalid hook call" errors. This is caused by Vite's dependency cache.

## Quick Fix (3 Steps)

1. **Stop the dev server** (Ctrl+C in the terminal)

2. **Clear Vite cache:**
   ```powershell
   Remove-Item -Recurse -Force node_modules\.vite
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

That's it! The error should be gone.

## Why This Happens
Vite pre-bundles dependencies. Sometimes it caches an incorrect React instance. Clearing the cache forces Vite to rebuild dependencies correctly.

## If That Doesn't Work
Full reinstall:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run dev
```


# Fix Module Visibility Issue

## Problem
- Accounting module exists in database ✅
- Accounting module is active ✅
- But modules don't appear for tenants because:
  1. Modules only show if they're mapped to the tenant's business category
  2. Accounting module hasn't been mapped to any business categories yet

## Solution Options

### Option 1: Add Accounting to All Business Categories (Quick Fix)
Add accounting module to all business categories so it appears for all tenants.

### Option 2: Modify to Show All Available Modules (Better UX)
Change the Settings page to show ALL available modules, not just recommended ones. This way tenants can see and request any module.

### Option 3: Add Accounting to Specific Categories
Add accounting module only to categories where it makes sense (e.g., all categories since accounting is useful for everyone).

## Recommended: Option 2 + Option 3 Combined
- Show all available modules in Settings (not just recommended)
- Still highlight recommended modules
- This way tenants can discover and request any module



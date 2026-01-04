# Seed Modules Guide

## Issue
The Settings page shows "No modules available" because modules haven't been seeded into the database yet.

## Solution
Run the management command to seed default modules:

```bash
python manage.py setup_modules
```

This command will create:
- **Core Modules** (6 modules):
  - Inventory Management
  - Point of Sale (POS)
  - Sales & Customer Management
  - Supplier & Purchase Management
  - User Roles & Permissions
  - Financial Reporting

- **Advanced Modules** (9 modules):
  - AI Smart Analytics
  - Multi-Branch Management
  - E-commerce Integration
  - Mobile Manager App
  - Accounting Integration
  - Double-Entry Accounting
  - QR/Barcode Automation
  - Offline POS
  - Smart Security Features

- **Specialized Modules** (3 modules):
  - Grocery Module
  - Electronics Module
  - Boutique/Clothing Module

- **Bonus Modules** (5 modules):
  - AI CEO Chatbot
  - Weekly Report Automation
  - Customer Credit Scoring
  - Delivery Management
  - Gift Cards & eWallet

**Total: 23 modules**

## How to Run on Render

### Option 1: Using Render Shell
1. Go to your Render dashboard
2. Select your backend service
3. Click on "Shell" tab
4. Run: `python manage.py setup_modules`

### Option 2: Using Render CLI
```bash
render ssh <service-name>
python manage.py setup_modules
```

### Option 3: Add to Build/Start Command
You can add it to your start command (it's idempotent - won't duplicate if modules exist):
```bash
python manage.py setup_modules && python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:${PORT:-8000} ...
```

## Verification
After running the command, check:
1. Settings page should show all available modules
2. Modules should be organized by category (Core, Advanced, Specialized, Bonus)
3. Recommended modules will appear based on business category

## Note
The command is **idempotent** - it won't create duplicate modules if they already exist. Safe to run multiple times.



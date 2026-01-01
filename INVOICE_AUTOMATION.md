# Invoice Automation & Payment Receipts

## Overview

RetailCloud automatically generates invoices 1 week before subscription expiration and sends payment receipts when payments are received.

## Features

### 1. Automatic Invoice Generation
- **Trigger**: 1 week before subscription `current_period_end`
- **Frequency**: Run daily via management command
- **Actions**:
  - Calculates total cost using dynamic pricing
  - Generates unique invoice number
  - Creates invoice with tax calculations
  - Sends email to tenant

### 2. Payment Receipts
- **Trigger**: Automatically when payment status changes to `completed`
- **Actions**:
  - Updates related invoice status to `paid`
  - Generates and sends receipt email
  - Includes transaction details

### 3. Dynamic Pricing
- Base category: $10/month
- Per user: $1/month (first user free)
- Per extra branch: $5/month (first branch free)
- Yearly discount: 20% off

## Setup

### 1. Email Configuration

Add to `backend/retail_saas/settings.py`:

```python
# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # or your SMTP server
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@domain.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'RetailCloud <noreply@retailcloud.com>

# Frontend URL for invoice links
FRONTEND_URL = 'http://localhost:3000'  # or production URL
```

### 2. Schedule Invoice Generation

#### Option A: Cron Job (Linux/Mac)
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/project/backend && source venv/bin/activate && python manage.py generate_invoices
```

#### Option B: Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily
4. Action: Start a program
5. Program: `python`
6. Arguments: `manage.py generate_invoices`
7. Start in: `C:\path\to\backend`

#### Option C: Celery Beat (Recommended for Production)
```python
# In celery.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    'generate-invoices-daily': {
        'task': 'subscriptions.tasks.generate_invoices_task',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
}
```

## Usage

### Generate Invoices Manually

```bash
# Generate invoices for subscriptions expiring in 7 days (default)
python manage.py generate_invoices

# Custom days before expiry
python manage.py generate_invoices --days 14
```

### Invoice Generation Logic

1. Finds all subscriptions with:
   - Status: `active` or `trial`
   - `current_period_end` within the specified days

2. For each subscription:
   - Calculates total cost using `calculate_tenant_total_cost()`
   - Includes: base + modules + users + branches
   - Applies tax based on tenant's `tax_rate`
   - Generates unique invoice number

3. Checks for existing invoices:
   - Prevents duplicate invoices for same period
   - Only creates if no pending invoice exists

4. Sends email notification to tenant

### Payment Receipt Generation

Receipts are automatically generated when:
- Payment `status` changes to `completed`
- Payment is created with `status='completed'`

The system:
1. Sets `paid_at` timestamp automatically
2. Updates related invoice status to `paid`
3. Sends receipt email with transaction details

## API Endpoints

### Generate Invoice (Manual)
```bash
POST /api/subscriptions/invoices/generate/
{
  "subscription_id": 1,
  "days_before_expiry": 7
}
```

### Payment Creation (Auto-receipt)
```bash
POST /api/subscriptions/payments/
{
  "invoice": 1,
  "amount": "100.00",
  "currency": "USD",
  "payment_method": "ecocash",
  "transaction_id": "TX123456",
  "status": "completed"
}
```

## Invoice Number Format

```
INV-YYYYMMDD-TTTT-SSS

Example: INV-20251207-0002-001
- INV: Prefix
- 20251207: Date (YYYYMMDD)
- 0002: Tenant ID (4 digits)
- 001: Sequence number (3 digits)
```

## Email Templates

### Invoice Email
- Subject: `Invoice {invoice_number} - RetailCloud Subscription Renewal`
- Includes: Invoice details, amount, due date, breakdown
- Action: Links to tenant portal

### Receipt Email
- Subject: `Payment Receipt - Transaction {transaction_id}`
- Includes: Payment details, transaction ID, amount, payment method
- Confirmation: Subscription renewal status

## Monitoring

Check logs for:
- Invoice generation: `logger.info()` messages
- Email sending: Success/failure logs
- Payment receipts: Automatic generation logs

## Troubleshooting

### Invoices Not Generating
- Check subscription `current_period_end` dates
- Verify subscriptions are `active` or `trial`
- Check if invoices already exist for the period

### Emails Not Sending
- Verify EMAIL_BACKEND is configured
- Check SMTP credentials
- Review email logs for errors
- Emails fail silently in console backend mode

### Receipts Not Generated
- Verify payment status is `completed`
- Check signals are loaded (app config)
- Review signal logs for errors

## Testing

```bash
# Test invoice generation
python manage.py generate_invoices --days 30

# Test with specific subscription
python manage.py shell
>>> from subscriptions.invoice_service import generate_subscription_invoice
>>> from subscriptions.models import Subscription
>>> sub = Subscription.objects.first()
>>> invoice = generate_subscription_invoice(sub, days_before_expiry=7)
```





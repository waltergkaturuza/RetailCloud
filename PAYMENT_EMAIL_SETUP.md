# Payment Gateway & Email Setup Guide

This document explains how to configure payment gateways and email services for the RetailCloud platform.

## 📧 Email Configuration

### 1. Email Backend Setup

The system uses Django's email backend. You need to configure SMTP settings in your `.env` file.

#### For Gmail:
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password-here  # Use App Password, not regular password
```

**Important**: For Gmail, you need to:
1. Enable 2-Factor Authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password)

#### For Other Email Providers:
- **Outlook/Hotmail**: `smtp-mail.outlook.com`, port 587
- **SendGrid**: Use SendGrid SMTP or their Django package
- **Mailgun**: Use Mailgun SMTP or their Django package
- **AWS SES**: Use AWS SES SMTP or boto3

### 2. Environment Variables

Add these to your `.env` file (see `.env.example`):

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-password-or-app-password
DEFAULT_FROM_EMAIL=noreply@retailcloud.com
FULL_FROM_EMAIL=RetailCloud <noreply@retailcloud.com>
FRONTEND_URL=http://localhost:5173
SITE_NAME=RetailCloud
```

### 3. Email Features

The system sends these emails automatically:
- **Verification Email**: When users sign up
- **Welcome Email**: After successful subscription signup
- **Trial Approval Email**: When owner approves a trial request
- **Invoice Emails**: Before subscription renewal
- **Payment Receipts**: After payment confirmation

## 💳 Payment Gateway Configuration

### Stripe Setup

1. **Get Stripe Keys**:
   - Sign up at https://dashboard.stripe.com
   - Go to Developers → API Keys
   - Copy your **Publishable Key** and **Secret Key**

2. **Environment Variables**:
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_ENABLED=True
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
DEFAULT_PAYMENT_GATEWAY=stripe
```

3. **Install Stripe SDK** (when ready to implement):
```bash
pip install stripe
```

4. **Implement Payment Processing**:
   - Edit `backend/core/payment_gateway.py`
   - Uncomment and implement the `_process_stripe_payment` method
   - The method already has placeholder code with instructions

### PayPal Setup

1. **Get PayPal Credentials**:
   - Sign up at https://developer.paypal.com
   - Create an app in the Dashboard
   - Get **Client ID** and **Client Secret**

2. **Environment Variables**:
```bash
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox  # Use 'sandbox' for testing, 'live' for production
PAYPAL_ENABLED=True
DEFAULT_PAYMENT_GATEWAY=paypal
```

3. **Install PayPal SDK** (when ready to implement):
```bash
pip install paypalrestsdk
```

4. **Implement Payment Processing**:
   - Edit `backend/core/payment_gateway.py`
   - Uncomment and implement the `_process_paypal_payment` method

## 🔧 Current Implementation Status

### ✅ Completed:
- Payment gateway service structure
- Email service with HTML templates
- Email verification system
- Mock payment processing (for development)
- Environment variable configuration
- Integration with signup flow

### ⏳ TODO (To Enable Full Production):

#### Payment Gateway:
1. **Stripe Integration**:
   ```bash
   pip install stripe
   ```
   - Uncomment `_process_stripe_payment` method
   - Update frontend to use Stripe.js for token creation
   - Set up webhook endpoint for payment confirmations

2. **PayPal Integration**:
   ```bash
   pip install paypalrestsdk
   ```
   - Uncomment `_process_paypal_payment` method
   - Implement PayPal payment flow

#### Frontend Payment Integration:
1. **Stripe.js Integration**:
   - Install: `npm install @stripe/stripe-js @stripe/react-stripe-js`
   - Create payment elements
   - Submit payment method token instead of card details

2. **PayPal Integration**:
   - Install: `npm install @paypal/react-paypal-js`
   - Integrate PayPal buttons

## 📝 Testing

### Test Email Configuration:
```python
# In Django shell: python manage.py shell
from django.core.mail import send_mail
send_mail(
    'Test Email',
    'This is a test email.',
    'from@example.com',
    ['to@example.com'],
    fail_silently=False,
)
```

### Test Payment Gateway (Mock Mode):
- The system automatically uses mock payments when gateways are not configured
- Mock payments return success but don't process actual transactions
- Check logs for mock payment warnings

## 🔒 Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use environment variables** - Never hardcode API keys
3. **Use App Passwords** - For Gmail, use App Passwords, not regular passwords
4. **Rotate Keys Regularly** - Update API keys periodically
5. **Use Webhooks** - For payment confirmations, use webhooks, not polling
6. **HTTPS in Production** - Always use HTTPS in production

## 📚 Additional Resources

- **Stripe Documentation**: https://stripe.com/docs
- **PayPal Developer Docs**: https://developer.paypal.com/docs
- **Django Email Docs**: https://docs.djangoproject.com/en/stable/topics/email/
- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833




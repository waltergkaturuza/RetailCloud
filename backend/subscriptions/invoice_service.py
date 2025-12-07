"""
Invoice generation and automation service.
Generates invoices 1 week before subscription expires and sends them to tenants.
"""
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from decimal import Decimal
from .models import Subscription, Invoice, Payment
from core.models import Tenant
from core.pricing_service import calculate_tenant_total_cost, get_active_pricing_rule
import logging

logger = logging.getLogger(__name__)


def generate_invoice_number(tenant, subscription):
    """Generate unique invoice number."""
    from django.utils import timezone
    date_str = timezone.now().strftime('%Y%m%d')
    tenant_id = str(tenant.id).zfill(4)
    
    # Get last invoice number for this tenant today
    last_invoice = Invoice.objects.filter(
        tenant=tenant,
        invoice_number__startswith=f'INV-{date_str}-{tenant_id}'
    ).order_by('-invoice_number').first()
    
    if last_invoice:
        # Extract sequence number
        try:
            seq = int(last_invoice.invoice_number.split('-')[-1]) + 1
        except:
            seq = 1
    else:
        seq = 1
    
    return f'INV-{date_str}-{tenant_id}-{str(seq).zfill(3)}'


@transaction.atomic
def generate_subscription_invoice(subscription, days_before_expiry=7):
    """
    Generate an invoice for a subscription that's about to expire.
    
    Args:
        subscription: Subscription instance
        days_before_expiry: Number of days before expiry to generate invoice
    
    Returns:
        Invoice instance or None if invoice already exists
    """
    now = timezone.now()
    expiry_date = subscription.current_period_end
    
    # Check if we're within the invoice generation window (1 week before expiry)
    days_until_expiry = (expiry_date - now).days
    
    if days_until_expiry > days_before_expiry or days_until_expiry < 0:
        return None  # Too early or already expired
    
    # Check if invoice already exists for this period
    existing_invoice = Invoice.objects.filter(
        subscription=subscription,
        due_date__gte=expiry_date - timedelta(days=1),
        due_date__lte=expiry_date + timedelta(days=1),
        status__in=['draft', 'pending']
    ).first()
    
    if existing_invoice:
        logger.info(f"Invoice already exists for subscription {subscription.id}: {existing_invoice.invoice_number}")
        return existing_invoice
    
    # Calculate invoice amount
    tenant = subscription.tenant
    billing_cycle = subscription.billing_cycle
    period_months = 12 if billing_cycle == 'yearly' else 1
    
    pricing_summary = calculate_tenant_total_cost(tenant, period_months=period_months)
    
    # Calculate amounts
    subtotal = pricing_summary['total']
    tax_rate = Decimal(str(tenant.tax_rate)) / Decimal('100.00') if tenant.tax_rate else Decimal('0.00')
    tax_amount = subtotal * tax_rate
    total_amount = subtotal + tax_amount
    
    # Generate invoice
    # Convert expiry_date (DateTimeField) to date for due_date (DateField)
    if hasattr(expiry_date, 'date'):
        due_date = expiry_date.date()
    else:
        due_date = expiry_date
    
    invoice = Invoice.objects.create(
        tenant=tenant,
        subscription=subscription,
        invoice_number=generate_invoice_number(tenant, subscription),
        amount=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        currency=pricing_summary['currency'],
        status='pending',
        due_date=due_date,
    )
    
    logger.info(f"Generated invoice {invoice.invoice_number} for tenant {tenant.company_name}")
    
    # Send invoice email
    try:
        send_invoice_email(invoice)
    except Exception as e:
        logger.error(f"Failed to send invoice email: {str(e)}")
    
    return invoice


def generate_upcoming_invoices(days_before_expiry=7):
    """
    Generate invoices for all subscriptions expiring within the specified days.
    
    Args:
        days_before_expiry: Number of days before expiry to generate invoice
    
    Returns:
        list of generated Invoice instances
    """
    now = timezone.now()
    target_date = now + timedelta(days=days_before_expiry)
    
    # Find subscriptions expiring within the window
    subscriptions = Subscription.objects.filter(
        status__in=['active', 'trial'],
        current_period_end__gte=now,
        current_period_end__lte=target_date
    ).select_related('tenant')
    
    generated_invoices = []
    for subscription in subscriptions:
        invoice = generate_subscription_invoice(subscription, days_before_expiry)
        if invoice:
            generated_invoices.append(invoice)
    
    logger.info(f"Generated {len(generated_invoices)} invoices")
    return generated_invoices


def send_invoice_email(invoice):
    """
    Send invoice email to tenant.
    
    Args:
        invoice: Invoice instance
    
    Note: Email functionality requires EMAIL_BACKEND and related settings
    to be configured in Django settings. If not configured, this will fail silently.
    """
    from django.core.mail import send_mail
    from django.conf import settings
    
    # Check if email is configured
    if not hasattr(settings, 'EMAIL_BACKEND') or settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        logger.warning("Email backend not configured. Invoice email not sent (console backend only).")
        return
    
    tenant = invoice.tenant
    
    # Prepare email context
    context = {
        'invoice': invoice,
        'tenant': tenant,
        'subscription': invoice.subscription,
        'site_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
    }
    
    # Render email template
    subject = f'Invoice {invoice.invoice_number} - RetailCloud Subscription Renewal'
    
    # Simple email body (can be enhanced with HTML template)
    message = f"""
Dear {tenant.contact_person},

Your subscription invoice is ready for renewal.

Invoice Number: {invoice.invoice_number}
Amount: {invoice.currency} {invoice.total_amount:.2f}
Due Date: {invoice.due_date.strftime('%Y-%m-%d')}

Breakdown:
  Subtotal: {invoice.currency} {invoice.amount:.2f}
  Tax: {invoice.currency} {invoice.tax_amount:.2f}
  Total: {invoice.currency} {invoice.total_amount:.2f}

Please log in to your RetailCloud account to view and pay this invoice.

Thank you for your business!

RetailCloud Team
"""
    
    # Send email
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
            recipient_list=[tenant.email],
            fail_silently=False,
        )
        logger.info(f"Sent invoice email to {tenant.email}")
    except Exception as e:
        logger.error(f"Failed to send invoice email to {tenant.email}: {str(e)}")
        raise


@transaction.atomic
def create_payment_receipt(payment):
    """
    Create and send payment receipt when payment is received.
    
    Args:
        payment: Payment instance with status='completed'
    
    Returns:
        dict with receipt information
    """
    if payment.status != 'completed':
        logger.warning(f"Payment {payment.id} is not completed, cannot generate receipt")
        return None
    
    # Update related invoice status if exists
    if payment.invoice:
        payment.invoice.status = 'paid'
        payment.invoice.save()
    
    # Send receipt email
    try:
        send_payment_receipt_email(payment)
    except Exception as e:
        logger.error(f"Failed to send payment receipt email: {str(e)}")
    
    receipt_info = {
        'payment_id': payment.id,
        'transaction_id': payment.transaction_id,
        'amount': float(payment.amount),
        'currency': payment.currency,
        'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
    }
    
    logger.info(f"Created payment receipt for payment {payment.transaction_id}")
    return receipt_info


def send_payment_receipt_email(payment):
    """
    Send payment receipt email to tenant.
    
    Args:
        payment: Payment instance
    
    Note: Email functionality requires EMAIL_BACKEND and related settings
    to be configured in Django settings. If not configured, this will fail silently.
    """
    from django.core.mail import send_mail
    from django.conf import settings
    
    # Check if email is configured
    if not hasattr(settings, 'EMAIL_BACKEND') or settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        logger.warning("Email backend not configured. Receipt email not sent (console backend only).")
        return
    
    tenant = payment.tenant
    invoice = payment.invoice
    
    subject = f'Payment Receipt - Transaction {payment.transaction_id}'
    
    message = f"""
Dear {tenant.contact_person},

Thank you for your payment!

Payment Receipt:
  Transaction ID: {payment.transaction_id}
  Amount: {payment.currency} {payment.amount:.2f}
  Payment Method: {payment.get_payment_method_display()}
  Paid At: {payment.paid_at.strftime('%Y-%m-%d %H:%M:%S') if payment.paid_at else 'N/A'}

{f"Invoice: {invoice.invoice_number}" if invoice else ""}

Your subscription has been renewed and is now active.

Thank you for your business!

RetailCloud Team
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
            recipient_list=[tenant.email],
            fail_silently=False,
        )
        logger.info(f"Sent payment receipt email to {tenant.email}")
    except Exception as e:
        logger.error(f"Failed to send payment receipt email to {tenant.email}: {str(e)}")
        raise


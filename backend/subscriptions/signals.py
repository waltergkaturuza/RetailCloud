"""
Signals for subscriptions app.
Automatically generates payment receipts when payment is completed.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment
from .invoice_service import create_payment_receipt


@receiver(post_save, sender=Payment)
def handle_payment_status_change(sender, instance, created, **kwargs):
    """
    Generate receipt when payment status changes to 'completed'.
    """
    if instance.status == 'completed' and instance.paid_at:
        try:
            create_payment_receipt(instance)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create payment receipt: {str(e)}")


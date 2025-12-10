"""
Signals for inventory app.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Product, StockLevel
from core.models import Branch
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Product)
def create_stock_levels_for_product(sender, instance, created, **kwargs):
    """
    Automatically create StockLevel records for all branches when a product is created.
    This ensures products appear in inventory management immediately.
    """
    if created and instance.tenant:
        try:
            # Get all branches for this tenant
            branches = Branch.objects.filter(tenant=instance.tenant, is_active=True)
            
            created_count = 0
            for branch in branches:
                # Create stock level with 0 quantity for each branch
                stock_level, was_created = StockLevel.objects.get_or_create(
                    tenant=instance.tenant,
                    branch=branch,
                    product=instance,
                    defaults={'quantity': 0}
                )
                if was_created:
                    created_count += 1
            
            if created_count > 0:
                logger.info(f"Created {created_count} stock level(s) for product {instance.name} (ID: {instance.id})")
        except Exception as e:
            # Log error but don't fail product creation
            logger.error(f"Error creating stock levels for product {instance.id}: {str(e)}", exc_info=True)


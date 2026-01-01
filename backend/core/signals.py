"""
Django signals for automatic category creation.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Tenant
from inventory.models import Category
from .industry_category_defaults import get_default_categories_for_industry


@receiver(post_save, sender=Tenant)
def create_default_categories(sender, instance, created, **kwargs):
    """
    Automatically create default product categories when:
    1. A tenant is created with a business category
    2. A tenant's business category is updated
    """
    if not instance.business_category:
        return
    
    category_code = instance.business_category.code
    default_categories = get_default_categories_for_industry(category_code)
    
    # Get existing category codes for this tenant
    existing_codes = set(
        Category.objects.filter(tenant=instance).values_list('code', flat=True)
    )
    
    # Create categories that don't exist
    for cat_data in default_categories:
        code = cat_data.get('code', '').upper()
        
        # Skip if category with this code already exists
        if code in existing_codes:
            continue
        
        # Check if category with same name exists (to avoid duplicates)
        if Category.objects.filter(tenant=instance, name=cat_data['name']).exists():
            continue
        
        Category.objects.create(
            tenant=instance,
            name=cat_data['name'],
            code=code,
            description=cat_data.get('description', ''),
            is_active=True,
            sort_order=len(existing_codes) + 1
        )
        existing_codes.add(code)


@receiver(pre_save, sender=Tenant)
def check_business_category_change(sender, instance, **kwargs):
    """
    Store the old business_category to detect changes.
    """
    if instance.pk:
        try:
            old_instance = Tenant.objects.get(pk=instance.pk)
            instance._old_business_category = old_instance.business_category
        except Tenant.DoesNotExist:
            instance._old_business_category = None
    else:
        instance._old_business_category = None





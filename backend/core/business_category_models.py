"""
Business category models for industry-specific configurations.
"""
from django.db import models
from django.utils import timezone


class BusinessCategory(models.Model):
    """Business category/industry type for tenant classification."""
    
    CATEGORY_CHOICES = [
        ('grocery', 'Grocery / Supermarket / Convenience Store'),
        ('motor_spares', 'Motor Spares / Hardware Shops'),
        ('clothing', 'Clothing Boutiques / Fashion Stores'),
        ('furniture', 'Furniture & Household Goods'),
        ('pharmacy', 'Pharmacies / Medical Shops'),
        ('cosmetics', 'Cosmetics & Beauty Shops'),
        ('restaurant', 'Restaurants / Takeaways / Fast Food'),
        ('general_retail', 'General Retail / Tuckshops / Bottle Stores'),
        ('electronics', 'Electronics & Tech Shops'),
        ('jewellery', 'Jewellery Shops'),
        ('clinic', 'Clinics / Medical Services'),
        ('car_wash', 'Car Wash / Auto Services'),
        ('repair_shop', 'Repair Shops (Electronics, Phones, etc.)'),
        ('agro', 'Agro Shops / Farm Supplies'),
        ('services', 'Travel, Printing, & Small Service Shops'),
        ('wholesale', 'Wholesale & Distribution'),
        ('salon', 'Salon & Barber Shops'),
        ('corporate', 'Corporate Stores / Staff Canteens'),
        ('ecommerce', 'Online Shops (E-commerce Only)'),
        ('other', 'Others (Custom Category)'),
    ]
    
    code = models.SlugField(unique=True, help_text="Category identifier code")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, help_text="Description of this business category")
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class or emoji")
    
    # Default modules for this category (via CategoryModuleMapping)
    
    # Category-specific features
    requires_expiry_tracking = models.BooleanField(default=False)
    requires_serial_tracking = models.BooleanField(default=False)
    requires_weight_scale = models.BooleanField(default=False)
    requires_variants = models.BooleanField(default=False)
    requires_warranty = models.BooleanField(default=False)
    requires_appointments = models.BooleanField(default=False)
    requires_recipe_costing = models.BooleanField(default=False)
    requires_layby = models.BooleanField(default=False)
    requires_delivery = models.BooleanField(default=False)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'business_categories'
        verbose_name_plural = 'Business Categories'
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return self.name
    
    def get_recommended_modules(self):
        """Get list of recommended module codes for this category."""
        return list(self.default_modules.values_list('code', flat=True))


class CategoryModuleMapping(models.Model):
    """Mapping between business categories and recommended modules."""
    category = models.ForeignKey(
        BusinessCategory,
        on_delete=models.CASCADE,
        related_name='module_mappings'
    )
    module = models.ForeignKey(
        'Module',
        on_delete=models.CASCADE,
        related_name='category_mappings'
    )
    is_required = models.BooleanField(
        default=False,
        help_text="Whether this module is required for this category"
    )
    priority = models.IntegerField(
        default=0,
        help_text="Priority order for activation (higher = more important)"
    )
    notes = models.TextField(blank=True, help_text="Notes about why this module is recommended")
    
    class Meta:
        db_table = 'category_module_mappings'
        unique_together = [['category', 'module']]
        ordering = ['-priority', 'module__name']
    
    def __str__(self):
        return f"{self.category.name} -> {self.module.name}"


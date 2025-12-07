"""
Promotion and discount models for Zimbabwe POS system.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from django.utils import timezone
from datetime import date, time
from core.models import Tenant
from inventory.models import Product, Category
from customers.models import Customer


class Promotion(models.Model):
    """Promotion/discount campaigns."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='promotions')
    
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, db_index=True, help_text="Promo code")
    description = models.TextField(blank=True)
    
    # Type
    promotion_type = models.CharField(
        max_length=50,
        choices=[
            ('percentage', 'Percentage Discount'),
            ('amount', 'Fixed Amount Discount'),
            ('bogo', 'Buy One Get One Free'),
            ('bogf', 'Buy X Get Y Free'),
            ('happy_hour', 'Happy Hour'),
            ('seasonal', 'Seasonal Sale'),
        ],
        default='percentage'
    )
    
    # Discount value
    discount_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )
    discount_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    # BOGO settings
    buy_quantity = models.IntegerField(default=1, help_text="Buy X items")
    get_quantity = models.IntegerField(default=1, help_text="Get Y items free")
    
    # Applicability
    apply_to = models.CharField(
        max_length=20,
        choices=[
            ('all', 'All Products'),
            ('category', 'Specific Category'),
            ('product', 'Specific Product'),
            ('customer', 'Specific Customer'),
            ('min_purchase', 'Minimum Purchase Amount'),
        ],
        default='all'
    )
    
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Schedule
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True, help_text="Happy hour start")
    end_time = models.TimeField(null=True, blank=True, help_text="Happy hour end")
    days_of_week = models.CharField(
        max_length=20,
        blank=True,
        help_text="Comma-separated: 0=Monday, 6=Sunday"
    )
    
    # Limits
    max_uses = models.IntegerField(null=True, blank=True, help_text="Maximum number of uses")
    max_uses_per_customer = models.IntegerField(null=True, blank=True, help_text="Max uses per customer")
    current_uses = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=False, help_text="Require supervisor approval")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'promotions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_promotion_type_display()})"
    
    def is_valid(self):
        """Check if promotion is currently valid."""
        today = timezone.now().date()
        now_time = timezone.now().time()
        
        # Check date range
        if not (self.start_date <= today <= self.end_date):
            return False
        
        # Check if active
        if not self.is_active:
            return False
        
        # Check max uses
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        
        # Check time for happy hour
        if self.promotion_type == 'happy_hour' and self.start_time and self.end_time:
            if not (self.start_time <= now_time <= self.end_time):
                return False
        
        # Check day of week
        if self.days_of_week:
            current_day = today.weekday()
            valid_days = [int(d) for d in self.days_of_week.split(',') if d.strip().isdigit()]
            if current_day not in valid_days:
                return False
        
        return True
    
    def calculate_discount(self, subtotal, quantity=1):
        """Calculate discount amount."""
        if not self.is_valid():
            return Decimal('0.00')
        
        if self.promotion_type == 'percentage' and self.discount_percentage:
            return (subtotal * self.discount_percentage / 100).quantize(Decimal('0.01'))
        
        elif self.promotion_type == 'amount' and self.discount_amount:
            return min(self.discount_amount, subtotal)
        
        elif self.promotion_type in ['bogo', 'bogf']:
            # BOGO calculation would be handled at item level
            return Decimal('0.00')
        
        return Decimal('0.00')


class PromotionUsage(models.Model):
    """Track promotion usage."""
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, related_name='usages')
    sale = models.ForeignKey('pos.Sale', on_delete=models.CASCADE, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'promotion_usages'
        ordering = ['-used_at']


class PriceOverride(models.Model):
    """Price overrides requiring supervisor approval."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='price_overrides')
    sale = models.ForeignKey('pos.Sale', on_delete=models.CASCADE, related_name='price_overrides', null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    override_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=1)
    
    reason = models.CharField(max_length=500)
    requested_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='price_override_requests')
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='price_override_approvals'
    )
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Approval'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'price_overrides'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Price Override: {self.product.name} - ${self.original_price} → ${self.override_price}"


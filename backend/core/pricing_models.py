"""
Dynamic pricing models for RetailCloud.
Supports per-category, per-user, per-branch pricing with yearly discounts.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class PricingRule(models.Model):
    """Dynamic pricing rules for the system."""
    name = models.CharField(max_length=100, unique=True, help_text="Name for this pricing rule")
    code = models.SlugField(unique=True, help_text="Code identifier for this rule")
    
    # Base pricing
    category_price_monthly = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('10.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Price per business category per month"
    )
    user_price_monthly = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Price per user per month"
    )
    branch_price_monthly = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('5.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Price per extra branch per month (beyond first branch)"
    )
    
    # Yearly discount
    yearly_discount_percent = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('20.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Percentage discount for yearly payments (e.g., 20.00 for 20%)"
    )
    
    # Currency
    currency = models.CharField(max_length=3, default='USD', help_text="Default currency for pricing")
    
    # Metadata
    is_active = models.BooleanField(default=True, help_text="Whether this pricing rule is currently active")
    is_default = models.BooleanField(default=False, help_text="Default pricing rule to use")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pricing_rules'
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def save(self, *args, **kwargs):
        # Ensure only one default rule
        if self.is_default:
            PricingRule.objects.filter(is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class ModulePricing(models.Model):
    """Per-module pricing overrides (optional)."""
    pricing_rule = models.ForeignKey(
        PricingRule, 
        on_delete=models.CASCADE, 
        related_name='module_pricing'
    )
    module = models.ForeignKey(
        'Module',
        on_delete=models.CASCADE,
        related_name='pricing_overrides'
    )
    price_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Monthly price override for this module"
    )
    price_yearly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Yearly price override (if not set, calculated with discount)"
    )
    
    class Meta:
        db_table = 'module_pricing'
        unique_together = [['pricing_rule', 'module']]
    
    def __str__(self):
        return f"{self.pricing_rule.name} - {self.module.name}"


"""
Core models for multi-tenancy and base functionality.
"""
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class Tenant(models.Model):
    """Multi-tenant organization/client."""
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, help_text="URL-friendly identifier")
    company_name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    country = models.CharField(max_length=100, default='Zimbabwe')
    city = models.CharField(max_length=100, blank=True)
    
    # Subscription
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('trial', 'Trial'),
            ('active', 'Active'),
            ('suspended', 'Suspended'),
            ('expired', 'Expired'),
            ('cancelled', 'Cancelled'),
        ],
        default='trial'
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    subscription_ends_at = models.DateTimeField(null=True, blank=True)
    
    # Settings
    timezone = models.CharField(max_length=50, default='Africa/Harare')
    currency = models.CharField(max_length=3, default='USD')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    vat_number = models.CharField(max_length=50, blank=True)
    
    # Business Category
    business_category = models.ForeignKey(
        'BusinessCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tenants',
        help_text="Industry/business category for this tenant"
    )
    custom_category_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Custom category name if 'Other' is selected"
    )
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenants'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.company_name
    
    def save(self, *args, **kwargs):
        if not self.trial_ends_at and self.subscription_status == 'trial':
            self.trial_ends_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    @property
    def is_subscription_active(self):
        """Check if tenant has active subscription."""
        if self.subscription_status == 'active':
            if self.subscription_ends_at:
                return timezone.now() < self.subscription_ends_at
            return True
        elif self.subscription_status == 'trial':
            return timezone.now() < self.trial_ends_at if self.trial_ends_at else False
        return False


class Module(models.Model):
    """Available system modules."""
    name = models.CharField(max_length=100, unique=True)
    code = models.SlugField(unique=True, help_text="Module identifier code")
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=50,
        choices=[
            ('core', 'Core'),
            ('advanced', 'Advanced'),
            ('specialized', 'Specialized'),
            ('bonus', 'Bonus'),
        ],
        default='core'
    )
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class or name")
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'modules'
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return self.name


class Package(models.Model):
    """Subscription packages."""
    name = models.CharField(max_length=100, unique=True)
    code = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    modules = models.ManyToManyField(Module, related_name='packages')
    max_users = models.IntegerField(default=5, help_text="Maximum users allowed")
    max_branches = models.IntegerField(default=1, help_text="Maximum branches allowed")
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'packages'
        ordering = ['sort_order', 'price_monthly']
    
    def __str__(self):
        return self.name


# AuditLog model has been moved to core.audit to avoid conflicts


class Branch(models.Model):
    """Store branches for multi-branch support."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='branches')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, help_text="Branch code/identifier")
    
    # Contact Information
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Zimbabwe')
    postal_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    phone_alt = models.CharField(max_length=20, blank=True, help_text="Alternative phone number")
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    
    # Additional Details
    description = models.TextField(blank=True, help_text="Branch description or notes")
    opening_hours = models.JSONField(
        default=dict,
        blank=True,
        help_text="Opening hours in JSON format: {'monday': {'open': '09:00', 'close': '17:00'}, ...}"
    )
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="GPS latitude for mapping"
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="GPS longitude for mapping"
    )
    
    # Management
    manager = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_branches'
    )
    
    # Settings
    is_active = models.BooleanField(default=True)
    is_main = models.BooleanField(default=False, help_text="Main/headquarters branch")
    allow_online_orders = models.BooleanField(default=False, help_text="Allow online orders for this branch")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'branches'
        unique_together = [['tenant', 'code']]
        ordering = ['-is_main', 'name']
        verbose_name_plural = 'Branches'
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.name}"
    
    def clean(self):
        """Ensure only one main branch per tenant."""
        if self.is_main:
            existing_main = Branch.objects.filter(
                tenant=self.tenant,
                is_main=True
            ).exclude(pk=self.pk).exists()
            if existing_main:
                raise ValidationError("Only one main branch allowed per tenant.")
    
    def get_full_address(self):
        """Get complete formatted address."""
        parts = []
        if self.address:
            parts.append(self.address)
        if self.city:
            parts.append(self.city)
        if self.postal_code:
            parts.append(self.postal_code)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts)


# Import currency models here to avoid circular imports
from .currency_models import Currency, ExchangeRate, TenantCurrency
# Import receipt models
from .receipt_models import ReceiptTemplate, ReceiptPrintLog


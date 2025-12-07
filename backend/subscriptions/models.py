"""
Subscription and billing models.
"""
from django.db import models
from django.utils import timezone
from decimal import Decimal
from core.models import Tenant, Package, Module


class Subscription(models.Model):
    """Tenant subscription."""
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='subscription')
    package = models.ForeignKey(Package, on_delete=models.PROTECT, related_name='subscriptions')
    billing_cycle = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('yearly', 'Yearly'),
        ],
        default='monthly'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('trial', 'Trial'),
            ('past_due', 'Past Due'),
            ('cancelled', 'Cancelled'),
            ('expired', 'Expired'),
        ],
        default='trial'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancelled_at = models.DateTimeField(null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'subscriptions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.package.name}"
    
    @property
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status == 'active' and timezone.now() < self.current_period_end


class TenantModule(models.Model):
    """Modules enabled for a tenant."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='enabled_modules')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='tenant_modules')
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Approval'),
            ('active', 'Active'),
            ('requires_payment', 'Requires Payment'),
            ('trial', 'Trial Access'),
            ('expired', 'Expired'),
            ('suspended', 'Suspended'),
        ],
        default='pending',
        help_text="Activation status of this module"
    )
    
    # Activation period
    activation_period_months = models.IntegerField(
        default=1,
        help_text="Activation period in months (1 for monthly, 12 for yearly)"
    )
    activated_at = models.DateTimeField(null=True, blank=True, help_text="When module was activated")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When module activation expires")
    
    # Payment tracking
    payment_type = models.CharField(
        max_length=20,
        choices=[
            ('trial', 'Trial'),
            ('paid', 'Paid'),
            ('debt', 'Debt'),
            ('complimentary', 'Complimentary'),
        ],
        default='trial',
        help_text="How this module is being paid for"
    )
    
    # Pricing
    price_monthly = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Monthly price at time of activation"
    )
    price_yearly = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Yearly price at time of activation"
    )
    actual_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Actual price paid for the activation period"
    )
    currency = models.CharField(max_length=3, default='USD', help_text="Currency for pricing")
    
    # Legacy fields (keeping for backwards compatibility)
    enabled_at = models.DateTimeField(null=True, blank=True, help_text="When module was activated (legacy)")
    requested_at = models.DateTimeField(auto_now_add=True, help_text="When module activation was requested")
    activated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activated_modules',
        help_text="User/admin who activated this module"
    )
    requires_owner_approval = models.BooleanField(
        default=False,
        help_text="Whether owner approval is required for activation"
    )
    notes = models.TextField(blank=True, help_text="Notes about activation (e.g., payment confirmation)")
    
    class Meta:
        db_table = 'tenant_modules'
        unique_together = [['tenant', 'module']]
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.module.name} ({self.status})"
    
    def save(self, *args, **kwargs):
        """Sync activated_at with enabled_at for backwards compatibility."""
        from django.utils import timezone
        from datetime import timedelta
        
        # Sync enabled_at with activated_at
        if self.activated_at and not self.enabled_at:
            self.enabled_at = self.activated_at
        elif self.enabled_at and not self.activated_at:
            self.activated_at = self.enabled_at
        
        # Set expires_at based on activation_period_months if activated
        if self.activated_at and not self.expires_at and self.activation_period_months:
            self.expires_at = self.activated_at + timedelta(days=30 * self.activation_period_months)
        
        super().save(*args, **kwargs)
    
    def can_activate(self):
        """Check if module can be activated based on tenant's subscription/trial status."""
        from django.utils import timezone
        
        # Check if trial is still valid
        if self.tenant.subscription_status == 'trial':
            if self.tenant.trial_ends_at and timezone.now() < self.tenant.trial_ends_at:
                return True, 'trial'
            return False, 'trial_expired'
        
        # Check if subscription is active
        if self.tenant.subscription_status == 'active':
            if self.tenant.subscription_ends_at and timezone.now() < self.tenant.subscription_ends_at:
                return True, 'active_subscription'
            return False, 'subscription_expired'
        
        # Check for payment
        if self.tenant.subscription_status in ['suspended', 'expired']:
            return False, 'requires_payment'
        
        return False, 'unknown'


class Invoice(models.Model):
    """Billing invoices."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    subscription = models.ForeignKey(Subscription, on_delete=models.PROTECT, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('pending', 'Pending'),
            ('paid', 'Paid'),
            ('overdue', 'Overdue'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    stripe_invoice_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.tenant.company_name}"


class Payment(models.Model):
    """Payment records."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='payments')
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='payments', null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('card', 'Credit/Debit Card'),
            ('ecocash', 'EcoCash'),
            ('onemoney', 'OneMoney'),
            ('telecash', 'Telecash'),
            ('zipit', 'ZIPIT'),
            ('paypal', 'PayPal'),
            ('bank_transfer', 'Bank Transfer'),
            ('cash', 'Cash'),
        ]
    )
    transaction_id = models.CharField(max_length=255, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
            ('refunded', 'Refunded'),
        ],
        default='pending'
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        """Auto-set paid_at when status changes to completed."""
        from django.utils import timezone
        
        # If status is being set to completed and paid_at is not set
        if self.status == 'completed' and not self.paid_at:
            self.paid_at = timezone.now()
        
        super().save(*args, **kwargs)


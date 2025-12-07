"""
Customer management models.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch


class Customer(models.Model):
    """Customer model."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customers')
    code = models.CharField(max_length=50, blank=True, help_text="Customer code")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, db_index=True)
    phone_alt = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Zimbabwe')
    
    # Loyalty
    loyalty_points = models.IntegerField(default=0)
    loyalty_points_balance = models.IntegerField(default=0)
    
    # Credit
    credit_limit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    credit_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    credit_rating = models.CharField(
        max_length=20,
        choices=[
            ('excellent', 'Excellent'),
            ('good', 'Good'),
            ('fair', 'Fair'),
            ('poor', 'Poor'),
            ('blacklisted', 'Blacklisted'),
        ],
        default='good'
    )
    
    # Stats
    total_purchases = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_visits = models.IntegerField(default=0)
    last_purchase_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers'
        unique_together = [['tenant', 'phone']]
        indexes = [
            models.Index(fields=['tenant', 'phone']),
            models.Index(fields=['tenant', 'email']),
        ]
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.phone})"
    
    @property
    def full_name(self):
        """Get full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def credit_available(self):
        """Get available credit."""
        return self.credit_limit - self.credit_balance
    
    @property
    def is_credit_available(self):
        """Check if credit is available."""
        return self.credit_available > 0


class CustomerTransaction(models.Model):
    """Customer transaction history."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customer_transactions')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(
        max_length=20,
        choices=[
            ('sale', 'Sale'),
            ('payment', 'Payment'),
            ('refund', 'Refund'),
            ('credit_issue', 'Credit Issue'),
            ('credit_adjustment', 'Credit Adjustment'),
        ]
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'customer_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.transaction_type}: {self.amount}"


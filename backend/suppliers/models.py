"""
Supplier management models.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant


class Supplier(models.Model):
    """Supplier model."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='suppliers')
    code = models.CharField(max_length=50, blank=True)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20)
    phone_alt = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Zimbabwe')
    
    # Financial
    credit_limit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Terms
    payment_terms = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Cash on Delivery'),
            ('7days', 'Net 7 Days'),
            ('15days', 'Net 15 Days'),
            ('30days', 'Net 30 Days'),
            ('60days', 'Net 60 Days'),
            ('custom', 'Custom Terms'),
        ],
        default='30days'
    )
    
    # Metadata
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'suppliers'
        unique_together = [['tenant', 'phone']]
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SupplierTransaction(models.Model):
    """Supplier transaction history."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='supplier_transactions')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(
        max_length=20,
        choices=[
            ('purchase', 'Purchase'),
            ('payment', 'Payment'),
            ('credit', 'Credit Note'),
            ('debit', 'Debit Note'),
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
        db_table = 'supplier_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.supplier.name} - {self.transaction_type}: {self.amount}"


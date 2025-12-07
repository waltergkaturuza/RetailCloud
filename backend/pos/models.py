"""
Point of Sale models.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch
from inventory.models import Product, ProductVariant
from customers.models import Customer

# Import till models
from .till_models import TillFloat, CashTransaction, SuspendedSale, DayEndReport
# Import promotion models
from .promotion_models import Promotion, PromotionUsage, PriceOverride


class Sale(models.Model):
    """Sales transaction."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='sales')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='sales')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    
    # Invoice
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateTimeField(auto_now_add=True)
    
    # Totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    change_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Payment
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Cash'),
            ('ecocash', 'EcoCash'),
            ('onemoney', 'OneMoney'),
            ('telecash', 'Telecash'),
            ('card', 'Card (Swipe)'),
            ('zipit', 'ZIPIT'),
            ('usd', 'USD Cash'),
            ('zwl', 'ZWL Cash'),
            ('zar', 'ZAR Cash'),
            ('rtgs', 'RTGS'),
            ('credit', 'Credit'),
            ('split', 'Split Payment'),
        ],
        default='cash'
    )
    currency = models.CharField(max_length=3, default='USD', help_text="Primary transaction currency")
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, help_text="Exchange rate used")
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # ZIMRA Compliance
    fiscal_number = models.CharField(max_length=100, blank=True, help_text="Fiscal invoice number")
    device_code = models.CharField(max_length=50, blank=True, help_text="Fiscal device code")
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    aids_levy = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('completed', 'Completed'),
            ('voided', 'Voided'),
            ('returned', 'Returned'),
            ('suspended', 'Suspended'),
        ],
        default='completed'
    )
    
    # Offline mode
    is_offline = models.BooleanField(default=False, help_text="Sale processed offline")
    synced_at = models.DateTimeField(null=True, blank=True, help_text="When offline sale was synced")
    
    # User tracking
    cashier = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='sales_as_cashier')
    supervisor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_approved',
        help_text="Supervisor who approved void/discount"
    )
    
    # Notes
    notes = models.TextField(blank=True)
    void_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sales'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['tenant', '-date']),
            models.Index(fields=['branch', '-date']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['customer']),
        ]
    
    def __str__(self):
        return f"Sale {self.invoice_number} - {self.total_amount}"
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate invoice number
            from django.utils import timezone
            prefix = f"INV-{timezone.now().strftime('%Y%m%d')}"
            last_sale = Sale.objects.filter(invoice_number__startswith=prefix).order_by('-id').first()
            if last_sale:
                num = int(last_sale.invoice_number.split('-')[-1]) + 1
            else:
                num = 1
            self.invoice_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)


class SaleItem(models.Model):
    """Sale line items."""
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='sale_items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Cost tracking
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sale_items'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity} = {self.total}"


class PaymentSplit(models.Model):
    """Split payment records."""
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payment_splits')
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Cash'),
            ('ecocash', 'EcoCash'),
            ('onemoney', 'OneMoney'),
            ('card', 'Card (Swipe)'),
            ('zipit', 'ZIPIT'),
            ('usd', 'USD Cash'),
            ('zwl', 'ZWL Cash'),
            ('zar', 'ZAR Cash'),
            ('rtgs', 'RTGS'),
        ]
    )
    currency = models.CharField(max_length=3, default='USD')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=255, blank=True, help_text="Transaction reference/EcoCash number")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_splits'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.payment_method} ({self.currency}): {self.amount}"


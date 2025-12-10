"""
Multi-currency and exchange rate models for Zimbabwe POS system.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant


class Currency(models.Model):
    """Supported currencies."""
    code = models.CharField(max_length=3, unique=True, primary_key=True)
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=5)
    is_active = models.BooleanField(default=True)
    is_base = models.BooleanField(default=False, help_text="Base currency for tenant")
    sort_order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'currencies'
        ordering = ['sort_order', 'code']
        verbose_name_plural = 'Currencies'
    
    def __str__(self):
        return f"{self.code} ({self.symbol})"


class ExchangeRate(models.Model):
    """Exchange rate tracking."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='exchange_rates')
    from_currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='exchange_rates_from')
    to_currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='exchange_rates_to')
    rate = models.DecimalField(
        max_digits=12, 
        decimal_places=4, 
        validators=[MinValueValidator(Decimal('0.0001'))],
        help_text="1 from_currency = rate to_currency"
    )
    effective_date = models.DateField()
    is_locked = models.BooleanField(default=False, help_text="Lock rate to prevent changes")
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_exchange_rates'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'exchange_rates'
        unique_together = [['tenant', 'from_currency', 'to_currency', 'effective_date']]
        ordering = ['-effective_date', '-created_at']
    
    def __str__(self):
        return f"{self.from_currency.code}/{self.to_currency.code}: {self.rate} ({self.effective_date})"


class TenantCurrency(models.Model):
    """Tenant-specific currency settings."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_currencies')
    currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='tenant_settings')
    is_enabled = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    rounding_rule = models.CharField(
        max_length=20,
        choices=[
            ('none', 'No Rounding'),
            ('round', 'Round to Nearest'),
            ('ceil', 'Round Up'),
            ('floor', 'Round Down'),
        ],
        default='round'
    )
    rounding_to = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.01'),
        help_text="Round to nearest (e.g., 0.01 for cents, 0.10 for dimes)"
    )
    allow_auto_convert = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'tenant_currencies'
        unique_together = [['tenant', 'currency']]
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.currency.code}"



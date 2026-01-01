"""
Till float and cash management models for Zimbabwe POS system.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch
from accounts.models import User


class TillFloat(models.Model):
    """Till float management per branch/shift."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='till_floats')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='till_floats')
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name='till_floats')
    
    # Float amounts per currency
    float_usd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    float_zwl = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    float_zar = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Shift info
    shift_date = models.DateField()
    shift_start = models.DateTimeField()
    shift_end = models.DateTimeField(null=True, blank=True)
    
    # Counts
    opening_cash_usd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    opening_cash_zwl = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    closing_cash_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    closing_cash_zwl = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('open', 'Open'),
            ('closed', 'Closed'),
            ('reconciled', 'Reconciled'),
        ],
        default='open'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'till_floats'
        ordering = ['-shift_date', '-shift_start']
        unique_together = [['branch', 'cashier', 'shift_date', 'status']]
    
    def __str__(self):
        return f"Till {self.branch.name} - {self.cashier.username} ({self.shift_date})"


class CashTransaction(models.Model):
    """Cash in/out transactions."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='cash_transactions')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='cash_transactions')
    till_float = models.ForeignKey(TillFloat, on_delete=models.CASCADE, related_name='cash_transactions', null=True, blank=True)
    
    transaction_type = models.CharField(
        max_length=20,
        choices=[
            ('float_in', 'Float In'),
            ('float_out', 'Float Out'),
            ('safe_drop', 'Safe Drop'),
            ('expense', 'Expense'),
            ('cash_in', 'Cash In'),
            ('cash_out', 'Cash Out'),
        ]
    )
    
    currency = models.CharField(max_length=3, default='USD')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    
    # Approval
    requires_approval = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_cash_transactions'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Details
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    reference = models.CharField(max_length=100, blank=True)
    
    # User tracking
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_cash_transactions')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cash_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.transaction_type} - {self.amount} {self.currency}"


class SuspendedSale(models.Model):
    """Parked/suspended sales."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='suspended_sales')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='suspended_sales')
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name='suspended_sales')
    
    # Sale data (stored as JSON)
    cart_data = models.JSONField(help_text="Serialized cart items")
    customer_id = models.IntegerField(null=True, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('suspended', 'Suspended'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ],
        default='suspended'
    )
    
    suspended_at = models.DateTimeField(auto_now_add=True)
    resumed_at = models.DateTimeField(null=True, blank=True)
    sale_id = models.IntegerField(null=True, blank=True, help_text="Sale ID when resumed")
    
    class Meta:
        db_table = 'suspended_sales'
        ordering = ['-suspended_at']
    
    def __str__(self):
        return f"Suspended Sale #{self.id} - {self.cashier.username}"


class DayEndReport(models.Model):
    """Day-end reports (X-Report, Z-Report)."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='day_end_reports')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='day_end_reports')
    till_float = models.ForeignKey(TillFloat, on_delete=models.CASCADE, related_name='day_end_reports')
    
    report_type = models.CharField(
        max_length=20,
        choices=[
            ('x_report', 'X-Report'),
            ('z_report', 'Z-Report'),
        ]
    )
    
    # Totals per currency
    total_sales_usd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_sales_zwl = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_sales_zar = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Payment methods breakdown
    cash_usd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    cash_zwl = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    ecocash = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    onemoney = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    card = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    zipit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    rtgs = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    credit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Summary
    total_transactions = models.IntegerField(default=0)
    total_items_sold = models.IntegerField(default=0)
    total_discounts = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Variances
    expected_cash_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expected_cash_zwl = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cash_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cash_zwl = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    variance_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    variance_zwl = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Report data (full JSON)
    report_data = models.JSONField(help_text="Complete report data")
    
    generated_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='generated_reports')
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'day_end_reports'
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"{self.get_report_type_display()} - {self.branch.name} ({self.generated_at.date()})"





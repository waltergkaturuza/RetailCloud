"""
Accounting models for expenses, taxes, and financial tracking.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch
from accounts.models import User


class ExpenseCategory(models.Model):
    """Categories for expenses."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='expense_categories')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'expense_categories'
        unique_together = [['tenant', 'code']]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.name}"


class Expense(models.Model):
    """Expense transactions for P&L accounting."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='expenses')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name='expenses')
    
    # Expense details
    expense_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateField()
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, related_name='expenses')
    
    # Amounts
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='USD')
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    
    # Expense type for P&L categorization
    expense_type = models.CharField(
        max_length=50,
        choices=[
            ('operating', 'Operating Expenses'),
            ('shipping', 'Shipping/Delivery Costs'),
            ('warehouse', 'Warehouse/Storage Costs'),
            ('utilities', 'Utilities'),
            ('rent', 'Rent'),
            ('salaries', 'Salaries & Wages'),
            ('marketing', 'Marketing & Advertising'),
            ('insurance', 'Insurance'),
            ('maintenance', 'Maintenance & Repairs'),
            ('office', 'Office Supplies'),
            ('professional', 'Professional Fees'),
            ('taxes', 'Taxes (Other)'),
            ('depreciation', 'Depreciation'),
            ('other', 'Other Expenses'),
        ],
        default='operating'
    )
    
    # Payment
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Cash'),
            ('bank', 'Bank Transfer'),
            ('card', 'Card'),
            ('cheque', 'Cheque'),
            ('ecocash', 'EcoCash'),
            ('other', 'Other'),
        ],
        default='cash'
    )
    paid = models.BooleanField(default=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Reference
    vendor_supplier = models.CharField(max_length=255, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    receipt_number = models.CharField(max_length=100, blank=True)
    
    # User tracking
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='expenses_created')
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses_approved'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Details
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'date']),
            models.Index(fields=['tenant', 'expense_type']),
            models.Index(fields=['expense_number']),
        ]
    
    def __str__(self):
        return f"Expense {self.expense_number} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        if not self.expense_number:
            from django.utils import timezone
            prefix = f"EXP-{timezone.now().strftime('%Y%m%d')}"
            last_expense = Expense.objects.filter(expense_number__startswith=prefix).order_by('-id').first()
            if last_expense:
                num = int(last_expense.expense_number.split('-')[-1]) + 1
            else:
                num = 1
            self.expense_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)


class TaxTransaction(models.Model):
    """Tax transactions for ZIMRA and other tax authorities."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tax_transactions')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name='tax_transactions')
    
    # Tax details
    tax_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateField()
    tax_period_start = models.DateField(null=True, blank=True)
    tax_period_end = models.DateField(null=True, blank=True)
    
    # Tax type
    tax_type = models.CharField(
        max_length=50,
        choices=[
            ('vat', 'VAT (Value Added Tax)'),
            ('income_tax', 'Income Tax'),
            ('paye', 'PAYE (Pay As You Earn)'),
            ('aids_levy', 'AIDS Levy'),
            ('nssa', 'NSSA Contributions'),
            ('zimdef', 'ZIMDEF Levy'),
            ('customs', 'Customs Duty'),
            ('excise', 'Excise Duty'),
            ('withholding', 'Withholding Tax'),
            ('other', 'Other Tax'),
        ],
        default='vat'
    )
    
    # Amounts
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='USD')
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    
    # Payment status
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Payment'),
            ('paid', 'Paid'),
            ('overdue', 'Overdue'),
            ('waived', 'Waived'),
        ],
        default='pending'
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    
    # Reference
    reference_number = models.CharField(max_length=100, blank=True)
    tax_authority = models.CharField(max_length=255, default='ZIMRA', help_text="Tax authority name")
    
    # Details
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # User tracking
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='tax_transactions_created')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tax_transactions'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'date']),
            models.Index(fields=['tenant', 'tax_type']),
            models.Index(fields=['tax_number']),
        ]
    
    def __str__(self):
        return f"{self.get_tax_type_display()} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        if not self.tax_number:
            from django.utils import timezone
            prefix = f"TAX-{timezone.now().strftime('%Y%m%d')}"
            last_tax = TaxTransaction.objects.filter(tax_number__startswith=prefix).order_by('-id').first()
            if last_tax:
                num = int(last_tax.tax_number.split('-')[-1]) + 1
            else:
                num = 1
            self.tax_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)




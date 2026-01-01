"""
Tax Configuration Models for Zimbabwe Tax Management
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from core.models import Tenant, Branch


class TaxConfiguration(models.Model):
    """Tax configuration and rates for a tenant."""
    
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name='tax_configuration'
    )
    
    # VAT Registration
    vat_registered = models.BooleanField(default=False)
    vat_number = models.CharField(max_length=50, blank=True, help_text="ZIMRA VAT registration number")
    vat_registration_date = models.DateField(null=True, blank=True)
    
    # Standard VAT Rate (typically 14.5% in Zimbabwe)
    standard_vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('14.50'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Standard VAT rate percentage"
    )
    
    # Tax Filing Frequency
    vat_filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annually', 'Annually'),
        ],
        default='monthly'
    )
    
    income_tax_filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annually', 'Annually'),
        ],
        default='annually'
    )
    
    # Tax Period Settings
    tax_year_start_month = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text="Month when tax year starts (1=January)"
    )
    
    # Income Tax Rates (Zimbabwe uses progressive brackets)
    # Store as JSON for flexibility
    income_tax_brackets = models.JSONField(
        default=list,
        help_text="Income tax brackets: [{'min': 0, 'max': 300000, 'rate': 0}, ...]"
    )
    
    # PAYE Settings
    paye_enabled = models.BooleanField(default=True)
    paye_threshold = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="PAYE threshold amount per month"
    )
    
    # Other Zimbabwe-Specific Taxes
    aids_levy_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('3.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="AIDS Levy rate percentage (on taxable income)"
    )
    
    nssa_enabled = models.BooleanField(default=True)
    nssa_employee_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('4.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="NSSA employee contribution rate percentage"
    )
    nssa_employer_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('4.50'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="NSSA employer contribution rate percentage"
    )
    
    zimdef_enabled = models.BooleanField(default=True)
    zimdef_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.50'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="ZIMDEF levy rate percentage"
    )
    
    # Default Currency
    default_currency = models.CharField(max_length=3, default='USD')
    
    # Settings
    auto_calculate_tax = models.BooleanField(
        default=True,
        help_text="Automatically calculate tax on sales and purchases"
    )
    tax_inclusive_pricing = models.BooleanField(
        default=False,
        help_text="Prices include tax (tax-inclusive) or exclude tax (tax-exclusive)"
    )
    
    # ZIMRA Integration (optional - for future API integration)
    zimra_api_key = models.CharField(max_length=255, blank=True, help_text="ZIMRA API key for direct filing")
    zimra_api_enabled = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tax_configurations'
    
    def __str__(self):
        return f"Tax Configuration for {self.tenant.company_name}"


class TaxPeriod(models.Model):
    """Tax periods for filing returns."""
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tax_periods')
    
    # Period Details
    period_type = models.CharField(
        max_length=20,
        choices=[
            ('vat', 'VAT'),
            ('income_tax', 'Income Tax'),
            ('paye', 'PAYE'),
        ]
    )
    period_start = models.DateField()
    period_end = models.DateField()
    period_label = models.CharField(max_length=100, help_text="e.g., 'January 2024', 'Q1 2024'")
    
    # Filing Status
    filing_status = models.CharField(
        max_length=20,
        choices=[
            ('not_started', 'Not Started'),
            ('in_progress', 'In Progress'),
            ('filed', 'Filed'),
            ('paid', 'Paid'),
            ('overdue', 'Overdue'),
        ],
        default='not_started'
    )
    
    # Due Dates
    filing_due_date = models.DateField()
    payment_due_date = models.DateField(null=True, blank=True)
    filed_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    
    # Amounts
    tax_payable = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total tax amount due"
    )
    tax_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Amount paid"
    )
    
    # References
    return_reference = models.CharField(max_length=100, blank=True, help_text="ZIMRA return reference number")
    payment_reference = models.CharField(max_length=100, blank=True, help_text="Payment reference number")
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tax_periods'
        ordering = ['-period_end']
        indexes = [
            models.Index(fields=['tenant', 'period_type', 'period_end']),
            models.Index(fields=['filing_status', 'filing_due_date']),
        ]
        unique_together = [['tenant', 'period_type', 'period_start', 'period_end']]
    
    def __str__(self):
        return f"{self.get_period_type_display()} - {self.period_label} ({self.tenant.company_name})"
    
    @property
    def is_overdue(self):
        """Check if period is overdue."""
        from django.utils import timezone
        today = timezone.now().date()
        return self.filing_status != 'paid' and today > self.filing_due_date
    
    @property
    def outstanding_amount(self):
        """Calculate outstanding tax amount."""
        return max(Decimal('0.00'), self.tax_payable - self.tax_paid)


class TaxLiability(models.Model):
    """Accrued tax liabilities from transactions."""
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tax_liabilities')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True)
    
    # Tax Details
    tax_type = models.CharField(
        max_length=50,
        choices=[
            ('vat_output', 'VAT Output (Sales)'),
            ('vat_input', 'VAT Input (Purchases)'),
            ('income_tax', 'Income Tax'),
            ('paye', 'PAYE'),
            ('aids_levy', 'AIDS Levy'),
            ('nssa', 'NSSA'),
            ('zimdef', 'ZIMDEF'),
            ('other', 'Other'),
        ]
    )
    
    # Source Transaction
    source_type = models.CharField(
        max_length=50,
        choices=[
            ('sale', 'Sale'),
            ('purchase', 'Purchase'),
            ('expense', 'Expense'),
            ('payroll', 'Payroll'),
            ('manual', 'Manual Entry'),
        ]
    )
    source_id = models.IntegerField(help_text="ID of the source transaction")
    
    # Amounts
    taxable_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Amount subject to tax (before tax)"
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Tax rate percentage applied"
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Tax amount accrued"
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Period
    tax_period_start = models.DateField(help_text="Start of tax period this liability belongs to")
    tax_period_end = models.DateField(help_text="End of tax period")
    
    # Status
    is_settled = models.BooleanField(default=False, help_text="Whether tax has been paid/filed")
    settled_at = models.DateTimeField(null=True, blank=True)
    tax_period = models.ForeignKey(
        TaxPeriod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='liabilities'
    )
    
    # Reference
    transaction_date = models.DateField()
    reference_number = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tax_liabilities'
        ordering = ['-transaction_date']
        indexes = [
            models.Index(fields=['tenant', 'tax_type', 'is_settled']),
            models.Index(fields=['tenant', 'tax_period_start', 'tax_period_end']),
            models.Index(fields=['source_type', 'source_id']),
        ]
    
    def __str__(self):
        return f"{self.get_tax_type_display()} - {self.tax_amount} {self.currency} ({self.transaction_date})"


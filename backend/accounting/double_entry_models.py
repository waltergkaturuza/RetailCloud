"""
Double-Entry Bookkeeping Models for Comprehensive Accounting Module.
This is a premium feature that requires module activation.
"""
from django.db import models
from django.core.validators import MinValueValidator
from django.db.models import Sum, Q
from decimal import Decimal
from core.models import Tenant, Branch
from accounts.models import User


class AccountType(models.TextChoices):
    """Account types following standard accounting classifications."""
    # Assets
    ASSET_CURRENT = 'asset_current', 'Current Asset'
    ASSET_FIXED = 'asset_fixed', 'Fixed Asset'
    ASSET_INTANGIBLE = 'asset_intangible', 'Intangible Asset'
    
    # Liabilities
    LIABILITY_CURRENT = 'liability_current', 'Current Liability'
    LIABILITY_LONG_TERM = 'liability_long_term', 'Long-Term Liability'
    
    # Equity
    EQUITY = 'equity', 'Equity'
    EQUITY_RETAINED = 'equity_retained', 'Retained Earnings'
    
    # Revenue
    REVENUE = 'revenue', 'Revenue'
    REVENUE_OTHER = 'revenue_other', 'Other Income'
    
    # Expenses
    EXPENSE = 'expense', 'Expense'
    EXPENSE_COGS = 'expense_cogs', 'Cost of Goods Sold'


class ChartOfAccounts(models.Model):
    """
    Chart of Accounts - Master list of all accounts for a tenant.
    Supports hierarchical account structure with parent/child relationships.
    """
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='chart_accounts')
    
    # Account identification
    code = models.CharField(max_length=50, db_index=True, help_text="Account code (e.g., 1000, 2000)")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Account classification
    account_type = models.CharField(max_length=50, choices=AccountType.choices)
    
    # Hierarchy (for sub-accounts)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sub_accounts',
        help_text="Parent account for hierarchical structure"
    )
    
    # Account properties
    is_active = models.BooleanField(default=True)
    is_system_account = models.BooleanField(
        default=False,
        help_text="System-generated accounts cannot be deleted"
    )
    
    # Normal balance (debit or credit)
    # Assets and Expenses: Debit normal
    # Liabilities, Equity, Revenue: Credit normal
    normal_balance = models.CharField(
        max_length=10,
        choices=[('debit', 'Debit'), ('credit', 'Credit')],
        default='debit'
    )
    
    # Account-level settings
    allow_manual_entries = models.BooleanField(
        default=True,
        help_text="Allow manual journal entries to this account"
    )
    requires_reconciliation = models.BooleanField(
        default=False,
        help_text="This account requires periodic reconciliation (e.g., bank accounts)"
    )
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='accounts_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chart_of_accounts'
        unique_together = [['tenant', 'code']]
        ordering = ['code']
        indexes = [
            models.Index(fields=['tenant', 'account_type']),
            models.Index(fields=['tenant', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    def get_full_code(self):
        """Get full account code including parent codes."""
        if self.parent:
            return f"{self.parent.get_full_code()}.{self.code}"
        return self.code
    
    def get_balance(self, as_of_date=None):
        """
        Get account balance (debit - credit) as of a specific date.
        Positive = debit balance, Negative = credit balance
        """
        from django.utils import timezone
        from datetime import date
        
        if as_of_date is None:
            as_of_date = date.today()
        
        # Get all journal lines for this account
        lines = JournalLine.objects.filter(
            account=self,
            journal_entry__date__lte=as_of_date,
            journal_entry__is_posted=True
        )
        
        # Calculate debit and credit totals
        debit_total = lines.aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')
        credit_total = lines.aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')
        
        # Return balance (debit - credit)
        return debit_total - credit_total
    
    def get_balance_display(self, as_of_date=None):
        """
        Get balance in the format appropriate for the account type.
        Returns dict with 'debit' and 'credit' amounts.
        """
        balance = self.get_balance(as_of_date)
        
        if balance >= 0:
            return {'debit': balance, 'credit': Decimal('0.00')}
        else:
            return {'debit': Decimal('0.00'), 'credit': abs(balance)}


class JournalEntry(models.Model):
    """
    Journal Entry - Represents a double-entry transaction.
    Every entry must balance (total debits = total credits).
    """
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='journal_entries')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name='journal_entries')
    
    # Entry identification
    entry_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateField(db_index=True)
    
    # Entry details
    description = models.TextField()
    reference = models.CharField(max_length=255, blank=True, help_text="External reference (invoice, receipt, etc.)")
    
    # Entry type
    entry_type = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual Entry'),
            ('sale', 'Sale Transaction'),
            ('purchase', 'Purchase Transaction'),
            ('payment', 'Payment'),
            ('receipt', 'Receipt'),
            ('expense', 'Expense'),
            ('adjustment', 'Adjustment'),
            ('closing', 'Closing Entry'),
            ('opening', 'Opening Balance'),
        ],
        default='manual'
    )
    
    # Status
    is_posted = models.BooleanField(default=False, db_index=True, help_text="Posted entries are locked and cannot be edited")
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journal_entries_posted'
    )
    
    # Reversal entry
    reversed_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reverses',
        help_text="Entry that reverses this entry"
    )
    
    # User tracking
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='journal_entries_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'journal_entries'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'date']),
            models.Index(fields=['tenant', 'is_posted']),
            models.Index(fields=['tenant', 'entry_type']),
            models.Index(fields=['entry_number']),
        ]
    
    def __str__(self):
        return f"JE {self.entry_number} - {self.date}"
    
    def save(self, *args, **kwargs):
        """Generate entry number if not provided."""
        if not self.entry_number:
            from django.utils import timezone
            prefix = f"JE-{timezone.now().strftime('%Y%m%d')}"
            last_entry = JournalEntry.objects.filter(entry_number__startswith=prefix).order_by('-id').first()
            if last_entry:
                num = int(last_entry.entry_number.split('-')[-1]) + 1
            else:
                num = 1
            self.entry_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)
    
    def get_total_debits(self):
        """Get total debit amount for this entry."""
        total = self.journal_lines.aggregate(total=Sum('debit_amount'))['total']
        return total or Decimal('0.00')
    
    def get_total_credits(self):
        """Get total credit amount for this entry."""
        total = self.journal_lines.aggregate(total=Sum('credit_amount'))['total']
        return total or Decimal('0.00')
    
    def is_balanced(self):
        """Check if entry balances (debits = credits)."""
        return self.get_total_debits() == self.get_total_credits()
    
    def post(self, user):
        """
        Post the journal entry (make it permanent).
        Validates that entry is balanced before posting.
        """
        if self.is_posted:
            raise ValueError("Entry is already posted")
        
        if not self.is_balanced():
            raise ValueError(f"Entry is not balanced. Debits: {self.get_total_debits()}, Credits: {self.get_total_credits()}")
        
        from django.utils import timezone
        self.is_posted = True
        self.posted_at = timezone.now()
        self.posted_by = user
        self.save()
        
        # Update general ledger
        for line in self.journal_lines.all():
            GeneralLedger.update_balance(line)
    
    def reverse(self, user, reversal_date=None):
        """
        Create a reversing entry for this journal entry.
        """
        if not self.is_posted:
            raise ValueError("Can only reverse posted entries")
        
        from django.utils import timezone
        from datetime import date
        
        if reversal_date is None:
            reversal_date = date.today()
        
        # Create reversing entry
        reversal = JournalEntry.objects.create(
            tenant=self.tenant,
            branch=self.branch,
            date=reversal_date,
            description=f"Reversal of {self.entry_number}: {self.description}",
            reference=f"REV-{self.entry_number}",
            entry_type='adjustment',
            created_by=user,
            reversed_by=self
        )
        
        # Create reversal lines (swap debits and credits)
        for line in self.journal_lines.all():
            JournalLine.objects.create(
                journal_entry=reversal,
                account=line.account,
                debit_amount=line.credit_amount,  # Swap
                credit_amount=line.debit_amount,  # Swap
                description=f"Reversal: {line.description}"
            )
        
        # Post the reversal
        reversal.post(user)
        
        return reversal


class JournalLine(models.Model):
    """
    Journal Line - Individual debit or credit line in a journal entry.
    Each journal entry must have at least 2 lines (one debit, one credit).
    """
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='journal_lines')
    account = models.ForeignKey(ChartOfAccounts, on_delete=models.PROTECT, related_name='journal_lines')
    
    # Amounts (one must be zero, the other must be positive)
    debit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Debit amount (must be 0.00 if credit_amount > 0)"
    )
    credit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Credit amount (must be 0.00 if debit_amount > 0)"
    )
    
    # Line details
    description = models.TextField(blank=True)
    reference = models.CharField(max_length=255, blank=True)
    
    class Meta:
        db_table = 'journal_lines'
        ordering = ['id']
    
    def __str__(self):
        amount = self.debit_amount if self.debit_amount > 0 else self.credit_amount
        type_str = "DR" if self.debit_amount > 0 else "CR"
        return f"{self.account.code} {type_str} {amount}"
    
    def clean(self):
        """Validate that only one of debit_amount or credit_amount is non-zero."""
        from django.core.exceptions import ValidationError
        
        if self.debit_amount > 0 and self.credit_amount > 0:
            raise ValidationError("A line cannot have both debit and credit amounts")
        
        if self.debit_amount == 0 and self.credit_amount == 0:
            raise ValidationError("A line must have either a debit or credit amount")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class GeneralLedger(models.Model):
    """
    General Ledger - Running balance for each account.
    Updated automatically when journal entries are posted.
    """
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='general_ledger')
    account = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='ledger_entries')
    
    # Period (for period-based reporting)
    period_year = models.IntegerField()
    period_month = models.IntegerField()
    
    # Opening balance for the period
    opening_debit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    opening_credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Movement during the period
    period_debit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    period_credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Closing balance for the period
    closing_debit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    closing_credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'general_ledger'
        unique_together = [['tenant', 'account', 'period_year', 'period_month']]
        ordering = ['account', 'period_year', 'period_month']
        indexes = [
            models.Index(fields=['tenant', 'period_year', 'period_month']),
            models.Index(fields=['account', 'period_year', 'period_month']),
        ]
    
    def __str__(self):
        return f"{self.account.code} - {self.period_year}/{self.period_month:02d}"
    
    @staticmethod
    def update_balance(journal_line):
        """
        Update general ledger balance when a journal line is posted.
        """
        from django.utils import timezone
        from datetime import date
        
        entry = journal_line.journal_entry
        account = journal_line.account
        period_date = entry.date
        
        ledger, created = cls.objects.get_or_create(
            tenant=entry.tenant,
            account=account,
            period_year=period_date.year,
            period_month=period_date.month,
            defaults={
                'opening_debit': Decimal('0.00'),
                'opening_credit': Decimal('0.00'),
                'period_debit': Decimal('0.00'),
                'period_credit': Decimal('0.00'),
                'closing_debit': Decimal('0.00'),
                'closing_credit': Decimal('0.00'),
            }
        )
        
        # Add to period totals
        ledger.period_debit += journal_line.debit_amount
        ledger.period_credit += journal_line.credit_amount
        
        # Recalculate closing balance
        opening_balance = ledger.opening_debit - ledger.opening_credit
        period_balance = ledger.period_debit - ledger.period_credit
        closing_balance = opening_balance + period_balance
        
        if closing_balance >= 0:
            ledger.closing_debit = closing_balance
            ledger.closing_credit = Decimal('0.00')
        else:
            ledger.closing_debit = Decimal('0.00')
            ledger.closing_credit = abs(closing_balance)
        
        ledger.save()
    
    def get_closing_balance(self):
        """Get closing balance as a single number (debit - credit)."""
        return self.closing_debit - self.closing_credit


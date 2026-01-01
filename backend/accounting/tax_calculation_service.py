"""
Tax Calculation Service for Zimbabwe
Handles automated tax calculations for sales, purchases, and other transactions
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Q
from datetime import date, timedelta
from .models import TaxTransaction
from .tax_config_models import TaxConfiguration, TaxPeriod, TaxLiability
from core.models import Tenant


class TaxCalculationService:
    """Service for calculating and managing taxes."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.config = self._get_or_create_config()
    
    def _get_or_create_config(self) -> TaxConfiguration:
        """Get or create tax configuration for tenant."""
        config, created = TaxConfiguration.objects.get_or_create(tenant=self.tenant)
        if created:
            # Set default Zimbabwe income tax brackets (2024 rates - update as needed)
            config.income_tax_brackets = [
                {'min': 0, 'max': 300000, 'rate': 0, 'label': 'First 300,000'},
                {'min': 300000, 'max': 720000, 'rate': 20, 'label': 'Next 420,000 (20%)'},
                {'min': 720000, 'max': 1440000, 'rate': 25, 'label': 'Next 720,000 (25%)'},
                {'min': 1440000, 'max': None, 'rate': 40, 'label': 'Above 1,440,000 (40%)'},
            ]
            config.save()
        return config
    
    def calculate_vat(self, amount: Decimal, is_tax_inclusive: bool = None) -> dict:
        """
        Calculate VAT on an amount.
        
        Args:
            amount: The amount (tax-inclusive or tax-exclusive based on config)
            is_tax_inclusive: Override config setting (optional)
        
        Returns:
            dict with 'base_amount', 'tax_amount', 'total_amount'
        """
        if is_tax_inclusive is None:
            is_tax_inclusive = self.config.tax_inclusive_pricing
        
        vat_rate = self.config.standard_vat_rate / 100
        
        if is_tax_inclusive:
            # Price includes VAT
            base_amount = amount / (1 + vat_rate)
            tax_amount = amount - base_amount
            total_amount = amount
        else:
            # Price excludes VAT
            base_amount = amount
            tax_amount = amount * vat_rate
            total_amount = amount + tax_amount
        
        return {
            'base_amount': round(base_amount, 2),
            'tax_amount': round(tax_amount, 2),
            'total_amount': round(total_amount, 2),
            'vat_rate': self.config.standard_vat_rate
        }
    
    def calculate_income_tax(self, taxable_income: Decimal) -> dict:
        """
        Calculate income tax using progressive brackets.
        
        Args:
            taxable_income: The taxable income amount
        
        Returns:
            dict with 'tax_amount', 'effective_rate', 'breakdown'
        """
        brackets = self.config.income_tax_brackets
        total_tax = Decimal('0.00')
        breakdown = []
        
        remaining_income = taxable_income
        
        for bracket in brackets:
            if remaining_income <= 0:
                break
            
            bracket_min = Decimal(str(bracket['min']))
            bracket_max = Decimal(str(bracket['max'])) if bracket['max'] else None
            rate = Decimal(str(bracket['rate'])) / 100
            
            # Determine taxable amount in this bracket
            if bracket_max is None:
                # Top bracket (no max)
                taxable_in_bracket = remaining_income
            else:
                taxable_in_bracket = min(remaining_income, bracket_max - bracket_min)
            
            if taxable_in_bracket > 0:
                tax_in_bracket = taxable_in_bracket * rate
                total_tax += tax_in_bracket
                breakdown.append({
                    'bracket': bracket.get('label', f"{bracket_min}-{bracket_max or '∞'}"),
                    'taxable_amount': float(taxable_in_bracket),
                    'rate': float(rate * 100),
                    'tax_amount': float(tax_in_bracket)
                })
                remaining_income -= taxable_in_bracket
        
        effective_rate = (total_tax / taxable_income * 100) if taxable_income > 0 else Decimal('0.00')
        
        return {
            'tax_amount': round(total_tax, 2),
            'effective_rate': round(effective_rate, 2),
            'breakdown': breakdown
        }
    
    def calculate_aids_levy(self, taxable_income: Decimal) -> Decimal:
        """Calculate AIDS Levy (typically 3% of taxable income)."""
        rate = self.config.aids_levy_rate / 100
        return round(taxable_income * rate, 2)
    
    def create_tax_liability(
        self,
        tax_type: str,
        source_type: str,
        source_id: int,
        taxable_amount: Decimal,
        tax_rate: Decimal,
        transaction_date: date,
        branch=None,
        reference_number: str = ''
    ) -> TaxLiability:
        """
        Create a tax liability from a transaction.
        
        Args:
            tax_type: Type of tax (vat_output, vat_input, income_tax, etc.)
            source_type: Type of source transaction (sale, purchase, expense, etc.)
            source_id: ID of the source transaction
            taxable_amount: Amount subject to tax
            tax_rate: Tax rate percentage
            transaction_date: Date of transaction
            branch: Branch (optional)
            reference_number: Reference number
        
        Returns:
            TaxLiability instance
        """
        tax_amount = taxable_amount * (tax_rate / 100)
        
        # Determine tax period
        period_start, period_end = self._get_tax_period_dates(transaction_date, tax_type)
        
        liability = TaxLiability.objects.create(
            tenant=self.tenant,
            branch=branch,
            tax_type=tax_type,
            source_type=source_type,
            source_id=source_id,
            taxable_amount=taxable_amount,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            currency=self.config.default_currency,
            tax_period_start=period_start,
            tax_period_end=period_end,
            transaction_date=transaction_date,
            reference_number=reference_number
        )
        
        return liability
    
    def _get_tax_period_dates(self, transaction_date: date, tax_type: str) -> tuple:
        """Get tax period start and end dates for a transaction date."""
        if tax_type.startswith('vat'):
            # VAT periods (monthly or quarterly)
            if self.config.vat_filing_frequency == 'monthly':
                period_start = transaction_date.replace(day=1)
                if period_start.month == 12:
                    period_end = date(period_start.year + 1, 1, 1) - timedelta(days=1)
                else:
                    period_end = date(period_start.year, period_start.month + 1, 1) - timedelta(days=1)
            elif self.config.vat_filing_frequency == 'quarterly':
                quarter = (transaction_date.month - 1) // 3
                period_start = date(transaction_date.year, quarter * 3 + 1, 1)
                if quarter == 3:
                    period_end = date(transaction_date.year + 1, 1, 1) - timedelta(days=1)
                else:
                    period_end = date(transaction_date.year, (quarter + 1) * 3 + 1, 1) - timedelta(days=1)
            else:  # annually
                period_start = date(transaction_date.year, 1, 1)
                period_end = date(transaction_date.year, 12, 31)
        else:
            # Income tax periods (typically annual)
            year_start_month = self.config.tax_year_start_month
            if transaction_date.month >= year_start_month:
                period_start = date(transaction_date.year, year_start_month, 1)
                if year_start_month == 1:
                    period_end = date(transaction_date.year, 12, 31)
                else:
                    period_end = date(transaction_date.year + 1, year_start_month - 1, 28)
            else:
                period_start = date(transaction_date.year - 1, year_start_month, 1)
                if year_start_month == 1:
                    period_end = date(transaction_date.year, 12, 31)
                else:
                    period_end = date(transaction_date.year, year_start_month - 1, 28)
        
        return period_start, period_end
    
    def calculate_vat_return(
        self,
        period_start: date,
        period_end: date,
        branch=None
    ) -> dict:
        """
        Calculate VAT return for a period (VAT Output - VAT Input).
        
        Returns:
            dict with vat_output, vat_input, vat_payable, breakdown
        """
        # Get VAT output (from sales)
        vat_output_qs = TaxLiability.objects.filter(
            tenant=self.tenant,
            tax_type='vat_output',
            tax_period_start=period_start,
            tax_period_end=period_end,
            is_settled=False
        )
        if branch:
            vat_output_qs = vat_output_qs.filter(branch=branch)
        
        vat_output_total = vat_output_qs.aggregate(
            total=Sum('tax_amount')
        )['total'] or Decimal('0.00')
        
        # Get VAT input (from purchases)
        vat_input_qs = TaxLiability.objects.filter(
            tenant=self.tenant,
            tax_type='vat_input',
            tax_period_start=period_start,
            tax_period_end=period_end,
            is_settled=False
        )
        if branch:
            vat_input_qs = vat_input_qs.filter(branch=branch)
        
        vat_input_total = vat_input_qs.aggregate(
            total=Sum('tax_amount')
        )['total'] or Decimal('0.00')
        
        # Calculate VAT payable (or refundable)
        vat_payable = vat_output_total - vat_input_total
        
        return {
            'period_start': period_start,
            'period_end': period_end,
            'vat_output': float(vat_output_total),
            'vat_input': float(vat_input_total),
            'vat_payable': float(vat_payable),
            'is_refund': vat_payable < 0,
            'breakdown': {
                'sales_vat': float(vat_output_total),
                'purchases_vat': float(vat_input_total),
            }
        }
    
    def calculate_taxable_income(
        self,
        period_start: date,
        period_end: date,
        branch=None
    ) -> Decimal:
        """
        Calculate taxable income for a period using P&L service.
        
        Returns:
            Taxable income (profit before tax)
        """
        try:
            from reports.pl_service import TradingProfitLossService
            branch_id = branch.id if branch else None
            pl_service = TradingProfitLossService(self.tenant, period_start, period_end, branch_id)
            
            # Get trading account and expenses
            trading = pl_service._calculate_trading_account()
            operating_expenses = pl_service._calculate_operating_expenses()
            other_expenses = pl_service._calculate_other_expenses()
            other_income = pl_service._calculate_other_income()
            
            # Calculate profit before tax
            gross_profit = Decimal(str(trading['gross_profit']))
            op_expenses_total = Decimal(str(operating_expenses['total']))
            other_income_total = Decimal(str(other_income['total']))
            other_expenses_total = Decimal(str(other_expenses['total']))
            
            operating_profit = gross_profit - op_expenses_total
            profit_before_tax = operating_profit + other_income_total - other_expenses_total
            
            return max(Decimal('0.00'), profit_before_tax)  # Taxable income cannot be negative
        except Exception:
            # Return zero if P&L service is not available
            return Decimal('0.00')
    
    def get_tax_due_dates(self, period_end: date, tax_type: str) -> dict:
        """
        Get due dates for tax filing and payment.
        Zimbabwe rules:
        - VAT: Due 25th of month following period end
        - Income Tax: Due dates vary by entity type
        """
        if tax_type == 'vat':
            # VAT due 25th of month following period end
            if period_end.month == 12:
                due_month = 1
                due_year = period_end.year + 1
            else:
                due_month = period_end.month + 1
                due_year = period_end.year
            
            filing_due_date = date(due_year, due_month, 25)
            payment_due_date = filing_due_date  # Usually same as filing
        
        elif tax_type == 'income_tax':
            # Income tax typically due after year end (varies)
            # Default: 4 months after period end
            filing_due_date = period_end + timedelta(days=120)
            payment_due_date = filing_due_date
        
        else:
            filing_due_date = period_end + timedelta(days=30)
            payment_due_date = filing_due_date
        
        return {
            'filing_due_date': filing_due_date,
            'payment_due_date': payment_due_date
        }
    
    def create_or_update_tax_period(
        self,
        period_type: str,
        period_start: date,
        period_end: date
    ) -> TaxPeriod:
        """Create or update a tax period."""
        period_label = self._generate_period_label(period_start, period_end, period_type)
        due_dates = self.get_tax_due_dates(period_end, period_type)
        
        period, created = TaxPeriod.objects.get_or_create(
            tenant=self.tenant,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            defaults={
                'period_label': period_label,
                'filing_due_date': due_dates['filing_due_date'],
                'payment_due_date': due_dates['payment_due_date'],
            }
        )
        
        if not created:
            # Update due dates if changed
            period.filing_due_date = due_dates['filing_due_date']
            period.payment_due_date = due_dates['payment_due_date']
            period.save()
        
        return period
    
    def _generate_period_label(self, period_start: date, period_end: date, period_type: str) -> str:
        """Generate a human-readable period label."""
        if period_start.year == period_end.year and period_start.month == period_end.month:
            # Monthly
            return period_start.strftime('%B %Y')
        elif period_start.month in [1, 4, 7, 10] and (period_end - period_start).days in [89, 90, 91, 92]:
            # Quarterly
            quarter = (period_start.month - 1) // 3 + 1
            return f"Q{quarter} {period_start.year}"
        else:
            # Annual or custom
            if period_start.year == period_end.year:
                return f"{period_start.year}"
            else:
                return f"{period_start.strftime('%b %Y')} - {period_end.strftime('%b %Y')}"


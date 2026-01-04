"""
Accounting Services for Trial Balance, Balance Sheet, and Cash Flow Statements.
Premium feature requiring double-entry bookkeeping module activation.
"""
from django.db.models import Sum, Q, F
from django.utils import timezone
from datetime import date, datetime
from decimal import Decimal
from .double_entry_models import (
    ChartOfAccounts,
    JournalEntry,
    JournalLine,
    GeneralLedger,
    AccountType
)
from core.models import Tenant


class TrialBalanceService:
    """Service for generating Trial Balance reports."""
    
    @staticmethod
    def generate_trial_balance(tenant, as_of_date=None, include_zero_balances=False):
        """
        Generate trial balance as of a specific date.
        
        Returns:
            dict: {
                'as_of_date': date,
                'accounts': [
                    {
                        'account_code': str,
                        'account_name': str,
                        'account_type': str,
                        'debit_balance': Decimal,
                        'credit_balance': Decimal,
                    },
                    ...
                ],
                'total_debits': Decimal,
                'total_credits': Decimal,
                'is_balanced': bool,
            }
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        accounts = ChartOfAccounts.objects.filter(
            tenant=tenant,
            is_active=True
        ).order_by('code')
        
        trial_balance_accounts = []
        total_debits = Decimal('0.00')
        total_credits = Decimal('0.00')
        
        for account in accounts:
            balance = account.get_balance(as_of_date)
            balance_display = account.get_balance_display(as_of_date)
            
            debit_balance = balance_display['debit']
            credit_balance = balance_display['credit']
            
            # Skip zero balances if requested
            if not include_zero_balances and debit_balance == 0 and credit_balance == 0:
                continue
            
            trial_balance_accounts.append({
                'account_id': account.id,
                'account_code': account.code,
                'account_name': account.name,
                'account_type': account.get_account_type_display(),
                'normal_balance': account.normal_balance,
                'debit_balance': debit_balance,
                'credit_balance': credit_balance,
                'net_balance': balance,
            })
            
            total_debits += debit_balance
            total_credits += credit_balance
        
        return {
            'as_of_date': as_of_date,
            'accounts': trial_balance_accounts,
            'total_debits': total_debits,
            'total_credits': total_credits,
            'is_balanced': total_debits == total_credits,
            'difference': total_debits - total_credits,
        }


class BalanceSheetService:
    """Service for generating Balance Sheet reports."""
    
    @staticmethod
    def generate_balance_sheet(tenant, as_of_date=None):
        """
        Generate balance sheet as of a specific date.
        
        Returns:
            dict: {
                'as_of_date': date,
                'assets': {
                    'current': [...],
                    'fixed': [...],
                    'intangible': [...],
                    'total': Decimal,
                },
                'liabilities': {
                    'current': [...],
                    'long_term': [...],
                    'total': Decimal,
                },
                'equity': {
                    'equity': [...],
                    'retained_earnings': Decimal,
                    'total': Decimal,
                },
                'total_assets': Decimal,
                'total_liabilities_and_equity': Decimal,
                'is_balanced': bool,
            }
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        accounts = ChartOfAccounts.objects.filter(
            tenant=tenant,
            is_active=True
        ).order_by('code')
        
        assets = {
            'current': [],
            'fixed': [],
            'intangible': [],
        }
        liabilities = {
            'current': [],
            'long_term': [],
        }
        equity_items = {
            'equity': [],
            'retained_earnings': Decimal('0.00'),
        }
        
        # Categorize accounts
        for account in accounts:
            balance = account.get_balance(as_of_date)
            balance_display = account.get_balance_display(as_of_date)
            
            # For assets, positive balance = debit (asset value)
            # For liabilities/equity, negative balance = credit (liability/equity value)
            
            account_data = {
                'account_id': account.id,
                'account_code': account.code,
                'account_name': account.name,
                'balance': abs(balance) if account.normal_balance == 'credit' else balance,
            }
            
            if account.account_type == AccountType.ASSET_CURRENT:
                assets['current'].append(account_data)
            elif account.account_type == AccountType.ASSET_FIXED:
                assets['fixed'].append(account_data)
            elif account.account_type == AccountType.ASSET_INTANGIBLE:
                assets['intangible'].append(account_data)
            elif account.account_type == AccountType.LIABILITY_CURRENT:
                liabilities['current'].append(account_data)
            elif account.account_type == AccountType.LIABILITY_LONG_TERM:
                liabilities['long_term'].append(account_data)
            elif account.account_type == AccountType.EQUITY:
                equity_items['equity'].append(account_data)
            elif account.account_type == AccountType.EQUITY_RETAINED:
                equity_items['retained_earnings'] = abs(balance)
        
        # Calculate totals
        assets['total'] = (
            sum(a['balance'] for a in assets['current']) +
            sum(a['balance'] for a in assets['fixed']) +
            sum(a['balance'] for a in assets['intangible'])
        )
        
        liabilities['total'] = (
            sum(l['balance'] for l in liabilities['current']) +
            sum(l['balance'] for l in liabilities['long_term'])
        )
        
        equity_items['total'] = (
            sum(e['balance'] for e in equity_items['equity']) +
            equity_items['retained_earnings']
        )
        
        total_assets = assets['total']
        total_liabilities_and_equity = liabilities['total'] + equity_items['total']
        
        return {
            'as_of_date': as_of_date,
            'assets': assets,
            'liabilities': liabilities,
            'equity': equity_items,
            'total_assets': total_assets,
            'total_liabilities_and_equity': total_liabilities_and_equity,
            'is_balanced': abs(total_assets - total_liabilities_and_equity) < Decimal('0.01'),
            'difference': total_assets - total_liabilities_and_equity,
        }


class CashFlowService:
    """Service for generating Cash Flow Statements."""
    
    @staticmethod
    def generate_cash_flow_statement(tenant, start_date, end_date):
        """
        Generate cash flow statement for a period.
        
        Returns:
            dict: {
                'period_start': date,
                'period_end': date,
                'operating_activities': {
                    'items': [...],
                    'total': Decimal,
                },
                'investing_activities': {
                    'items': [...],
                    'total': Decimal,
                },
                'financing_activities': {
                    'items': [...],
                    'total': Decimal,
                },
                'net_cash_flow': Decimal,
                'opening_cash': Decimal,
                'closing_cash': Decimal,
            }
        """
        # Get cash accounts (typically current assets with "cash" or "bank" in name)
        cash_accounts = ChartOfAccounts.objects.filter(
            tenant=tenant,
            is_active=True,
            account_type__in=[
                AccountType.ASSET_CURRENT,
            ],
            name__icontains='cash'
        ) | ChartOfAccounts.objects.filter(
            tenant=tenant,
            is_active=True,
            account_type__in=[
                AccountType.ASSET_CURRENT,
            ],
            name__icontains='bank'
        )
        
        # Get opening cash balance
        opening_cash = Decimal('0.00')
        for account in cash_accounts:
            opening_cash += account.get_balance(start_date)
        
        # Get closing cash balance
        closing_cash = Decimal('0.00')
        for account in cash_accounts:
            closing_cash += account.get_balance(end_date)
        
        # Get journal entries in the period
        journal_entries = JournalEntry.objects.filter(
            tenant=tenant,
            date__gte=start_date,
            date__lte=end_date,
            is_posted=True
        ).prefetch_related('journal_lines__account')
        
        # Categorize cash flows
        operating_activities = []
        investing_activities = []
        financing_activities = []
        
        for entry in journal_entries:
            for line in entry.journal_lines.all():
                if line.account in cash_accounts:
                    amount = line.debit_amount - line.credit_amount
                    
                    # Categorize based on entry type and account
                    if entry.entry_type in ['sale', 'receipt', 'expense', 'payment']:
                        operating_activities.append({
                            'date': entry.date,
                            'description': entry.description,
                            'amount': amount,
                            'entry_number': entry.entry_number,
                        })
                    elif entry.entry_type in ['purchase'] and 'asset' in line.account.account_type:
                        investing_activities.append({
                            'date': entry.date,
                            'description': entry.description,
                            'amount': amount,
                            'entry_number': entry.entry_number,
                        })
                    elif entry.entry_type in ['adjustment']:
                        # Try to categorize based on account type
                        if line.account.account_type in [AccountType.LIABILITY_CURRENT, AccountType.LIABILITY_LONG_TERM, AccountType.EQUITY]:
                            financing_activities.append({
                                'date': entry.date,
                                'description': entry.description,
                                'amount': amount,
                                'entry_number': entry.entry_number,
                            })
        
        operating_total = sum(item['amount'] for item in operating_activities)
        investing_total = sum(item['amount'] for item in investing_activities)
        financing_total = sum(item['amount'] for item in financing_activities)
        
        net_cash_flow = operating_total + investing_total + financing_total
        
        return {
            'period_start': start_date,
            'period_end': end_date,
            'operating_activities': {
                'items': operating_activities,
                'total': operating_total,
            },
            'investing_activities': {
                'items': investing_activities,
                'total': investing_total,
            },
            'financing_activities': {
                'items': financing_activities,
                'total': financing_total,
            },
            'net_cash_flow': net_cash_flow,
            'opening_cash': opening_cash,
            'closing_cash': closing_cash,
            'reconciliation': opening_cash + net_cash_flow - closing_cash,  # Should be 0
        }


class AccountAgingService:
    """Service for generating aging reports for Accounts Receivable and Payable."""
    
    @staticmethod
    def generate_ar_aging(tenant, as_of_date=None):
        """
        Generate Accounts Receivable aging report.
        
        Returns:
            dict: {
                'as_of_date': date,
                'customers': [
                    {
                        'customer_id': int,
                        'customer_name': str,
                        'current': Decimal,
                        'days_30': Decimal,
                        'days_60': Decimal,
                        'days_90': Decimal,
                        'over_90': Decimal,
                        'total': Decimal,
                    },
                    ...
                ],
                'totals': {...},
            }
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        # Get AR account (typically "Accounts Receivable")
        ar_account = ChartOfAccounts.objects.filter(
            tenant=tenant,
            is_active=True,
            name__icontains='receivable'
        ).first()
        
        if not ar_account:
            return {
                'as_of_date': as_of_date,
                'customers': [],
                'totals': {
                    'current': Decimal('0.00'),
                    'days_30': Decimal('0.00'),
                    'days_60': Decimal('0.00'),
                    'days_90': Decimal('0.00'),
                    'over_90': Decimal('0.00'),
                    'total': Decimal('0.00'),
                },
                'error': 'Accounts Receivable account not found',
            }
        
        # This would need integration with Customer/Sale models
        # For now, return structure
        return {
            'as_of_date': as_of_date,
            'customers': [],
            'totals': {
                'current': Decimal('0.00'),
                'days_30': Decimal('0.00'),
                'days_60': Decimal('0.00'),
                'days_90': Decimal('0.00'),
                'over_90': Decimal('0.00'),
                'total': Decimal('0.00'),
            },
        }
    
    @staticmethod
    def generate_ap_aging(tenant, as_of_date=None):
        """
        Generate Accounts Payable aging report.
        Similar structure to AR aging.
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        # Get AP account
        ap_account = ChartOfAccounts.objects.filter(
            tenant=tenant,
            is_active=True,
            name__icontains='payable'
        ).first()
        
        if not ap_account:
            return {
                'as_of_date': as_of_date,
                'suppliers': [],
                'totals': {
                    'current': Decimal('0.00'),
                    'days_30': Decimal('0.00'),
                    'days_60': Decimal('0.00'),
                    'days_90': Decimal('0.00'),
                    'over_90': Decimal('0.00'),
                    'total': Decimal('0.00'),
                },
                'error': 'Accounts Payable account not found',
            }
        
        return {
            'as_of_date': as_of_date,
            'suppliers': [],
            'totals': {
                'current': Decimal('0.00'),
                'days_30': Decimal('0.00'),
                'days_60': Decimal('0.00'),
                'days_90': Decimal('0.00'),
                'over_90': Decimal('0.00'),
                'total': Decimal('0.00'),
            },
        }



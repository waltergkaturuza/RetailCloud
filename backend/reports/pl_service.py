"""
Comprehensive Trading Profit & Loss Statement Service
Generates proper accounting-style P&L statements.
"""
from django.db.models import Sum, Q, F, DecimalField, Value
from django.db.models.functions import Coalesce
from decimal import Decimal
from datetime import datetime, date
from typing import Dict, List, Optional
from django.utils import timezone

from pos.models import Sale, SaleItem
try:
    from pos.return_models import SaleReturn
except ImportError:
    SaleReturn = None
try:
    from pos.return_service import ReturnProcessingService
except ImportError:
    # Fallback if return_service doesn't exist
    ReturnProcessingService = None
from accounting.models import Expense, TaxTransaction
from accounting.tax_config_models import TaxLiability
from inventory.models import StockLevel


class TradingProfitLossService:
    """Service to generate comprehensive Trading Profit & Loss statements."""
    
    def __init__(self, tenant, start_date: date, end_date: date, branch_id: Optional[int] = None):
        self.tenant = tenant
        self.start_date = start_date
        self.end_date = end_date
        self.branch_id = branch_id
    
    def generate_pl_statement(self) -> Dict:
        """
        Generate comprehensive Trading P&L statement.
        
        Structure:
        - Trading Account (Revenue, COGS, Gross Profit)
        - Operating Expenses
        - Other Income/Expenses
        - Taxes
        - Net Profit
        """
        
        # ===== TRADING ACCOUNT =====
        trading = self._calculate_trading_account()
        
        # ===== OPERATING EXPENSES =====
        operating_expenses = self._calculate_operating_expenses()
        
        # ===== OTHER EXPENSES =====
        other_expenses = self._calculate_other_expenses()
        
        # ===== TAXES =====
        taxes = self._calculate_taxes()
        
        # ===== OTHER INCOME =====
        other_income = self._calculate_other_income()
        
        # ===== CALCULATIONS =====
        # Convert all values to Decimal for consistent arithmetic
        gross_profit = Decimal(str(trading['gross_profit']))
        op_expenses_total = Decimal(str(operating_expenses['total']))
        other_income_total = Decimal(str(other_income['total']))
        other_expenses_total = Decimal(str(other_expenses['total']))
        taxes_total = Decimal(str(taxes['total']))
        revenue = Decimal(str(trading['revenue']))
        
        operating_profit = gross_profit - op_expenses_total
        profit_before_tax = operating_profit + other_income_total - other_expenses_total
        net_profit = profit_before_tax - taxes_total
        
        # Calculate margins
        gross_profit_margin = float((gross_profit / revenue * 100) if revenue > 0 else 0)
        operating_profit_margin = float((operating_profit / revenue * 100) if revenue > 0 else 0)
        net_profit_margin = float((net_profit / revenue * 100) if revenue > 0 else 0)
        
        return {
            'period': {
                'start_date': self.start_date.isoformat(),
                'end_date': self.end_date.isoformat(),
                'tenant_name': self.tenant.company_name,
                'branch': self.branch_id
            },
            'trading_account': trading,
            'operating_expenses': operating_expenses,
            'other_expenses': other_expenses,
            'other_income': other_income,
            'taxes': taxes,
            'summary': {
                'gross_profit': float(gross_profit),
                'operating_expenses_total': float(op_expenses_total),
                'operating_profit': float(operating_profit),
                'other_income_total': float(other_income_total),
                'other_expenses_total': float(other_expenses_total),
                'profit_before_tax': float(profit_before_tax),
                'taxes_total': float(taxes_total),
                'net_profit': float(net_profit),
                'margins': {
                    'gross_profit_margin': round(gross_profit_margin, 2),
                    'operating_profit_margin': round(operating_profit_margin, 2),
                    'net_profit_margin': round(net_profit_margin, 2)
                }
            },
            'generated_at': timezone.now().isoformat()
        }
    
    def _calculate_trading_account(self) -> Dict:
        """Calculate Trading Account: Revenue, COGS, Gross Profit."""
        
        # Build sales query
        sales_query = Sale.objects.filter(
            tenant=self.tenant,
            date__date__gte=self.start_date,
            date__date__lte=self.end_date,
            status='completed'
        )
        
        if self.branch_id:
            sales_query = sales_query.filter(branch_id=self.branch_id)
        
        # Calculate Revenue
        revenue_result = sales_query.aggregate(
            total_revenue=Sum('total_amount'),
            total_discount=Sum('discount_amount'),
            total_sales_tax=Sum('tax_amount')
        )
        
        revenue = Decimal(str(revenue_result['total_revenue'] or 0))
        sales_discounts = Decimal(str(revenue_result['total_discount'] or 0))
        sales_tax = Decimal(str(revenue_result['total_sales_tax'] or 0))
        
        # Calculate Returns & Refunds
        returns = self._calculate_returns()
        
        # Net Revenue (after discounts and returns)
        net_revenue = revenue - sales_discounts - returns['returns_value']
        
        # Calculate COGS
        cogs = Decimal('0.00')
        for sale in sales_query.select_related('branch').prefetch_related('items'):
            for item in sale.items.all():
                item_cost = Decimal(str(item.cost_price or 0)) * Decimal(str(item.quantity or 0))
                cogs += item_cost
        
        # Adjust COGS for returns (restorable items reverse COGS)
        cogs -= returns['cogs_reversed']
        # Add write-offs to COGS (damaged returns increase cost)
        cogs += returns['write_offs']
        
        # Gross Profit
        gross_profit = net_revenue - cogs
        
        return {
            'revenue': float(revenue),
            'sales_discounts': float(sales_discounts),
            'returns_value': float(returns['returns_value']),
            'net_revenue': float(net_revenue),
            'cost_of_goods_sold': float(cogs),
            'returns_adjustment': {
                'cogs_reversed': float(returns['cogs_reversed']),
                'write_offs': float(returns['write_offs'])
            },
            'gross_profit': float(gross_profit),
            'gross_profit_margin': float((gross_profit / net_revenue * 100) if net_revenue > 0 else 0)
        }
    
    def _calculate_returns(self) -> Dict:
        """Calculate return impacts on revenue and COGS."""
        # Initialize defaults
        returns_value = Decimal('0.00')
        cogs_reversed = Decimal('0.00')
        write_offs = Decimal('0.00')
        
        # Check if SaleReturn model is available
        if not SaleReturn:
            return {
                'returns_value': returns_value,
                'cogs_reversed': cogs_reversed,
                'write_offs': write_offs
            }
        
        returns_query = SaleReturn.objects.filter(
            tenant=self.tenant,
            date__date__gte=self.start_date,
            date__date__lte=self.end_date,
            status__in=['approved', 'processed']
        )
        
        if self.branch_id:
            returns_query = returns_query.filter(branch_id=self.branch_id)
        
        for sale_return in returns_query.prefetch_related('items'):
            returns_value += sale_return.total_amount
            
            # Calculate impact per item
            for return_item in sale_return.items.all():
                cost_per_unit = Decimal(str(return_item.product.cost_price or 0))
                quantity = Decimal(str(return_item.quantity_returned))
                
                if ReturnProcessingService and ReturnProcessingService.can_restore_to_inventory(return_item.condition):
                    # Restorable: COGS reversed
                    cogs_reversed += cost_per_unit * quantity
                else:
                    # Damaged: Write-off
                    write_offs += cost_per_unit * quantity
        
        return {
            'returns_value': returns_value,
            'cogs_reversed': cogs_reversed,
            'write_offs': write_offs
        }
    
    def _calculate_operating_expenses(self) -> Dict:
        """Calculate operating expenses by category."""
        expenses_query = Expense.objects.filter(
            tenant=self.tenant,
            date__gte=self.start_date,
            date__lte=self.end_date
        )
        
        if self.branch_id:
            expenses_query = expenses_query.filter(branch_id=self.branch_id)
        
        # Group by expense type
        expense_types = {}
        total = Decimal('0.00')
        
        for expense in expenses_query.select_related('category'):
            expense_type = expense.expense_type
            amount = Decimal(str(expense.amount))
            
            if expense_type not in expense_types:
                expense_types[expense_type] = {
                    'name': expense.get_expense_type_display(),
                    'amount': Decimal('0.00'),
                    'items': []
                }
            
            expense_types[expense_type]['amount'] += amount
            expense_types[expense_type]['items'].append({
                'expense_number': expense.expense_number,
                'date': expense.date.isoformat(),
                'description': expense.description or expense.category.name,
                'amount': float(amount),
                'vendor': expense.vendor_supplier
            })
            total += amount
        
        # Convert to list format
        expenses_list = []
        for exp_type, data in sorted(expense_types.items()):
            expenses_list.append({
                'type': exp_type,
                'name': data['name'],
                'amount': float(data['amount']),
                'items': data['items']
            })
        
        return {
            'total': total,
            'categories': expenses_list,
            'breakdown': {
                'shipping': float(expense_types.get('shipping', {}).get('amount', Decimal('0.00'))),
                'warehouse': float(expense_types.get('warehouse', {}).get('amount', Decimal('0.00'))),
                'utilities': float(expense_types.get('utilities', {}).get('amount', Decimal('0.00'))),
                'rent': float(expense_types.get('rent', {}).get('amount', Decimal('0.00'))),
                'salaries': float(expense_types.get('salaries', {}).get('amount', Decimal('0.00'))),
                'marketing': float(expense_types.get('marketing', {}).get('amount', Decimal('0.00'))),
                'other_operating': float(sum(
                    float(data['amount']) for exp_type, data in expense_types.items()
                    if exp_type not in ['shipping', 'warehouse', 'utilities', 'rent', 'salaries', 'marketing']
                ))
            }
        }
    
    def _calculate_other_expenses(self) -> Dict:
        """Calculate other non-operating expenses."""
        # This includes expenses marked as 'other', depreciation, etc.
        expenses_query = Expense.objects.filter(
            tenant=self.tenant,
            date__gte=self.start_date,
            date__lte=self.end_date,
            expense_type__in=['other', 'depreciation']
        )
        
        if self.branch_id:
            expenses_query = expenses_query.filter(branch_id=self.branch_id)
        
        total_result = expenses_query.aggregate(
            total=Sum('amount')
        )
        total = Decimal(str(total_result['total'] or 0))
        
        depreciation_result = expenses_query.filter(expense_type='depreciation').aggregate(
            total=Sum('amount')
        )
        depreciation = Decimal(str(depreciation_result['total'] or 0))
        
        other_result = expenses_query.filter(expense_type='other').aggregate(
            total=Sum('amount')
        )
        other = Decimal(str(other_result['total'] or 0))
        
        return {
            'total': total,
            'breakdown': {
                'depreciation': float(depreciation),
                'other': float(other)
            }
        }
    
    def _calculate_taxes(self, profit_before_tax: Decimal = None) -> Dict:
        """
        Calculate tax expenses (ZIMRA, etc.).
        Integrates with TaxCalculationService for accurate tax calculations.
        """
        # Get paid taxes from TaxTransaction (actual tax payments)
        taxes_query = TaxTransaction.objects.filter(
            tenant=self.tenant,
            date__gte=self.start_date,
            date__lte=self.end_date
        )
        
        if self.branch_id:
            taxes_query = taxes_query.filter(branch_id=self.branch_id)
        
        # Get accrued taxes from TaxLiability (VAT, PAYE, etc. - not income tax)
        liabilities_query = TaxLiability.objects.filter(
            tenant=self.tenant,
            transaction_date__gte=self.start_date,
            transaction_date__lte=self.end_date,
            tax_type__in=['vat_output', 'paye', 'aids_levy', 'nssa', 'zimdef']  # Exclude VAT input and income tax
        )
        
        if self.branch_id:
            liabilities_query = liabilities_query.filter(branch_id=self.branch_id)
        
        # Group by tax type
        tax_types = {}
        total = Decimal('0.00')
        
        # Add TaxTransaction payments
        for tax in taxes_query:
            tax_type = tax.tax_type
            amount = Decimal(str(tax.amount))
            
            if tax_type not in tax_types:
                tax_types[tax_type] = {
                    'name': tax.get_tax_type_display(),
                    'amount': Decimal('0.00'),
                    'items': []
                }
            
            tax_types[tax_type]['amount'] += amount
            tax_types[tax_type]['items'].append({
                'tax_number': tax.tax_number,
                'date': tax.date.isoformat(),
                'amount': float(amount),
                'reference': tax.reference_number,
                'status': tax.status,
                'source': 'payment'
            })
            total += amount
        
        # Add TaxLiability accrued taxes
        for liability in liabilities_query:
            tax_type = liability.tax_type
            # Map liability tax_type to TaxTransaction tax_type
            if tax_type == 'vat_output':
                mapped_type = 'vat'
            elif tax_type == 'aids_levy':
                mapped_type = 'aids_levy'
            elif tax_type == 'nssa':
                mapped_type = 'nssa'
            elif tax_type == 'zimdef':
                mapped_type = 'zimdef'
            else:
                mapped_type = tax_type
            
            amount = Decimal(str(liability.tax_amount))
            
            if mapped_type not in tax_types:
                tax_types[mapped_type] = {
                    'name': liability.get_tax_type_display(),
                    'amount': Decimal('0.00'),
                    'items': []
                }
            
            tax_types[mapped_type]['amount'] += amount
            tax_types[mapped_type]['items'].append({
                'reference': liability.reference_number,
                'date': liability.transaction_date.isoformat(),
                'amount': float(amount),
                'source': 'accrued'
            })
            total += amount
        
        # Calculate income tax if profit_before_tax is provided
        income_tax_amount = Decimal('0.00')
        if profit_before_tax is not None and profit_before_tax > 0:
            try:
                from accounting.tax_calculation_service import TaxCalculationService
                tax_service = TaxCalculationService(self.tenant)
                income_tax_result = tax_service.calculate_income_tax(profit_before_tax)
                income_tax_amount = income_tax_result['tax_amount']
                
                # Calculate AIDS Levy on taxable income
                aids_levy_amount = tax_service.calculate_aids_levy(profit_before_tax)
                
                # Add income tax
                if 'income_tax' not in tax_types:
                    tax_types['income_tax'] = {
                        'name': 'Income Tax',
                        'amount': Decimal('0.00'),
                        'items': []
                    }
                tax_types['income_tax']['amount'] += income_tax_amount
                tax_types['income_tax']['items'].append({
                    'reference': 'Calculated',
                    'date': self.end_date.isoformat(),
                    'amount': float(income_tax_amount),
                    'source': 'calculated',
                    'breakdown': income_tax_result.get('breakdown', [])
                })
                total += income_tax_amount
                
                # Add AIDS Levy if not already included
                if aids_levy_amount > 0:
                    if 'aids_levy' not in tax_types:
                        tax_types['aids_levy'] = {
                            'name': 'AIDS Levy',
                            'amount': Decimal('0.00'),
                            'items': []
                        }
                    tax_types['aids_levy']['amount'] += aids_levy_amount
                    tax_types['aids_levy']['items'].append({
                        'reference': 'Calculated',
                        'date': self.end_date.isoformat(),
                        'amount': float(aids_levy_amount),
                        'source': 'calculated'
                    })
                    total += aids_levy_amount
            except Exception:
                # Silently fail if tax service is not available
                pass
        
        # Convert to list
        taxes_list = []
        for tax_type, data in sorted(tax_types.items()):
            taxes_list.append({
                'type': tax_type,
                'name': data['name'],
                'amount': float(data['amount']),
                'items': data['items']
            })
        
        return {
            'total': float(total),
            'categories': taxes_list,
            'breakdown': {
                'vat': float(tax_types.get('vat', {}).get('amount', Decimal('0.00'))),
                'income_tax': float(tax_types.get('income_tax', {}).get('amount', Decimal('0.00'))),
                'paye': float(tax_types.get('paye', {}).get('amount', Decimal('0.00'))),
                'aids_levy': float(tax_types.get('aids_levy', {}).get('amount', Decimal('0.00'))),
                'nssa': float(tax_types.get('nssa', {}).get('amount', Decimal('0.00'))),
                'zimdef': float(tax_types.get('zimdef', {}).get('amount', Decimal('0.00'))),
                'other_taxes': float(sum(
                    float(data['amount']) for tax_type, data in tax_types.items()
                    if tax_type not in ['vat', 'income_tax', 'paye', 'aids_levy', 'nssa', 'zimdef']
                ))
            }
        }
    
    def _calculate_other_income(self) -> Dict:
        """Calculate other income (non-sales revenue)."""
        # For now, return zero. Can be extended for interest income, etc.
        return {
            'total': Decimal('0.00'),
            'breakdown': {}
        }


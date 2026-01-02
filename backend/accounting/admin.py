"""
Django Admin configuration for accounting models.
"""
from django.contrib import admin
from .models import ExpenseCategory, Expense, TaxTransaction
from .tax_config_models import TaxConfiguration, TaxPeriod, TaxLiability

# Import double-entry models admin (premium feature)
from . import admin_double_entry  # noqa


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'tenant', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'tenant__company_name']
    list_editable = ['is_active']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['expense_number', 'date', 'category', 'amount', 'currency', 'expense_type', 'paid', 'tenant']
    list_filter = ['expense_type', 'paid', 'payment_method', 'date', 'currency']
    search_fields = ['expense_number', 'vendor_supplier', 'invoice_number', 'description']
    date_hierarchy = 'date'
    readonly_fields = ['expense_number', 'created_at', 'updated_at']


@admin.register(TaxTransaction)
class TaxTransactionAdmin(admin.ModelAdmin):
    list_display = ['tax_number', 'date', 'tax_type', 'amount', 'currency', 'status', 'due_date', 'tenant']
    list_filter = ['tax_type', 'status', 'tax_authority', 'date', 'currency']
    search_fields = ['tax_number', 'reference_number', 'description']
    date_hierarchy = 'date'
    readonly_fields = ['tax_number', 'created_at', 'updated_at']


@admin.register(TaxConfiguration)
class TaxConfigurationAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'vat_registered', 'standard_vat_rate', 'vat_filing_frequency', 'auto_calculate_tax']
    list_filter = ['vat_registered', 'vat_filing_frequency', 'auto_calculate_tax']
    search_fields = ['tenant__company_name', 'vat_number']


@admin.register(TaxPeriod)
class TaxPeriodAdmin(admin.ModelAdmin):
    list_display = ['period_label', 'period_type', 'period_start', 'period_end', 'filing_status', 'tax_payable', 'tenant']
    list_filter = ['period_type', 'filing_status', 'period_end']
    search_fields = ['period_label', 'return_reference', 'payment_reference']
    date_hierarchy = 'period_end'
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TaxLiability)
class TaxLiabilityAdmin(admin.ModelAdmin):
    list_display = ['tax_type', 'source_type', 'tax_amount', 'currency', 'transaction_date', 'is_settled', 'tenant']
    list_filter = ['tax_type', 'source_type', 'is_settled', 'currency', 'transaction_date']
    search_fields = ['reference_number']
    date_hierarchy = 'transaction_date'
    readonly_fields = ['created_at', 'updated_at']

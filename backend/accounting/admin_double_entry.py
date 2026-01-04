"""
Django Admin configuration for double-entry bookkeeping models (premium feature).
"""
from django.contrib import admin

try:
    from .double_entry_models import ChartOfAccounts, JournalEntry, JournalLine, GeneralLedger
    DOUBLE_ENTRY_AVAILABLE = True
except ImportError:
    DOUBLE_ENTRY_AVAILABLE = False


if DOUBLE_ENTRY_AVAILABLE:
    @admin.register(ChartOfAccounts)
    class ChartOfAccountsAdmin(admin.ModelAdmin):
        list_display = ['code', 'name', 'account_type', 'normal_balance', 'is_active', 'tenant', 'parent']
        list_filter = ['account_type', 'is_active', 'normal_balance', 'is_system_account']
        search_fields = ['code', 'name', 'tenant__company_name']
        list_editable = ['is_active']
        readonly_fields = ['created_at', 'updated_at']
        raw_id_fields = ['parent', 'tenant', 'created_by']
    
    class JournalLineInline(admin.TabularInline):
        model = JournalLine
        extra = 2
        fields = ['account', 'debit_amount', 'credit_amount', 'description']
        readonly_fields = []
    
    @admin.register(JournalEntry)
    class JournalEntryAdmin(admin.ModelAdmin):
        list_display = ['entry_number', 'date', 'entry_type', 'is_posted', 'tenant', 'total_debits', 'total_credits']
        list_filter = ['entry_type', 'is_posted', 'date']
        search_fields = ['entry_number', 'description', 'reference', 'tenant__company_name']
        date_hierarchy = 'date'
        readonly_fields = ['entry_number', 'posted_at', 'created_at', 'updated_at']
        raw_id_fields = ['tenant', 'branch', 'created_by', 'posted_by', 'reversed_by']
        inlines = [JournalLineInline]
        
        def total_debits(self, obj):
            return obj.get_total_debits()
        total_debits.short_description = 'Total Debits'
        
        def total_credits(self, obj):
            return obj.get_total_credits()
        total_credits.short_description = 'Total Credits'
    
    @admin.register(GeneralLedger)
    class GeneralLedgerAdmin(admin.ModelAdmin):
        list_display = ['account', 'period_year', 'period_month', 'closing_debit', 'closing_credit', 'tenant']
        list_filter = ['period_year', 'period_month']
        search_fields = ['account__code', 'account__name', 'tenant__company_name']
        readonly_fields = ['updated_at']
        raw_id_fields = ['tenant', 'account']



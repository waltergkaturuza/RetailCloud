from django.contrib import admin
from .models import ExpenseCategory, Expense, TaxTransaction


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'tenant', 'is_active', 'created_at']
    list_filter = ['is_active', 'tenant']
    search_fields = ['name', 'code']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['expense_number', 'date', 'category', 'expense_type', 'amount', 'currency', 'tenant', 'branch']
    list_filter = ['expense_type', 'payment_method', 'paid', 'tenant']
    search_fields = ['expense_number', 'description', 'vendor_supplier', 'invoice_number']
    readonly_fields = ['expense_number', 'created_at', 'updated_at']
    date_hierarchy = 'date'


@admin.register(TaxTransaction)
class TaxTransactionAdmin(admin.ModelAdmin):
    list_display = ['tax_number', 'date', 'tax_type', 'amount', 'currency', 'status', 'tenant']
    list_filter = ['tax_type', 'status', 'tenant']
    search_fields = ['tax_number', 'reference_number', 'description']
    readonly_fields = ['tax_number', 'created_at', 'updated_at']
    date_hierarchy = 'date'


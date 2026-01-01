"""
Admin for suppliers app.
"""
from django.contrib import admin
from .models import Supplier, SupplierTransaction


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'phone', 'email', 'balance', 'is_active']
    list_filter = ['is_active', 'payment_terms', 'tenant']
    search_fields = ['name', 'email', 'phone', 'code']


@admin.register(SupplierTransaction)
class SupplierTransactionAdmin(admin.ModelAdmin):
    list_display = ['supplier', 'transaction_type', 'amount', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    readonly_fields = ['created_at']





"""
Admin for customers app.
"""
from django.contrib import admin
from .models import Customer, CustomerTransaction


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone', 'email', 'credit_balance', 'loyalty_points', 'is_active']
    list_filter = ['is_active', 'credit_rating', 'tenant']
    search_fields = ['first_name', 'last_name', 'email', 'phone']


@admin.register(CustomerTransaction)
class CustomerTransactionAdmin(admin.ModelAdmin):
    list_display = ['customer', 'transaction_type', 'amount', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    readonly_fields = ['created_at']





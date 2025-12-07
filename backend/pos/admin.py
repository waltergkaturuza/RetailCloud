"""
Admin for POS app.
"""
from django.contrib import admin
from .models import Sale, SaleItem, PaymentSplit
from .till_models import TillFloat, CashTransaction, SuspendedSale, DayEndReport
from .promotion_models import Promotion, PromotionUsage, PriceOverride


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'date', 'branch', 'customer', 'total_amount', 'payment_method', 'status']
    list_filter = ['status', 'payment_method', 'is_paid', 'date']
    search_fields = ['invoice_number', 'customer__first_name', 'customer__last_name']
    readonly_fields = ['invoice_number', 'date', 'created_at', 'updated_at']
    inlines = [SaleItemInline]
    date_hierarchy = 'date'


@admin.register(PaymentSplit)
class PaymentSplitAdmin(admin.ModelAdmin):
    list_display = ['sale', 'payment_method', 'currency', 'amount', 'reference', 'created_at']
    list_filter = ['payment_method', 'currency']


@admin.register(TillFloat)
class TillFloatAdmin(admin.ModelAdmin):
    list_display = ['branch', 'cashier', 'shift_date', 'status', 'float_usd', 'float_zwl']
    list_filter = ['status', 'shift_date', 'branch']
    search_fields = ['cashier__username', 'branch__name']
    date_hierarchy = 'shift_date'


@admin.register(CashTransaction)
class CashTransactionAdmin(admin.ModelAdmin):
    list_display = ['branch', 'transaction_type', 'currency', 'amount', 'created_by', 'approved_by', 'created_at']
    list_filter = ['transaction_type', 'currency', 'requires_approval', 'created_at']
    search_fields = ['reference', 'reason']


@admin.register(SuspendedSale)
class SuspendedSaleAdmin(admin.ModelAdmin):
    list_display = ['id', 'branch', 'cashier', 'status', 'suspended_at', 'resumed_at']
    list_filter = ['status', 'suspended_at']
    search_fields = ['cashier__username']


@admin.register(DayEndReport)
class DayEndReportAdmin(admin.ModelAdmin):
    list_display = ['report_type', 'branch', 'generated_by', 'generated_at', 'total_sales_usd', 'total_sales_zwl']
    list_filter = ['report_type', 'generated_at', 'branch']
    date_hierarchy = 'generated_at'
    readonly_fields = ['generated_at']


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'promotion_type', 'is_active', 'start_date', 'end_date', 'current_uses']
    list_filter = ['promotion_type', 'is_active', 'apply_to']
    search_fields = ['name', 'code']
    date_hierarchy = 'start_date'


@admin.register(PromotionUsage)
class PromotionUsageAdmin(admin.ModelAdmin):
    list_display = ['promotion', 'sale', 'customer', 'discount_amount', 'used_at']
    list_filter = ['used_at', 'promotion']
    date_hierarchy = 'used_at'


@admin.register(PriceOverride)
class PriceOverrideAdmin(admin.ModelAdmin):
    list_display = ['product', 'original_price', 'override_price', 'status', 'requested_by', 'approved_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['product__name', 'reason']
    readonly_fields = ['created_at', 'approved_at']


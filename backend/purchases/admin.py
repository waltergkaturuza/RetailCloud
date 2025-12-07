"""
Admin for purchases app.
"""
from django.contrib import admin
from .models import PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GRNItem


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0
    readonly_fields = ['created_at']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'supplier', 'branch', 'total_amount', 'status', 'date']
    list_filter = ['status', 'date', 'tenant']
    search_fields = ['po_number', 'supplier__name']
    readonly_fields = ['po_number', 'date', 'created_at', 'updated_at']
    inlines = [PurchaseOrderItemInline]
    date_hierarchy = 'date'


class GRNItemInline(admin.TabularInline):
    model = GRNItem
    extra = 0
    readonly_fields = ['created_at']


@admin.register(GoodsReceivedNote)
class GoodsReceivedNoteAdmin(admin.ModelAdmin):
    list_display = ['grn_number', 'purchase_order', 'supplier', 'branch', 'date']
    list_filter = ['date', 'tenant']
    search_fields = ['grn_number', 'invoice_number']
    readonly_fields = ['grn_number', 'date', 'created_at']
    inlines = [GRNItemInline]
    date_hierarchy = 'date'


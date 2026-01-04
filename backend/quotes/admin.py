"""
Admin configuration for quotes app.
"""
from django.contrib import admin
from .models import Quotation, QuotationLineItem, CustomerInvoice, InvoiceLineItem, InvoicePayment


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['quotation_number', 'customer', 'quotation_date', 'valid_until', 'status', 'total_amount', 'currency', 'tenant', 'created_at']
    list_filter = ['status', 'quotation_date', 'tenant']
    search_fields = ['quotation_number', 'customer__name', 'customer__email']
    date_hierarchy = 'quotation_date'
    raw_id_fields = ['tenant', 'branch', 'customer', 'created_by', 'updated_by']
    readonly_fields = ['quotation_number', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('tenant', 'branch', 'quotation_number', 'customer', 'quotation_date', 'valid_until', 'status')
        }),
        ('Pricing', {
            'fields': ('subtotal', 'tax_rate', 'tax_amount', 'discount_percentage', 'discount_amount', 'total_amount', 'currency')
        }),
        ('Terms & Notes', {
            'fields': ('terms_and_conditions', 'notes', 'internal_notes')
        }),
        ('Conversion', {
            'fields': ('invoice',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at', 'accepted_at')
        }),
    )


class QuotationLineItemInline(admin.TabularInline):
    model = QuotationLineItem
    extra = 1
    fields = ['item_description', 'quantity', 'unit_price', 'line_total', 'sort_order']


@admin.register(QuotationLineItem)
class QuotationLineItemAdmin(admin.ModelAdmin):
    list_display = ['quotation', 'item_description', 'quantity', 'unit_price', 'line_total']
    list_filter = ['quotation__tenant']
    search_fields = ['quotation__quotation_number', 'item_description']
    raw_id_fields = ['quotation']


@admin.register(CustomerInvoice)
class CustomerInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'invoice_date', 'due_date', 'status', 'total_amount', 'paid_amount', 'balance_due', 'currency', 'tenant']
    list_filter = ['status', 'invoice_date', 'due_date', 'tenant']
    search_fields = ['invoice_number', 'customer__name', 'customer__email']
    date_hierarchy = 'invoice_date'
    raw_id_fields = ['tenant', 'branch', 'customer', 'quotation', 'created_by', 'updated_by']
    readonly_fields = ['invoice_number', 'balance_due', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('tenant', 'branch', 'invoice_number', 'customer', 'invoice_date', 'due_date', 'status', 'quotation')
        }),
        ('Pricing', {
            'fields': ('subtotal', 'tax_rate', 'tax_amount', 'discount_percentage', 'discount_amount', 'total_amount', 'paid_amount', 'balance_due', 'currency')
        }),
        ('Terms & Notes', {
            'fields': ('terms_and_conditions', 'notes', 'internal_notes')
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at', 'paid_at')
        }),
    )


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 1
    fields = ['item_description', 'quantity', 'unit_price', 'line_total', 'sort_order']


class InvoicePaymentInline(admin.TabularInline):
    model = InvoicePayment
    extra = 0
    fields = ['payment_date', 'amount', 'payment_method', 'reference', 'notes', 'recorded_by']
    readonly_fields = ['recorded_by']


@admin.register(InvoiceLineItem)
class InvoiceLineItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'item_description', 'quantity', 'unit_price', 'line_total']
    list_filter = ['invoice__tenant']
    search_fields = ['invoice__invoice_number', 'item_description']
    raw_id_fields = ['invoice']


@admin.register(InvoicePayment)
class InvoicePaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'payment_date', 'amount', 'payment_method', 'reference', 'recorded_by']
    list_filter = ['payment_date', 'payment_method', 'invoice__tenant']
    search_fields = ['invoice__invoice_number', 'reference', 'notes']
    date_hierarchy = 'payment_date'
    raw_id_fields = ['invoice', 'recorded_by']
    readonly_fields = ['created_at']


"""
Django admin configuration for inventory models.
"""
from django.contrib import admin
from .models import Category, Product, ProductVariant, StockLevel, StockMovement, Batch
from .category_product_fields import ProductCustomField


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'code', 'parent', 'is_active', 'sort_order']
    list_filter = ['is_active', 'tenant']
    search_fields = ['name', 'code', 'tenant__company_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'tenant', 'category', 'selling_price', 'is_active', 'track_inventory']
    list_filter = ['is_active', 'track_inventory', 'is_taxable', 'tenant', 'category']
    search_fields = ['name', 'sku', 'barcode', 'rfid_tag', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('tenant', 'category', 'name', 'sku', 'barcode', 'rfid_tag', 'description')
        }),
        ('Pricing', {
            'fields': ('cost_price', 'selling_price', 'discount_price', 'is_taxable')
        }),
        ('Inventory', {
            'fields': ('track_inventory', 'reorder_level', 'reorder_quantity', 'allow_negative_stock')
        }),
        ('Attributes', {
            'fields': ('unit', 'weight', 'image')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['product', 'name', 'sku', 'selling_price', 'is_active']
    list_filter = ['is_active']
    search_fields = ['product__name', 'name', 'sku', 'barcode']


@admin.register(StockLevel)
class StockLevelAdmin(admin.ModelAdmin):
    list_display = ['product', 'branch', 'quantity', 'available_quantity', 'is_low_stock', 'updated_at']
    list_filter = ['branch']
    search_fields = ['product__name', 'product__sku', 'branch__name']
    readonly_fields = ['available_quantity', 'is_low_stock', 'updated_at']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'branch', 'movement_type', 'quantity', 'reference_type', 'created_at']
    list_filter = ['movement_type', 'reference_type', 'branch']
    search_fields = ['product__name', 'reference_id', 'notes']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ['product', 'batch_number', 'expiry_date', 'quantity', 'remaining_quantity', 'is_expired', 'is_expiring_soon']
    list_filter = ['branch', 'expiry_date']
    search_fields = ['product__name', 'batch_number']
    readonly_fields = ['is_expired', 'is_expiring_soon']


@admin.register(ProductCustomField)
class ProductCustomFieldAdmin(admin.ModelAdmin):
    list_display = ['product', 'tenant', 'updated_at']
    list_filter = ['tenant']
    search_fields = ['product__name', 'product__sku']
    readonly_fields = ['created_at', 'updated_at']

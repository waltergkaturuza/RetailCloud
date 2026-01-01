"""
Django admin configuration for core models.
"""
from django.contrib import admin
from .models import Tenant, Module, Package, Branch
from .currency_models import Currency, ExchangeRate, TenantCurrency
from .receipt_models import ReceiptTemplate, ReceiptPrintLog
from .business_category_models import BusinessCategory, CategoryModuleMapping
from .notification_models import Notification, NotificationPreference
from .owner_models import (
    SystemSettings, OwnerAuditLog, SystemHealthMetric,
    SystemAnnouncement, TenantBackup
)
from .pricing_models import PricingRule, ModulePricing

# Import advanced admin to register additional models
from . import admin_advanced  # noqa
from . import owner_admin  # noqa - Register owner models
from . import admin_industry  # noqa - Register industry-specific models
from . import admin_pricing  # noqa - Register pricing models


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'email', 'subscription_status', 'is_active', 'created_at']
    list_filter = ['subscription_status', 'is_active', 'created_at']
    search_fields = ['company_name', 'email', 'contact_person']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Company Information', {
            'fields': ('name', 'slug', 'company_name', 'contact_person', 'email', 'phone')
        }),
        ('Address', {
            'fields': ('address', 'country', 'city')
        }),
        ('Subscription', {
            'fields': ('subscription_status', 'trial_ends_at', 'subscription_ends_at')
        }),
        ('Business Category', {
            'fields': ('business_category', 'custom_category_name')
        }),
        ('Settings', {
            'fields': ('timezone', 'currency', 'tax_rate', 'vat_number')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category', 'is_active', 'sort_order']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering = ['sort_order', 'name']


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'price_monthly', 'price_yearly', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    filter_horizontal = ['modules']


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'code', 'is_main', 'is_active']
    list_filter = ['is_active', 'is_main', 'tenant']
    search_fields = ['name', 'code', 'tenant__company_name']


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'symbol', 'is_active', 'is_base', 'sort_order']
    list_filter = ['is_active', 'is_base']
    search_fields = ['code', 'name']


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ['from_currency', 'to_currency', 'rate', 'effective_date', 'is_locked', 'approved_by']
    list_filter = ['is_locked', 'effective_date', 'from_currency', 'to_currency']
    search_fields = ['from_currency__code', 'to_currency__code']
    date_hierarchy = 'effective_date'
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TenantCurrency)
class TenantCurrencyAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'currency', 'is_enabled', 'is_default', 'rounding_rule']
    list_filter = ['is_enabled', 'is_default', 'rounding_rule', 'currency']
    search_fields = ['tenant__company_name', 'currency__code']


@admin.register(ReceiptTemplate)
class ReceiptTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'branch', 'is_default', 'is_active']
    list_filter = ['is_default', 'is_active', 'show_logo', 'show_zimra_info']
    search_fields = ['name', 'tenant__company_name']


@admin.register(ReceiptPrintLog)
class ReceiptPrintLogAdmin(admin.ModelAdmin):
    list_display = ['sale', 'print_type', 'printed_by', 'printed_at']
    list_filter = ['print_type', 'printed_at']
    date_hierarchy = 'printed_at'
    readonly_fields = ['printed_at']


@admin.register(BusinessCategory)
class BusinessCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'icon', 'is_active', 'sort_order']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'description', 'icon', 'sort_order', 'is_active')
        }),
        ('Features', {
            'fields': (
                'requires_expiry_tracking', 'requires_serial_tracking', 'requires_weight_scale',
                'requires_variants', 'requires_warranty', 'requires_appointments',
                'requires_recipe_costing', 'requires_layby', 'requires_delivery'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(CategoryModuleMapping)
class CategoryModuleMappingAdmin(admin.ModelAdmin):
    list_display = ['category', 'module', 'is_required', 'priority']
    list_filter = ['is_required', 'category', 'module']
    search_fields = ['category__name', 'module__name', 'notes']
    ordering = ['-priority']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'type', 'priority', 'is_read', 'created_at']
    list_filter = ['type', 'priority', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'user__email']
    readonly_fields = ['created_at', 'read_at']
    date_hierarchy = 'created_at'


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_enabled', 'in_app_enabled', 'sms_enabled', 'push_enabled']
    list_filter = ['email_enabled', 'in_app_enabled', 'sms_enabled', 'push_enabled']
    search_fields = ['user__email', 'user__username']


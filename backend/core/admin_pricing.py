"""
Admin configuration for pricing models.
"""
from django.contrib import admin
from .pricing_models import PricingRule, ModulePricing


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category_price_monthly', 'user_price_monthly', 
                    'branch_price_monthly', 'yearly_discount_percent', 'currency', 
                    'is_active', 'is_default', 'created_at']
    list_filter = ['is_active', 'is_default', 'currency', 'created_at']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'is_active', 'is_default')
        }),
        ('Pricing', {
            'fields': (
                'category_price_monthly',
                'user_price_monthly',
                'branch_price_monthly',
                'yearly_discount_percent',
                'currency'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ModulePricing)
class ModulePricingAdmin(admin.ModelAdmin):
    list_display = ['pricing_rule', 'module', 'price_monthly', 'price_yearly']
    list_filter = ['pricing_rule', 'module']
    search_fields = ['pricing_rule__name', 'module__name', 'module__code']
    autocomplete_fields = ['module']



"""
Serializers for pricing models.
"""
from rest_framework import serializers
from .pricing_models import PricingRule, ModulePricing
from .models import Module


class ModulePricingSerializer(serializers.ModelSerializer):
    """Serializer for ModulePricing model."""
    module_name = serializers.CharField(source='module.name', read_only=True)
    module_code = serializers.CharField(source='module.code', read_only=True)
    module_description = serializers.CharField(source='module.description', read_only=True)
    
    class Meta:
        model = ModulePricing
        fields = [
            'id', 'module', 'module_name', 'module_code', 'module_description',
            'price_monthly', 'price_yearly',
        ]
        read_only_fields = ['id']


class PricingRuleSerializer(serializers.ModelSerializer):
    """Serializer for PricingRule model."""
    module_pricing = serializers.SerializerMethodField()
    module_pricing_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PricingRule
        fields = [
            'id', 'name', 'code',
            'category_price_monthly', 'user_price_monthly', 'branch_price_monthly',
            'yearly_discount_percent', 'currency',
            'is_active', 'is_default',
            'module_pricing', 'module_pricing_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_module_pricing(self, obj):
        """Get module pricing overrides."""
        # Only include if explicitly requested via query param to avoid large responses
        include_details = self.context.get('request') and self.context['request'].query_params.get('include_modules') == 'true'
        if include_details:
            module_pricing = obj.module_pricing.all().select_related('module')
            return ModulePricingSerializer(module_pricing, many=True).data
        return []
    
    def get_module_pricing_count(self, obj):
        """Get count of module pricing overrides."""
        return obj.module_pricing.count()


class PricingRuleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing pricing rules."""
    module_pricing_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PricingRule
        fields = [
            'id', 'name', 'code',
            'category_price_monthly', 'user_price_monthly', 'branch_price_monthly',
            'yearly_discount_percent', 'currency',
            'is_active', 'is_default',
            'module_pricing_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_module_pricing_count(self, obj):
        """Get count of module pricing overrides."""
        return obj.module_pricing.count()


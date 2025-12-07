"""
Serializers for business category models.
"""
from rest_framework import serializers
from .business_category_models import BusinessCategory, CategoryModuleMapping
from .models import Module


class ModuleSimpleSerializer(serializers.ModelSerializer):
    """Simple module serializer for category recommendations."""
    class Meta:
        model = Module
        fields = ['id', 'code', 'name', 'description', 'category', 'icon']
        read_only_fields = fields


class CategoryModuleMappingSerializer(serializers.ModelSerializer):
    """Serializer for category-module mappings."""
    module = ModuleSimpleSerializer(read_only=True)
    module_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = CategoryModuleMapping
        fields = [
            'id', 'module', 'module_id', 'is_required', 
            'priority', 'notes', 'category'
        ]
        read_only_fields = ['id', 'category']


class BusinessCategorySerializer(serializers.ModelSerializer):
    """Business category serializer with recommended modules."""
    recommended_modules = serializers.SerializerMethodField()
    module_count = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessCategory
        fields = [
            'id', 'code', 'name', 'description', 'icon',
            'requires_expiry_tracking', 'requires_serial_tracking',
            'requires_weight_scale', 'requires_variants',
            'requires_warranty', 'requires_appointments',
            'requires_recipe_costing', 'requires_layby',
            'requires_delivery', 'is_active', 'sort_order',
            'recommended_modules', 'module_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_recommended_modules(self, obj):
        """Get recommended modules for this category."""
        mappings = obj.module_mappings.all().order_by('-priority')
        return CategoryModuleMappingSerializer(mappings, many=True).data
    
    def get_module_count(self, obj):
        """Get count of recommended modules."""
        return obj.module_mappings.count()


class BusinessCategoryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for category lists."""
    module_count = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessCategory
        fields = [
            'id', 'code', 'name', 'description', 'icon',
            'module_count', 'is_active', 'sort_order'
        ]
    
    def get_module_count(self, obj):
        return obj.module_mappings.count()


class TenantCategoryUpdateSerializer(serializers.Serializer):
    """Serializer for updating tenant's business category."""
    business_category_id = serializers.IntegerField(required=True)
    custom_category_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    auto_activate_modules = serializers.BooleanField(default=True, help_text="Auto-activate recommended modules")


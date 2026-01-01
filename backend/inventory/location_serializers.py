"""
Serializers for location and pattern models.
"""
from rest_framework import serializers
from .location_models import (
    WarehouseZone, ProductLocation, ProductLocationMapping,
    SerialNumberPattern
)
from .models import Product


class WarehouseZoneSerializer(serializers.ModelSerializer):
    """Serializer for WarehouseZone."""
    
    class Meta:
        model = WarehouseZone
        fields = [
            'id', 'name', 'code', 'description', 'zone_type',
            'is_active', 'sort_order', 'branch'
        ]
        read_only_fields = ['id']


class ProductLocationSerializer(serializers.ModelSerializer):
    """Serializer for ProductLocation."""
    
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    zone_code = serializers.CharField(source='zone.code', read_only=True)
    
    class Meta:
        model = ProductLocation
        fields = [
            'id', 'location_code', 'zone', 'zone_name', 'zone_code',
            'aisle', 'shelf', 'bin', 'row', 'level',
            'capacity', 'dimensions', 'is_active', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductLocationMappingSerializer(serializers.ModelSerializer):
    """Serializer for ProductLocationMapping."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    location_code = serializers.CharField(source='location.location_code', read_only=True)
    
    class Meta:
        model = ProductLocationMapping
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'location', 'location_code', 'quantity',
            'is_primary', 'last_stocked_at', 'last_picked_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'product_name', 'product_sku', 'location_code',
            'last_stocked_at', 'last_picked_at', 'created_at', 'updated_at'
        ]


class SerialNumberPatternSerializer(serializers.ModelSerializer):
    """Serializer for SerialNumberPattern."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = SerialNumberPattern
        fields = [
            'id', 'name', 'pattern_type', 'pattern_config',
            'description', 'is_active', 'product', 'product_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'product_name', 'created_at', 'updated_at']
    
    def validate_pattern_config(self, value):
        """Validate pattern configuration based on type."""
        pattern_type = self.initial_data.get('pattern_type')
        
        if pattern_type == 'prefix_suffix':
            required_fields = ['prefix']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(f"{field} is required for prefix_suffix pattern")
        
        elif pattern_type == 'regex':
            if 'regex' not in value:
                raise serializers.ValidationError("regex is required for regex pattern")
            # Validate regex syntax
            import re
            try:
                re.compile(value['regex'])
            except re.error as e:
                raise serializers.ValidationError(f"Invalid regex: {str(e)}")
        
        return value


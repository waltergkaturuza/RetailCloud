"""
Custom serializer for product creation with category-specific fields.
"""
from rest_framework import serializers
import json
from .models import Product
from .category_product_fields import ProductCustomField


class ProductCreateSerializer(serializers.ModelSerializer):
    """Product serializer that handles category-specific custom fields."""
    custom_fields = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'category', 'name', 'sku', 'barcode', 'rfid_tag',
            'description', 'cost_price', 'selling_price', 'discount_price',
            'track_inventory', 'reorder_level', 'reorder_quantity',
            'unit', 'weight', 'image', 'is_active', 'is_taxable',
            'allow_negative_stock', 'custom_fields',
        ]
    
    def create(self, validated_data):
        """Create product and save custom fields."""
        custom_fields_data = validated_data.pop('custom_fields', None)
        product = Product.objects.create(**validated_data)
        
        # Save custom fields if provided
        if custom_fields_data:
            ProductCustomField.objects.create(
                product=product,
                tenant=product.tenant,
                field_data=json.dumps(custom_fields_data) if custom_fields_data else '{}'
            )
        
        return product
    
    def update(self, instance, validated_data):
        """Update product and custom fields."""
        custom_fields_data = validated_data.pop('custom_fields', None)
        
        # Update product fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update or create custom fields
        if custom_fields_data is not None:
            custom_fields, created = ProductCustomField.objects.get_or_create(
                product=instance,
                defaults={'tenant': instance.tenant}
            )
            custom_fields.set_field_data(custom_fields_data)
            custom_fields.save()
        
        return instance


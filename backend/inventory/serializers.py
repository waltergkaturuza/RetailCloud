"""
Serializers for inventory app.
"""
from rest_framework import serializers
from .models import Category, Product, ProductVariant, StockLevel, StockMovement, Batch
from .category_product_fields import ProductCustomField


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer."""
    children_count = serializers.IntegerField(source='children.count', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'code', 'description', 'parent',
            'image', 'is_active', 'sort_order', 'children_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ProductVariantSerializer(serializers.ModelSerializer):
    """Product variant serializer."""
    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product', 'name', 'sku', 'barcode',
            'cost_price', 'selling_price', 'reorder_level', 'is_active'
        ]


class ProductSerializer(serializers.ModelSerializer):
    """Product serializer."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    current_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    custom_fields = serializers.SerializerMethodField()
    business_category_code = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_name', 'name', 'sku', 'barcode', 'rfid_tag',
            'description', 'cost_price', 'selling_price', 'discount_price',
            'current_price', 'track_inventory', 'reorder_level', 'reorder_quantity',
            'unit', 'weight', 'image', 'is_active', 'is_taxable',
            'allow_negative_stock', 'variants', 'custom_fields', 'business_category_code',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'custom_fields', 'business_category_code']
    
    def get_custom_fields(self, obj):
        """Get category-specific custom fields."""
        try:
            custom_fields = ProductCustomField.objects.get(product=obj)
            return custom_fields.get_field_data()
        except ProductCustomField.DoesNotExist:
            return {}
    
    def get_business_category_code(self, obj):
        """Get tenant's business category code."""
        if obj.tenant and obj.tenant.business_category:
            return obj.tenant.business_category.code
        return None


class StockLevelSerializer(serializers.ModelSerializer):
    """Stock level serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    available_quantity = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = StockLevel
        fields = [
            'id', 'branch', 'branch_name', 'product', 'product_name',
            'product_sku', 'variant', 'quantity', 'reserved_quantity',
            'available_quantity', 'is_low_stock', 'last_counted_at', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class StockMovementSerializer(serializers.ModelSerializer):
    """Stock movement serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'branch', 'branch_name', 'product', 'product_name',
            'variant', 'movement_type', 'quantity', 'quantity_before',
            'quantity_after', 'reference_type', 'reference_id',
            'notes', 'user', 'user_name', 'created_at'
        ]
        read_only_fields = ['created_at']


class BatchSerializer(serializers.ModelSerializer):
    """Batch serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Batch
        fields = [
            'id', 'branch', 'product', 'product_name', 'batch_number',
            'expiry_date', 'quantity', 'remaining_quantity',
            'cost_price', 'received_date', 'is_expired',
            'is_expiring_soon', 'created_at'
        ]
        read_only_fields = ['created_at']


"""
Serializers for promotion and discount management.
"""
from rest_framework import serializers
from .promotion_models import Promotion, PromotionUsage, PriceOverride
from inventory.serializers import ProductSerializer
from customers.serializers import CustomerSerializer


class PromotionSerializer(serializers.ModelSerializer):
    """Promotion serializer."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'code', 'description', 'promotion_type',
            'discount_percentage', 'discount_amount',
            'buy_quantity', 'get_quantity',
            'apply_to', 'category', 'category_name', 'product', 'product_name',
            'customer', 'customer_name', 'min_purchase_amount',
            'start_date', 'end_date', 'start_time', 'end_time', 'days_of_week',
            'max_uses', 'max_uses_per_customer', 'current_uses',
            'is_active', 'requires_approval', 'is_valid',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'current_uses']


class PromotionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating promotions."""
    class Meta:
        model = Promotion
        fields = [
            'name', 'code', 'description', 'promotion_type',
            'discount_percentage', 'discount_amount',
            'buy_quantity', 'get_quantity',
            'apply_to', 'category', 'product', 'customer', 'min_purchase_amount',
            'start_date', 'end_date', 'start_time', 'end_time', 'days_of_week',
            'max_uses', 'max_uses_per_customer',
            'is_active', 'requires_approval'
        ]
    
    def validate(self, data):
        """Validate promotion data."""
        if data['promotion_type'] == 'percentage' and not data.get('discount_percentage'):
            raise serializers.ValidationError("discount_percentage is required for percentage promotions")
        if data['promotion_type'] == 'amount' and not data.get('discount_amount'):
            raise serializers.ValidationError("discount_amount is required for amount promotions")
        return data


class PromotionUsageSerializer(serializers.ModelSerializer):
    """Promotion usage serializer."""
    promotion_name = serializers.CharField(source='promotion.name', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    
    class Meta:
        model = PromotionUsage
        fields = [
            'id', 'promotion', 'promotion_name', 'sale', 'customer', 'customer_name',
            'discount_amount', 'used_at'
        ]
        read_only_fields = ['used_at']


class PriceOverrideSerializer(serializers.ModelSerializer):
    """Price override serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = PriceOverride
        fields = [
            'id', 'product', 'product_name',
            'original_price', 'override_price', 'quantity',
            'reason', 'requested_by', 'requested_by_name',
            'approved_by', 'approved_by_name', 'status',
            'created_at', 'approved_at'
        ]
        read_only_fields = ['created_at', 'approved_at', 'requested_by', 'approved_by']


class ApplyPromotionSerializer(serializers.Serializer):
    """Serializer for applying promotion to cart."""
    promotion_code = serializers.CharField(required=False, allow_blank=True)
    promotion_id = serializers.IntegerField(required=False)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    items = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of cart items with product_id, quantity, unit_price"
    )





"""
Serializers for POS app.
"""
from rest_framework import serializers
from .models import Sale, SaleItem, PaymentSplit
from inventory.models import Product, ProductVariant


class SaleItemSerializer(serializers.ModelSerializer):
    """Sale item serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'variant',
            'quantity', 'unit_price', 'discount_amount', 'tax_amount',
            'total', 'cost_price', 'created_at'
        ]
        read_only_fields = ['created_at']


class PaymentSplitSerializer(serializers.ModelSerializer):
    """Payment split serializer."""
    class Meta:
        model = PaymentSplit
        fields = ['id', 'payment_method', 'amount', 'reference', 'created_at']
        read_only_fields = ['created_at']


class SaleSerializer(serializers.ModelSerializer):
    """Sale serializer."""
    items = SaleItemSerializer(many=True, read_only=True)
    payment_splits = PaymentSplitSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'invoice_number', 'branch', 'branch_name', 'customer', 'customer_name',
            'date', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
            'amount_paid', 'change_amount', 'payment_method', 'is_paid', 'paid_at',
            'status', 'cashier', 'cashier_name', 'supervisor', 'notes', 'void_reason',
            'items', 'payment_splits', 'created_at', 'updated_at'
        ]
        read_only_fields = ['invoice_number', 'date', 'created_at', 'updated_at']


class SaleCreateSerializer(serializers.Serializer):
    """Serializer for creating sales."""
    branch_id = serializers.IntegerField()
    customer_id = serializers.IntegerField(required=False, allow_null=True)
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    payment_method = serializers.CharField()
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)
    payment_splits = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


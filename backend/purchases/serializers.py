"""
Serializers for purchases app.
"""
from rest_framework import serializers
from .models import PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GRNItem


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Purchase order item serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'variant',
            'quantity', 'unit_price', 'total', 'received_quantity',
            'created_at'
        ]
        read_only_fields = ['created_at']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Purchase order serializer."""
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'branch', 'branch_name', 'supplier', 'supplier_name',
            'date', 'expected_delivery_date', 'subtotal', 'tax_amount', 'total_amount',
            'status', 'notes', 'created_by', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['po_number', 'date', 'created_at', 'updated_at']


class GRNItemSerializer(serializers.ModelSerializer):
    """GRN item serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = GRNItem
        fields = [
            'id', 'purchase_order_item', 'product', 'product_name', 'variant',
            'quantity_received', 'batch_number', 'expiry_date', 'cost_price',
            'created_at'
        ]
        read_only_fields = ['created_at']


class GoodsReceivedNoteSerializer(serializers.ModelSerializer):
    """GRN serializer."""
    items = GRNItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = GoodsReceivedNote
        fields = [
            'id', 'grn_number', 'branch', 'branch_name', 'purchase_order',
            'supplier', 'supplier_name', 'date', 'invoice_number',
            'notes', 'received_by', 'items', 'created_at'
        ]
        read_only_fields = ['grn_number', 'date', 'created_at']


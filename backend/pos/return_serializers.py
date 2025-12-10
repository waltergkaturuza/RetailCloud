"""
Serializers for returns.
"""
from rest_framework import serializers
from decimal import Decimal
from .return_models import SaleReturn, SaleReturnItem, PurchaseReturn, PurchaseReturnItem
from .models import Sale, SaleItem
from django.db.models import Sum


class SaleReturnItemSerializer(serializers.ModelSerializer):
    """Sale return item serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    sale_item_id = serializers.IntegerField(source='sale_item.id', read_only=True)
    max_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = SaleReturnItem
        fields = [
            'id', 'sale_item', 'sale_item_id', 'product', 'product_name', 'product_sku',
            'variant', 'quantity_returned', 'unit_price', 'discount_amount', 'tax_amount',
            'total', 'condition', 'condition_notes', 'max_quantity', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_max_quantity(self, obj):
        """Get maximum quantity that can be returned."""
        if obj.sale_item:
            # Get already returned quantity
            already_returned = SaleReturnItem.objects.filter(
                sale_item=obj.sale_item,
                sale_return__status__in=['approved', 'processed']
            ).exclude(id=obj.id if obj.id else None).aggregate(
                total=Sum('quantity_returned')
            )['total'] or 0
            return obj.sale_item.quantity - already_returned
        return 0


class SaleReturnSerializer(serializers.ModelSerializer):
    """Sale return serializer."""
    items = SaleReturnItemSerializer(many=True, read_only=True)
    sale_invoice_number = serializers.CharField(source='sale.invoice_number', read_only=True)
    sale_date = serializers.DateTimeField(source='sale.date', read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    processed_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    can_restore_all_items = serializers.SerializerMethodField()
    has_damaged_items = serializers.SerializerMethodField()
    
    class Meta:
        model = SaleReturn
        fields = [
            'id', 'return_number', 'sale', 'sale_invoice_number', 'sale_date',
            'customer', 'customer_name', 'branch', 'branch_name',
            'date', 'return_reason', 'reason_details',
            'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
            'refund_method', 'refund_amount',
            'status', 'processed_by', 'processed_by_name',
            'approved_by', 'approved_by_name', 'approved_at',
            'rejection_reason', 'notes', 'items',
            'can_restore_all_items', 'has_damaged_items',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['return_number', 'date', 'created_at', 'updated_at']
    
    def get_can_restore_all_items(self, obj):
        """Check if all items can be restored to inventory."""
        from .return_service import ReturnProcessingService
        return all(
            ReturnProcessingService.can_restore_to_inventory(item.condition)
            for item in obj.items.all()
        )
    
    def get_has_damaged_items(self, obj):
        """Check if any items are damaged/defective."""
        return any(
            item.condition in ['damaged', 'defective', 'expired']
            for item in obj.items.all()
        )
    
    def get_processed_by_name(self, obj):
        if obj.processed_by:
            return obj.processed_by.get_full_name() or obj.processed_by.email
        return None
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.email
        return None


class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    """Purchase return item serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    purchase_order_item_id = serializers.IntegerField(source='purchase_order_item.id', read_only=True)
    max_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseReturnItem
        fields = [
            'id', 'purchase_order_item', 'purchase_order_item_id',
            'product', 'product_name', 'product_sku', 'variant',
            'quantity_returned', 'unit_price', 'tax_amount', 'total',
            'condition', 'condition_notes', 'max_quantity', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_max_quantity(self, obj):
        """Get maximum quantity that can be returned."""
        if obj.purchase_order_item:
            # Get already returned quantity
            already_returned = PurchaseReturnItem.objects.filter(
                purchase_order_item=obj.purchase_order_item,
                purchase_return__status__in=['approved', 'processed', 'received_by_supplier']
            ).exclude(id=obj.id if obj.id else None).aggregate(
                total=Sum('quantity_returned')
            )['total'] or 0
            return obj.purchase_order_item.received_quantity - already_returned
        return 0


class PurchaseReturnSerializer(serializers.ModelSerializer):
    """Purchase return serializer."""
    items = PurchaseReturnItemSerializer(many=True, read_only=True)
    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseReturn
        fields = [
            'id', 'return_number', 'purchase_order', 'purchase_order_number',
            'supplier', 'supplier_name', 'branch', 'branch_name',
            'date', 'return_reason', 'reason_details',
            'subtotal', 'tax_amount', 'total_amount',
            'status', 'created_by', 'created_by_name',
            'approved_by', 'approved_by_name', 'approved_at',
            'rejection_reason',
            'supplier_acknowledged', 'supplier_acknowledged_at', 'supplier_credit_note',
            'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['return_number', 'date', 'created_at', 'updated_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.email
        return None


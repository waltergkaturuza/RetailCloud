"""
Serializers for Advanced Inventory & Warehouse Management
"""
from rest_framework import serializers
from .advanced_models import (
    Warehouse, WarehouseLocation, StockLocation, PickList, PickListItem,
    PutAway, PutAwayItem, CycleCount, CycleCountItem, WarehouseTransfer, WarehouseTransferItem,
    SafetyStock, ABCAnalysis, DeadStock, StockAging, SupplierPerformance,
    InventoryValuation, CostLayer, CostAdjustment, InventoryWriteOff
)
from .models import Product, ProductVariant, Batch, Branch
from accounts.models import User


# ============================================================================
# WMS SERIALIZERS
# ============================================================================

class WarehouseSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = Warehouse
        fields = '__all__'
        read_only_fields = ['tenant', 'created_at', 'updated_at']


class WarehouseLocationSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    current_usage_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = WarehouseLocation
        fields = '__all__'
        read_only_fields = ['tenant', 'current_capacity', 'created_at', 'updated_at']
    
    def get_current_usage_percent(self, obj):
        if obj.max_capacity and obj.max_capacity > 0:
            return (obj.current_capacity / obj.max_capacity) * 100
        return None


class StockLocationSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    location_code = serializers.CharField(source='location.location_code', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    available_quantity = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = StockLocation
        fields = '__all__'
        read_only_fields = ['tenant', 'put_away_date', 'created_at', 'updated_at']


class PickListItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    location_code = serializers.CharField(source='stock_location.location.location_code', read_only=True, allow_null=True)
    is_complete = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PickListItem
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PickListSerializer(serializers.ModelSerializer):
    items = PickListItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PickList
        fields = '__all__'
        read_only_fields = ['tenant', 'pick_list_number', 'created_at', 'updated_at']
    
    def get_item_count(self, obj):
        return obj.items.count()


class PutAwayItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    suggested_location_code = serializers.CharField(source='suggested_location.location_code', read_only=True, allow_null=True)
    actual_location_code = serializers.CharField(source='actual_location.location_code', read_only=True, allow_null=True)
    
    class Meta:
        model = PutAwayItem
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PutAwaySerializer(serializers.ModelSerializer):
    items = PutAwayItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = PutAway
        fields = '__all__'
        read_only_fields = ['tenant', 'put_away_number', 'created_at', 'updated_at']


class CycleCountItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    location_code = serializers.CharField(source='location.location_code', read_only=True, allow_null=True)
    
    class Meta:
        model = CycleCountItem
        fields = '__all__'
        read_only_fields = ['variance', 'variance_percent', 'is_variance_acceptable', 'created_at', 'updated_at']


class CycleCountSerializer(serializers.ModelSerializer):
    items = CycleCountItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    item_count = serializers.SerializerMethodField()
    total_variance = serializers.SerializerMethodField()
    
    class Meta:
        model = CycleCount
        fields = '__all__'
        read_only_fields = ['tenant', 'count_number', 'created_at', 'updated_at']
    
    def get_item_count(self, obj):
        return obj.items.count()
    
    def get_total_variance(self, obj):
        from django.db.models import Sum
        return obj.items.aggregate(total=Sum('variance'))['total'] or 0


class WarehouseTransferItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    from_location_code = serializers.CharField(source='from_location.location_code', read_only=True, allow_null=True)
    to_location_code = serializers.CharField(source='to_location.location_code', read_only=True, allow_null=True)
    is_fully_shipped = serializers.BooleanField(read_only=True)
    is_fully_received = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = WarehouseTransferItem
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class WarehouseTransferSerializer(serializers.ModelSerializer):
    items = WarehouseTransferItemSerializer(many=True, read_only=True)
    from_warehouse_name = serializers.CharField(source='from_warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='to_warehouse.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = WarehouseTransfer
        fields = '__all__'
        read_only_fields = ['tenant', 'transfer_number', 'created_at', 'updated_at']


# ============================================================================
# ADVANCED STOCK MANAGEMENT SERIALIZERS
# ============================================================================

class SafetyStockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    
    class Meta:
        model = SafetyStock
        fields = '__all__'
        read_only_fields = ['tenant', 'calculated_safety_stock', 'last_calculated_at', 'created_at', 'updated_at']


class ABCAnalysisSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = ABCAnalysis
        fields = '__all__'
        read_only_fields = ['tenant', 'created_at', 'updated_at']


class DeadStockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    
    class Meta:
        model = DeadStock
        fields = '__all__'
        read_only_fields = ['tenant', 'created_at', 'updated_at']


class StockAgingSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    
    class Meta:
        model = StockAging
        fields = '__all__'
        read_only_fields = ['tenant', 'created_at', 'updated_at']


class SupplierPerformanceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    
    class Meta:
        model = SupplierPerformance
        fields = '__all__'
        read_only_fields = ['tenant', 'created_at', 'updated_at']


# ============================================================================
# INVENTORY VALUATION SERIALIZERS
# ============================================================================

class CostLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostLayer
        fields = '__all__'
        read_only_fields = ['tenant', 'created_at', 'updated_at']


class InventoryValuationSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    cost_layers = CostLayerSerializer(many=True, read_only=True)
    average_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryValuation
        fields = '__all__'
        read_only_fields = ['tenant', 'created_at', 'updated_at']
    
    def get_average_cost(self, obj):
        if obj.total_quantity > 0:
            return obj.total_value / obj.total_quantity
        return obj.current_cost


class CostAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = CostAdjustment
        fields = '__all__'
        read_only_fields = ['tenant', 'adjustment_number', 'created_at', 'updated_at']


class InventoryWriteOffSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True, allow_null=True)
    location_code = serializers.CharField(source='location.location_code', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = InventoryWriteOff
        fields = '__all__'
        read_only_fields = ['tenant', 'write_off_number', 'created_at', 'updated_at']


# ============================================================================
# ACTION SERIALIZERS (for creating/updating with related data)
# ============================================================================

class CreatePickListSerializer(serializers.Serializer):
    warehouse_id = serializers.IntegerField()
    reference_type = serializers.ChoiceField(choices=PickList._meta.get_field('reference_type').choices)
    reference_id = serializers.CharField()
    items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )
    picking_strategy = serializers.ChoiceField(choices=PickList._meta.get_field('picking_strategy').choices, default='fifo')
    priority = serializers.ChoiceField(choices=PickList._meta.get_field('priority').choices, default='normal')
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)


class CreatePutAwaySerializer(serializers.Serializer):
    warehouse_id = serializers.IntegerField()
    reference_type = serializers.CharField()
    reference_id = serializers.CharField()
    items = serializers.ListField(
        child=serializers.DictField()
    )
    strategy = serializers.ChoiceField(choices=PutAway._meta.get_field('put_away_strategy').choices, default='random')
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)


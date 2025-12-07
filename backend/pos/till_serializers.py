"""
Serializers for till float and cash management.
"""
from rest_framework import serializers
from .till_models import TillFloat, CashTransaction, SuspendedSale, DayEndReport
from accounts.serializers import UserSerializer


class TillFloatSerializer(serializers.ModelSerializer):
    """Till float serializer."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    
    class Meta:
        model = TillFloat
        fields = [
            'id', 'branch', 'branch_name', 'cashier', 'cashier_name',
            'float_usd', 'float_zwl', 'float_zar',
            'shift_date', 'shift_start', 'shift_end',
            'opening_cash_usd', 'opening_cash_zwl',
            'closing_cash_usd', 'closing_cash_zwl',
            'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'shift_start', 'shift_end']


class TillFloatCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating till float."""
    class Meta:
        model = TillFloat
        fields = ['branch', 'float_usd', 'float_zwl', 'float_zar', 'shift_date', 'notes']
    
    def create(self, validated_data):
        validated_data['tenant'] = self.context['request'].tenant
        validated_data['cashier'] = self.context['request'].user
        validated_data['shift_start'] = serializers.DateTimeField().to_internal_value(
            self.context['request'].data.get('shift_start')
        ) if self.context['request'].data.get('shift_start') else None
        return super().create(validated_data)


class CashTransactionSerializer(serializers.ModelSerializer):
    """Cash transaction serializer."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = CashTransaction
        fields = [
            'id', 'branch', 'branch_name', 'till_float',
            'transaction_type', 'currency', 'amount',
            'requires_approval', 'approved_by', 'approved_by_name', 'approved_at',
            'reason', 'notes', 'reference',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['created_at', 'approved_by', 'approved_at', 'created_by']


class CashTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cash transactions."""
    class Meta:
        model = CashTransaction
        fields = [
            'branch', 'till_float', 'transaction_type', 'currency', 'amount',
            'reason', 'notes', 'reference'
        ]
    
    def create(self, validated_data):
        validated_data['tenant'] = self.context['request'].tenant
        validated_data['created_by'] = self.context['request'].user
        
        # Check if approval is required based on amount or type
        transaction_type = validated_data.get('transaction_type')
        amount = validated_data.get('amount')
        
        # Safe drops and large amounts require approval
        if transaction_type == 'safe_drop' or (amount and float(amount) > 100):
            validated_data['requires_approval'] = True
        
        return super().create(validated_data)


class SuspendedSaleSerializer(serializers.ModelSerializer):
    """Suspended sale serializer."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    
    class Meta:
        model = SuspendedSale
        fields = [
            'id', 'branch', 'branch_name', 'cashier', 'cashier_name',
            'cart_data', 'customer_id', 'notes',
            'status', 'suspended_at', 'resumed_at', 'sale_id'
        ]
        read_only_fields = ['suspended_at', 'resumed_at', 'sale_id', 'cashier']


class DayEndReportSerializer(serializers.ModelSerializer):
    """Day-end report serializer."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)
    
    class Meta:
        model = DayEndReport
        fields = [
            'id', 'branch', 'branch_name', 'till_float',
            'report_type',
            'total_sales_usd', 'total_sales_zwl', 'total_sales_zar',
            'cash_usd', 'cash_zwl', 'ecocash', 'onemoney', 'card', 'zipit', 'rtgs', 'credit',
            'total_transactions', 'total_items_sold', 'total_discounts', 'total_tax',
            'expected_cash_usd', 'expected_cash_zwl',
            'actual_cash_usd', 'actual_cash_zwl',
            'variance_usd', 'variance_zwl',
            'report_data',
            'generated_by', 'generated_by_name', 'generated_at'
        ]
        read_only_fields = ['generated_at', 'generated_by']


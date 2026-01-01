from rest_framework import serializers
from .models import ExpenseCategory, Expense, TaxTransaction
from core.utils import get_tenant_from_request


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = [
            'id', 'expense_number', 'date', 'category', 'category_name',
            'expense_type', 'amount', 'currency', 'exchange_rate',
            'payment_method', 'paid', 'paid_at',
            'vendor_supplier', 'invoice_number', 'receipt_number',
            'branch', 'branch_name',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name', 'approved_at',
            'description', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['expense_number', 'created_at', 'updated_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.email
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise serializers.ValidationError("Tenant not found")
        
        validated_data['tenant'] = tenant
        if not validated_data.get('created_by'):
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)


class TaxTransactionSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxTransaction
        fields = [
            'id', 'tax_number', 'date', 'tax_period_start', 'tax_period_end',
            'tax_type', 'amount', 'currency', 'exchange_rate',
            'status', 'paid_at', 'due_date',
            'reference_number', 'tax_authority',
            'branch', 'branch_name',
            'created_by', 'created_by_name',
            'description', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['tax_number', 'created_at', 'updated_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise serializers.ValidationError("Tenant not found")
        
        validated_data['tenant'] = tenant
        if not validated_data.get('created_by'):
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)




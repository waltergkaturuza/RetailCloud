"""
Serializers for customers app.
"""
from rest_framework import serializers
from .models import Customer, CustomerTransaction
from core.utils import get_tenant_from_request


class CustomerSerializer(serializers.ModelSerializer):
    """Customer serializer."""
    full_name = serializers.CharField(read_only=True)
    credit_available = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_credit_available = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'code', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'phone_alt', 'address', 'city', 'country',
            'loyalty_points', 'loyalty_points_balance',
            'credit_limit', 'credit_balance', 'credit_available', 'credit_rating',
            'is_credit_available', 'total_purchases', 'total_visits',
            'last_purchase_date', 'notes', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'loyalty_points_balance', 'credit_balance', 'total_purchases',
            'total_visits', 'last_purchase_date', 'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        """Create customer with tenant from context."""
        # Get tenant from context (set by perform_create or request)
        request = self.context.get('request')
        if request:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                # Fallback to user's tenant
                tenant = get_tenant_from_request(request)
            
            if tenant:
                validated_data['tenant'] = tenant
            else:
                raise serializers.ValidationError("Tenant is required for customer creation.")
        else:
            raise serializers.ValidationError("Request context is required for customer creation.")
        
        return super().create(validated_data)


class CustomerTransactionSerializer(serializers.ModelSerializer):
    """Customer transaction serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    
    class Meta:
        model = CustomerTransaction
        fields = [
            'id', 'customer', 'customer_name', 'transaction_type',
            'amount', 'balance_before', 'balance_after',
            'reference_type', 'reference_id', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']



"""
Serializers for suppliers app.
"""
from rest_framework import serializers
from .models import Supplier, SupplierTransaction
from core.utils import get_tenant_from_request


class SupplierSerializer(serializers.ModelSerializer):
    """Supplier serializer."""
    class Meta:
        model = Supplier
        fields = [
            'id', 'code', 'name', 'contact_person', 'email', 'phone', 'phone_alt',
            'address', 'city', 'country', 'credit_limit', 'balance',
            'payment_terms', 'notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['balance', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create supplier with tenant from context."""
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
                raise serializers.ValidationError("Tenant is required for supplier creation.")
        else:
            raise serializers.ValidationError("Request context is required for supplier creation.")
        
        return super().create(validated_data)


class SupplierTransactionSerializer(serializers.ModelSerializer):
    """Supplier transaction serializer."""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    class Meta:
        model = SupplierTransaction
        fields = [
            'id', 'supplier', 'supplier_name', 'transaction_type',
            'amount', 'balance_before', 'balance_after',
            'reference_type', 'reference_id', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']



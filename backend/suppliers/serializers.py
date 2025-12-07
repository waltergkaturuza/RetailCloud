"""
Serializers for suppliers app.
"""
from rest_framework import serializers
from .models import Supplier, SupplierTransaction


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


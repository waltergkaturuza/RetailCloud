"""
Serializers for currency and exchange rate management.
"""
from rest_framework import serializers
from .currency_models import Currency, ExchangeRate, TenantCurrency
from accounts.serializers import UserSerializer


class CurrencySerializer(serializers.ModelSerializer):
    """Currency serializer."""
    class Meta:
        model = Currency
        fields = ['code', 'name', 'symbol', 'is_active', 'is_base', 'sort_order']
        read_only_fields = ['code']


class ExchangeRateSerializer(serializers.ModelSerializer):
    """Exchange rate serializer."""
    from_currency_name = serializers.CharField(source='from_currency.name', read_only=True)
    from_currency_symbol = serializers.CharField(source='from_currency.symbol', read_only=True)
    to_currency_name = serializers.CharField(source='to_currency.name', read_only=True)
    to_currency_symbol = serializers.CharField(source='to_currency.symbol', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = ExchangeRate
        fields = [
            'id', 'from_currency', 'from_currency_name', 'from_currency_symbol',
            'to_currency', 'to_currency_name', 'to_currency_symbol',
            'rate', 'effective_date', 'is_locked', 'approved_by', 'approved_by_name',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'approved_by']


class ExchangeRateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating exchange rates (requires approval)."""
    class Meta:
        model = ExchangeRate
        fields = ['from_currency', 'to_currency', 'rate', 'effective_date', 'notes']
    
    def create(self, validated_data):
        validated_data['tenant'] = self.context['request'].tenant
        return super().create(validated_data)


class TenantCurrencySerializer(serializers.ModelSerializer):
    """Tenant currency settings serializer."""
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    
    class Meta:
        model = TenantCurrency
        fields = [
            'id', 'currency', 'currency_name', 'currency_code', 'currency_symbol',
            'is_enabled', 'is_default', 'rounding_rule', 'rounding_to', 'allow_auto_convert'
        ]


class CurrentExchangeRateSerializer(serializers.Serializer):
    """Serializer for current exchange rates."""
    from_currency = serializers.CharField()
    to_currency = serializers.CharField()
    rate = serializers.DecimalField(max_digits=12, decimal_places=4)
    effective_date = serializers.DateField()
    is_locked = serializers.BooleanField()



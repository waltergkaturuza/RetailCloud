"""
Serializers for Tax Management Models
"""
from rest_framework import serializers
from .tax_config_models import TaxConfiguration, TaxPeriod, TaxLiability
from core.utils import get_tenant_from_request


class TaxConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxConfiguration
        fields = [
            'id', 'vat_registered', 'vat_number', 'vat_registration_date',
            'standard_vat_rate', 'vat_filing_frequency', 'income_tax_filing_frequency',
            'tax_year_start_month', 'income_tax_brackets',
            'paye_enabled', 'paye_threshold',
            'aids_levy_rate',
            'nssa_enabled', 'nssa_employee_rate', 'nssa_employer_rate',
            'zimdef_enabled', 'zimdef_rate',
            'default_currency',
            'auto_calculate_tax', 'tax_inclusive_pricing',
            'zimra_api_key', 'zimra_api_enabled',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TaxPeriodSerializer(serializers.ModelSerializer):
    outstanding_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TaxPeriod
        fields = [
            'id', 'period_type', 'period_start', 'period_end', 'period_label',
            'filing_status', 'filing_due_date', 'payment_due_date',
            'filed_date', 'paid_date',
            'tax_payable', 'tax_paid', 'outstanding_amount',
            'return_reference', 'payment_reference',
            'notes', 'is_overdue',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'outstanding_amount', 'is_overdue']


class TaxLiabilitySerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    tax_period_label = serializers.CharField(source='tax_period.period_label', read_only=True, allow_null=True)
    
    class Meta:
        model = TaxLiability
        fields = [
            'id', 'tax_type', 'source_type', 'source_id',
            'taxable_amount', 'tax_rate', 'tax_amount', 'currency',
            'tax_period_start', 'tax_period_end', 'tax_period', 'tax_period_label',
            'is_settled', 'settled_at',
            'transaction_date', 'reference_number',
            'branch', 'branch_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


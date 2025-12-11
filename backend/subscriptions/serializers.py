"""
Serializers for subscriptions.
"""
from rest_framework import serializers
from .models import Subscription, TenantModule, Invoice, Payment
from core.models import Package, Module


class ModuleSerializer(serializers.ModelSerializer):
    """Module serializer."""
    class Meta:
        model = Module
        fields = [
            'id', 'name', 'code', 'description', 'detailed_description',
            'category', 'icon', 'features', 'benefits', 'use_cases',
            'target_business_types', 'highlight_color', 'is_featured',
            'video_demo_url', 'documentation_url', 'is_active', 'sort_order'
        ]


class PackageSerializer(serializers.ModelSerializer):
    """Package serializer."""
    modules = ModuleSerializer(many=True, read_only=True)
    module_ids = serializers.PrimaryKeyRelatedField(
        queryset=Module.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='modules'
    )
    modules_count = serializers.SerializerMethodField()
    monthly_savings = serializers.SerializerMethodField()
    yearly_savings = serializers.SerializerMethodField()
    
    class Meta:
        model = Package
        fields = [
            'id', 'name', 'code', 'description',
            'price_monthly', 'price_yearly', 'currency',
            'modules', 'module_ids', 'modules_count',
            'max_users', 'max_branches',
            'is_active', 'sort_order',
            'monthly_savings', 'yearly_savings',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'modules_count', 'monthly_savings', 'yearly_savings']
    
    def get_modules_count(self, obj):
        """Get count of modules in this package."""
        return obj.modules.count() if hasattr(obj, 'modules') else 0
    
    def get_monthly_savings(self, obj):
        """Calculate monthly savings compared to yearly (per month)."""
        if obj.price_yearly and obj.price_monthly:
            yearly_monthly = float(obj.price_yearly) / 12
            savings = float(obj.price_monthly) - yearly_monthly
            return max(0, savings)
        return 0
    
    def get_yearly_savings(self, obj):
        """Calculate total yearly savings."""
        if obj.price_yearly and obj.price_monthly:
            monthly_yearly = float(obj.price_monthly) * 12
            savings = monthly_yearly - float(obj.price_yearly)
            return max(0, savings)
        return 0


class SubscriptionSerializer(serializers.ModelSerializer):
    """Subscription serializer."""
    package_name = serializers.CharField(source='package.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'tenant', 'tenant_name', 'package', 'package_name',
            'billing_cycle', 'status', 'started_at',
            'current_period_start', 'current_period_end',
            'cancelled_at', 'is_active'
        ]
        read_only_fields = ['started_at', 'is_active']


class TenantModuleSerializer(serializers.ModelSerializer):
    """Tenant module serializer."""
    module_name = serializers.SerializerMethodField()
    module_code = serializers.SerializerMethodField()
    module_category = serializers.SerializerMethodField()
    module_description = serializers.SerializerMethodField()
    tenant_name = serializers.SerializerMethodField()
    activated_by_name = serializers.SerializerMethodField()
    pricing_info = serializers.SerializerMethodField()
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    
    class Meta:
        model = TenantModule
        fields = [
            'id', 'tenant', 'tenant_name', 'module', 'module_name', 
            'module_code', 'module_category', 'module_description',
            'status', 'enabled_at', 'activated_at', 'expires_at',
            'requested_at', 'activated_by', 'activated_by_name',
            'requires_owner_approval', 'notes',
            'activation_period_months', 'payment_type', 'payment_type_display',
            'price_monthly', 'price_yearly', 'actual_price', 'currency',
            'pricing_info'
        ]
        read_only_fields = ['requested_at', 'enabled_at', 'activated_at']
    
    def get_module_name(self, obj):
        """Get module name safely."""
        if obj.module:
            return obj.module.name
        return None
    
    def get_module_code(self, obj):
        """Get module code safely."""
        if obj.module:
            return obj.module.code
        return None
    
    def get_module_category(self, obj):
        """Get module category safely."""
        if obj.module:
            return obj.module.category
        return None
    
    def get_module_description(self, obj):
        """Get module description safely."""
        if obj.module:
            return obj.module.description
        return None
    
    def get_tenant_name(self, obj):
        """Get tenant name safely."""
        if obj.tenant:
            return obj.tenant.company_name
        return None
    
    def get_activated_by_name(self, obj):
        """Get activated by user name safely."""
        if obj.activated_by:
            return obj.activated_by.get_full_name() or obj.activated_by.username
        return None
    
    def get_pricing_info(self, obj):
        """Get pricing information for the module."""
        from core.pricing_service import calculate_module_pricing
        
        if obj.module and obj.tenant:
            period = obj.activation_period_months or 1
            pricing = calculate_module_pricing(obj.tenant, obj.module, period)
            return {
                'price_monthly': float(pricing['price_monthly']),
                'price_yearly': float(pricing['price_yearly']),
                'actual_price': float(pricing['actual_price']),
                'currency': pricing['currency'],
                'discount_applied': float(pricing['discount_applied']),
                'period_months': period
            }
        return None


class InvoiceSerializer(serializers.ModelSerializer):
    """Invoice serializer."""
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'tenant', 'tenant_name', 'subscription',
            'invoice_number', 'amount', 'tax_amount', 'total_amount',
            'currency', 'status', 'due_date', 'paid_at',
            'created_at'
        ]
        read_only_fields = ['invoice_number', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Payment serializer."""
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'tenant', 'tenant_name', 'invoice',
            'amount', 'currency', 'payment_method',
            'transaction_id', 'status', 'paid_at', 'created_at'
        ]
        read_only_fields = ['created_at']


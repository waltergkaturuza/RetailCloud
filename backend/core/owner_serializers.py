"""
Serializers for Owner/Super Admin functionality.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Tenant, Branch, Module, Package
from .business_category_models import BusinessCategory, CategoryModuleMapping
from .owner_models import (
    SystemSettings, OwnerAuditLog, SystemHealthMetric,
    SystemAnnouncement, TenantBackup
)
from subscriptions.models import Subscription, TenantModule
from accounts.models import User
from pos.models import Sale
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
import re

User = get_user_model()


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system settings."""
    typed_value = serializers.SerializerMethodField()
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = SystemSettings
        fields = [
            'id', 'key', 'value', 'typed_value', 'data_type', 'description',
            'category', 'is_public', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_typed_value(self, obj):
        return obj.get_value()


class OwnerAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = OwnerAuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'action_type',
            'action_type_display', 'description', 'tenant', 'tenant_name',
            'ip_address', 'user_agent', 'metadata', 'created_at'
        ]
        read_only_fields = fields


class SystemHealthMetricSerializer(serializers.ModelSerializer):
    """Serializer for system health metrics."""
    metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = SystemHealthMetric
        fields = [
            'id', 'metric_type', 'metric_type_display', 'value', 'unit',
            'status', 'status_display', 'metadata', 'recorded_at'
        ]
        read_only_fields = fields


class SystemAnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for system announcements."""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    target_tenant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemAnnouncement
        fields = [
            'id', 'title', 'message', 'announcement_type', 'target_tenants',
            'target_tenant_count', 'is_active', 'scheduled_at', 'expires_at',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_target_tenant_count(self, obj):
        if obj.target_tenants.exists():
            return obj.target_tenants.count()
        return Tenant.objects.count()  # All tenants


class TenantBackupSerializer(serializers.ModelSerializer):
    """Serializer for tenant backups."""
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantBackup
        fields = [
            'id', 'tenant', 'tenant_name', 'backup_type', 'file_path',
            'file_size', 'file_size_mb', 'status', 'notes',
            'created_by', 'created_by_name', 'created_at', 'completed_at'
        ]
        read_only_fields = ['created_at', 'completed_at']
    
    def get_file_size_mb(self, obj):
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return 0


class OwnerDashboardStatsSerializer(serializers.Serializer):
    """Serializer for owner dashboard statistics."""
    total_tenants = serializers.IntegerField()
    active_tenants = serializers.IntegerField()
    suspended_tenants = serializers.IntegerField()
    trial_tenants = serializers.IntegerField()
    total_users = serializers.IntegerField()
    total_branches = serializers.IntegerField()
    total_sales_today_usd = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_sales_today_zwl = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_transactions_today = serializers.IntegerField()
    active_pos_terminals = serializers.IntegerField()
    system_health_status = serializers.CharField()
    recent_audit_logs = OwnerAuditLogSerializer(many=True)
    top_tenants_by_sales = serializers.ListField()
    industry_distribution = serializers.DictField()


class TenantUserSerializer(serializers.ModelSerializer):
    """Serializer for tenant users in detailed view."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'role_display', 'branch', 'branch_name',
            'is_active', 'is_email_verified', 'created_at'
        ]
    
    def get_full_name(self, obj):
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.username or obj.email


class TenantBranchSerializer(serializers.ModelSerializer):
    """Serializer for tenant branches."""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    manager_email = serializers.EmailField(source='manager.email', read_only=True)
    staff_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'code', 'address', 'phone', 'email',
            'manager', 'manager_name', 'manager_email', 'staff_count',
            'is_active', 'is_main', 'created_at'
        ]
    
    def get_staff_count(self, obj):
        return obj.staff.count()


class TenantDetailSerializer(serializers.ModelSerializer):
    """Complete tenant serializer for owner management."""
    user_count = serializers.SerializerMethodField()
    branch_count = serializers.SerializerMethodField()
    sales_today = serializers.SerializerMethodField()
    sales_this_month = serializers.SerializerMethodField()
    business_category_name = serializers.CharField(source='business_category.name', read_only=True)
    business_category_icon = serializers.CharField(source='business_category.icon', read_only=True)
    subscription_name = serializers.SerializerMethodField()
    subscription_id = serializers.SerializerMethodField()
    enabled_modules = serializers.SerializerMethodField()
    users = serializers.SerializerMethodField()
    branches = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    total_stock_quantity = serializers.SerializerMethodField()
    low_stock_count = serializers.SerializerMethodField()
    customer_count = serializers.SerializerMethodField()
    total_sales_all_time = serializers.SerializerMethodField()
    role_distribution = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'slug', 'company_name', 'contact_person', 'email', 'phone',
            'address', 'country', 'city',
            'subscription_status', 'subscription_type', 'preferred_payment_method',
            'trial_ends_at', 'subscription_ends_at',
            'timezone', 'currency', 'tax_rate', 'vat_number',
            'business_category', 'business_category_name', 'business_category_icon',
            'custom_category_name',
            'user_count', 'branch_count', 'sales_today', 'sales_this_month',
            'subscription_name', 'subscription_id', 'enabled_modules',
            'users', 'branches', 'product_count', 'total_stock_quantity',
            'low_stock_count', 'customer_count', 'total_sales_all_time',
            'role_distribution',
            'is_active', 'created_at', 'updated_at'
        ]
    
    def get_user_count(self, obj):
        return obj.users.count()
    
    def get_branch_count(self, obj):
        return obj.branches.count()
    
    def get_sales_today(self, obj):
        today = timezone.now().date()
        total = Sale.objects.filter(
            tenant=obj,
            date__date=today
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        return float(total)
    
    def get_sales_this_month(self, obj):
        now = timezone.now()
        first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total = Sale.objects.filter(
            tenant=obj,
            date__gte=first_day
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        return float(total)
    
    def get_subscription_name(self, obj):
        try:
            return obj.subscription.package.name if hasattr(obj, 'subscription') and obj.subscription else None
        except:
            return None
    
    def get_subscription_id(self, obj):
        try:
            return obj.subscription.id if hasattr(obj, 'subscription') and obj.subscription else None
        except:
            return None
    
    def get_enabled_modules(self, obj):
        try:
            from subscriptions.models import TenantModule
            modules = TenantModule.objects.filter(
                tenant=obj,
                status__in=['active', 'trial']
            ).select_related('module')
            return [{
                'id': tm.module.id,
                'code': tm.module.code,
                'name': tm.module.name,
                'category': tm.module.category,
            } for tm in modules]
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting enabled modules: {str(e)}")
            return []
    
    def get_users(self, obj):
        """Get all users for this tenant."""
        users = obj.users.all().select_related('branch').order_by('-created_at')
        return TenantUserSerializer(users, many=True).data
    
    def get_branches(self, obj):
        """Get all branches for this tenant."""
        branches = obj.branches.all().select_related('manager').order_by('-is_main', 'name')
        return TenantBranchSerializer(branches, many=True).data
    
    def get_product_count(self, obj):
        """Get total product count."""
        try:
            from inventory.models import Product
            return Product.objects.filter(tenant=obj).count()
        except:
            return 0
    
    def get_total_stock_quantity(self, obj):
        """Get total stock quantity across all branches."""
        try:
            from inventory.models import StockLevel
            total = StockLevel.objects.filter(tenant=obj).aggregate(
                total=Sum('quantity')
            )['total'] or 0
            return int(total)
        except:
            return 0
    
    def get_low_stock_count(self, obj):
        """Get count of products with low stock."""
        try:
            from inventory.models import StockLevel, Product
            low_stock_products = set()
            stock_levels = StockLevel.objects.filter(tenant=obj).select_related('product')
            for sl in stock_levels:
                product = sl.product
                reorder_level = product.reorder_level if product else 10
                if sl.quantity <= reorder_level:
                    low_stock_products.add(product.id if product else None)
            return len([p for p in low_stock_products if p])
        except:
            return 0
    
    def get_customer_count(self, obj):
        """Get total customer count."""
        try:
            from customers.models import Customer
            return Customer.objects.filter(tenant=obj).count()
        except:
            return 0
    
    def get_total_sales_all_time(self, obj):
        """Get total sales revenue all time."""
        try:
            total = Sale.objects.filter(tenant=obj).aggregate(
                total=Sum('total_amount')
            )['total'] or 0
            return float(total)
        except:
            return 0.0
    
    def get_role_distribution(self, obj):
        """Get user count by role."""
        try:
            from django.db.models import Count
            role_counts = obj.users.values('role').annotate(
                count=Count('id')
            ).order_by('-count')
            return {
                item['role']: item['count']
                for item in role_counts
            }
        except:
            return {}


class TenantCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating tenants."""
    
    class Meta:
        model = Tenant
        fields = [
            'name', 'slug', 'company_name', 'contact_person', 'email', 'phone',
            'address', 'address_line_2', 'country', 'city', 'state_province', 'postal_code',
            'subscription_status', 'subscription_type', 'preferred_payment_method',
            'trial_ends_at', 'subscription_ends_at',
            'timezone', 'currency', 'tax_rate', 'vat_number',
            'business_category', 'custom_category_name',
            'logo', 'manager_signature', 'approved_by_signature', 'prepared_by_signature',
            'is_active'
        ]
    
    def validate_slug(self, value):
        """Validate slug format and uniqueness."""
        if not value:
            raise serializers.ValidationError("Slug is required.")
        if not re.match(r'^[a-z0-9-]+$', value):
            raise serializers.ValidationError("Slug can only contain lowercase letters, numbers, and hyphens.")
        # Check uniqueness (excluding current instance if updating)
        queryset = Tenant.objects.filter(slug=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A tenant with this slug already exists.")
        return value
    
    def validate_email(self, value):
        """Ensure email is unique across tenants and users.
        
        Rules:
        - Tenant email must be unique among all tenants
        - When creating tenant, email must not exist as any user
        - When updating tenant, allow if email unchanged OR if user with email is this tenant's admin
        """
        if not value:
            raise serializers.ValidationError("Email is required.")
        
        # Normalize email (lowercase, strip whitespace)
        value = value.lower().strip()
        
        # Check if this is an update and email hasn't changed
        if self.instance and self.instance.email.lower() == value:
            return value
        
        # Check if email already exists as a Tenant (excluding current instance if updating)
        tenant_queryset = Tenant.objects.filter(email__iexact=value)
        if self.instance:
            tenant_queryset = tenant_queryset.exclude(pk=self.instance.pk)
        if tenant_queryset.exists():
            raise serializers.ValidationError(
                "A tenant with this email already exists. Please use a different email."
            )
        
        # Check if email is used by a User
        from accounts.models import User
        existing_user = User.objects.filter(email__iexact=value).first()
        
        if existing_user:
            if self.instance:
                # Updating tenant: allow only if the user is the tenant admin for THIS tenant
                if (existing_user.tenant == self.instance and 
                    existing_user.role == 'tenant_admin'):
                    # This tenant's admin user shares the tenant email - allowed
                    return value
                else:
                    # Email belongs to a different user or tenant - reject
                    raise serializers.ValidationError(
                        "This email is already registered as a user account. "
                        "Please use a different email for the tenant."
                    )
            else:
                # Creating new tenant: reject if email exists as any user
                # (Tenant admin will be created with this email AFTER tenant creation)
                raise serializers.ValidationError(
                    "This email is already registered as a user account. "
                    "Please use a different email for the tenant."
                )
        
        return value
    
    def validate(self, data):
        """Additional validation."""
        # Convert empty strings to None for nullable fields
        if 'trial_ends_at' in data and data['trial_ends_at'] == '':
            data['trial_ends_at'] = None
        if 'subscription_ends_at' in data and data['subscription_ends_at'] == '':
            data['subscription_ends_at'] = None
        if 'business_category' in data and data['business_category'] == '':
            data['business_category'] = None
        return data
    
    def create(self, validated_data):
        """Create tenant with default trial period."""
        if validated_data.get('subscription_status') == 'trial' and not validated_data.get('trial_ends_at'):
            validated_data['trial_ends_at'] = timezone.now() + timedelta(days=14)
        return super().create(validated_data)


class OwnerUserSerializer(serializers.ModelSerializer):
    """Serializer for global user management by owner."""
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    tenant_slug = serializers.CharField(source='tenant.slug', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name = serializers.SerializerMethodField()
    last_login_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'role_display', 'tenant', 'tenant_name', 'tenant_slug',
            'branch', 'branch_name', 'pin', 'is_active', 'is_email_verified',
            'last_login', 'last_login_display', 'last_login_ip', 'created_at', 'updated_at'
        ]
        read_only_fields = ['last_login', 'created_at', 'updated_at']
    
    def get_full_name(self, obj):
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.username
    
    def get_last_login_display(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%Y-%m-%d %H:%M:%S')
        return 'Never'


class OwnerBusinessCategorySerializer(serializers.ModelSerializer):
    """Serializer for business category management by owner."""
    module_count = serializers.SerializerMethodField()
    recommended_modules = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessCategory
        fields = [
            'id', 'code', 'name', 'description', 'icon',
            'requires_expiry_tracking', 'requires_serial_tracking',
            'requires_weight_scale', 'requires_variants',
            'requires_warranty', 'requires_appointments',
            'requires_recipe_costing', 'requires_layby',
            'requires_delivery', 'is_active', 'sort_order',
            'module_count', 'recommended_modules',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_module_count(self, obj):
        return obj.module_mappings.count()
    
    def get_recommended_modules(self, obj):
        """Get recommended modules for this category."""
        from .business_category_serializers import ModuleSimpleSerializer, CategoryModuleMappingSerializer
        mappings = obj.module_mappings.all().order_by('-priority')
        return CategoryModuleMappingSerializer(mappings, many=True).data


class TenantSummarySerializer(serializers.ModelSerializer):
    """Lightweight tenant summary for owner dashboard."""
    user_count = serializers.SerializerMethodField()
    branch_count = serializers.SerializerMethodField()
    sales_today = serializers.SerializerMethodField()
    business_category_name = serializers.CharField(source='business_category.name', read_only=True)
    subscription_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'slug', 'company_name', 'email', 'phone',
            'subscription_status', 'subscription_type', 'preferred_payment_method',
            'trial_ends_at', 'subscription_ends_at',
            'user_count', 'branch_count', 'sales_today', 'business_category_name',
            'subscription_name', 'created_at'
        ]
    
    def get_user_count(self, obj):
        return obj.users.count()
    
    def get_branch_count(self, obj):
        return obj.branches.count()
    
    def get_sales_today(self, obj):
        today = timezone.now().date()
        total = Sale.objects.filter(
            tenant=obj,
            date__date=today
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        return str(total)
    
    def get_subscription_name(self, obj):
        try:
            return obj.subscription.package.name if hasattr(obj, 'subscription') and obj.subscription else None
        except:
            return None

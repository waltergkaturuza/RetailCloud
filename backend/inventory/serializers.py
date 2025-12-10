"""
Serializers for inventory app.
"""
from rest_framework import serializers
from .models import Category, Product, ProductVariant, StockLevel, StockMovement, Batch
from .category_product_fields import ProductCustomField


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer."""
    children_count = serializers.IntegerField(source='children.count', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'code', 'description', 'parent',
            'image', 'is_active', 'sort_order', 'children_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ProductVariantSerializer(serializers.ModelSerializer):
    """Product variant serializer."""
    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product', 'name', 'sku', 'barcode',
            'cost_price', 'selling_price', 'reorder_level', 'is_active'
        ]


class ProductSerializer(serializers.ModelSerializer):
    """Product serializer."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    current_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    custom_fields = serializers.SerializerMethodField()
    business_category_code = serializers.SerializerMethodField()
    # Accept custom_fields in write operations (but it's handled separately)
    custom_fields_write = serializers.DictField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_name', 'name', 'sku', 'barcode', 'rfid_tag',
            'description', 'cost_price', 'selling_price', 'discount_price',
            'current_price', 'track_inventory', 'reorder_level', 'reorder_quantity',
            'unit', 'weight', 'image', 'is_active', 'is_taxable',
            'allow_negative_stock', 'variants', 'custom_fields', 'business_category_code',
            'custom_fields_write', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'custom_fields', 'business_category_code']
    
    def get_custom_fields(self, obj):
        """Get category-specific custom fields."""
        if not obj or not obj.id:
            return {}  # Return empty dict if object doesn't exist yet
        try:
            custom_fields = ProductCustomField.objects.get(product=obj)
            return custom_fields.get_field_data()
        except ProductCustomField.DoesNotExist:
            return {}
        except Exception:
            return {}  # Return empty dict on any error
    
    def get_business_category_code(self, obj):
        """Get tenant's business category code."""
        if not obj or not hasattr(obj, 'tenant') or not obj.tenant:
            return None
        try:
            if obj.tenant and hasattr(obj.tenant, 'business_category') and obj.tenant.business_category:
                return obj.tenant.business_category.code
        except Exception:
            pass
        return None
    
    def create(self, validated_data):
        """Create product and handle custom_fields."""
        # Extract custom_fields from validated_data or initial_data
        custom_fields_data = validated_data.pop('custom_fields_write', None)
        if not custom_fields_data and 'custom_fields' in self.initial_data:
            custom_fields_data = self.initial_data.get('custom_fields')
        
        # Ensure tenant is set - DRF should merge kwargs from serializer.save() into validated_data,
        # but we also check context as a fallback (following the pattern used in other serializers)
        if 'tenant' not in validated_data or validated_data.get('tenant') is None:
            # Get tenant from context request (most reliable approach, used in CashTransactionCreateSerializer, etc.)
            if self.context and 'request' in self.context:
                request = self.context['request']
                if hasattr(request, 'tenant') and request.tenant:
                    validated_data['tenant'] = request.tenant
        
        # If tenant is still not set, this is an error condition
        if 'tenant' not in validated_data or validated_data.get('tenant') is None:
            import logging
            logger = logging.getLogger(__name__)
            context_has_request = bool(self.context and 'request' in self.context)
            request_has_tenant = False
            tenant_value = None
            if context_has_request:
                request = self.context['request']
                request_has_tenant = hasattr(request, 'tenant')
                tenant_value = getattr(request, 'tenant', None)
            
            logger.error(
                f"Product creation failed: tenant not found. "
                f"Context has request: {context_has_request}, "
                f"Request has tenant attr: {request_has_tenant}, "
                f"Tenant value: {tenant_value}, "
                f"User authenticated: {getattr(self.context.get('request'), 'user', {}).is_authenticated if context_has_request else 'N/A'}"
            )
            raise serializers.ValidationError({
                'tenant': 'Tenant is required for product creation. Please ensure you are authenticated and associated with a tenant.'
            })
        
        # Create the product
        product = super().create(validated_data)
        
        # Save custom fields if provided
        if custom_fields_data and isinstance(custom_fields_data, dict) and custom_fields_data:
            try:
                # Use update_or_create for better performance
                custom_field, created = ProductCustomField.objects.update_or_create(
                    product=product,
                    defaults={'tenant': product.tenant}
                )
                custom_field.set_field_data(custom_fields_data)
                # Only update necessary fields
                custom_field.save(update_fields=['field_data', 'updated_at'])
            except Exception as e:
                # Log error but don't fail product creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error saving custom fields: {str(e)}")
        
        return product
    
    def update(self, instance, validated_data):
        """Update product and handle custom_fields."""
        # Extract custom_fields from validated_data or initial_data
        custom_fields_data = validated_data.pop('custom_fields_write', None)
        if not custom_fields_data and 'custom_fields' in self.initial_data:
            custom_fields_data = self.initial_data.get('custom_fields')
        
        # Update the product (don't pass tenant if it's not changing)
        product = super().update(instance, validated_data)
        
        # Save custom fields if provided (only if there's actual data or it's being cleared)
        if custom_fields_data is not None and isinstance(custom_fields_data, dict):
            try:
                # Use update_or_create to avoid unnecessary queries
                custom_field, created = ProductCustomField.objects.update_or_create(
                    product=product,
                    defaults={'tenant': product.tenant}  # Ensure tenant is set
                )
                custom_field.set_field_data(custom_fields_data)
                custom_field.save(update_fields=['field_data', 'updated_at'])
            except Exception as e:
                # Log error but don't fail product update
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error saving custom fields: {str(e)}", exc_info=True)
        
        return product


class StockLevelSerializer(serializers.ModelSerializer):
    """Stock level serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True, allow_null=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    available_quantity = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = StockLevel
        fields = [
            'id', 'branch', 'branch_name', 'product', 'product_name',
            'product_sku', 'product_barcode', 'variant', 'quantity', 'reserved_quantity',
            'available_quantity', 'is_low_stock', 'last_counted_at', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class StockMovementSerializer(serializers.ModelSerializer):
    """Stock movement serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'branch', 'branch_name', 'product', 'product_name',
            'variant', 'movement_type', 'quantity', 'quantity_before',
            'quantity_after', 'reference_type', 'reference_id',
            'notes', 'user', 'user_name', 'created_at'
        ]
        read_only_fields = ['created_at']


class BatchSerializer(serializers.ModelSerializer):
    """Batch serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Batch
        fields = [
            'id', 'branch', 'product', 'product_name', 'batch_number',
            'expiry_date', 'quantity', 'remaining_quantity',
            'cost_price', 'received_date', 'is_expired',
            'is_expiring_soon', 'created_at'
        ]
        read_only_fields = ['created_at']


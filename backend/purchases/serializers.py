"""
Serializers for purchases app.
"""
from rest_framework import serializers
from decimal import Decimal
from .models import PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GRNItem
from core.utils import get_tenant_from_request


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Purchase order item serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'variant',
            'quantity', 'unit_price', 'total', 'received_quantity',
            'created_at'
        ]
        read_only_fields = ['created_at']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Purchase order serializer."""
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_id = serializers.IntegerField(write_only=True, required=False)
    
    @staticmethod
    def _get_user_display_name(user):
        """Helper method to get user display name."""
        if not user:
            return 'N/A'
        full_name = user.get_full_name()
        if full_name and full_name.strip():
            return full_name
        return user.username or user.email or 'N/A'
    
    def get_grns(self, obj):
        """Get GRNs for this purchase order."""
        from .models import GoodsReceivedNote
        grns = GoodsReceivedNote.objects.filter(purchase_order=obj).select_related('received_by').order_by('-date')
        # Use a simple representation to avoid circular import
        return [{
            'id': grn.id,
            'grn_number': grn.grn_number,
            'date': grn.date,
            'invoice_number': grn.invoice_number,
            'notes': grn.notes,
            'received_by_name': self._get_user_display_name(grn.received_by)
        } for grn in grns]
    
    grns = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'branch', 'branch_id', 'branch_name', 'supplier', 'supplier_name',
            'date', 'expected_delivery_date', 'subtotal', 'tax_amount', 'total_amount',
            'status', 'notes', 'created_by', 'items', 'grns', 'created_at', 'updated_at'
        ]
        read_only_fields = ['po_number', 'date', 'total_amount', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'branch': {'required': False}  # We'll set it from branch_id in validate()
        }
    
    def to_internal_value(self, data):
        """Override to handle branch_id before field validation."""
        # Store branch_id before DRF processes the data
        branch_id = data.get('branch_id') if isinstance(data, dict) else None
        result = super().to_internal_value(data)
        # Restore branch_id in result if it was there
        if branch_id is not None:
            result['branch_id'] = branch_id
        return result
    
    def validate(self, data):
        """Validate purchase order data and handle branch_id."""
        import logging
        logger = logging.getLogger(__name__)
        
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError({'branch': 'Request context is required.'})
        
        # Get branch_id from multiple sources (DRF processes data through different stages)
        branch_id = None
        
        # Try initial_data first (raw data before validation)
        if hasattr(self, 'initial_data') and self.initial_data:
            branch_id = self.initial_data.get('branch_id')
            logger.debug(f"Found branch_id in initial_data: {branch_id}")
        
        # Fallback to request.data (raw POST data)
        if branch_id is None and hasattr(request, 'data'):
            branch_id = request.data.get('branch_id')
            logger.debug(f"Found branch_id in request.data: {branch_id}")
        
        # Also check if branch_id was passed but filtered out
        if branch_id is None and hasattr(self, '_validated_data'):
            branch_id = getattr(self, '_validated_data', {}).get('branch_id')
        
        # Ensure tenant is available first
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            tenant = get_tenant_from_request(request)
            if tenant:
                request.tenant = tenant  # Set it for future use
        
        if not tenant:
            raise serializers.ValidationError({'branch': "Tenant context is required. Please ensure you're logged in."})
        
        # Convert branch_id to int if it's a string or number
        if branch_id is not None:
            try:
                branch_id = int(branch_id)
            except (ValueError, TypeError):
                raise serializers.ValidationError({'branch_id': 'Invalid branch ID format.'})
        
        # Set branch from branch_id if not already set
        if branch_id is not None and not data.get('branch'):
            from core.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id, tenant=tenant, is_active=True)
                data['branch'] = branch
            except Branch.DoesNotExist:
                raise serializers.ValidationError({'branch_id': f'Branch {branch_id} not found or does not belong to your tenant.'})
        
        # Ensure branch is set
        if not data.get('branch'):
            raise serializers.ValidationError({'branch': 'Branch is required. Please select a branch.'})
        
        return data
    
    def create(self, validated_data):
        """Create purchase order with items and calculate totals."""
        # Get items from request data (they'll be created separately)
        request = self.context.get('request')
        items_data = request.data.get('items', []) if request else []
        
        # Calculate totals from items
        subtotal = Decimal('0.00')
        for item_data in items_data:
            quantity = Decimal(str(item_data.get('quantity', 0)))
            unit_price = Decimal(str(item_data.get('unit_price', 0)))
            subtotal += quantity * unit_price
        
        tax_amount = Decimal('0.00')  # Could be calculated based on tenant tax_rate
        total_amount = subtotal + tax_amount
        
        validated_data['subtotal'] = subtotal
        validated_data['tax_amount'] = tax_amount
        validated_data['total_amount'] = total_amount
        
        # Create the purchase order
        purchase_order = super().create(validated_data)
        
        # Create purchase order items
        for item_data in items_data:
            from inventory.models import Product
            product_id = item_data.get('product_id')
            if not product_id:
                continue
                
            quantity = int(item_data.get('quantity', 0))
            unit_price = Decimal(str(item_data.get('unit_price', 0)))
            total = quantity * unit_price
            
            try:
                product = Product.objects.get(id=product_id, tenant=purchase_order.tenant)
            except Product.DoesNotExist:
                continue  # Skip invalid products
            
            PurchaseOrderItem.objects.create(
                purchase_order=purchase_order,
                product=product,
                variant=None,  # Could be added later
                quantity=quantity,
                unit_price=unit_price,
                total=total
            )
        
        return purchase_order


class GRNItemSerializer(serializers.ModelSerializer):
    """GRN item serializer."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = GRNItem
        fields = [
            'id', 'purchase_order_item', 'product', 'product_name', 'variant',
            'quantity_received', 'batch_number', 'expiry_date', 'cost_price',
            'created_at'
        ]
        read_only_fields = ['created_at']


class GoodsReceivedNoteSerializer(serializers.ModelSerializer):
    """GRN serializer."""
    items = GRNItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    def get_received_by_name(self, obj):
        """Get the name of the user who received the goods."""
        if not obj.received_by:
            return 'N/A'
        full_name = obj.received_by.get_full_name()
        if full_name and full_name.strip():
            return full_name
        return obj.received_by.username or obj.received_by.email or 'N/A'
    
    received_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = GoodsReceivedNote
        fields = [
            'id', 'grn_number', 'branch', 'branch_id', 'branch_name', 'purchase_order',
            'supplier', 'supplier_name', 'date', 'invoice_number',
            'notes', 'received_by', 'received_by_name', 'items', 'created_at'
        ]
        read_only_fields = ['grn_number', 'date', 'created_at']
        extra_kwargs = {
            'branch': {'required': False},  # We'll set it from branch_id or purchase_order
            'supplier': {'required': False},  # We'll set it from purchase_order
            'received_by': {'required': False}  # We'll set it in perform_create
        }
    
    def to_internal_value(self, data):
        """Override to handle branch_id before field validation."""
        branch_id = data.get('branch_id') if isinstance(data, dict) else None
        result = super().to_internal_value(data)
        if branch_id is not None:
            result['branch_id'] = branch_id
        return result
    
    def validate(self, data):
        """Validate GRN data and handle branch_id, supplier, and purchase_order."""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError({'branch': 'Request context is required.'})
        
        # Get tenant
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            tenant = get_tenant_from_request(request)
            if tenant:
                request.tenant = tenant
        
        if not tenant:
            raise serializers.ValidationError({'branch': "Tenant context is required. Please ensure you're logged in."})
        
        # Get purchase_order - it should have supplier and branch
        purchase_order = data.get('purchase_order')
        if not purchase_order:
            raise serializers.ValidationError({'purchase_order': 'Purchase order is required.'})
        
        # Set supplier from purchase_order if not provided
        if not data.get('supplier'):
            data['supplier'] = purchase_order.supplier
        
        # Get branch_id from request or use purchase_order branch
        branch_id = None
        if hasattr(self, 'initial_data') and self.initial_data:
            branch_id = self.initial_data.get('branch_id')
        if branch_id is None and hasattr(request, 'data'):
            branch_id = request.data.get('branch_id')
        
        # Set branch from branch_id or purchase_order
        if not data.get('branch'):
            if branch_id is not None:
                try:
                    branch_id = int(branch_id)
                    from core.models import Branch
                    branch = Branch.objects.get(id=branch_id, tenant=tenant, is_active=True)
                    data['branch'] = branch
                except (ValueError, TypeError, Branch.DoesNotExist):
                    raise serializers.ValidationError({'branch_id': f'Branch {branch_id} not found or does not belong to your tenant.'})
            else:
                # Use branch from purchase_order
                data['branch'] = purchase_order.branch
        
        return data
    
    def create(self, validated_data):
        """Create GRN with items."""
        request = self.context.get('request')
        items_data = request.data.get('items', []) if request else []
        
        # Create the GRN
        grn = super().create(validated_data)
        
        # Create GRN items
        for item_data in items_data:
            from purchases.models import PurchaseOrderItem
            from inventory.models import Product
            
            purchase_order_item_id = item_data.get('purchase_order_item')
            product_id = item_data.get('product')
            
            if not purchase_order_item_id or not product_id:
                continue
            
            try:
                purchase_order_item = PurchaseOrderItem.objects.get(
                    id=purchase_order_item_id,
                    purchase_order=grn.purchase_order
                )
                product = Product.objects.get(id=product_id, tenant=grn.tenant)
            except (PurchaseOrderItem.DoesNotExist, Product.DoesNotExist):
                continue
            
            quantity_received = int(item_data.get('quantity_received', 0))
            if quantity_received <= 0:
                continue
            
            from decimal import Decimal
            cost_price = Decimal(str(item_data.get('cost_price', 0)))
            
            GRNItem.objects.create(
                grn=grn,
                purchase_order_item=purchase_order_item,
                product=product,
                variant=None,
                quantity_received=quantity_received,
                batch_number=item_data.get('batch_number', ''),
                expiry_date=item_data.get('expiry_date') or None,
                cost_price=cost_price
            )
        
        # Auto-create VAT input tax liability if tax config is enabled
        # Calculate total purchase amount from GRN items
        from decimal import Decimal as D
        total_purchase_amount = D('0.00')
        for grn_item in grn.items.all():
            total_purchase_amount += grn_item.cost_price * D(str(grn_item.quantity_received))
        
        if total_purchase_amount > 0:
            try:
                from accounting.tax_calculation_service import TaxCalculationService
                from django.utils import timezone
                tax_service = TaxCalculationService(grn.tenant)
                if tax_service.config.auto_calculate_tax and tax_service.config.vat_registered:
                    # Calculate VAT on purchase
                    vat_result = tax_service.calculate_vat(total_purchase_amount, tax_service.config.tax_inclusive_pricing)
                    vat_input_amount = D(str(vat_result['tax_amount']))
                    
                    if vat_input_amount > 0:
                        # Create VAT input liability for this purchase
                        tax_service.create_tax_liability(
                            tax_type='vat_input',
                            source_type='purchase',
                            source_id=grn.id,
                            taxable_amount=D(str(vat_result['base_amount'])),
                            tax_rate=tax_service.config.standard_vat_rate,
                            transaction_date=timezone.now().date(),
                            branch=grn.branch,
                            reference_number=grn.invoice_number or grn.grn_number
                        )
            except Exception:
                # Silently fail if tax service is not available
                pass
        
        return grn



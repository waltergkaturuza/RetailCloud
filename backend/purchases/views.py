"""
Purchase management views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GRNItem
from .serializers import PurchaseOrderSerializer, GoodsReceivedNoteSerializer
from inventory.models import StockLevel, StockMovement, Batch
from core.utils import get_tenant_from_request


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """Purchase order management."""
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'supplier']
    search_fields = ['po_number']
    ordering_fields = ['date', 'total_amount']
    
    def get_queryset(self):
        """Filter by tenant and handle multiple status values."""
        tenant = get_tenant_from_request(self.request)
        queryset = PurchaseOrder.objects.select_related('supplier', 'branch', 'created_by').all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        
        # Handle multiple status values (comma-separated)
        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = [s.strip() for s in status_param.split(',')]
            queryset = queryset.filter(status__in=statuses)
        
        return queryset
    
    def get_serializer_context(self):
        """Add request to serializer context and ensure tenant is set."""
        context = super().get_serializer_context()
        context['request'] = self.request
        
        # Ensure tenant is set on request before validation
        if not hasattr(self.request, 'tenant') or not self.request.tenant:
            tenant = get_tenant_from_request(self.request)
            if tenant:
                self.request.tenant = tenant
        
        return context
    
    def create(self, request, *args, **kwargs):
        """Override create to handle branch_id before validation."""
        # Ensure tenant is set on request
        tenant = get_tenant_from_request(request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            return Response(
                {'detail': "Tenant context not found. Please ensure you're logged in."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not hasattr(request, 'tenant') or not request.tenant:
            request.tenant = tenant
        
        # Call parent create
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Set tenant and creator on PO creation."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': "Tenant context not found. Please ensure you're logged in."})
        
        # Ensure tenant is set on request for serializer validation
        if not hasattr(self.request, 'tenant') or not self.request.tenant:
            self.request.tenant = tenant
        
        # Set tenant and created_by
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )


class GoodsReceivedNoteViewSet(viewsets.ModelViewSet):
    """GRN management."""
    serializer_class = GoodsReceivedNoteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'supplier', 'purchase_order']
    search_fields = ['grn_number', 'invoice_number']
    ordering_fields = ['date']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = GoodsReceivedNote.objects.select_related(
            'tenant', 'branch', 'supplier', 'purchase_order', 'received_by'
        ).all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset
    
    def get_serializer_context(self):
        """Add request to serializer context and ensure tenant is set."""
        context = super().get_serializer_context()
        context['request'] = self.request
        
        # Ensure tenant is set on request before validation
        if not hasattr(self.request, 'tenant') or not self.request.tenant:
            tenant = get_tenant_from_request(self.request)
            if tenant:
                self.request.tenant = tenant
        
        return context
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create GRN and update stock."""
        # Ensure tenant is set on request
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant context not found. Please ensure you\'re logged in.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not hasattr(request, 'tenant') or not request.tenant:
            request.tenant = tenant
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            grn = serializer.save(
                tenant=tenant,
                received_by=request.user
            )
            
            # Get GRN items that were created by the serializer
            grn_items = grn.items.all()
            
            # Update stock for each item and update PO item received quantities
            for grn_item in grn_items:
                # Update PurchaseOrderItem received_quantity
                po_item = grn_item.purchase_order_item
                po_item.received_quantity = min(
                    po_item.received_quantity + grn_item.quantity_received,
                    po_item.quantity
                )
                po_item.save()
                
                # Update stock level
                stock_level, created = StockLevel.objects.get_or_create(
                    tenant=tenant,
                    branch=grn.branch,
                    product=grn_item.product
                )
                
                quantity_before = stock_level.quantity
                stock_level.quantity += grn_item.quantity_received
                stock_level.save()
                
                # Record stock movement
                StockMovement.objects.create(
                    tenant=tenant,
                    branch=grn.branch,
                    product=grn_item.product,
                    variant=grn_item.variant,
                    movement_type='in',
                    quantity=grn_item.quantity_received,
                    quantity_before=quantity_before,
                    quantity_after=stock_level.quantity,
                    reference_type='GRN',
                    reference_id=str(grn.id),
                    notes=f"GRN {grn.grn_number}",
                    user=request.user
                )
                
                # Create batch if batch number provided
                if grn_item.batch_number:
                    Batch.objects.create(
                        tenant=tenant,
                        branch=grn.branch,
                        product=grn_item.product,
                        batch_number=grn_item.batch_number,
                        expiry_date=grn_item.expiry_date,
                        quantity=grn_item.quantity_received,
                        remaining_quantity=grn_item.quantity_received,
                        cost_price=grn_item.cost_price,
                        received_date=timezone.now().date()
                    )
            
            # Update PurchaseOrder status based on received quantities
            purchase_order = grn.purchase_order
            all_items_received = all(
                item.received_quantity >= item.quantity 
                for item in purchase_order.items.all()
            )
            some_items_received = any(
                item.received_quantity > 0 
                for item in purchase_order.items.all()
            )
            
            if all_items_received:
                purchase_order.status = 'received'
            elif some_items_received:
                purchase_order.status = 'partially_received'
            
            purchase_order.save()
            
            return Response(GoodsReceivedNoteSerializer(grn).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



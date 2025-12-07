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


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """Purchase order management."""
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'supplier', 'status']
    search_fields = ['po_number']
    ordering_fields = ['date', 'total_amount']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = PurchaseOrder.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    def perform_create(self, serializer):
        """Set tenant and creator on PO creation."""
        serializer.save(
            tenant=self.request.tenant,
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
        queryset = GoodsReceivedNote.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    @transaction.atomic
    def create(self, request):
        """Create GRN and update stock."""
        serializer = GoodsReceivedNoteSerializer(data=request.data)
        if serializer.is_valid():
            grn = serializer.save(
                tenant=request.tenant,
                received_by=request.user
            )
            
            # Update stock for each item
            for item_data in request.data.get('items', []):
                grn_item = GRNItem.objects.get(id=item_data['id']) if item_data.get('id') else None
                if not grn_item:
                    continue
                
                # Update stock level
                stock_level, created = StockLevel.objects.get_or_create(
                    tenant=request.tenant,
                    branch=grn.branch,
                    product=grn_item.product
                )
                
                quantity_before = stock_level.quantity
                stock_level.quantity += grn_item.quantity_received
                stock_level.save()
                
                # Record stock movement
                StockMovement.objects.create(
                    tenant=request.tenant,
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
                        tenant=request.tenant,
                        branch=grn.branch,
                        product=grn_item.product,
                        batch_number=grn_item.batch_number,
                        expiry_date=grn_item.expiry_date,
                        quantity=grn_item.quantity_received,
                        remaining_quantity=grn_item.quantity_received,
                        cost_price=grn_item.cost_price,
                        received_date=timezone.now().date()
                    )
            
            return Response(GoodsReceivedNoteSerializer(grn).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


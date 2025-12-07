"""
Inventory management views.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product, ProductVariant, StockLevel, StockMovement, Batch
from .serializers import (
    CategorySerializer, ProductSerializer, ProductVariantSerializer,
    StockLevelSerializer, StockMovementSerializer, BatchSerializer
)
from .category_product_fields import ProductCustomField
import json


class CategoryViewSet(viewsets.ModelViewSet):
    """Category management."""
    serializer_class = CategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['parent', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['sort_order', 'name']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = Category.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset


class ProductViewSet(viewsets.ModelViewSet):
    """Product management."""
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'track_inventory']
    search_fields = ['name', 'sku', 'barcode', 'rfid_tag', 'description']
    ordering_fields = ['name', 'sku', 'created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = Product.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Adjust stock level."""
        product = self.get_object()
        branch_id = request.data.get('branch_id')
        quantity = request.data.get('quantity')
        notes = request.data.get('notes', '')
        
        if not branch_id or quantity is None:
            return Response(
                {'error': 'branch_id and quantity are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create stock level
        from core.models import Branch
        try:
            branch = Branch.objects.get(id=branch_id, tenant=request.tenant)
        except Branch.DoesNotExist:
            return Response(
                {'error': 'Branch not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        stock_level, created = StockLevel.objects.get_or_create(
            tenant=request.tenant,
            branch=branch,
            product=product
        )
        
        quantity_before = stock_level.quantity
        stock_level.quantity = quantity
        stock_level.save()
        
        # Record movement
        StockMovement.objects.create(
            tenant=request.tenant,
            branch=branch,
            product=product,
            movement_type='adjustment',
            quantity=quantity - quantity_before,
            quantity_before=quantity_before,
            quantity_after=quantity,
            notes=notes,
            user=request.user
        )
        
        return Response(StockLevelSerializer(stock_level).data)


class StockLevelViewSet(viewsets.ReadOnlyModelViewSet):
    """Stock level viewset."""
    serializer_class = StockLevelSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch', 'product']  # Removed is_low_stock - it's a property, not a DB field
    search_fields = ['product__name', 'product__sku', 'product__barcode']
    
    def get_queryset(self):
        """Filter by tenant."""
        # Get tenant from request or user
        tenant = getattr(self.request, 'tenant', None)
        if not tenant and self.request.user.is_authenticated and hasattr(self.request.user, 'tenant'):
            tenant = self.request.user.tenant
        
        if not tenant:
            # Return empty queryset if no tenant found
            return StockLevel.objects.none()
        
        # Use all() to bypass tenant_filtered_manager, then filter explicitly
        queryset = StockLevel.objects.filter(tenant=tenant).select_related(
            'product', 'branch', 'variant', 'product__category'
        )
        
        return queryset


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """Stock movement history."""
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['branch', 'product', 'movement_type', 'reference_type']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = StockMovement.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset


class BatchViewSet(viewsets.ModelViewSet):
    """Batch management."""
    serializer_class = BatchSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['branch', 'product', 'is_expired']
    ordering_fields = ['expiry_date', 'received_date']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = Batch.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset


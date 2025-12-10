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
from core.utils import get_tenant_from_request
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
        tenant = get_tenant_from_request(self.request)
        queryset = Category.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
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
        tenant = get_tenant_from_request(self.request)
        queryset = Product.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset
    
    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Set tenant automatically when creating a product."""
        tenant = get_tenant_from_request(self.request)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            # If still no tenant, let serializer handle the error with better message
            serializer.save()
    
    def perform_update(self, serializer):
        """Optimize update - tenant shouldn't change on update."""
        # For updates, tenant should already be set on the instance
        # Just save without unnecessary tenant lookup
        serializer.save()
    
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
        
        # Get tenant from request
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {
                    'error': 'Tenant context not found. Please ensure you are authenticated and associated with a tenant.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert branch_id to int if it's a string
        try:
            branch_id = int(branch_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid branch_id. Must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            branch = Branch.objects.get(id=branch_id, tenant=tenant)
        except Branch.DoesNotExist:
            # Provide more helpful error message - check both active and inactive branches
            tenant_branches_all = Branch.objects.filter(tenant=tenant)
            tenant_branches_active = Branch.objects.filter(tenant=tenant, is_active=True)
            
            all_branch_ids = list(tenant_branches_all.values_list('id', flat=True))
            available_branch_ids = list(tenant_branches_active.values_list('id', flat=True))
            
            # Check if branch exists but belongs to different tenant
            branch_exists = Branch.objects.filter(id=branch_id).exists()
            
            error_msg = f'Branch not found. Branch ID {branch_id} does not exist for this tenant.'
            if branch_exists:
                error_msg = f'Branch ID {branch_id} exists but does not belong to your tenant (Tenant: {tenant.company_name}).'
            
            return Response(
                {
                    'error': error_msg,
                    'tenant_id': tenant.id,
                    'tenant_name': tenant.company_name,
                    'all_branch_ids': all_branch_ids,
                    'available_branch_ids': available_branch_ids,
                    'branch_exists_elsewhere': branch_exists
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        stock_level, created = StockLevel.objects.get_or_create(
            tenant=tenant,
            branch=branch,
            product=product
        )
        
        quantity_before = stock_level.quantity
        stock_level.quantity = quantity
        stock_level.save()
        
        # Record movement
        StockMovement.objects.create(
            tenant=tenant,
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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'product']  # Removed is_low_stock - it's a property, not a DB field
    search_fields = ['product__name', 'product__sku', 'product__barcode']
    ordering_fields = ['product__name', 'quantity', 'branch__name']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        
        if not tenant:
            # Return empty queryset if no tenant found
            return StockLevel.objects.none()
        
        # Use all() to bypass tenant_filtered_manager, then filter explicitly
        queryset = StockLevel.objects.filter(tenant=tenant).select_related(
            'product', 'branch', 'variant', 'product__category'
        )
        
        # Handle branch filter manually if provided (to validate it belongs to tenant)
        branch_param = self.request.query_params.get('branch')
        if branch_param:
            try:
                from core.models import Branch
                branch_id = int(branch_param)
                # Verify branch belongs to tenant
                branch_exists = Branch.objects.filter(id=branch_id, tenant=tenant, is_active=True).exists()
                if branch_exists:
                    queryset = queryset.filter(branch_id=branch_id)
                else:
                    # Return empty queryset if branch doesn't belong to tenant
                    return StockLevel.objects.none()
            except (ValueError, TypeError):
                # Invalid branch parameter, return empty queryset
                return StockLevel.objects.none()
        
        # Add default ordering to prevent pagination warnings
        # Order by product name, then branch name for consistent pagination
        queryset = queryset.order_by('product__name', 'branch__name')
        
        return queryset


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """Stock movement history."""
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['branch', 'product', 'movement_type', 'reference_type']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = StockMovement.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset


class BatchViewSet(viewsets.ModelViewSet):
    """Batch management."""
    serializer_class = BatchSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['branch', 'product']  # Removed is_expired - it's a property, not a DB field
    ordering_fields = ['expiry_date', 'received_date']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = Batch.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        # Add default ordering to prevent pagination warnings
        queryset = queryset.order_by('-expiry_date', '-received_date')
        return queryset
    
    def filter_queryset(self, queryset):
        """Override to handle custom is_expired filtering."""
        queryset = super().filter_queryset(queryset)
        
        # Handle is_expired filter manually since it's a property
        is_expired_param = self.request.query_params.get('is_expired')
        if is_expired_param is not None:
            from django.utils import timezone
            from django.db.models import Q
            try:
                is_expired = is_expired_param.lower() in ('true', '1', 'yes')
                if is_expired:
                    # Filter for expired batches (expiry_date < today)
                    queryset = queryset.filter(expiry_date__lt=timezone.now().date())
                else:
                    # Filter for non-expired batches (expiry_date >= today or NULL)
                    queryset = queryset.filter(
                        Q(expiry_date__gte=timezone.now().date()) | Q(expiry_date__isnull=True)
                    )
            except (ValueError, TypeError):
                # Invalid parameter, ignore filter
                pass
        
        return queryset


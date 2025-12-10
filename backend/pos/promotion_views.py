"""
Views for promotion and discount management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from decimal import Decimal
from .promotion_models import Promotion, PromotionUsage, PriceOverride
from .promotion_serializers import (
    PromotionSerializer, PromotionCreateSerializer,
    PromotionUsageSerializer, PriceOverrideSerializer,
    ApplyPromotionSerializer
)
from inventory.models import Product


class PromotionViewSet(viewsets.ModelViewSet):
    """Promotion viewset."""
    serializer_class = PromotionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['promotion_type', 'is_active', 'apply_to']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = Promotion.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PromotionCreateSerializer
        return PromotionSerializer
    
    def perform_create(self, serializer):
        """Create promotion with tenant."""
        serializer.save(tenant=self.request.tenant)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active and valid promotions."""
        promotions = self.get_queryset().filter(is_active=True)
        valid_promotions = [p for p in promotions if p.is_valid()]
        return Response(PromotionSerializer(valid_promotions, many=True).data)
    
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply promotion to cart."""
        promotion = self.get_object()
        
        if not promotion.is_valid():
            return Response(
                {'error': 'Promotion is not currently valid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        subtotal = Decimal(request.data.get('subtotal', 0))
        discount = promotion.calculate_discount(subtotal)
        
        return Response({
            'promotion_id': promotion.id,
            'promotion_name': promotion.name,
            'discount_amount': float(discount),
            'subtotal': float(subtotal),
            'new_total': float(subtotal - discount)
        })


class PromotionApplyView(APIView):
    """Apply promotion by code or ID."""
    
    def post(self, request):
        """Apply promotion to cart."""
        serializer = ApplyPromotionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        promotion_code = data.get('promotion_code')
        promotion_id = data.get('promotion_id')
        subtotal = data.get('subtotal')
        items = data.get('items', [])
        
        # Find promotion
        promotion = None
        if promotion_code:
            try:
                promotion = Promotion.objects.get(
                    code=promotion_code,
                    tenant=request.tenant,
                    is_active=True
                )
            except Promotion.DoesNotExist:
                return Response(
                    {'error': f'Promotion code "{promotion_code}" not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif promotion_id:
            try:
                promotion = Promotion.objects.get(
                    id=promotion_id,
                    tenant=request.tenant,
                    is_active=True
                )
            except Promotion.DoesNotExist:
                return Response(
                    {'error': 'Promotion not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'promotion_code or promotion_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not promotion.is_valid():
            return Response(
                {'error': 'Promotion is not currently valid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if promotion applies to items
        applicable_items = items
        if promotion.apply_to == 'category' and promotion.category:
            applicable_items = [i for i in items if i.get('category_id') == promotion.category.id]
        elif promotion.apply_to == 'product' and promotion.product:
            applicable_items = [i for i in items if i.get('product_id') == promotion.product.id]
        
        if not applicable_items:
            return Response(
                {'error': 'Promotion does not apply to any items in cart'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate discount
        applicable_subtotal = sum(
            Decimal(str(item.get('unit_price', 0))) * item.get('quantity', 0)
            for item in applicable_items
        )
        
        discount = promotion.calculate_discount(applicable_subtotal)
        
        return Response({
            'promotion_id': promotion.id,
            'promotion_name': promotion.name,
            'promotion_type': promotion.promotion_type,
            'discount_amount': float(discount),
            'applicable_subtotal': float(applicable_subtotal),
            'new_total': float(subtotal - discount),
            'items_affected': len(applicable_items)
        })


class PriceOverrideViewSet(viewsets.ModelViewSet):
    """Price override viewset."""
    serializer_class = PriceOverrideSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = PriceOverride.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create price override request."""
        serializer.save(
            tenant=self.request.tenant,
            requested_by=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve price override."""
        price_override = self.get_object()
        
        if not request.user.role in ['super_admin', 'tenant_admin', 'supervisor', 'manager']:
            return Response(
                {'error': 'Permission denied. Only supervisors can approve price overrides.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if price_override.status != 'pending':
            return Response(
                {'error': 'Price override is not pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        price_override.approved_by = request.user
        price_override.approved_at = timezone.now()
        price_override.status = 'approved'
        price_override.save()
        
        return Response(PriceOverrideSerializer(price_override).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject price override."""
        price_override = self.get_object()
        
        if not request.user.role in ['super_admin', 'tenant_admin', 'supervisor', 'manager']:
            return Response(
                {'error': 'Permission denied. Only supervisors can reject price overrides.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        price_override.approved_by = request.user
        price_override.approved_at = timezone.now()
        price_override.status = 'rejected'
        price_override.save()
        
        return Response(PriceOverrideSerializer(price_override).data)



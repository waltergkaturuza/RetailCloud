"""
API Views for Bulk Inventory Operations with Pattern Recognition.
"""
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from .pattern_recognition_service import BulkInventoryProcessor
from .location_models import (
    WarehouseZone, ProductLocation, ProductLocationMapping,
    SerialNumberPattern
)
from .location_serializers import (
    WarehouseZoneSerializer,
    ProductLocationSerializer,
    ProductLocationMappingSerializer,
    SerialNumberPatternSerializer
)
from .models import Product, StockLevel
from core.utils import get_tenant_from_request
from django.db.models import Q


class BulkInventoryViewSet(viewsets.ViewSet):
    """ViewSet for bulk inventory operations."""
    
    permission_classes = [IsAuthenticated]
    
    def get_tenant(self):
        """Get tenant from request."""
        return get_tenant_from_request(self.request)
    
    @action(detail=False, methods=['post'])
    def extract_serials(self, request):
        """
        Extract serial numbers from text input using pattern recognition.
        
        POST /api/inventory/bulk/extract_serials/
        Body: {
            "input_text": "SN-1000, SN-1001, SN-1002 to SN-1010",
            "product_id": 123  # Optional
        }
        """
        tenant = self.get_tenant()
        input_text = request.data.get('input_text', '')
        product_id = request.data.get('product_id')
        
        if not input_text:
            return Response(
                {'error': 'input_text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        processor = BulkInventoryProcessor(tenant)
        result = processor.process_serial_input(input_text, product_id)
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def extract_barcodes(self, request):
        """
        Extract barcodes from text or image.
        
        POST /api/inventory/bulk/extract_barcodes/
        Body: {
            "input_text": "...",
            "image": <base64 or file>
        }
        """
        tenant = self.get_tenant()
        input_text = request.data.get('input_text', '')
        image_data = None
        
        # Handle image upload if provided
        if 'image' in request.FILES:
            image_data = request.FILES['image'].read()
        elif 'image' in request.data:
            # Base64 encoded image
            import base64
            try:
                image_data = base64.b64decode(request.data['image'])
            except Exception:
                pass
        
        processor = BulkInventoryProcessor(tenant)
        result = processor.process_barcode_input(input_text, image_data)
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def bulk_update_locations(self, request):
        """
        Bulk update product locations.
        
        POST /api/inventory/bulk/update_locations/
        Body: {
            "updates": [
                {
                    "product_id": 123,
                    "location_code": "A-3-2-5",
                    "quantity": 50,
                    "is_primary": true
                },
                ...
            ]
        }
        """
        tenant = self.get_tenant()
        updates = request.data.get('updates', [])
        
        results = []
        errors = []
        
        for update_data in updates:
            try:
                product_id = update_data.get('product_id')
                location_code = update_data.get('location_code')
                quantity = update_data.get('quantity', 0)
                is_primary = update_data.get('is_primary', False)
                
                # Get product
                try:
                    product = Product.objects.get(id=product_id, tenant=tenant)
                except Product.DoesNotExist:
                    errors.append({
                        'product_id': product_id,
                        'error': 'Product not found'
                    })
                    continue
                
                # Get or create location
                location, created = ProductLocation.objects.get_or_create(
                    tenant=tenant,
                    branch=request.user.tenant.branches.first() if hasattr(request.user, 'tenant') else None,
                    location_code=location_code,
                    defaults={'is_active': True}
                )
                
                # Create or update mapping
                mapping, created = ProductLocationMapping.objects.get_or_create(
                    product=product,
                    location=location,
                    defaults={'quantity': quantity, 'is_primary': is_primary}
                )
                
                if not created:
                    mapping.quantity = quantity
                    if is_primary:
                        # Unset other primary locations for this product
                        ProductLocationMapping.objects.filter(
                            product=product,
                            is_primary=True
                        ).exclude(pk=mapping.pk).update(is_primary=False)
                    mapping.is_primary = is_primary
                    mapping.last_stocked_at = timezone.now()
                    mapping.save()
                
                results.append({
                    'product_id': product_id,
                    'location_code': location_code,
                    'quantity': quantity,
                    'success': True
                })
                
            except Exception as e:
                errors.append({
                    'update': update_data,
                    'error': str(e)
                })
        
        return Response({
            'success_count': len(results),
            'error_count': len(errors),
            'results': results,
            'errors': errors
        })
    
    @action(detail=False, methods=['post'])
    def generate_serials_from_pattern(self, request):
        """
        Generate serial numbers from a pattern and range.
        
        POST /api/inventory/bulk/generate_serials/
        Body: {
            "pattern_id": 1,
            "start": 1000,
            "end": 1010,
            "step": 1
        }
        """
        tenant = self.get_tenant()
        pattern_id = request.data.get('pattern_id')
        start = request.data.get('start')
        end = request.data.get('end')
        step = request.data.get('step', 1)
        
        try:
            pattern_obj = SerialNumberPattern.objects.get(id=pattern_id, tenant=tenant)
        except SerialNumberPattern.DoesNotExist:
            return Response(
                {'error': 'Pattern not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from .pattern_recognition_service import SerialNumberPatternRecognizer, SerialPattern
        
        pattern = SerialPattern(
            name=pattern_obj.name,
            pattern_type=pattern_obj.pattern_type,
            config=pattern_obj.pattern_config
        )
        
        recognizer = SerialNumberPatternRecognizer([pattern])
        serials = recognizer.generate_serial_range(pattern, start, end, step)
        
        return Response({
            'serials': serials,
            'count': len(serials),
            'pattern': pattern_obj.name
        })


class ProductLocationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing product locations."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = ProductLocationSerializer
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        queryset = ProductLocation.objects.filter(tenant=tenant)
        
        # Filter by branch if specified
        branch_id = self.request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by zone if specified
        zone_id = self.request.query_params.get('zone_id')
        if zone_id:
            queryset = queryset.filter(zone_id=zone_id)
        
        return queryset.order_by('zone', 'location_code')
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)


class WarehouseZoneViewSet(viewsets.ModelViewSet):
    """ViewSet for managing warehouse zones."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = WarehouseZoneSerializer
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        queryset = WarehouseZone.objects.filter(tenant=tenant)
        
        branch_id = self.request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        return queryset.order_by('sort_order', 'name')
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)


class SerialPatternViewSet(viewsets.ModelViewSet):
    """ViewSet for managing serial number patterns."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = SerialNumberPatternSerializer
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        queryset = SerialNumberPattern.objects.filter(tenant=tenant)
        
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(
                Q(product_id=product_id) | Q(product__isnull=True)
            )
        
        return queryset.order_by('-is_active', 'name')
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)


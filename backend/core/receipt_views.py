"""
Views for receipt templates and printing.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .receipt_models import ReceiptTemplate, ReceiptPrintLog
from .receipt_serializers import ReceiptTemplateSerializer, ReceiptPrintLogSerializer


class ReceiptTemplateViewSet(viewsets.ModelViewSet):
    """Receipt template viewset."""
    serializer_class = ReceiptTemplateSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = ReceiptTemplate.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        
        # Filter by branch if provided
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        else:
            # Get branch-specific or default
            queryset = queryset.filter(branch__isnull=True) | queryset.filter(branch__isnull=False)
        
        return queryset
    
    def get_serializer_context(self):
        """Add request to serializer context for absolute URLs."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Create template with tenant."""
        serializer.save(tenant=self.request.tenant)
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get default receipt template for tenant/branch."""
        branch_id = request.query_params.get('branch')
        
        template = ReceiptTemplate.objects.filter(
            tenant=request.tenant,
            is_default=True,
            is_active=True
        )
        
        if branch_id:
            template = template.filter(branch_id=branch_id) | template.filter(branch__isnull=True)
        else:
            template = template.filter(branch__isnull=True)
        
        template = template.first()
        
        if not template:
            # Create default template if none exists
            template = ReceiptTemplate.objects.create(
                tenant=request.tenant,
                name='Default Receipt',
                is_default=True,
                is_active=True
            )
        
        return Response(ReceiptTemplateSerializer(template, context={'request': request}).data)


class ReceiptPrintLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Receipt print log viewset (read-only)."""
    serializer_class = ReceiptPrintLogSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = ReceiptPrintLog.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        
        # Filter by sale if provided
        sale_id = self.request.query_params.get('sale')
        if sale_id:
            queryset = queryset.filter(sale_id=sale_id)
        
        return queryset.order_by('-printed_at')


class LogReceiptPrintView(APIView):
    """Log a receipt print."""
    
    def post(self, request):
        """Log receipt print."""
        sale_id = request.data.get('sale_id')
        print_type = request.data.get('print_type', 'original')
        
        if not sale_id:
            return Response(
                {'error': 'sale_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from pos.models import Sale
        try:
            sale = Sale.objects.get(id=sale_id, tenant=request.tenant)
        except Sale.DoesNotExist:
            return Response(
                {'error': 'Sale not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get client IP
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        
        log = ReceiptPrintLog.objects.create(
            tenant=request.tenant,
            sale=sale,
            print_type=print_type,
            printed_by=request.user,
            ip_address=ip_address
        )
        
        return Response(ReceiptPrintLogSerializer(log).data)


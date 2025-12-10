"""
Supplier management views.
"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Supplier, SupplierTransaction
from .serializers import SupplierSerializer, SupplierTransactionSerializer
from core.utils import get_tenant_from_request


class SupplierViewSet(viewsets.ModelViewSet):
    """Supplier management."""
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'payment_terms']
    search_fields = ['name', 'email', 'phone', 'code']
    ordering_fields = ['name', 'created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = Supplier.objects.all()
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
        """Set tenant automatically when creating a supplier."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Tenant context not found. Please ensure you are authenticated and associated with a tenant.")
        serializer.save(tenant=tenant)


class SupplierTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Supplier transaction history."""
    serializer_class = SupplierTransactionSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'transaction_type']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = SupplierTransaction.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset



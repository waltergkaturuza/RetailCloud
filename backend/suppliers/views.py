"""
Supplier management views.
"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Supplier, SupplierTransaction
from .serializers import SupplierSerializer, SupplierTransactionSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    """Supplier management."""
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'payment_terms']
    search_fields = ['name', 'email', 'phone', 'code']
    ordering_fields = ['name', 'created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = Supplier.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset


class SupplierTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Supplier transaction history."""
    serializer_class = SupplierTransactionSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'transaction_type']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = SupplierTransaction.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset


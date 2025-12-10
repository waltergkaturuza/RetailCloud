"""
Customer management views.
"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer, CustomerTransaction
from .serializers import CustomerSerializer, CustomerTransactionSerializer
from core.utils import get_tenant_from_request


class CustomerViewSet(viewsets.ModelViewSet):
    """Customer management."""
    serializer_class = CustomerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'credit_rating']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'code']
    ordering_fields = ['last_name', 'first_name', 'created_at', 'total_purchases']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = Customer.objects.all()
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
        """Set tenant automatically when creating a customer."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Tenant context not found. Please ensure you are authenticated and associated with a tenant.")
        serializer.save(tenant=tenant)


class CustomerTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer transaction history."""
    serializer_class = CustomerTransactionSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['customer', 'transaction_type']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = CustomerTransaction.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset



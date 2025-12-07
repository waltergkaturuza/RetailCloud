"""
Customer management views.
"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer, CustomerTransaction
from .serializers import CustomerSerializer, CustomerTransactionSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    """Customer management."""
    serializer_class = CustomerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'credit_rating']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'code']
    ordering_fields = ['last_name', 'first_name', 'created_at', 'total_purchases']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = Customer.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset


class CustomerTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer transaction history."""
    serializer_class = CustomerTransactionSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['customer', 'transaction_type']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = CustomerTransaction.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset


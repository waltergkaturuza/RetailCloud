"""
Views for currency and exchange rate management.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import date
from .currency_models import Currency, ExchangeRate, TenantCurrency
from .currency_serializers import (
    CurrencySerializer, ExchangeRateSerializer, ExchangeRateCreateSerializer,
    TenantCurrencySerializer, CurrentExchangeRateSerializer
)


class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    """Currency viewset."""
    queryset = Currency.objects.filter(is_active=True)
    serializer_class = CurrencySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'name']
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active currencies."""
        currencies = Currency.objects.filter(is_active=True).order_by('sort_order')
        return Response(CurrencySerializer(currencies, many=True).data)


class ExchangeRateViewSet(viewsets.ModelViewSet):
    """Exchange rate viewset."""
    serializer_class = ExchangeRateSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['from_currency', 'to_currency', 'effective_date', 'is_locked']
    ordering_fields = ['effective_date', 'created_at']
    ordering = ['-effective_date', '-created_at']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = ExchangeRate.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ExchangeRateCreateSerializer
        return ExchangeRateSerializer
    
    def perform_create(self, serializer):
        """Create exchange rate with tenant."""
        serializer.save(tenant=self.request.tenant)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current exchange rates."""
        from_currency = request.query_params.get('from', 'USD')
        to_currency = request.query_params.get('to')
        
        queryset = self.get_queryset()
        
        if to_currency:
            # Get specific rate
            rate = queryset.filter(
                from_currency__code=from_currency,
                to_currency__code=to_currency,
                effective_date__lte=timezone.now().date()
            ).order_by('-effective_date').first()
            
            if rate:
                return Response(CurrentExchangeRateSerializer(rate).data)
            return Response(
                {'error': f'Exchange rate not found for {from_currency}/{to_currency}'},
                status=status.HTTP_404_NOT_FOUND
            )
        else:
            # Get all current rates from base currency
            rates = {}
            today = timezone.now().date()
            
            currencies = Currency.objects.filter(is_active=True).exclude(code=from_currency)
            for currency in currencies:
                rate = queryset.filter(
                    from_currency__code=from_currency,
                    to_currency=currency,
                    effective_date__lte=today
                ).order_by('-effective_date').first()
                
                if rate:
                    rates[currency.code] = {
                        'rate': float(rate.rate),
                        'effective_date': rate.effective_date.isoformat(),
                        'is_locked': rate.is_locked
                    }
            
            return Response({
                'base_currency': from_currency,
                'rates': rates,
                'date': today.isoformat()
            })
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve exchange rate (requires supervisor/admin)."""
        exchange_rate = self.get_object()
        
        if not request.user.role in ['super_admin', 'tenant_admin', 'supervisor', 'manager']:
            return Response(
                {'error': 'Permission denied. Only supervisors can approve exchange rates.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        exchange_rate.approved_by = request.user
        exchange_rate.save()
        
        return Response(ExchangeRateSerializer(exchange_rate).data)
    
    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """Lock exchange rate."""
        exchange_rate = self.get_object()
        
        if not request.user.role in ['super_admin', 'tenant_admin', 'supervisor']:
            return Response(
                {'error': 'Permission denied. Only supervisors can lock rates.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        exchange_rate.is_locked = True
        exchange_rate.approved_by = request.user
        exchange_rate.save()
        
        return Response(ExchangeRateSerializer(exchange_rate).data)


class TenantCurrencyViewSet(viewsets.ModelViewSet):
    """Tenant currency settings viewset."""
    serializer_class = TenantCurrencySerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = TenantCurrency.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    def perform_create(self, serializer):
        """Create tenant currency with tenant."""
        serializer.save(tenant=self.request.tenant)
    
    @action(detail=False, methods=['get'])
    def enabled(self, request):
        """Get enabled currencies for tenant."""
        currencies = self.get_queryset().filter(is_enabled=True).order_by('-is_default', 'currency__sort_order')
        return Response(TenantCurrencySerializer(currencies, many=True).data)


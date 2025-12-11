"""
Subscription management views.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Subscription, TenantModule, Invoice, Payment
from .serializers import (
    SubscriptionSerializer, TenantModuleSerializer,
    InvoiceSerializer, PaymentSerializer, PackageSerializer
)
from core.models import Package, Module
from core.utils import get_tenant_from_request


class SubscriptionViewSet(viewsets.ModelViewSet):
    """Subscription management."""
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant, or show all for super_admin."""
        queryset = Subscription.objects.all().order_by('-created_at')
        # Super admin can see all subscriptions
        if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
            tenant_id = self.request.query_params.get('tenant')
            if tenant_id:
                queryset = queryset.filter(tenant_id=tenant_id)
        else:
            tenant = get_tenant_from_request(self.request)
            if tenant:
                queryset = queryset.filter(tenant=tenant)
        return queryset
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current tenant subscription."""
        # Try to get tenant from request (set by middleware or from user)
        tenant = get_tenant_from_request(request)
        
        if not tenant:
            # If no tenant and user is super_admin, check for tenant query param
            if request.user.is_authenticated and hasattr(request.user, 'role') and request.user.role == 'super_admin':
                tenant_id = request.query_params.get('tenant')
                if tenant_id:
                    from core.models import Tenant
                    try:
                        tenant = Tenant.objects.get(id=tenant_id)
                    except Tenant.DoesNotExist:
                        return Response(
                            {'error': 'Tenant not found.'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    return Response(
                        {'error': 'Tenant is required. Please provide tenant ID in query params for super_admin.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Regular user without tenant - return null/404 instead of 400
                return Response(
                    {'error': 'No subscription found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        try:
            subscription = Subscription.objects.get(tenant=tenant)
            return Response(SubscriptionSerializer(subscription).data)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No subscription found.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def enabled_modules(self, request):
        """Get enabled modules for current tenant."""
        tenant = get_tenant_from_request(request)
        
        if not tenant:
            return Response([])
        
        modules = TenantModule.objects.filter(tenant=tenant).select_related('module')
        return Response(TenantModuleSerializer(modules, many=True).data)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get subscription history for tenant."""
        # Super admin can filter by tenant query param or see all
        if request.user.is_authenticated and hasattr(request.user, 'role') and request.user.role == 'super_admin':
            tenant_id = request.query_params.get('tenant')
            if tenant_id:
                subscriptions = Subscription.objects.filter(
                    tenant_id=tenant_id
                ).select_related('package', 'tenant').order_by('-created_at')
            else:
                subscriptions = Subscription.objects.all().select_related('package', 'tenant').order_by('-created_at')
        else:
            # Try to get tenant from request (set by middleware or from user)
            tenant = get_tenant_from_request(request)
            
            if tenant:
                subscriptions = Subscription.objects.filter(
                    tenant=tenant
                ).select_related('package', 'tenant').order_by('-created_at')
            else:
                # No tenant found - return empty array instead of error for better UX
                return Response([])
        
        return Response(SubscriptionSerializer(subscriptions, many=True).data)


class PackageViewSet(viewsets.ModelViewSet):
    """Package management. Read-only for public, full CRUD for super_admin."""
    queryset = Package.objects.all().prefetch_related('modules').order_by('sort_order', 'price_monthly')
    serializer_class = PackageSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """Return active packages for public, all for super_admin."""
        queryset = super().get_queryset()
        # Super admin can see all packages (active and inactive)
        if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
            return queryset
        # Public users only see active packages
        return queryset.filter(is_active=True)
    
    def get_permissions(self):
        """Require super_admin for write operations."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from accounts.permissions import IsSuperAdmin
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return [permissions.AllowAny()]


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Invoice viewset."""
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant, or show all for super_admin."""
        queryset = Invoice.objects.all().order_by('-created_at')
        # Super admin can see all invoices
        if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
            tenant_id = self.request.query_params.get('tenant')
            if tenant_id:
                queryset = queryset.filter(tenant_id=tenant_id)
        elif hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue invoices."""
        queryset = self.get_queryset().filter(
            status__in=['pending', 'overdue'],
            due_date__lt=timezone.now().date()
        )
        return Response(InvoiceSerializer(queryset, many=True).data)


class PaymentViewSet(viewsets.ModelViewSet):
    """Payment viewset."""
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant, or show all for super_admin."""
        queryset = Payment.objects.all().order_by('-created_at')
        # Super admin can see all payments
        if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
            tenant_id = self.request.query_params.get('tenant')
            if tenant_id:
                queryset = queryset.filter(tenant_id=tenant_id)
        elif hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    def perform_create(self, serializer):
        """Set tenant and auto-generate receipt when payment is completed."""
        from django.utils import timezone
        from .invoice_service import create_payment_receipt
        
        # Auto-assign tenant if not provided
        if hasattr(self.request, 'tenant') and self.request.tenant:
            serializer.save(tenant=self.request.tenant)
        else:
            serializer.save()
        
        # If payment is completed, generate receipt
        payment = serializer.instance
        if payment.status == 'completed':
            try:
                create_payment_receipt(payment)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create payment receipt: {str(e)}")
    
    @action(detail=False, methods=['get'])
    def failed(self, request):
        """Get failed payments."""
        queryset = self.get_queryset().filter(status='failed')
        return Response(PaymentSerializer(queryset, many=True).data)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get payment history."""
        queryset = self.get_queryset().order_by('-created_at')
        return Response(PaymentSerializer(queryset, many=True).data)


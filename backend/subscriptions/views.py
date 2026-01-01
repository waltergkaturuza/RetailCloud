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
    
    def update(self, request, *args, **kwargs):
        """Update subscription (upgrade/downgrade package)."""
        try:
            subscription = self.get_object()
            tenant = get_tenant_from_request(request)
            
            # Verify tenant owns this subscription (unless super_admin)
            if not (request.user.is_authenticated and hasattr(request.user, 'role') and request.user.role == 'super_admin'):
                if subscription.tenant != tenant:
                    return Response(
                        {'error': 'Permission denied.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            package_id = request.data.get('package')
            billing_cycle = request.data.get('billing_cycle', subscription.billing_cycle)
            payment_data = request.data.get('payment_data')
            
            # Get new package
            if package_id:
                try:
                    new_package = Package.objects.get(id=package_id, is_active=True)
                except Package.DoesNotExist:
                    return Response(
                        {'error': 'Package not found or inactive.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Process payment if provided
                if payment_data:
                    from core.payment_gateway import process_subscription_payment
                    from .models import Payment
                    
                    amount = new_package.price_yearly if billing_cycle == 'yearly' else new_package.price_monthly
                    
                    payment_success, payment_result = process_subscription_payment(
                        tenant_id=subscription.tenant.id,
                        package_id=new_package.id,
                        amount=amount,
                        currency=new_package.currency,
                        payment_data=payment_data,
                        billing_cycle=billing_cycle
                    )
                    
                    if not payment_success:
                        return Response(
                            {'error': 'Payment processing failed. Please try again.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Create payment record
                    Payment.objects.create(
                        tenant=subscription.tenant,
                        subscription=subscription,
                        amount=amount,
                        currency=new_package.currency,
                        payment_method=payment_data.get('payment_method', 'card'),
                        status='completed',
                        transaction_id=payment_result.get('transaction_id', ''),
                        paid_at=timezone.now(),
                    )
                
                # Update subscription
                subscription.package = new_package
                subscription.billing_cycle = billing_cycle
                
                # Calculate new period
                now = timezone.now()
                subscription.current_period_start = now
                if billing_cycle == 'yearly':
                    subscription.current_period_end = now + timedelta(days=365)
                else:
                    subscription.current_period_end = now + timedelta(days=30)
                
                # Activate subscription if payment was processed
                if payment_data:
                    subscription.status = 'active'
                
                subscription.save()
                
                return Response(SubscriptionSerializer(subscription).data)
            
            # If no package change, just update billing cycle
            subscription.billing_cycle = billing_cycle
            subscription.save()
            
            return Response(SubscriptionSerializer(subscription).data)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating subscription: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while updating subscription.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
        try:
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
                # Auto-create a default trial subscription if none exists
                from core.models import Package
                from datetime import timedelta
                
                # Get default package or first active package
                package = Package.objects.filter(is_active=True).order_by('sort_order', 'price_monthly').first()
                
                if not package:
                    return Response(
                        {'error': 'No subscription found and no active packages available.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Create default trial subscription
                now = timezone.now()
                subscription = Subscription.objects.create(
                    tenant=tenant,
                    package=package,
                    billing_cycle=tenant.subscription_type or 'monthly',
                    status='trial',
                    current_period_start=now,
                    current_period_end=now + timedelta(days=7),  # 7-day trial
                )
                
                return Response(SubscriptionSerializer(subscription).data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in current subscription endpoint: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching subscription.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        try:
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
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in subscription history endpoint: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching subscription history.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
        try:
            queryset = Invoice.objects.all().order_by('-created_at')
            # Super admin can see all invoices
            if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
                tenant_id = self.request.query_params.get('tenant')
                if tenant_id:
                    queryset = queryset.filter(tenant_id=tenant_id)
            elif hasattr(self.request, 'tenant') and self.request.tenant:
                queryset = queryset.filter(tenant=self.request.tenant)
            else:
                # No tenant context - return empty queryset for regular users
                queryset = queryset.none()
            return queryset
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in InvoiceViewSet.get_queryset: {str(e)}", exc_info=True)
            return Invoice.objects.none()
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue invoices."""
        try:
            queryset = self.get_queryset().filter(
                status__in=['pending', 'overdue'],
                due_date__lt=timezone.now().date()
            )
            return Response(InvoiceSerializer(queryset, many=True).data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in overdue invoices endpoint: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching overdue invoices.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentViewSet(viewsets.ModelViewSet):
    """Payment viewset."""
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant, or show all for super_admin."""
        try:
            queryset = Payment.objects.all().order_by('-created_at')
            # Super admin can see all payments
            if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
                tenant_id = self.request.query_params.get('tenant')
                if tenant_id:
                    queryset = queryset.filter(tenant_id=tenant_id)
            elif hasattr(self.request, 'tenant') and self.request.tenant:
                queryset = queryset.filter(tenant=self.request.tenant)
            else:
                # No tenant context - return empty queryset for regular users
                queryset = queryset.none()
            return queryset
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in PaymentViewSet.get_queryset: {str(e)}", exc_info=True)
            return Payment.objects.none()
    
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
        try:
            queryset = self.get_queryset().filter(status='failed')
            return Response(PaymentSerializer(queryset, many=True).data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in failed payments endpoint: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching failed payments.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get payment history."""
        try:
            queryset = self.get_queryset().order_by('-created_at')
            return Response(PaymentSerializer(queryset, many=True).data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in payment history endpoint: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching payment history.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


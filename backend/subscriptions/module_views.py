"""
API views for module activation management.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import TenantModule
from .serializers import TenantModuleSerializer
from .module_activation_service import (
    request_module_activation,
    approve_module_activation,
    can_activate_module
)
from core.models import Module, Tenant
from core.owner_permissions import IsSuperAdmin
from core.utils import get_tenant_from_request


class TenantModuleViewSet(viewsets.ModelViewSet):
    """Manage tenant module activations."""
    serializer_class = TenantModuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant, or return all for super_admin."""
        queryset = TenantModule.objects.select_related('module', 'tenant', 'activated_by').all()
        
        # Super admin can see all modules
        if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
            # Apply search filter if provided
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(tenant__company_name__icontains=search) |
                    Q(module__name__icontains=search) |
                    Q(module__code__icontains=search)
                )
            return queryset
        
        # Regular tenants only see their own modules
        tenant = getattr(self.request, 'tenant', None)
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            # If no tenant context, return empty queryset for regular users
            queryset = queryset.none()
        return queryset
    
    @action(detail=False, methods=['get'])
    def recommended(self, request):
        """Get recommended modules based on tenant's business category."""
        try:
            tenant = self._get_tenant(request)
            if not tenant or not tenant.business_category:
                return Response({
                    'recommended': [],
                    'category': None,
                    'message': 'No business category selected'
                })
            
            from core.category_services import get_category_recommendations
            recommendations = get_category_recommendations(category_id=tenant.business_category.id)
            
            if not recommendations:
                return Response({
                    'recommended': [],
                    'category': None,
                    'message': 'No recommendations available for this category'
                })
            
            # Check which modules are already requested/activated
            existing_modules = TenantModule.objects.filter(
                tenant=tenant
            ).values_list('module__code', flat=True)
            
            # Get module IDs for codes
            recommended_modules = recommendations.get('recommended_modules', [])
            if not recommended_modules:
                return Response({
                    'recommended': [],
                    'category': recommendations.get('category'),
                    'message': 'No modules configured for this category'
                })
            
            module_codes = [mod['code'] for mod in recommended_modules]
            module_objects = Module.objects.filter(code__in=module_codes)
            module_map = {mod.code: mod for mod in module_objects}
            
            # Import serializer to get full module details
            from .serializers import ModuleSerializer
            
            recommended = []
            for mod in recommended_modules:
                is_requested = mod['code'] in existing_modules
                module_obj = module_map.get(mod['code'])
                
                # Get full module details if available
                module_data = mod.copy()  # Start with basic data
                if module_obj:
                    module_serializer = ModuleSerializer(module_obj)
                    module_data.update(module_serializer.data)
                    module_data['module_id'] = module_obj.id
                else:
                    module_data['module_id'] = None
                
                module_data.update({
                    'is_requested': is_requested,
                    'can_request': not is_requested
                })
                
                recommended.append(module_data)
            
            return Response({
                'recommended': recommended,
                'category': recommendations.get('category')
            })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in recommended endpoint: {str(e)}", exc_info=True)
            return Response({
                'recommended': [],
                'category': None,
                'error': str(e),
                'message': 'Error fetching recommendations'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def request_activation(self, request):
        """Request activation of one or more modules."""
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        module_ids = request.data.get('module_ids', [])
        module_codes = request.data.get('module_codes', [])
        period_months = request.data.get('period_months', 1)  # Default to monthly
        payment_type = request.data.get('payment_type', 'trial')  # Default to trial
        
        # Validate period_months
        if period_months not in [1, 12]:
            return Response(
                {'error': 'period_months must be 1 (monthly) or 12 (yearly)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Support both module_ids and module_codes
        if not module_ids and not module_codes:
            return Response(
                {'error': 'module_ids or module_codes required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If codes provided, convert to IDs
        if module_codes and not module_ids:
            modules = Module.objects.filter(code__in=module_codes)
            if modules.count() != len(module_codes):
                return Response(
                    {'error': 'Some modules not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            modules = Module.objects.filter(id__in=module_ids)
            if modules.count() != len(module_ids):
                return Response(
                    {'error': 'Some modules not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        results = []
        for module in modules:
            result = request_module_activation(
                tenant, 
                module, 
                requested_by=request.user,
                period_months=period_months,
                payment_type=payment_type
            )
            results.append({
                'module': {
                    'id': module.id,
                    'code': module.code,
                    'name': module.name
                },
                'success': result['success'],
                'status': result['tenant_module'].status,
                'message': result['message'],
                'requires_approval': result.get('requires_approval', False),
                'can_activate': result.get('can_activate', False),
                'pricing': result.get('pricing', {})
            })
        
        return Response({
            'results': results,
            'message': f'Processed {len(results)} module activation request(s)'
        })
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve module activation (owner/admin only)."""
        try:
            tenant_module = self.get_object()
        except TenantModule.DoesNotExist:
            return Response(
                {'error': 'Module activation request not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permission (owner or tenant admin)
        if not (request.user.role == 'super_admin' or 
                (hasattr(request, 'tenant') and request.tenant == tenant_module.tenant)):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        payment_type = request.data.get('payment_type', 'paid')
        period_months = request.data.get('period_months', tenant_module.activation_period_months or 1)
        
        # Update period if provided
        if period_months and period_months != tenant_module.activation_period_months:
            tenant_module.activation_period_months = period_months
            from core.pricing_service import calculate_module_pricing
            from datetime import timedelta
            pricing = calculate_module_pricing(tenant_module.tenant, tenant_module.module, period_months)
            tenant_module.price_monthly = pricing['price_monthly']
            tenant_module.price_yearly = pricing['price_yearly']
            tenant_module.actual_price = pricing['actual_price']
            tenant_module.currency = pricing['currency']
            tenant_module.expires_at = tenant_module.activated_at + timedelta(days=30 * period_months) if tenant_module.activated_at else None
        
        result = approve_module_activation(tenant_module, request.user, payment_type=payment_type)
        
        if result['success']:
            # Refresh from DB
            tenant_module.refresh_from_db()
            return Response({
                'success': True,
                'message': result['message'],
                'tenant_module': TenantModuleSerializer(tenant_module).data
            })
        else:
            return Response(
                {'error': result['message']},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def pricing_summary(self, request):
        """Get pricing summary for tenant (current usage and costs)."""
        from core.pricing_service import get_pricing_summary
        
        tenant = self._get_tenant(request)
        if not tenant:
            # Return empty/default summary instead of 404 for better UX
            return Response({
                'total_monthly': 0,
                'total_yearly': 0,
                'currency': 'USD',
                'modules': [],
                'breakdown': []
            })
        
        summary = get_pricing_summary(tenant)
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """Get modules pending approval (owner/admin only)."""
        if request.user.role != 'super_admin':
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        pending = TenantModule.objects.filter(
            status__in=['pending', 'requires_payment'],
            requires_owner_approval=True
        ).select_related('tenant', 'module', 'activated_by')
        
        return Response(TenantModuleSerializer(pending, many=True).data)
    
    def _get_tenant(self, request):
        """Get tenant from request."""
        return get_tenant_from_request(request)


"""
Views for pricing models - accessible to both tenants and owners.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .pricing_models import PricingRule, ModulePricing
from .pricing_serializers import PricingRuleSerializer, PricingRuleListSerializer, ModulePricingSerializer
from .pricing_service import get_active_pricing_rule
from .owner_permissions import IsSuperAdmin
from .utils import get_tenant_from_request


class PricingRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pricing rules.
    - Owners can CRUD all pricing rules
    - Tenants can view active pricing rules only
    """
    queryset = PricingRule.objects.all().prefetch_related('module_pricing__module').order_by('-is_default', '-created_at')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PricingRuleListSerializer
        return PricingRuleSerializer
    
    def get_queryset(self):
        """Filter based on user role."""
        queryset = super().get_queryset()
        
        # Owners can see all pricing rules
        if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
            return queryset
        
        # Tenants can only see active pricing rules
        return queryset.filter(is_active=True)
    
    def get_permissions(self):
        """Owners can create/update/delete, tenants can only view."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsSuperAdmin()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active pricing rule."""
        try:
            pricing_rule = get_active_pricing_rule()
            if not pricing_rule:
                return Response(
                    {'error': 'No active pricing rule found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = self.get_serializer(pricing_rule)
            return Response(serializer.data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in active pricing rule endpoint: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching pricing rule.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def modules(self, request, pk=None):
        """Get all module pricing overrides for this rule."""
        pricing_rule = self.get_object()
        module_pricing = pricing_rule.module_pricing.all().select_related('module')
        serializer = ModulePricingSerializer(module_pricing, many=True)
        return Response(serializer.data)


class ModulePricingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing module pricing overrides.
    - Owners can CRUD module pricing
    - Tenants can view module pricing for active pricing rules
    """
    queryset = ModulePricing.objects.all().select_related('module', 'pricing_rule')
    serializer_class = ModulePricingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter based on user role."""
        queryset = super().get_queryset()
        
        # Owners can see all module pricing
        if self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin':
            pricing_rule_id = self.request.query_params.get('pricing_rule')
            if pricing_rule_id:
                queryset = queryset.filter(pricing_rule_id=pricing_rule_id)
            return queryset
        
        # Tenants can only see module pricing for active pricing rules
        return queryset.filter(pricing_rule__is_active=True)
    
    def get_permissions(self):
        """Owners can create/update/delete, tenants can only view."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsSuperAdmin()]
        return [IsAuthenticated()]



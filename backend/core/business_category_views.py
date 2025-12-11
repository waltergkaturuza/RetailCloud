"""
Views for business category management and module activation.
"""
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from .business_category_models import BusinessCategory
from .business_category_serializers import (
    BusinessCategorySerializer,
    BusinessCategoryListSerializer,
    TenantCategoryUpdateSerializer
)
from .category_services import (
    activate_modules_for_category,
    get_category_recommendations,
    suggest_category_by_keywords
)
from .models import Tenant
from .industry_category_defaults import get_default_categories_for_industry
from inventory.models import Category
from .utils import get_tenant_from_request


def _create_default_categories_for_tenant(tenant: Tenant, category_code: str):
    """Create default product categories for a tenant based on their business category."""
    default_categories = get_default_categories_for_industry(category_code)
    
    # Get existing category codes for this tenant
    existing_codes = set(
        Category.objects.filter(tenant=tenant).values_list('code', flat=True)
    )
    
    created_count = 0
    # Create categories that don't exist
    for cat_data in default_categories:
        code = cat_data.get('code', '').upper()
        
        # Skip if category with this code already exists
        if code in existing_codes:
            continue
        
        # Check if category with same name exists (to avoid duplicates)
        if Category.objects.filter(tenant=tenant, name=cat_data['name']).exists():
            continue
        
        Category.objects.create(
            tenant=tenant,
            name=cat_data['name'],
            code=code,
            description=cat_data.get('description', ''),
            is_active=True,
            sort_order=len(existing_codes) + created_count + 1
        )
        existing_codes.add(code)
        created_count += 1
    
    return created_count


class BusinessCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for listing and retrieving business categories."""
    queryset = BusinessCategory.objects.filter(is_active=True).order_by('sort_order', 'name')
    permission_classes = [AllowAny]  # Allow public access for registration
    pagination_class = None  # Disable pagination for categories list
    
    def get_serializer_class(self):
        if self.action == 'list':
            return BusinessCategoryListSerializer
        return BusinessCategorySerializer
    
    @action(detail=True, methods=['get'])
    def recommendations(self, request, pk=None):
        """Get module recommendations for a category."""
        category = self.get_object()
        recommendations = get_category_recommendations(category_id=category.id)
        
        if not recommendations:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(recommendations)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def suggest(self, request):
        """Suggest business categories based on keywords. Public endpoint for signup."""
        keywords = request.data.get('keywords', '')
        description = request.data.get('description', '')
        
        # Combine keywords and description
        search_text = f"{keywords} {description}".strip()
        
        if not search_text:
            return Response(
                {'error': 'Keywords or description required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        suggestions = suggest_category_by_keywords(search_text)
        
        return Response({
            'query': search_text,
            'suggestions': suggestions
        })


class TenantCategoryView(views.APIView):
    """View for updating tenant's business category and auto-activating modules."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current tenant's business category."""
        tenant = self._get_tenant(request)
        if not tenant:
            # Return null category instead of 404 for better UX
            return Response({
                'category': None,
                'custom_category_name': None
            })
        
        if tenant.business_category:
            serializer = BusinessCategorySerializer(tenant.business_category)
            return Response({
                'category': serializer.data,
                'custom_category_name': tenant.custom_category_name
            })
        
        return Response({
            'category': None,
            'custom_category_name': tenant.custom_category_name
        })
    
    def post(self, request):
        """Update tenant's business category and optionally activate modules."""
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TenantCategoryUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        category_id = data['business_category_id']
        
        try:
            category = BusinessCategory.objects.get(id=category_id, is_active=True)
        except BusinessCategory.DoesNotExist:
            return Response(
                {'error': 'Business category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Store old category to check if it changed
        old_category = tenant.business_category
        
        with transaction.atomic():
            # Update tenant's category
            if category:
                tenant.business_category = category
                tenant.custom_category_name = data.get('custom_category_name', '')
            else:
                tenant.custom_category_name = data.get('custom_category_name', '')
            
            tenant.save()
            
            # Auto-create default product categories if category changed or is new
            categories_created = 0
            if category and (not old_category or old_category.id != category.id):
                categories_created = _create_default_categories_for_tenant(tenant, category.code)
            
            # Auto-activate modules if requested (default to False - only recommend)
            auto_activate = data.get('auto_activate_modules', False)
            modules_activated = {}
            if category:
                try:
                    # Activate modules - this uses its own transaction but should work fine
                    modules_activated = activate_modules_for_category(
                        tenant=tenant,
                        category=category,
                        auto_activate=True
                    )
                    # Verify modules were actually created
                    from subscriptions.models import TenantModule
                    actual_count = TenantModule.objects.filter(tenant=tenant).count()
                    if modules_activated.get('activated') and len(modules_activated['activated']) > 0:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.info(f"Modules activation result: {len(modules_activated['activated'])} activated, {actual_count} total in DB")
                except Exception as e:
                    # Log error but don't fail the category update
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error activating modules: {str(e)}", exc_info=True)
                    modules_activated = {
                        'success': False,
                        'error': str(e),
                        'activated': [],
                        'skipped': []
                    }
        
        # Get updated category info
        serializer = BusinessCategorySerializer(category)
        
        # Build message
        message_parts = [f'Business category updated to {category.name}']
        
        if categories_created > 0:
            message_parts.append(f'{categories_created} default product categories created')
        
        if modules_activated and isinstance(modules_activated, dict):
            activated_count = len(modules_activated.get('activated', []))
            if activated_count > 0:
                message_parts.append(f'{activated_count} module(s) activated')
        
        message = '. '.join(message_parts) + '.'
        
        return Response({
            'category': serializer.data,
            'message': message,
            'categories_created': categories_created,
            'modules_activated': modules_activated or {}
        })
    
    def _get_tenant(self, request):
        """Get tenant from request."""
        return get_tenant_from_request(request)

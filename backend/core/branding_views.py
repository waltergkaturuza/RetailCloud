"""
Views for Tenant Branding Settings.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Tenant
from .branding_serializers import TenantBrandingSerializer
from .utils import get_tenant_from_request


class TenantBrandingView(views.APIView):
    """View for managing tenant branding (logo and signatures)."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current tenant's branding settings."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TenantBrandingSerializer(tenant, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request):
        """Update tenant branding settings."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions - only tenant_admin, manager, or super_admin can update branding
        user_role = request.user.role
        if user_role not in ['tenant_admin', 'manager', 'super_admin']:
            return Response(
                {'error': 'You do not have permission to update branding settings.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TenantBrandingSerializer(
            tenant,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request):
        """Delete a specific branding asset."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions
        user_role = request.user.role
        if user_role not in ['tenant_admin', 'manager', 'super_admin']:
            return Response(
                {'error': 'You do not have permission to delete branding assets.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        asset_type = request.data.get('asset_type')
        if asset_type == 'logo':
            tenant.logo.delete(save=False)
            tenant.logo = None
            tenant.save()
        elif asset_type == 'manager_signature':
            tenant.manager_signature.delete(save=False)
            tenant.manager_signature = None
            tenant.save()
        elif asset_type == 'approved_by_signature':
            tenant.approved_by_signature.delete(save=False)
            tenant.approved_by_signature = None
            tenant.save()
        elif asset_type == 'prepared_by_signature':
            tenant.prepared_by_signature.delete(save=False)
            tenant.prepared_by_signature = None
            tenant.save()
        else:
            return Response(
                {'error': 'Invalid asset_type. Must be one of: logo, manager_signature, approved_by_signature, prepared_by_signature'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TenantBrandingSerializer(tenant, context={'request': request})
        return Response(serializer.data)




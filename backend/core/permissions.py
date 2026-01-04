"""
Permission classes for core functionality.
"""
from rest_framework import permissions
from core.utils import get_tenant_from_request


class HasModuleAccess(permissions.BasePermission):
    """
    Permission class to check if tenant has access to a specific module.
    Requires the ViewSet to define a 'required_module' attribute.
    """
    message = 'This module is not activated for your account.'
    
    def has_permission(self, request, view):
        # Allow super_admin (owners) to access everything
        if request.user.is_authenticated and hasattr(request.user, 'role') and request.user.role == 'super_admin':
            return True
        
        # Get the required module from the view
        required_module = getattr(view, 'required_module', None)
        if not required_module:
            return True  # If no module required, allow access
        
        # Get tenant from request
        tenant = get_tenant_from_request(request)
        if not tenant:
            return False
        
        # Check if tenant has this module activated
        from subscriptions.models import TenantModule
        try:
            tenant_module = TenantModule.objects.filter(
                tenant=tenant,
                module__code=required_module,
                status__in=['active', 'trial']
            ).exists()
            return tenant_module
        except:
            return False


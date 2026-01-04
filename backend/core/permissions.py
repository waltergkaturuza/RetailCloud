"""
Permission classes for core functionality.
"""
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
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
            self.message = 'Tenant not found in request.'
            return False
        
        # Check if tenant has this module activated
        from subscriptions.models import TenantModule
        from core.models import Module
        try:
            # First check if module exists
            try:
                module = Module.objects.get(code=required_module)
            except Module.DoesNotExist:
                self.message = f"Module '{required_module}' is not configured in the system."
                return False
            
            # Check if tenant has this module activated
            tenant_module = TenantModule.objects.filter(
                tenant=tenant,
                module__code=required_module,
                status__in=['active', 'trial']
            ).first()
            
            if not tenant_module:
                self.message = f"The '{module.name}' module is not activated for your account. Please activate it in Settings > Modules to use this feature."
                return False
            
            # Check if module is expired (for trial modules)
            if tenant_module.status == 'trial' and tenant_module.expires_at:
                from django.utils import timezone
                if timezone.now() > tenant_module.expires_at:
                    self.message = f"The '{module.name}' module trial has expired. Please activate it to continue using this feature."
                    return False
            
            return True
        except Exception as e:
            # Log error but don't expose it to user
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error checking module access: {str(e)}")
            self.message = 'An error occurred while checking module access.'
            return False


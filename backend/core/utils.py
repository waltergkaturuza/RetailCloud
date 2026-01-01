"""
Utility functions for core app.
"""
from accounts.models import User


def get_tenant_from_request(request):
    """
    Get tenant from request object.
    Checks multiple sources in order:
    1. request.tenant (set by middleware)
    2. Authenticated user's tenant relationship
    
    Args:
        request: Django request object
        
    Returns:
        Tenant instance or None
    """
    # Method 1: Get from request.tenant (set by middleware)
    if hasattr(request, 'tenant') and request.tenant:
        return request.tenant
    
    # Method 2: Get from authenticated user
    if request.user.is_authenticated:
        try:
            # Refresh user from DB to get tenant relationship
            user = User.objects.select_related('tenant').get(pk=request.user.pk)
            if user.tenant:
                # Also set it on request for consistency
                request.tenant = user.tenant
                return user.tenant
        except (User.DoesNotExist, AttributeError):
            pass
    
    return None




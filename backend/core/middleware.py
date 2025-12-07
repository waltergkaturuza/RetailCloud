"""
Middleware for tenant context and request handling.
"""
from django.utils.deprecation import MiddlewareMixin
from django.http import Http404
from .models import Tenant


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to set tenant context from request.
    Can extract tenant from subdomain, header, or user's tenant.
    """
    
    def process_request(self, request):
        """Set tenant on request object."""
        tenant = None
        
        # Method 1: Get from subdomain
        host = request.get_host().split(':')[0]
        subdomain = host.split('.')[0]
        if subdomain and subdomain not in ['www', 'api', 'admin']:
            try:
                tenant = Tenant.objects.get(slug=subdomain, is_active=True)
            except Tenant.DoesNotExist:
                pass
        
        # Method 2: Get from header (for API calls)
        if not tenant:
            tenant_header = request.headers.get('X-Tenant-ID')
            if tenant_header:
                try:
                    tenant = Tenant.objects.get(slug=tenant_header, is_active=True)
                except Tenant.DoesNotExist:
                    pass
        
        # Method 3: Get from authenticated user
        if not tenant and request.user.is_authenticated:
            if hasattr(request.user, 'tenant'):
                tenant = request.user.tenant
        
        # Check subscription status
        if tenant:
            if not tenant.is_subscription_active:
                # Allow access to billing/subscription pages only
                allowed_paths = [
                    '/api/subscriptions/',
                    '/api/auth/logout/',
                ]
                if not any(request.path.startswith(path) for path in allowed_paths):
                    # In production, redirect to subscription page
                    pass
        
        request.tenant = tenant
        return None


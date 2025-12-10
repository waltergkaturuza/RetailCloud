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
        # Note: JWT authentication happens in DRF views, not middleware,
        # so request.user might be AnonymousUser here. We'll handle this in views.
        if not tenant:
            # Check if user is authenticated (this works for session auth, but not always for JWT)
            if hasattr(request, 'user') and request.user.is_authenticated:
                # For regular users, get tenant from user.tenant
                # Need to refresh from DB to get relationship
                try:
                    from accounts.models import User
                    user = User.objects.select_related('tenant').get(pk=request.user.pk)
                    if user.tenant:
                        tenant = user.tenant
                except (User.DoesNotExist, AttributeError):
                    pass
        
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


"""
Permission classes for Owner/Super Admin access control.
"""
from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Only allow super_admin role users."""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'super_admin' and
            request.user.tenant is None  # System owners don't belong to a tenant
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow read-only to authenticated users, full access to owners."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'super_admin' and
            request.user.tenant is None
        )


class IsOwnerOrTenantAdmin(permissions.BasePermission):
    """Allow access to owners and tenant admins."""
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # System owner
        if request.user.role == 'super_admin' and request.user.tenant is None:
            return True
        
        # Tenant admin
        if request.user.role == 'tenant_admin':
            return True
        
        return False





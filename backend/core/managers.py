"""
Custom managers for tenant-scoped queries.
"""
from django.db import models


class TenantManager(models.Manager):
    """Manager that automatically filters by tenant."""
    
    def get_queryset(self):
        """Override to filter by tenant from thread-local storage."""
        from .context import get_current_tenant
        tenant = get_current_tenant()
        if tenant:
            return super().get_queryset().filter(tenant=tenant)
        return super().get_queryset()


class TenantQuerySet(models.QuerySet):
    """QuerySet that filters by tenant."""
    
    def for_tenant(self, tenant):
        """Filter by specific tenant."""
        return self.filter(tenant=tenant)


def tenant_filtered_manager():
    """Factory function to create tenant-aware managers."""
    return TenantManager.from_queryset(TenantQuerySet)()





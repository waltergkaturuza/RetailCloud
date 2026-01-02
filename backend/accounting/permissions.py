"""
Permissions and utilities for accounting module access control.
"""
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from subscriptions.models import TenantModule
from core.models import Module
from core.utils import get_tenant_from_request


def has_accounting_module(request):
    """
    Check if the tenant has the accounting module activated.
    
    Returns:
        tuple: (has_module: bool, tenant_module: TenantModule or None, message: str)
    """
    tenant = get_tenant_from_request(request)
    if not tenant:
        return False, None, "Tenant not found"
    
    try:
        # Find accounting module by code
        accounting_module = Module.objects.get(code='accounting')
    except Module.DoesNotExist:
        return False, None, "Accounting module not configured in system"
    
    try:
        tenant_module = TenantModule.objects.get(
            tenant=tenant,
            module=accounting_module,
            status__in=['active', 'trial']
        )
        return True, tenant_module, "Accounting module is active"
    except TenantModule.DoesNotExist:
        return False, None, "Accounting module is not activated. Please activate it to use double-entry bookkeeping features."
    except TenantModule.MultipleObjectsReturned:
        tenant_module = TenantModule.objects.filter(
            tenant=tenant,
            module=accounting_module,
            status__in=['active', 'trial']
        ).first()
        return True, tenant_module, "Accounting module is active"


class HasAccountingModule(BasePermission):
    """Permission class to check if tenant has accounting module activated."""
    
    def has_permission(self, request, view):
        has_module, _, message = has_accounting_module(request)
        if not has_module:
            raise PermissionDenied(message)
        return has_module


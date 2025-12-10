"""
Thread-local context for storing current tenant.
"""
import threading

_context = threading.local()


def set_current_tenant(tenant):
    """Set the current tenant in thread-local storage."""
    _context.tenant = tenant


def get_current_tenant():
    """Get the current tenant from thread-local storage."""
    return getattr(_context, 'tenant', None)


def clear_current_tenant():
    """Clear the current tenant from thread-local storage."""
    if hasattr(_context, 'tenant'):
        delattr(_context, 'tenant')



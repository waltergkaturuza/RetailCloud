"""
Service for managing module activation requests and approvals.
"""
from django.db import transaction
from django.utils import timezone
from .models import TenantModule
from core.models import Tenant, Module
from subscriptions.models import Subscription, Payment


def can_activate_module(tenant, module):
    """
    Check if a module can be activated for a tenant.
    
    Returns:
        tuple: (can_activate: bool, reason: str, requires_payment: bool, requires_approval: bool)
    """
    # Check if tenant has active trial
    if tenant.subscription_status == 'trial':
        if tenant.trial_ends_at and timezone.now() < tenant.trial_ends_at:
            return True, 'trial_active', False, False
    
    # Check if tenant has active subscription
    if tenant.subscription_status == 'active':
        if tenant.subscription_ends_at and timezone.now() < tenant.subscription_ends_at:
            return True, 'subscription_active', False, False
        return False, 'subscription_expired', True, False
    
    # Check if tenant has paid invoices for modules
    # For now, we'll check if there's a subscription record with active status
    try:
        subscription = tenant.subscription
        if subscription and subscription.is_active:
            return True, 'subscription_active', False, False
    except Subscription.DoesNotExist:
        pass
    
    # If trial expired or no subscription, check for recent payments
    recent_payments = Payment.objects.filter(
        tenant=tenant,
        status='completed',
        paid_at__gte=timezone.now() - timezone.timedelta(days=30)
    ).exists()
    
    if recent_payments:
        return True, 'payment_received', False, True  # May need owner approval
    
    # Default: requires payment or approval
    return False, 'requires_payment', True, True


def request_module_activation(tenant, module, requested_by=None, period_months=1, payment_type='trial'):
    """
    Request activation of a module for a tenant.
    Creates a TenantModule record with 'pending' status.
    
    Args:
        tenant: Tenant instance
        module: Module instance
        requested_by: User who requested the activation
        period_months: Activation period in months (1 for monthly, 12 for yearly)
        payment_type: Payment type ('trial', 'paid', 'debt', 'complimentary')
    
    Returns:
        dict: {
            'success': bool,
            'tenant_module': TenantModule instance,
            'can_activate': bool,
            'reason': str,
            'requires_approval': bool,
            'pricing': dict  # Pricing information
        }
    """
    from core.pricing_service import calculate_module_pricing
    
    # Calculate pricing
    pricing = calculate_module_pricing(tenant, module, period_months)
    # Check if module is already requested/activated
    existing = TenantModule.objects.filter(tenant=tenant, module=module).first()
    if existing:
        can_act, reason, req_payment, req_approval = can_activate_module(tenant, module)
        
        # If it's pending but can now activate, update status
        # BUT don't set activated_by - that should only be set when owner approves
        if existing.status == 'pending' and can_act:
            existing.status = 'trial' if reason == 'trial_active' else 'active'
            existing.enabled_at = timezone.now()
            # Don't set activated_by here - only set when owner explicitly approves
            # existing.activated_by = requested_by
            existing.save()
            return {
                'success': True,
                'tenant_module': existing,
                'can_activate': True,
                'reason': reason,
                'requires_approval': req_approval,
                'message': 'Module activated successfully'
            }
        
        return {
            'success': False,
            'tenant_module': existing,
            'can_activate': can_act,
            'reason': reason,
            'requires_approval': req_approval,
            'message': f'Module already {existing.status}'
        }
    
    # Check activation eligibility
    can_act, reason, req_payment, req_approval = can_activate_module(tenant, module)
    
    # Determine initial status
    # Even if can_activate, require owner approval for tracking purposes
    # Only set activated_by when owner explicitly approves
    if can_act and not req_approval:
        status = 'trial' if reason == 'trial_active' else 'active'
        enabled_at = timezone.now()
        activated_by = None  # Don't set until owner approves
    else:
        status = 'requires_payment' if req_payment else 'pending'
        enabled_at = None
        activated_by = None
    
    # Create TenantModule record with pricing
    from datetime import timedelta
    
    tenant_module = TenantModule.objects.create(
        tenant=tenant,
        module=module,
        status=status,
        enabled_at=enabled_at,
        activated_at=enabled_at,
        activated_by=activated_by,
        requires_owner_approval=req_approval,
        requested_at=timezone.now(),
        activation_period_months=period_months,
        payment_type=payment_type,
        price_monthly=pricing['price_monthly'],
        price_yearly=pricing['price_yearly'],
        actual_price=pricing['actual_price'],
        currency=pricing['currency'],
        expires_at=timezone.now() + timedelta(days=30 * period_months) if enabled_at else None
    )
    
    return {
        'success': True,
        'tenant_module': tenant_module,
        'can_activate': can_act,
        'reason': reason,
        'requires_approval': req_approval,
        'pricing': pricing,
        'message': f'Module activation {"approved" if can_act else "requested"}'
    }


def approve_module_activation(tenant_module, approved_by, payment_type='paid'):
    """
    Approve and activate a module for a tenant (by owner/admin).
    
    Args:
        tenant_module: TenantModule instance
        approved_by: User approving the activation
        payment_type: Payment type ('paid', 'trial', 'debt', 'complimentary')
    
    Returns:
        dict: {
            'success': bool,
            'message': str
        }
    """
    if tenant_module.status == 'active':
        return {
            'success': False,
            'message': 'Module is already active'
        }
    
    from datetime import timedelta
    
    now = timezone.now()
    tenant_module.status = 'active' if payment_type == 'paid' else ('trial' if payment_type == 'trial' else 'active')
    tenant_module.enabled_at = now
    tenant_module.activated_at = now
    tenant_module.activated_by = approved_by
    tenant_module.requires_owner_approval = False
    tenant_module.payment_type = payment_type
    
    # Set expiration if not already set
    if not tenant_module.expires_at and tenant_module.activation_period_months:
        tenant_module.expires_at = now + timedelta(days=30 * tenant_module.activation_period_months)
    
    tenant_module.save()
    
    return {
        'success': True,
        'message': f'Module {tenant_module.module.name} activated for {tenant_module.tenant.company_name}'
    }


def activate_modules_after_payment(tenant, payment):
    """
    Activate pending modules after successful payment.
    
    Returns:
        dict: {
            'activated_count': int,
            'activated_modules': list
        }
    """
    if payment.status != 'completed':
        return {
            'activated_count': 0,
            'activated_modules': []
        }
    
    # Find pending modules that require payment
    pending_modules = TenantModule.objects.filter(
        tenant=tenant,
        status__in=['pending', 'requires_payment']
    )
    
    activated = []
    for tenant_module in pending_modules:
        tenant_module.status = 'active'
        tenant_module.enabled_at = timezone.now()
        tenant_module.requires_owner_approval = False
        tenant_module.notes = f'Activated after payment: {payment.transaction_id}'
        tenant_module.save()
        activated.append(tenant_module)
    
    return {
        'activated_count': len(activated),
        'activated_modules': activated
    }


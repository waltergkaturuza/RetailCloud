"""
Pricing calculation service for RetailCloud.
Calculates costs based on dynamic pricing rules.
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Count, Q
from .pricing_models import PricingRule, ModulePricing
from .models import Tenant, Module, Branch
from accounts.models import User


def get_active_pricing_rule():
    """Get the currently active pricing rule."""
    try:
        return PricingRule.objects.filter(is_active=True, is_default=True).first() or \
               PricingRule.objects.filter(is_active=True).first()
    except PricingRule.DoesNotExist:
        # Return default values if no pricing rule exists
        return None


def calculate_module_pricing(tenant, module, period_months=1, pricing_rule=None):
    """
    Calculate pricing for a specific module.
    
    Args:
        tenant: Tenant instance
        module: Module instance
        period_months: Activation period in months (1 for monthly, 12 for yearly)
        pricing_rule: Optional PricingRule instance (uses active rule if not provided)
    
    Returns:
        dict with pricing details:
        {
            'price_monthly': Decimal,
            'price_yearly': Decimal,
            'actual_price': Decimal,
            'currency': str,
            'discount_applied': Decimal,
            'pricing_rule': PricingRule instance
        }
    """
    if not pricing_rule:
        pricing_rule = get_active_pricing_rule()
    
    if not pricing_rule:
        # Fallback to default pricing
        price_monthly = Decimal('10.00')
        price_yearly = Decimal('96.00')  # 10 * 12 * 0.8 (20% discount)
        currency = 'USD'
        discount = Decimal('0.20')
    else:
        # Check for module-specific pricing override
        module_pricing = ModulePricing.objects.filter(
            pricing_rule=pricing_rule,
            module=module
        ).first()
        
        if module_pricing:
            price_monthly = module_pricing.price_monthly
            if module_pricing.price_yearly:
                price_yearly = module_pricing.price_yearly
            else:
                # Calculate yearly with discount
                discount = pricing_rule.yearly_discount_percent / Decimal('100.00')
                price_yearly = price_monthly * Decimal('12') * (Decimal('1') - discount)
        else:
            # Use base category pricing
            price_monthly = pricing_rule.category_price_monthly
            discount = pricing_rule.yearly_discount_percent / Decimal('100.00')
            price_yearly = price_monthly * Decimal('12') * (Decimal('1') - discount)
        
        currency = pricing_rule.currency
    
    # Calculate actual price based on period
    if period_months == 12:
        actual_price = price_yearly
        discount_applied = pricing_rule.yearly_discount_percent if pricing_rule else Decimal('20.00')
    else:
        actual_price = price_monthly * Decimal(str(period_months))
        discount_applied = Decimal('0.00')
    
    return {
        'price_monthly': price_monthly,
        'price_yearly': price_yearly,
        'actual_price': actual_price,
        'currency': currency,
        'discount_applied': discount_applied,
        'pricing_rule': pricing_rule
    }


def calculate_tenant_total_cost(tenant, period_months=1, include_modules=True, pricing_rule=None):
    """
    Calculate total cost for a tenant including modules, users, and branches.
    
    Args:
        tenant: Tenant instance
        period_months: Billing period in months (1 for monthly, 12 for yearly)
        include_modules: Whether to include module costs
        pricing_rule: Optional PricingRule instance
    
    Returns:
        dict with cost breakdown:
        {
            'base_cost': Decimal,  # Category base cost
            'module_cost': Decimal,  # Total module costs
            'user_cost': Decimal,  # Total user costs
            'branch_cost': Decimal,  # Total extra branch costs
            'subtotal': Decimal,
            'discount': Decimal,
            'total': Decimal,
            'currency': str,
            'breakdown': dict  # Detailed breakdown
        }
    """
    if not pricing_rule:
        pricing_rule = get_active_pricing_rule()
    
    if not pricing_rule:
        # Fallback to default pricing
        category_price = Decimal('10.00')
        user_price = Decimal('1.00')
        branch_price = Decimal('5.00')
        currency = 'USD'
        discount_percent = Decimal('20.00')
    else:
        category_price = pricing_rule.category_price_monthly
        user_price = pricing_rule.user_price_monthly
        branch_price = pricing_rule.branch_price_monthly
        currency = pricing_rule.currency
        discount_percent = pricing_rule.yearly_discount_percent
    
    # Calculate costs
    base_cost = category_price
    
    # Module costs
    module_cost = Decimal('0.00')
    if include_modules:
        active_modules = tenant.enabled_modules.filter(status__in=['active', 'trial'])
        for tenant_module in active_modules:
            module_pricing = calculate_module_pricing(tenant, tenant_module.module, period_months, pricing_rule)
            module_cost += module_pricing['price_monthly']
    
    # User costs (count active users)
    user_count = User.objects.filter(tenant=tenant, is_active=True).count()
    # First user is usually free (tenant admin), so subtract 1
    billable_users = max(0, user_count - 1)
    user_cost = user_price * Decimal(str(billable_users))
    
    # Branch costs (beyond first branch)
    branch_count = Branch.objects.filter(tenant=tenant, is_active=True).count()
    billable_branches = max(0, branch_count - 1)  # First branch is usually free
    branch_cost = branch_price * Decimal(str(billable_branches))
    
    # Calculate subtotal and total
    subtotal = base_cost + module_cost + user_cost + branch_cost
    
    # Apply yearly discount if applicable
    if period_months == 12:
        discount_amount = subtotal * (discount_percent / Decimal('100.00'))
        total = subtotal - discount_amount
    else:
        discount_amount = Decimal('0.00')
        total = subtotal * Decimal(str(period_months))
    
    return {
        'base_cost': base_cost,
        'module_cost': module_cost,
        'user_cost': user_cost,
        'branch_cost': branch_cost,
        'subtotal': subtotal,
        'discount': discount_amount,
        'total': total,
        'currency': currency,
        'period_months': period_months,
        'breakdown': {
            'category': float(base_cost),
            'modules': float(module_cost),
            'users': {'count': billable_users, 'cost': float(user_cost)},
            'branches': {'count': billable_branches, 'cost': float(branch_cost)},
        }
    }


def get_pricing_summary(tenant, pricing_rule=None):
    """
    Get pricing summary for a tenant showing what they'll pay.
    
    Returns:
        dict with monthly and yearly pricing summaries
    """
    monthly = calculate_tenant_total_cost(tenant, period_months=1, pricing_rule=pricing_rule)
    yearly = calculate_tenant_total_cost(tenant, period_months=12, pricing_rule=pricing_rule)
    
    return {
        'monthly': monthly,
        'yearly': yearly,
        'yearly_savings': monthly['subtotal'] * Decimal('12') - yearly['total'],
        'currency': monthly['currency']
    }





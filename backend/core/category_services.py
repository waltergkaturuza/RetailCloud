"""
Services for business category operations and auto-module activation.
"""
from django.db import transaction
from .models import Module
from .business_category_models import BusinessCategory, CategoryModuleMapping
from subscriptions.models import TenantModule


def activate_modules_for_category(tenant, category, auto_activate=False):
    """
    Recommend modules for a tenant based on their business category.
    By default, modules are NOT auto-activated but only recommended.
    
    Args:
        tenant: Tenant instance
        category: BusinessCategory instance
        auto_activate: If True, automatically activate recommended modules (default: False)
                      Note: Activation still requires payment/trial validation
    
    Returns:
        dict with recommendation/activation results
    """
    if not category:
        return {
            'success': False,
            'message': 'No category specified',
            'activated': [],
            'skipped': [],
            'recommended': []
        }
    
    # Get recommended modules for this category
    mappings = CategoryModuleMapping.objects.filter(
        category=category
    ).select_related('module').order_by('-priority')
    
    if not mappings.exists():
        return {
            'success': True,
            'message': f'No recommended modules found for {category.name}',
            'activated': [],
            'skipped': [],
            'recommended': [],
            'total_recommended': 0
        }
    
    # Always return recommended modules list
    recommended = [
        {
            'module_code': mapping.module.code,
            'module_name': mapping.module.name,
            'is_required': mapping.is_required,
            'priority': mapping.priority
        }
        for mapping in mappings
    ]
    
    # If not auto-activating, just return recommendations
    if not auto_activate:
        return {
            'success': True,
            'message': f'Recommended {len(recommended)} module(s) for {category.name}. Select modules to activate.',
            'activated': [],
            'skipped': [],
            'recommended': recommended,
            'total_recommended': len(recommended)
        }
    
    # Auto-activate: Import activation service
    from subscriptions.module_activation_service import request_module_activation
    
    activated = []
    skipped = []
    
    for mapping in mappings:
        module = mapping.module
        
        # Check if module is already requested/activated
        existing = TenantModule.objects.filter(
            tenant=tenant,
            module=module
        ).first()
        
        if existing:
            skipped.append({
                'module_code': module.code,
                'module_name': module.name,
                'reason': f'Already {existing.status}'
            })
            continue
        
        # Request module activation (may auto-activate if eligible)
        try:
            result = request_module_activation(tenant, module)
            if result['can_activate'] and result['tenant_module'].status in ['active', 'trial']:
                activated.append({
                    'module_code': module.code,
                    'module_name': module.name,
                    'is_required': mapping.is_required,
                    'priority': mapping.priority,
                    'status': result['tenant_module'].status
                })
            else:
                skipped.append({
                    'module_code': module.code,
                    'module_name': module.name,
                    'reason': f"Status: {result['tenant_module'].status} - {result['reason']}"
                })
        except Exception as e:
            # Log the error but continue with other modules
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error requesting module {module.code}: {str(e)}")
            skipped.append({
                'module_code': module.code,
                'module_name': module.name,
                'reason': f'Error: {str(e)}'
            })
    
    return {
        'success': True,
        'message': f'Recommended {len(recommended)} module(s) for {category.name}. {len(activated)} activated automatically.',
        'activated': activated,
        'skipped': skipped,
        'recommended': recommended,
        'total_recommended': len(recommended)
    }


def get_category_recommendations(category_code=None, category_id=None):
    """
    Get module recommendations for a business category.
    
    Args:
        category_code: Category code (slug)
        category_id: Category ID
    
    Returns:
        dict with category info and recommended modules
    """
    try:
        if category_code:
            category = BusinessCategory.objects.get(code=category_code, is_active=True)
        elif category_id:
            category = BusinessCategory.objects.get(id=category_id, is_active=True)
        else:
            return None
        
        mappings = category.module_mappings.all().select_related('module').order_by('-priority')
        
        return {
            'category': {
                'id': category.id,
                'code': category.code,
                'name': category.name,
                'description': category.description,
                'icon': category.icon,
                'features': {
                    'expiry_tracking': category.requires_expiry_tracking,
                    'serial_tracking': category.requires_serial_tracking,
                    'weight_scale': category.requires_weight_scale,
                    'variants': category.requires_variants,
                    'warranty': category.requires_warranty,
                    'appointments': category.requires_appointments,
                    'recipe_costing': category.requires_recipe_costing,
                    'layby': category.requires_layby,
                    'delivery': category.requires_delivery,
                }
            },
            'recommended_modules': [
                {
                    'code': mapping.module.code,
                    'name': mapping.module.name,
                    'description': mapping.module.description,
                    'category': mapping.module.category,
                    'is_required': mapping.is_required,
                    'priority': mapping.priority,
                    'notes': mapping.notes
                }
                for mapping in mappings
            ],
            'required_modules': [
                mapping.module.code
                for mapping in mappings
                if mapping.is_required
            ]
        }
    except BusinessCategory.DoesNotExist:
        return None


def suggest_category_by_keywords(keywords):
    """
    Suggest business category based on keywords (basic implementation).
    Can be enhanced with AI/NLP later.
    
    Args:
        keywords: List of keywords or description string
    
    Returns:
        List of suggested categories with relevance scores
    """
    if isinstance(keywords, str):
        keywords = keywords.lower().split()
    
    keywords_str = ' '.join(keywords).lower()
    
    # Keyword mapping for basic suggestions
    keyword_map = {
        'grocery': ['grocery', 'supermarket', 'convenience', 'tuckshop', 'liquor', 'butchery', 'food', 'shop'],
        'motor_spares': ['motor', 'spare', 'hardware', 'vehicle', 'car', 'auto', 'parts'],
        'clothing': ['clothing', 'fashion', 'boutique', 'apparel', 'garment', 'dress', 'shirt'],
        'furniture': ['furniture', 'household', 'home', 'sofa', 'chair', 'table', 'furnishing'],
        'pharmacy': ['pharmacy', 'medical', 'medicine', 'drug', 'pharmaceutical', 'health'],
        'cosmetics': ['cosmetics', 'beauty', 'makeup', 'skincare', 'perfume', 'cosmetic'],
        'restaurant': ['restaurant', 'cafe', 'food', 'takeaway', 'fast food', 'dining', 'menu'],
        'electronics': ['electronics', 'tech', 'phone', 'computer', 'gadget', 'device', 'electronic'],
        'jewellery': ['jewellery', 'jewelry', 'gold', 'silver', 'gem', 'diamond', 'ring'],
        'salon': ['salon', 'barber', 'hair', 'beauty', 'stylist', 'haircut'],
    }
    
    suggestions = []
    categories = BusinessCategory.objects.filter(is_active=True)
    
    for category in categories:
        score = 0
        category_keywords = keyword_map.get(category.code, [])
        
        for keyword in keywords:
            for cat_keyword in category_keywords:
                if keyword in cat_keyword or cat_keyword in keyword:
                    score += 1
        
        if score > 0:
            suggestions.append({
                'category': BusinessCategoryListSerializer(category).data,
                'relevance_score': score,
                'matched_keywords': [
                    kw for kw in keywords
                    if any(cat_kw in kw or kw in cat_kw for cat_kw in category_keywords)
                ]
            })
    
    # Sort by relevance score
    suggestions.sort(key=lambda x: x['relevance_score'], reverse=True)
    
    return suggestions[:5]  # Return top 5 suggestions


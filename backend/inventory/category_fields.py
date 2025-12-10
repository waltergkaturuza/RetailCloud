"""
Industry-specific product field definitions for different business categories.
"""
from typing import Dict, List, Any


# Define field configurations for each category
CATEGORY_FIELD_CONFIGS: Dict[str, List[Dict[str, Any]]] = {
    'grocery': [
        # Expiry tracking fields
        {'key': 'expiry_date', 'label': 'Expiry Date', 'type': 'date', 'required': True, 'section': 'inventory'},
        {'key': 'batch_number', 'label': 'Batch Number', 'type': 'text', 'section': 'inventory'},
        {'key': 'manufacturing_date', 'label': 'Manufacturing Date', 'type': 'date', 'section': 'inventory'},
        
        # Weight scale integration
        {'key': 'weight', 'label': 'Weight (kg)', 'type': 'decimal', 'section': 'pricing'},
        {'key': 'unit_of_measure', 'label': 'Unit of Measure', 'type': 'select', 
         'options': [{'value': 'kg', 'label': 'Kilogram'}, {'value': 'g', 'label': 'Gram'}, 
                     {'value': 'piece', 'label': 'Piece'}], 'section': 'pricing'},
        
        # Promotions
        {'key': 'allow_bundle', 'label': 'Allow Bundle Offers', 'type': 'boolean', 'section': 'promotions'},
    ],
    
    'motor_spares': [
        # Vehicle compatibility
        {'key': 'vehicle_make', 'label': 'Vehicle Make', 'type': 'text', 'section': 'specifications'},
        {'key': 'vehicle_model', 'label': 'Vehicle Model', 'type': 'text', 'section': 'specifications'},
        {'key': 'vehicle_year', 'label': 'Vehicle Year', 'type': 'number', 'section': 'specifications'},
        {'key': 'part_number', 'label': 'Part Number/OEM', 'type': 'text', 'required': True, 'section': 'specifications'},
        
        # Serial tracking
        {'key': 'serial_number', 'label': 'Serial Number', 'type': 'text', 'section': 'inventory'},
        {'key': 'track_serial', 'label': 'Track Serial Numbers', 'type': 'boolean', 'section': 'inventory'},
        
        # Warranty
        {'key': 'warranty_period', 'label': 'Warranty Period (months)', 'type': 'number', 'section': 'warranty'},
        {'key': 'warranty_type', 'label': 'Warranty Type', 'type': 'select',
         'options': [{'value': 'manufacturer', 'label': 'Manufacturer'}, 
                     {'value': 'supplier', 'label': 'Supplier'}, 
                     {'value': 'none', 'label': 'None'}], 'section': 'warranty'},
    ],
    
    'clothing': [
        # Size & color variants
        {'key': 'has_variants', 'label': 'Has Size/Color Variants', 'type': 'boolean', 'section': 'variants'},
        {'key': 'sizes', 'label': 'Available Sizes', 'type': 'multiselect',
         'options': [{'value': 'xs', 'label': 'XS'}, {'value': 's', 'label': 'S'}, 
                     {'value': 'm', 'label': 'M'}, {'value': 'l', 'label': 'L'}, 
                     {'value': 'xl', 'label': 'XL'}, {'value': 'xxl', 'label': 'XXL'}], 'section': 'variants'},
        {'key': 'colors', 'label': 'Available Colors', 'type': 'text', 'placeholder': 'Red, Blue, Green...', 'section': 'variants'},
        
        # Style/lookbook
        {'key': 'style_code', 'label': 'Style Code', 'type': 'text', 'section': 'specifications'},
        {'key': 'season', 'label': 'Season', 'type': 'select',
         'options': [{'value': 'spring', 'label': 'Spring'}, {'value': 'summer', 'label': 'Summer'},
                     {'value': 'fall', 'label': 'Fall'}, {'value': 'winter', 'label': 'Winter'},
                     {'value': 'all', 'label': 'All Season'}], 'section': 'specifications'},
        
        # Returns/exchanges
        {'key': 'return_policy_days', 'label': 'Return Policy (days)', 'type': 'number', 'section': 'policies'},
        {'key': 'exchange_allowed', 'label': 'Exchange Allowed', 'type': 'boolean', 'section': 'policies'},
    ],
    
    'furniture': [
        # Large items
        {'key': 'dimensions', 'label': 'Dimensions (L x W x H cm)', 'type': 'text', 'section': 'specifications'},
        {'key': 'weight', 'label': 'Weight (kg)', 'type': 'decimal', 'section': 'specifications'},
        {'key': 'assembly_required', 'label': 'Assembly Required', 'type': 'boolean', 'section': 'specifications'},
        
        # Lay-by
        {'key': 'allow_layby', 'label': 'Allow Lay-by', 'type': 'boolean', 'section': 'payment'},
        {'key': 'layby_installments', 'label': 'Lay-by Installments', 'type': 'number', 'section': 'payment'},
        
        # Delivery
        {'key': 'requires_delivery', 'label': 'Requires Delivery', 'type': 'boolean', 'section': 'delivery'},
        {'key': 'delivery_fee', 'label': 'Delivery Fee', 'type': 'decimal', 'section': 'delivery'},
        
        # Warranty
        {'key': 'warranty_period', 'label': 'Warranty Period (years)', 'type': 'number', 'section': 'warranty'},
    ],
    
    'pharmacy': [
        # Critical expiry tracking
        {'key': 'expiry_date', 'label': 'Expiry Date', 'type': 'date', 'required': True, 'section': 'compliance'},
        {'key': 'batch_number', 'label': 'Batch Number', 'type': 'text', 'required': True, 'section': 'compliance'},
        {'key': 'manufacturing_date', 'label': 'Manufacturing Date', 'type': 'date', 'section': 'compliance'},
        {'key': 'lot_number', 'label': 'Lot Number', 'type': 'text', 'section': 'compliance'},
        
        # Dangerous drugs
        {'key': 'is_controlled', 'label': 'Controlled Substance', 'type': 'boolean', 'section': 'compliance'},
        {'key': 'requires_prescription', 'label': 'Requires Prescription', 'type': 'boolean', 'section': 'compliance'},
        
        # Prescription attachment
        {'key': 'prescription_required', 'label': 'Prescription Required', 'type': 'boolean', 'section': 'compliance'},
        
        # Supplier compliance
        {'key': 'supplier_license', 'label': 'Supplier License Number', 'type': 'text', 'section': 'compliance'},
    ],
    
    'cosmetics': [
        # Variants
        {'key': 'has_variants', 'label': 'Has Variants', 'type': 'boolean', 'section': 'variants'},
        {'key': 'shade', 'label': 'Shade/Color', 'type': 'text', 'section': 'variants'},
        {'key': 'size', 'label': 'Size', 'type': 'text', 'section': 'variants'},
        
        # Combo offers
        {'key': 'allow_combo', 'label': 'Allow Combo Offers', 'type': 'boolean', 'section': 'promotions'},
        
        # Expiry for cosmetics
        {'key': 'expiry_date', 'label': 'Expiry Date', 'type': 'date', 'section': 'inventory'},
        {'key': 'batch_number', 'label': 'Batch Number', 'type': 'text', 'section': 'inventory'},
    ],
    
    'restaurant': [
        # Menu management
        {'key': 'is_menu_item', 'label': 'Menu Item', 'type': 'boolean', 'section': 'menu'},
        {'key': 'category', 'label': 'Menu Category', 'type': 'select',
         'options': [{'value': 'starter', 'label': 'Starter'}, {'value': 'main', 'label': 'Main Course'},
                     {'value': 'dessert', 'label': 'Dessert'}, {'value': 'drink', 'label': 'Drink'},
                     {'value': 'side', 'label': 'Side Dish'}], 'section': 'menu'},
        
        # Recipe costing
        {'key': 'has_recipe', 'label': 'Has Recipe', 'type': 'boolean', 'section': 'costing'},
        {'key': 'recipe_cost', 'label': 'Recipe Cost', 'type': 'decimal', 'section': 'costing'},
        
        # KOT
        {'key': 'prep_time', 'label': 'Preparation Time (minutes)', 'type': 'number', 'section': 'menu'},
    ],
    
    'electronics': [
        # IMEI/Serial tracking
        {'key': 'imei_number', 'label': 'IMEI Number', 'type': 'text', 'section': 'specifications'},
        {'key': 'serial_number', 'label': 'Serial Number', 'type': 'text', 'section': 'specifications'},
        {'key': 'track_serial', 'label': 'Track Serial Numbers', 'type': 'boolean', 'section': 'inventory'},
        
        # Warranty & repair
        {'key': 'warranty_period', 'label': 'Warranty Period (months)', 'type': 'number', 'section': 'warranty'},
        {'key': 'allow_repairs', 'label': 'Allow Repairs', 'type': 'boolean', 'section': 'services'},
        
        # Installment payments
        {'key': 'allow_installments', 'label': 'Allow Installments', 'type': 'boolean', 'section': 'payment'},
        {'key': 'installment_plans', 'label': 'Installment Plans', 'type': 'json', 'section': 'payment'},
        
        # High-value tracking
        {'key': 'is_high_value', 'label': 'High Value Item', 'type': 'boolean', 'section': 'inventory'},
    ],
    
    'jewellery': [
        # Weight/karat
        {'key': 'weight_grams', 'label': 'Weight (grams)', 'type': 'decimal', 'section': 'specifications'},
        {'key': 'karat', 'label': 'Karat', 'type': 'number', 'section': 'specifications'},
        {'key': 'metal_type', 'label': 'Metal Type', 'type': 'select',
         'options': [{'value': 'gold', 'label': 'Gold'}, {'value': 'silver', 'label': 'Silver'},
                     {'value': 'platinum', 'label': 'Platinum'}, {'value': 'diamond', 'label': 'Diamond'}], 'section': 'specifications'},
        
        # Certification
        {'key': 'certification_number', 'label': 'Certification Number', 'type': 'text', 'section': 'certification'},
        {'key': 'certificate_file', 'label': 'Certificate File', 'type': 'file', 'section': 'certification'},
        
        # Custom valuation
        {'key': 'appraised_value', 'label': 'Appraised Value', 'type': 'decimal', 'section': 'pricing'},
        
        # High-security
        {'key': 'requires_verification', 'label': 'Requires Manager Verification', 'type': 'boolean', 'section': 'security'},
    ],
    
    'agro': [
        # Seed batch tracking
        {'key': 'batch_number', 'label': 'Batch Number', 'type': 'text', 'required': True, 'section': 'inventory'},
        {'key': 'seed_variety', 'label': 'Seed Variety', 'type': 'text', 'section': 'specifications'},
        {'key': 'germination_rate', 'label': 'Germination Rate (%)', 'type': 'number', 'section': 'specifications'},
        
        # Animal feeds
        {'key': 'feed_type', 'label': 'Feed Type', 'type': 'select',
         'options': [{'value': 'poultry', 'label': 'Poultry'}, {'value': 'cattle', 'label': 'Cattle'},
                     {'value': 'pigs', 'label': 'Pigs'}, {'value': 'sheep', 'label': 'Sheep'}], 'section': 'specifications'},
        {'key': 'weight', 'label': 'Weight (kg)', 'type': 'decimal', 'section': 'pricing'},
        
        # Pesticide regulations
        {'key': 'is_pesticide', 'label': 'Pesticide/Herbicide', 'type': 'boolean', 'section': 'compliance'},
        {'key': 'regulation_number', 'label': 'Regulation Number', 'type': 'text', 'section': 'compliance'},
    ],
    
    'repair_shop': [
        # Job cards
        {'key': 'is_service', 'label': 'Service Item', 'type': 'boolean', 'section': 'services'},
        {'key': 'service_duration', 'label': 'Service Duration (hours)', 'type': 'decimal', 'section': 'services'},
        {'key': 'requires_parts', 'label': 'Requires Parts', 'type': 'boolean', 'section': 'services'},
        
        # Parts usage
        {'key': 'parts_list', 'label': 'Parts List', 'type': 'json', 'section': 'services'},
    ],
    
    'salon': [
        # Services
        {'key': 'is_service', 'label': 'Service', 'type': 'boolean', 'section': 'services'},
        {'key': 'service_duration', 'label': 'Duration (minutes)', 'type': 'number', 'section': 'services'},
        {'key': 'stylist_commission', 'label': 'Stylist Commission (%)', 'type': 'decimal', 'section': 'pricing'},
        
        # Products + services mix
        {'key': 'is_product', 'label': 'Product', 'type': 'boolean', 'section': 'product'},
    ],
}


def get_category_fields(category_code: str) -> List[Dict[str, Any]]:
    """Get field definitions for a specific category."""
    return CATEGORY_FIELD_CONFIGS.get(category_code, [])


def get_all_category_fields() -> Dict[str, List[Dict[str, Any]]]:
    """Get all category field configurations."""
    return CATEGORY_FIELD_CONFIGS



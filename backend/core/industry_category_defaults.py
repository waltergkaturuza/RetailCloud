"""
Default product categories for each business category/industry.
When a tenant selects a business category, these default product categories
will be automatically created for them.
"""
from typing import Dict, List


# Default product categories per business category
INDUSTRY_DEFAULT_CATEGORIES: Dict[str, List[Dict[str, str]]] = {
    'grocery': [
        {'name': 'Fruits & Vegetables', 'code': 'FRUITS_VEG', 'description': 'Fresh fruits and vegetables'},
        {'name': 'Dairy Products', 'code': 'DAIRY', 'description': 'Milk, cheese, yogurt, butter'},
        {'name': 'Meat & Poultry', 'code': 'MEAT', 'description': 'Fresh meat and poultry products'},
        {'name': 'Beverages', 'code': 'BEVERAGES', 'description': 'Soft drinks, juices, water'},
        {'name': 'Bakery', 'code': 'BAKERY', 'description': 'Bread, cakes, pastries'},
        {'name': 'Canned Goods', 'code': 'CANNED', 'description': 'Canned foods and preserves'},
        {'name': 'Snacks', 'code': 'SNACKS', 'description': 'Chips, biscuits, confectionery'},
        {'name': 'Household Items', 'code': 'HOUSEHOLD', 'description': 'Cleaning supplies, toiletries'},
    ],
    
    'motor_spares': [
        {'name': 'Engine Parts', 'code': 'ENGINE', 'description': 'Engine components and parts'},
        {'name': 'Brake System', 'code': 'BRAKE', 'description': 'Brake pads, discs, fluid'},
        {'name': 'Electrical', 'code': 'ELECTRICAL', 'description': 'Batteries, alternators, starters'},
        {'name': 'Filters', 'code': 'FILTERS', 'description': 'Oil, air, fuel filters'},
        {'name': 'Suspension', 'code': 'SUSPENSION', 'description': 'Shocks, struts, springs'},
        {'name': 'Body Parts', 'code': 'BODY', 'description': 'Bumpers, mirrors, lights'},
        {'name': 'Tyres', 'code': 'TYRES', 'description': 'Tyres and wheels'},
        {'name': 'Accessories', 'code': 'ACCESSORIES', 'description': 'Car accessories and tools'},
    ],
    
    'clothing': [
        {'name': 'Men\'s Clothing', 'code': 'MENS', 'description': 'Men\'s apparel'},
        {'name': 'Women\'s Clothing', 'code': 'WOMENS', 'description': 'Women\'s apparel'},
        {'name': 'Kids Clothing', 'code': 'KIDS', 'description': 'Children\'s clothing'},
        {'name': 'Shoes', 'code': 'SHOES', 'description': 'Footwear'},
        {'name': 'Accessories', 'code': 'ACCESSORIES', 'description': 'Bags, belts, jewelry'},
    ],
    
    'furniture': [
        {'name': 'Living Room', 'code': 'LIVING', 'description': 'Sofas, coffee tables, TV stands'},
        {'name': 'Bedroom', 'code': 'BEDROOM', 'description': 'Beds, wardrobes, dressers'},
        {'name': 'Dining Room', 'code': 'DINING', 'description': 'Dining tables, chairs'},
        {'name': 'Office Furniture', 'code': 'OFFICE', 'description': 'Desks, office chairs'},
        {'name': 'Outdoor', 'code': 'OUTDOOR', 'description': 'Garden furniture'},
    ],
    
    'pharmacy': [
        {'name': 'Prescription Drugs', 'code': 'RX', 'description': 'Prescription medications'},
        {'name': 'Over-the-Counter', 'code': 'OTC', 'description': 'Non-prescription medicines'},
        {'name': 'Vitamins & Supplements', 'code': 'VITAMINS', 'description': 'Vitamins and dietary supplements'},
        {'name': 'Personal Care', 'code': 'CARE', 'description': 'Toiletries, cosmetics'},
        {'name': 'Medical Supplies', 'code': 'SUPPLIES', 'description': 'Bandages, thermometers, etc.'},
        {'name': 'Baby Care', 'code': 'BABY', 'description': 'Baby products'},
    ],
    
    'cosmetics': [
        {'name': 'Makeup', 'code': 'MAKEUP', 'description': 'Foundation, lipstick, eyeshadow'},
        {'name': 'Skincare', 'code': 'SKINCARE', 'description': 'Moisturizers, cleansers, serums'},
        {'name': 'Hair Care', 'code': 'HAIR', 'description': 'Shampoo, conditioner, styling products'},
        {'name': 'Fragrances', 'code': 'FRAGRANCE', 'description': 'Perfumes and colognes'},
        {'name': 'Nail Care', 'code': 'NAILS', 'description': 'Nail polish, treatments'},
    ],
    
    'restaurant': [
        {'name': 'Starters', 'code': 'STARTERS', 'description': 'Appetizers and starters'},
        {'name': 'Main Courses', 'code': 'MAINS', 'description': 'Main dishes'},
        {'name': 'Desserts', 'code': 'DESSERTS', 'description': 'Sweets and desserts'},
        {'name': 'Beverages', 'code': 'BEVERAGES', 'description': 'Drinks and beverages'},
        {'name': 'Sides', 'code': 'SIDES', 'description': 'Side dishes'},
    ],
    
    'general_retail': [
        {'name': 'General Items', 'code': 'GENERAL', 'description': 'General retail items'},
        {'name': 'Food Items', 'code': 'FOOD', 'description': 'Food and snacks'},
        {'name': 'Beverages', 'code': 'BEVERAGES', 'description': 'Drinks'},
        {'name': 'Household', 'code': 'HOUSEHOLD', 'description': 'Household items'},
    ],
    
    'electronics': [
        {'name': 'Mobile Phones', 'code': 'PHONES', 'description': 'Smartphones and accessories'},
        {'name': 'Computers', 'code': 'COMPUTERS', 'description': 'Laptops, desktops, tablets'},
        {'name': 'Audio & Video', 'code': 'AV', 'description': 'Speakers, headphones, TVs'},
        {'name': 'Gaming', 'code': 'GAMING', 'description': 'Gaming consoles and accessories'},
        {'name': 'Accessories', 'code': 'ACCESSORIES', 'description': 'Cables, cases, chargers'},
    ],
    
    'jewellery': [
        {'name': 'Rings', 'code': 'RINGS', 'description': 'Finger rings'},
        {'name': 'Necklaces', 'code': 'NECKLACES', 'description': 'Necklaces and chains'},
        {'name': 'Earrings', 'code': 'EARRINGS', 'description': 'Earrings'},
        {'name': 'Bracelets', 'code': 'BRACELETS', 'description': 'Bracelets and bangles'},
        {'name': 'Watches', 'code': 'WATCHES', 'description': 'Wristwatches'},
    ],
    
    'clinic': [
        {'name': 'Consultation Services', 'code': 'CONSULTATION', 'description': 'Medical consultations'},
        {'name': 'Prescription Drugs', 'code': 'RX', 'description': 'Prescription medications'},
        {'name': 'Over-the-Counter', 'code': 'OTC', 'description': 'Non-prescription medicines'},
        {'name': 'Medical Supplies', 'code': 'SUPPLIES', 'description': 'Medical equipment and supplies'},
    ],
    
    'car_wash': [
        {'name': 'Services', 'code': 'SERVICES', 'description': 'Car wash and detailing services'},
        {'name': 'Products', 'code': 'PRODUCTS', 'description': 'Car care products'},
    ],
    
    'repair_shop': [
        {'name': 'Repair Services', 'code': 'SERVICES', 'description': 'Repair and maintenance services'},
        {'name': 'Parts', 'code': 'PARTS', 'description': 'Replacement parts'},
        {'name': 'Accessories', 'code': 'ACCESSORIES', 'description': 'Accessories and components'},
    ],
    
    'agro': [
        {'name': 'Seeds', 'code': 'SEEDS', 'description': 'Agricultural seeds'},
        {'name': 'Fertilizers', 'code': 'FERTILIZERS', 'description': 'Fertilizers and nutrients'},
        {'name': 'Animal Feeds', 'code': 'FEEDS', 'description': 'Animal feed products'},
        {'name': 'Pesticides', 'code': 'PESTICIDES', 'description': 'Pesticides and herbicides'},
        {'name': 'Tools', 'code': 'TOOLS', 'description': 'Farming tools and equipment'},
    ],
    
    'services': [
        {'name': 'Services', 'code': 'SERVICES', 'description': 'General services'},
        {'name': 'Products', 'code': 'PRODUCTS', 'description': 'Related products'},
    ],
    
    'wholesale': [
        {'name': 'Bulk Items', 'code': 'BULK', 'description': 'Bulk products'},
        {'name': 'Food & Beverages', 'code': 'FOOD_BEV', 'description': 'Food and beverages'},
        {'name': 'Household Goods', 'code': 'HOUSEHOLD', 'description': 'Household items'},
    ],
    
    'salon': [
        {'name': 'Hair Services', 'code': 'HAIR_SERVICES', 'description': 'Haircut, styling, coloring'},
        {'name': 'Beauty Services', 'code': 'BEAUTY', 'description': 'Facial, nails, etc.'},
        {'name': 'Products', 'code': 'PRODUCTS', 'description': 'Hair and beauty products'},
    ],
    
    'corporate': [
        {'name': 'Food Items', 'code': 'FOOD', 'description': 'Food and snacks'},
        {'name': 'Beverages', 'code': 'BEVERAGES', 'description': 'Drinks'},
        {'name': 'General Items', 'code': 'GENERAL', 'description': 'General items'},
    ],
    
    'ecommerce': [
        {'name': 'General Products', 'code': 'GENERAL', 'description': 'General products'},
    ],
    
    'other': [
        {'name': 'General', 'code': 'GENERAL', 'description': 'General category'},
    ],
}


def get_default_categories_for_industry(category_code: str) -> List[Dict[str, str]]:
    """Get default product categories for a business category."""
    return INDUSTRY_DEFAULT_CATEGORIES.get(category_code, [
        {'name': 'General', 'code': 'GENERAL', 'description': 'General products'}
    ])


def get_all_default_categories() -> Dict[str, List[Dict[str, str]]]:
    """Get all default categories for all industries."""
    return INDUSTRY_DEFAULT_CATEGORIES





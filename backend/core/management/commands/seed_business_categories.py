"""
Django management command to seed business categories with their recommended modules.
"""
from django.core.management.base import BaseCommand
from core.models import Module
from core.business_category_models import BusinessCategory, CategoryModuleMapping


class Command(BaseCommand):
    help = 'Seed business categories with recommended modules'

    def handle(self, *args, **options):
        # Define all business categories with their configurations
        categories_data = [
            {
                'code': 'grocery',
                'name': 'Grocery / Supermarket / Convenience Store',
                'description': 'Supermarkets, small grocery tuckshops, liquor stores, butcheries',
                'icon': '🛒',
                'features': {
                    'requires_expiry_tracking': True,
                    'requires_weight_scale': True,
                    'requires_variants': False,
                },
                'modules': ['pos', 'inventory', 'grocery_module', 'offline_pos', 'financial_reporting'],
            },
            {
                'code': 'motor_spares',
                'name': 'Motor Spares / Hardware Shops',
                'description': 'Vehicle parts, hardware, tools, and automotive accessories',
                'icon': '🔧',
                'features': {
                    'requires_serial_tracking': True,
                    'requires_warranty': True,
                },
                'modules': ['pos', 'inventory', 'electronics_module', 'suppliers_purchases', 'sales_customers'],
            },
            {
                'code': 'clothing',
                'name': 'Clothing Boutiques / Fashion Stores',
                'description': 'Fashion retail, clothing stores, boutiques',
                'icon': '👗',
                'features': {
                    'requires_variants': True,
                },
                'modules': ['pos', 'inventory', 'boutique_module', 'gift_cards', 'sales_customers'],
            },
            {
                'code': 'furniture',
                'name': 'Furniture & Household Goods',
                'description': 'Furniture stores, home goods, large item retail',
                'icon': '🪑',
                'features': {
                    'requires_layby': True,
                    'requires_delivery': True,
                    'requires_warranty': True,
                },
                'modules': ['pos', 'inventory', 'delivery_management', 'sales_customers'],
            },
            {
                'code': 'pharmacy',
                'name': 'Pharmacies / Medical Shops',
                'description': 'Pharmacy, medical supplies, healthcare products',
                'icon': '💊',
                'features': {
                    'requires_expiry_tracking': True,
                    'requires_serial_tracking': True,
                },
                'modules': ['pos', 'inventory', 'grocery_module', 'sales_customers'],
            },
            {
                'code': 'cosmetics',
                'name': 'Cosmetics & Beauty Shops',
                'description': 'Beauty products, cosmetics, skincare',
                'icon': '🧪',
                'features': {
                    'requires_variants': True,
                },
                'modules': ['pos', 'inventory', 'boutique_module', 'gift_cards'],
            },
            {
                'code': 'restaurant',
                'name': 'Restaurants / Takeaways / Fast Food',
                'description': 'Restaurants, cafes, fast food, food service',
                'icon': '🍽️',
                'features': {
                    'requires_recipe_costing': True,
                    'requires_appointments': True,
                },
                'modules': ['pos', 'inventory', 'sales_customers'],
            },
            {
                'code': 'general_retail',
                'name': 'General Retail / Tuckshops / Bottle Stores',
                'description': 'Small retail shops, tuckshops, bottle stores',
                'icon': '📦',
                'features': {},
                'modules': ['pos', 'inventory', 'offline_pos', 'financial_reporting'],
            },
            {
                'code': 'electronics',
                'name': 'Electronics & Tech Shops',
                'description': 'Electronics, gadgets, technology products',
                'icon': '📱',
                'features': {
                    'requires_serial_tracking': True,
                    'requires_warranty': True,
                },
                'modules': ['pos', 'inventory', 'electronics_module', 'sales_customers'],
            },
            {
                'code': 'jewellery',
                'name': 'Jewellery Shops',
                'description': 'Jewelry stores, precious metals, gemstones',
                'icon': '💎',
                'features': {
                    'requires_serial_tracking': True,
                },
                'modules': ['pos', 'inventory', 'security_features', 'sales_customers'],
            },
            {
                'code': 'clinic',
                'name': 'Clinics / Medical Services',
                'description': 'Medical clinics with retail products',
                'icon': '🏥',
                'features': {
                    'requires_appointments': True,
                },
                'modules': ['pos', 'inventory', 'sales_customers', 'financial_reporting'],
            },
            {
                'code': 'car_wash',
                'name': 'Car Wash / Auto Services',
                'description': 'Car wash, auto detailing, valeting services',
                'icon': '🚗',
                'features': {
                    'requires_appointments': True,
                },
                'modules': ['pos', 'inventory', 'sales_customers'],
            },
            {
                'code': 'repair_shop',
                'name': 'Repair Shops (Electronics, Phones, etc.)',
                'description': 'Electronics repair, phone repair, device services',
                'icon': '🧰',
                'features': {},
                'modules': ['pos', 'inventory', 'electronics_module', 'sales_customers'],
            },
            {
                'code': 'agro',
                'name': 'Agro Shops / Farm Supplies',
                'description': 'Agricultural supplies, farm equipment, seeds',
                'icon': '🌾',
                'features': {
                    'requires_weight_scale': True,
                    'requires_serial_tracking': True,
                },
                'modules': ['pos', 'inventory', 'grocery_module', 'suppliers_purchases'],
            },
            {
                'code': 'services',
                'name': 'Travel, Printing, & Small Service Shops',
                'description': 'Service-based businesses, printing, travel agencies',
                'icon': '🧳',
                'features': {},
                'modules': ['pos', 'inventory', 'sales_customers'],
            },
            {
                'code': 'wholesale',
                'name': 'Wholesale & Distribution',
                'description': 'Wholesale businesses, distributors, bulk suppliers',
                'icon': '🏭',
                'features': {
                    'requires_delivery': True,
                },
                'modules': ['inventory', 'multi_branch', 'delivery_management', 'suppliers_purchases'],
            },
            {
                'code': 'salon',
                'name': 'Salon & Barber Shops',
                'description': 'Hair salons, barber shops, beauty services',
                'icon': '🧼',
                'features': {
                    'requires_appointments': True,
                },
                'modules': ['pos', 'inventory', 'sales_customers'],
            },
            {
                'code': 'corporate',
                'name': 'Corporate Stores / Staff Canteens',
                'description': 'Internal corporate stores, employee canteens',
                'icon': '💼',
                'features': {},
                'modules': ['pos', 'inventory', 'roles_permissions', 'sales_customers'],
            },
            {
                'code': 'ecommerce',
                'name': 'Online Shops (E-commerce Only)',
                'description': 'E-commerce businesses, online stores',
                'icon': '💻',
                'features': {},
                'modules': ['ecommerce_integration', 'inventory', 'multi_branch'],
            },
            {
                'code': 'professional_services',
                'name': 'Professional Services / Consulting',
                'description': 'Consulting firms, professional services, B2B service providers, supply of goods and services',
                'icon': '💼',
                'features': {},
                'modules': ['quotations_invoicing', 'sales_customers', 'financial_reporting', 'accounting', 'multi_branch'],
            },
            {
                'code': 'other',
                'name': 'Others (Custom Category)',
                'description': 'Custom business category for niche businesses',
                'icon': '⚙️',
                'features': {},
                'modules': ['pos', 'inventory'],
            },
        ]

        created_count = 0
        updated_count = 0

        for cat_data in categories_data:
            features = cat_data.pop('features', {})
            module_codes = cat_data.pop('modules', [])
            
            category, created = BusinessCategory.objects.update_or_create(
                code=cat_data['code'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data.get('description', ''),
                    'icon': cat_data.get('icon', ''),
                    'is_active': True,
                    **features
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Updated category: {category.name}'))
            
            # Clear existing module mappings
            CategoryModuleMapping.objects.filter(category=category).delete()
            
            # Add module mappings
            priority = len(module_codes)
            for module_code in module_codes:
                try:
                    module = Module.objects.get(code=module_code)
                    CategoryModuleMapping.objects.create(
                        category=category,
                        module=module,
                        is_required=(module_code in ['pos', 'inventory']),  # Core modules are required
                        priority=priority,
                        notes=f'Auto-activated for {category.name}'
                    )
                    priority -= 1
                except Module.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'Module "{module_code}" not found for category "{category.name}"')
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Business categories seeded successfully! '
                f'Created: {created_count}, Updated: {updated_count}'
            )
        )


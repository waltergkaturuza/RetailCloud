"""
Management command to create default modules and packages.
"""
from django.core.management.base import BaseCommand
from core.models import Module, Package


class Command(BaseCommand):
    help = 'Create default modules and packages for the system'
    
    def handle(self, *args, **options):
        self.stdout.write('Creating default modules...')
        
        modules_data = [
            # Core Modules
            {'name': 'Inventory Management', 'code': 'inventory', 'category': 'core', 'sort_order': 1},
            {'name': 'Point of Sale (POS)', 'code': 'pos', 'category': 'core', 'sort_order': 2},
            {'name': 'Sales & Customer Management', 'code': 'sales_customers', 'category': 'core', 'sort_order': 3},
            {'name': 'Supplier & Purchase Management', 'code': 'suppliers_purchases', 'category': 'core', 'sort_order': 4},
            {'name': 'User Roles & Permissions', 'code': 'roles_permissions', 'category': 'core', 'sort_order': 5},
            {'name': 'Financial Reporting', 'code': 'financial_reporting', 'category': 'core', 'sort_order': 6},
            
            # Advanced Modules
            {'name': 'AI Smart Analytics', 'code': 'ai_analytics', 'category': 'advanced', 'sort_order': 7},
            {'name': 'Multi-Branch Management', 'code': 'multi_branch', 'category': 'advanced', 'sort_order': 8},
            {'name': 'E-commerce Integration', 'code': 'ecommerce_integration', 'category': 'advanced', 'sort_order': 9},
            {'name': 'Mobile Manager App', 'code': 'mobile_app', 'category': 'advanced', 'sort_order': 10},
            {'name': 'Accounting Integration', 'code': 'accounting_integration', 'category': 'advanced', 'sort_order': 11},
            {'name': 'Double-Entry Accounting', 'code': 'accounting', 'category': 'advanced', 'sort_order': 11.5},
            {'name': 'QR/Barcode Automation', 'code': 'barcode_automation', 'category': 'advanced', 'sort_order': 12},
            {'name': 'Offline POS', 'code': 'offline_pos', 'category': 'advanced', 'sort_order': 13},
            {'name': 'Smart Security Features', 'code': 'security_features', 'category': 'advanced', 'sort_order': 14},
            
            # Specialized Modules
            {'name': 'Grocery Module', 'code': 'grocery_module', 'category': 'specialized', 'sort_order': 15},
            {'name': 'Electronics Module', 'code': 'electronics_module', 'category': 'specialized', 'sort_order': 16},
            {'name': 'Boutique/Clothing Module', 'code': 'boutique_module', 'category': 'specialized', 'sort_order': 17},
            
            # Bonus Modules
            {'name': 'AI CEO Chatbot', 'code': 'ai_chatbot', 'category': 'bonus', 'sort_order': 18},
            {'name': 'Weekly Report Automation', 'code': 'weekly_reports', 'category': 'bonus', 'sort_order': 19},
            {'name': 'Customer Credit Scoring', 'code': 'credit_scoring', 'category': 'bonus', 'sort_order': 20},
            {'name': 'Delivery Management', 'code': 'delivery_management', 'category': 'bonus', 'sort_order': 21},
            {'name': 'Gift Cards & eWallet', 'code': 'gift_cards', 'category': 'bonus', 'sort_order': 22},
        ]
        
        created_modules = []
        for module_data in modules_data:
            module, created = Module.objects.get_or_create(
                code=module_data['code'],
                defaults=module_data
            )
            if created:
                created_modules.append(module.name)
                self.stdout.write(self.style.SUCCESS(f'Created module: {module.name}'))
            else:
                self.stdout.write(f'Module already exists: {module.name}')
        
        self.stdout.write(f'\nCreated {len(created_modules)} new modules\n')
        
        # Create packages
        self.stdout.write('Creating default packages...')
        
        # Get core modules
        core_modules = Module.objects.filter(category='core')
        advanced_modules = Module.objects.filter(category='advanced')
        
        packages_data = [
            {
                'name': 'Starter Pack',
                'code': 'starter',
                'description': 'Essential features for small shops',
                'price_monthly': 10,
                'price_yearly': 100,
                'modules': core_modules.filter(code__in=['inventory', 'pos', 'financial_reporting']),
                'max_users': 3,
                'max_branches': 1,
                'sort_order': 1
            },
            {
                'name': 'Business Pack',
                'code': 'business',
                'description': 'Complete solution for growing businesses',
                'price_monthly': 25,
                'price_yearly': 250,
                'modules': core_modules.all(),
                'max_users': 10,
                'max_branches': 3,
                'sort_order': 2
            },
            {
                'name': 'Professional Pack',
                'code': 'professional',
                'description': 'Advanced features for established businesses',
                'price_monthly': 45,
                'price_yearly': 450,
                'modules': Module.objects.filter(code__in=[
                    'inventory', 'pos', 'sales_customers', 'suppliers_purchases',
                    'roles_permissions', 'financial_reporting', 'multi_branch',
                    'ai_analytics', 'barcode_automation', 'offline_pos'
                ]),
                'max_users': 25,
                'max_branches': 10,
                'sort_order': 3
            },
            {
                'name': 'Enterprise Pack',
                'code': 'enterprise',
                'description': 'Full feature set for large organizations',
                'price_monthly': 75,
                'price_yearly': 750,
                'modules': Module.objects.all(),
                'max_users': -1,  # Unlimited
                'max_branches': -1,  # Unlimited
                'sort_order': 4
            },
        ]
        
        for package_data in packages_data:
            modules = package_data.pop('modules')
            package, created = Package.objects.get_or_create(
                code=package_data['code'],
                defaults=package_data
            )
            if created:
                package.modules.set(modules)
                self.stdout.write(self.style.SUCCESS(f'Created package: {package.name}'))
            else:
                self.stdout.write(f'Package already exists: {package.name}')
        
        self.stdout.write(self.style.SUCCESS('\nSetup completed!'))





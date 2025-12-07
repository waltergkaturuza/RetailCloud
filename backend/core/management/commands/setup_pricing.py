"""
Management command to create default pricing rules.
"""
from django.core.management.base import BaseCommand
from core.pricing_models import PricingRule


class Command(BaseCommand):
    help = 'Create default pricing rules for RetailCloud'
    
    def handle(self, *args, **options):
        self.stdout.write('Creating default pricing rules...')
        
        # Create default pricing rule
        pricing_rule, created = PricingRule.objects.get_or_create(
            code='default',
            defaults={
                'name': 'Default Pricing',
                'category_price_monthly': 10.00,
                'user_price_monthly': 1.00,
                'branch_price_monthly': 5.00,
                'yearly_discount_percent': 20.00,
                'currency': 'USD',
                'is_active': True,
                'is_default': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Created default pricing rule: {pricing_rule.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Default pricing rule already exists: {pricing_rule.name}'))
        
        self.stdout.write(self.style.SUCCESS('Pricing rules setup complete!'))


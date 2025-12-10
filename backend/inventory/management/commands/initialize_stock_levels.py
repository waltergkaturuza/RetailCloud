"""
Management command to initialize stock levels for existing products that don't have them.
Run this once after deploying the signal to backfill stock levels for existing products.
"""
from django.core.management.base import BaseCommand
from inventory.models import Product, StockLevel
from core.models import Branch
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Initialize stock levels for all existing products that don\'t have stock levels yet'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            help='Tenant slug to process (if not provided, processes all tenants)',
        )

    def handle(self, *args, **options):
        tenant_slug = options.get('tenant')
        
        if tenant_slug:
            from core.models import Tenant
            try:
                tenants = [Tenant.objects.get(slug=tenant_slug)]
            except Tenant.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Tenant with slug "{tenant_slug}" not found.'))
                return
        else:
            from core.models import Tenant
            tenants = Tenant.objects.all()
        
        total_products_processed = 0
        total_stock_levels_created = 0
        
        for tenant in tenants:
            self.stdout.write(f'\nProcessing tenant: {tenant.company_name} (slug: {tenant.slug})')
            
            # Get all branches for this tenant
            branches = Branch.objects.filter(tenant=tenant, is_active=True)
            branch_count = branches.count()
            
            if branch_count == 0:
                self.stdout.write(self.style.WARNING(f'  No active branches found for tenant {tenant.company_name}. Skipping.'))
                continue
            
            self.stdout.write(f'  Found {branch_count} active branch(es)')
            
            # Get all products for this tenant
            products = Product.objects.filter(tenant=tenant)
            product_count = products.count()
            self.stdout.write(f'  Found {product_count} product(s)')
            
            for product in products:
                product_processed = False
                for branch in branches:
                    # Check if stock level already exists
                    stock_level_exists = StockLevel.objects.filter(
                        tenant=tenant,
                        branch=branch,
                        product=product
                    ).exists()
                    
                    if not stock_level_exists:
                        StockLevel.objects.create(
                            tenant=tenant,
                            branch=branch,
                            product=product,
                            quantity=0
                        )
                        total_stock_levels_created += 1
                        product_processed = True
                
                if product_processed:
                    total_products_processed += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Completed! Processed {total_products_processed} product(s) and created {total_stock_levels_created} stock level(s).'
        ))


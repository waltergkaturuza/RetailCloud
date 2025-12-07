"""
Django management command to create a default tenant and assign it to the admin user.
"""
from django.core.management.base import BaseCommand
from core.models import Tenant, Branch
from accounts.models import User


class Command(BaseCommand):
    help = 'Create a default tenant and assign it to the first user'

    def handle(self, *args, **options):
        # Check if tenant already exists
        existing_tenant = Tenant.objects.filter(slug='default').first()
        if existing_tenant:
            self.stdout.write(
                self.style.WARNING(f'Tenant with slug "default" already exists: {existing_tenant.company_name}')
            )
            tenant = existing_tenant
        else:
            # Create default tenant
            tenant = Tenant.objects.create(
                name='Default Shop',
                slug='default',
                company_name='Default Shop',
                contact_person='Admin',
                email='admin@shopmanagementsys.com',
                phone='+263',
                subscription_status='trial',
                is_active=True,
            )
            self.stdout.write(
                self.style.SUCCESS(f'Created tenant: {tenant.company_name} (slug: {tenant.slug})')
            )

        # Create default branch
        branch, created = Branch.objects.get_or_create(
            tenant=tenant,
            code='MAIN',
            defaults={
                'name': 'Main Branch',
                'is_main': True,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created branch: {branch.name}'))

        # Assign tenant to all users without a tenant
        users_without_tenant = User.objects.filter(tenant__isnull=True)
        count = users_without_tenant.update(tenant=tenant)
        
        if count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Assigned tenant to {count} user(s)')
            )
        else:
            self.stdout.write(
                self.style.WARNING('All users already have a tenant assigned')
            )

        self.stdout.write(
            self.style.SUCCESS(f'\nSetup complete! Tenant: {tenant.company_name}, Users updated: {count}')
        )


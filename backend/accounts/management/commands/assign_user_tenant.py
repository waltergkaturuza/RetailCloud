"""
Management command to assign users to tenants.
"""
from django.core.management.base import BaseCommand
from accounts.models import User
from core.models import Tenant


class Command(BaseCommand):
    help = 'Assign users to a tenant'

    def add_arguments(self, parser):
        parser.add_argument('--user-email', type=str, help='Email of user to assign')
        parser.add_argument('--tenant-name', type=str, help='Name of tenant to assign to')
        parser.add_argument('--tenant-id', type=int, help='ID of tenant to assign to')
        parser.add_argument('--all-unassigned', action='store_true', help='Assign all users without tenants to a tenant')

    def handle(self, *args, **options):
        user_email = options.get('user_email')
        tenant_name = options.get('tenant_name')
        tenant_id = options.get('tenant_id')
        all_unassigned = options.get('all_unassigned')

        # Get tenant
        tenant = None
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Tenant with ID {tenant_id} not found'))
                return
        elif tenant_name:
            tenants = Tenant.objects.filter(company_name__icontains=tenant_name)
            if tenants.count() == 0:
                self.stdout.write(self.style.ERROR(f'Tenant "{tenant_name}" not found'))
                return
            elif tenants.count() > 1:
                self.stdout.write(self.style.WARNING(f'Multiple tenants found matching "{tenant_name}":'))
                for t in tenants:
                    self.stdout.write(f'  - ID {t.id}: {t.company_name}')
                return
            tenant = tenants.first()
        else:
            self.stdout.write(self.style.ERROR('Please provide either --tenant-name or --tenant-id'))
            return

        if all_unassigned:
            # Assign all users without tenants
            users_without_tenant = User.objects.filter(tenant__isnull=True).exclude(role='super_admin')
            count = users_without_tenant.count()
            if count == 0:
                self.stdout.write(self.style.SUCCESS('No users without tenants found'))
                return
            
            self.stdout.write(f'Found {count} user(s) without tenants:')
            for user in users_without_tenant:
                self.stdout.write(f'  - {user.email} ({user.role})')
            
            # Assign them
            updated = users_without_tenant.update(tenant=tenant)
            self.stdout.write(self.style.SUCCESS(f'✅ Assigned {updated} user(s) to tenant: {tenant.company_name}'))
            return

        if not user_email:
            self.stdout.write(self.style.ERROR('Please provide --user-email or use --all-unassigned'))
            return

        # Get user
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email "{user_email}" not found'))
            return

        # Assign tenant
        old_tenant = user.tenant
        user.tenant = tenant
        user.save()

        if old_tenant:
            self.stdout.write(self.style.SUCCESS(
                f'✅ Changed tenant for {user.email} from "{old_tenant.company_name}" to "{tenant.company_name}"'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'✅ Assigned {user.email} to tenant: {tenant.company_name}'
            ))



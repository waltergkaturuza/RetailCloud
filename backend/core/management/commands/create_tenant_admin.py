"""
Management command to create admin user for a tenant.
Useful for fixing tenants that were created before auto-admin creation was implemented.
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from core.models import Tenant
import secrets
import string

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a tenant admin user for a tenant'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-id',
            type=int,
            help='Tenant ID to create admin for',
        )
        parser.add_argument(
            '--tenant-slug',
            type=str,
            help='Tenant slug to create admin for',
        )
        parser.add_argument(
            '--tenant-name',
            type=str,
            help='Tenant company name to create admin for',
        )
        parser.add_argument(
            '--all-missing',
            action='store_true',
            help='Create admin users for all tenants that don\'t have one',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Custom password (otherwise generates random)',
        )

    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        tenant_slug = options.get('tenant_slug')
        tenant_name = options.get('tenant_name')
        all_missing = options.get('all_missing')
        custom_password = options.get('password')

        if all_missing:
            # Find all tenants without admin users
            tenants = Tenant.objects.all()
            created_count = 0
            skipped_count = 0
            
            for tenant in tenants:
                admin_exists = User.objects.filter(tenant=tenant, role='tenant_admin').exists()
                if admin_exists:
                    skipped_count += 1
                    continue
                
                try:
                    self.create_admin_user(tenant, custom_password)
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Created admin for: {tenant.company_name}')
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Failed for {tenant.company_name}: {str(e)}')
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nCompleted: Created {created_count}, Skipped {skipped_count} (already have admin)'
                )
            )
        else:
            # Find specific tenant
            tenant = None
            if tenant_id:
                tenant = Tenant.objects.filter(id=tenant_id).first()
            elif tenant_slug:
                tenant = Tenant.objects.filter(slug=tenant_slug).first()
            elif tenant_name:
                tenant = Tenant.objects.filter(company_name__icontains=tenant_name).first()
            else:
                raise CommandError('Must provide --tenant-id, --tenant-slug, --tenant-name, or --all-missing')

            if not tenant:
                raise CommandError('Tenant not found')

            # Check if admin already exists
            if User.objects.filter(tenant=tenant, role='tenant_admin').exists():
                self.stdout.write(
                    self.style.WARNING(f'Tenant {tenant.company_name} already has an admin user')
                )
                return

            self.create_admin_user(tenant, custom_password)
            self.stdout.write(
                self.style.SUCCESS(f'✅ Created admin user for tenant: {tenant.company_name}')
            )

    def create_admin_user(self, tenant, custom_password=None):
        """Create admin user for a tenant."""
        # Generate password if not provided
        if custom_password:
            admin_password = custom_password
        else:
            password_length = 12
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            admin_password = ''.join(secrets.choice(alphabet) for _ in range(password_length))

        # Generate username
        admin_email = tenant.email
        admin_username = tenant.slug + '_admin'

        # Ensure username is unique
        base_username = admin_username
        counter = 1
        while User.objects.filter(username=admin_username).exists():
            admin_username = f"{base_username}_{counter}"
            counter += 1

        # Extract first and last name from contact_person if available
        contact_parts = tenant.contact_person.split(' ', 1) if tenant.contact_person else ['', '']
        first_name = contact_parts[0] if len(contact_parts) > 0 else 'Admin'
        last_name = contact_parts[1] if len(contact_parts) > 1 else tenant.company_name

        admin_user = User.objects.create_user(
            username=admin_username,
            email=admin_email,
            password=admin_password,
            first_name=first_name,
            last_name=last_name,
            phone=tenant.phone,
            role='tenant_admin',
            tenant=tenant,
            is_active=True,
            is_staff=True,
        )

        self.stdout.write(f'  Username: {admin_username}')
        self.stdout.write(f'  Email: {admin_email}')
        self.stdout.write(f'  Password: {admin_password}')
        self.stdout.write(f'  ⚠️  Please save these credentials securely!')

        return admin_user




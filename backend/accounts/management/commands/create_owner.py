"""
Django management command to create a system owner (super_admin user without tenant).
Usage: python manage.py create_owner --email owner@example.com --password securepassword
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a system owner (super_admin user without tenant)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email address for the owner'
        )
        parser.add_argument(
            '--password',
            type=str,
            required=True,
            help='Password for the owner'
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username (optional, defaults to email)'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            default='',
            help='First name (optional)'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            default='',
            help='Last name (optional)'
        )
        parser.add_argument(
            '--skip-validation',
            action='store_true',
            help='Skip validation checks (not recommended)'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        username = options.get('username') or email
        first_name = options.get('first_name', '')
        last_name = options.get('last_name', '')
        skip_validation = options.get('skip_validation', False)

        # Validate email
        if not email or '@' not in email:
            raise CommandError('Valid email address is required')

        # Validate password
        if len(password) < 8:
            if not skip_validation:
                raise CommandError('Password must be at least 8 characters long. Use --skip-validation to override.')
            else:
                self.stdout.write(self.style.WARNING('Password is less than 8 characters. Proceeding anyway...'))

        with transaction.atomic():
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                raise CommandError(f'User with email {email} already exists')

            if User.objects.filter(username=username).exists():
                raise CommandError(f'User with username {username} already exists')

            # Create the owner user
            try:
                owner = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role='super_admin',
                    tenant=None,  # No tenant - this is a system owner
                    is_staff=True,
                    is_superuser=True,  # Also make superuser for Django admin access
                    is_active=True,
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✅ Successfully created system owner:\n'
                        f'   Email: {owner.email}\n'
                        f'   Username: {owner.username}\n'
                        f'   Role: {owner.get_role_display()}\n'
                        f'   Tenant: None (System Owner)\n'
                        f'\n📝 You can now login to the Owner Portal at:\n'
                        f'   http://localhost:3000/owner/login\n'
                    )
                )

            except Exception as e:
                raise CommandError(f'Error creating owner: {str(e)}')


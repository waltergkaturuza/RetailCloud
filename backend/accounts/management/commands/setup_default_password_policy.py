"""
Management command to create default password policy.
"""
from django.core.management.base import BaseCommand
from accounts.security_models import PasswordPolicy


class Command(BaseCommand):
    help = 'Create default system-wide password policy'
    
    def handle(self, *args, **options):
        policy, created = PasswordPolicy.objects.get_or_create(
            tenant=None,
            defaults={
                'min_length': 8,
                'require_uppercase': True,
                'require_lowercase': True,
                'require_digits': True,
                'require_special_chars': True,
                'special_chars': '!@#$%^&*()_+-=[]{}|;:,.<>?',
                'password_expiry_days': None,  # No expiration by default
                'password_history_count': 5,
                'max_login_attempts': 5,
                'lockout_duration_minutes': 30,
                'session_timeout_minutes': 480,  # 8 hours
                'max_concurrent_sessions': 5,
                'is_active': True,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Default password policy created successfully.'))
        else:
            self.stdout.write(self.style.WARNING('Default password policy already exists.'))


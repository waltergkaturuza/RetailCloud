"""
Management command to check and notify users with expired passwords.
Should be run daily via cron job.
"""
from django.core.management.base import BaseCommand
from accounts.models import User
from accounts.email_notifications import PasswordExpirationService, SecurityEmailService
from accounts.security_service import SecurityService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check for expired passwords and send notifications'
    
    def handle(self, *args, **options):
        self.stdout.write('Checking for expired passwords...')
        
        expired_count = 0
        notified_count = 0
        
        # Get all active users
        active_users = User.objects.filter(is_active=True)
        
        for user in active_users:
            try:
                is_expired, days_remaining = PasswordExpirationService.check_password_expiration(user)
                
                if is_expired:
                    expired_count += 1
                    # Send expired password notification
                    try:
                        SecurityEmailService.send_password_expired_notification(user)
                        notified_count += 1
                    except Exception as e:
                        logger.error(f"Failed to send expired password notification to {user.email}: {str(e)}", exc_info=True)
            except Exception as e:
                logger.error(f"Error checking password expiration for user {user.email}: {str(e)}", exc_info=True)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Found {expired_count} expired password(s). Sent {notified_count} notification(s).'
            )
        )




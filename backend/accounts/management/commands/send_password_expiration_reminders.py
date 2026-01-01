"""
Management command to send password expiration reminders.
Should be run daily via cron job.
"""
from django.core.management.base import BaseCommand
from accounts.email_notifications import PasswordExpirationService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send password expiration reminders to users whose passwords will expire soon'
    
    def handle(self, *args, **options):
        self.stdout.write('Starting password expiration reminder process...')
        
        try:
            reminders_sent = PasswordExpirationService.send_expiration_reminders()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully sent {reminders_sent} password expiration reminder(s).'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error sending password expiration reminders: {str(e)}')
            )
            logger.error(f"Failed to send password expiration reminders: {str(e)}", exc_info=True)
            raise




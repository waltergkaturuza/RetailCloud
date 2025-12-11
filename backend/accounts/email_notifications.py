"""
Email notifications for security events and password expiration.
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging

from .models import User
from .security_models import SecurityEvent, PasswordHistory

logger = logging.getLogger(__name__)


class SecurityEmailService:
    """Service for sending security-related email notifications."""
    
    @staticmethod
    def send_failed_login_alert(user: User, ip_address: str, attempt_count: int):
        """Send email alert for failed login attempts."""
        try:
            subject = f"Security Alert: Failed Login Attempts for {user.email}"
            context = {
                'user': user,
                'ip_address': ip_address,
                'attempt_count': attempt_count,
                'login_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/login",
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
            }
            
            html_message = render_to_string('security_emails/failed_login_alert.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Failed login alert email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send failed login alert email: {str(e)}", exc_info=True)
    
    @staticmethod
    def send_account_locked_alert(user: User, ip_address: str, unlock_time: timezone.datetime):
        """Send email alert when account is locked."""
        try:
            subject = f"Security Alert: Account Temporarily Locked"
            context = {
                'user': user,
                'ip_address': ip_address,
                'unlock_time': unlock_time,
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
            }
            
            html_message = render_to_string('security_emails/account_locked.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Account locked alert email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send account locked alert email: {str(e)}", exc_info=True)
    
    @staticmethod
    def send_new_device_login(user: User, device_name: str, ip_address: str, location: str):
        """Send email alert for login from new device."""
        try:
            subject = f"New Device Login Detected"
            context = {
                'user': user,
                'device_name': device_name,
                'ip_address': ip_address,
                'location': location,
                'login_time': timezone.now(),
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
                'security_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/settings?tab=security",
            }
            
            html_message = render_to_string('security_emails/new_device_login.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"New device login email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send new device login email: {str(e)}", exc_info=True)
    
    @staticmethod
    def send_2fa_enabled_notification(user: User):
        """Send email notification when 2FA is enabled."""
        try:
            subject = f"Two-Factor Authentication Enabled"
            context = {
                'user': user,
                'enabled_time': timezone.now(),
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
            }
            
            html_message = render_to_string('security_emails/2fa_enabled.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"2FA enabled notification email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send 2FA enabled notification email: {str(e)}", exc_info=True)
    
    @staticmethod
    def send_password_changed_notification(user: User, ip_address: str):
        """Send email notification when password is changed."""
        try:
            subject = f"Password Changed Successfully"
            context = {
                'user': user,
                'ip_address': ip_address,
                'changed_time': timezone.now(),
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
                'reset_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/reset-password",
            }
            
            html_message = render_to_string('security_emails/password_changed.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Password changed notification email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send password changed notification email: {str(e)}", exc_info=True)
    
    @staticmethod
    def send_password_expiration_reminder(user: User, days_remaining: int):
        """Send email reminder before password expires."""
        try:
            subject = f"Password Expiring Soon - {days_remaining} Day(s) Remaining"
            context = {
                'user': user,
                'days_remaining': days_remaining,
                'change_password_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/settings?tab=security",
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
            }
            
            html_message = render_to_string('security_emails/password_expiration_reminder.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Password expiration reminder email sent to {user.email} ({days_remaining} days remaining)")
        except Exception as e:
            logger.error(f"Failed to send password expiration reminder email: {str(e)}", exc_info=True)
    
    @staticmethod
    def send_password_expired_notification(user: User):
        """Send email notification when password has expired."""
        try:
            subject = f"Your Password Has Expired - Action Required"
            context = {
                'user': user,
                'change_password_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/change-password",
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
            }
            
            html_message = render_to_string('security_emails/password_expired.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Password expired notification email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send password expired notification email: {str(e)}", exc_info=True)
    
    @staticmethod
    def send_security_event_alert(user: User, event: SecurityEvent):
        """Send email alert for critical security events."""
        try:
            # Only send emails for high/critical severity events
            if event.severity not in ['high', 'critical']:
                return
            
            # Format event type for display
            event_type_display = event.event_type.replace('_', ' ').replace('-', ' ').title()
            subject = f"Security Alert: {event_type_display}"
            context = {
                'user': user,
                'event': event,
                'event_type_display': event_type_display,
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@retailcloud.com'),
                'security_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/settings?tab=security",
            }
            
            html_message = render_to_string('security_emails/security_event_alert.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Security event alert email sent to {user.email} for event: {event.event_type}")
        except Exception as e:
            logger.error(f"Failed to send security event alert email: {str(e)}", exc_info=True)


class PasswordExpirationService:
    """Service for password expiration checking and enforcement."""
    
    @staticmethod
    def check_password_expiration(user: User) -> tuple[bool, int | None]:
        """
        Check if user's password is expired or expiring soon.
        
        Returns:
            Tuple of (is_expired: bool, days_remaining: int | None)
            If password doesn't expire, returns (False, None)
        """
        from .security_service import SecurityService
        
        # Get password policy
        policy = SecurityService.get_password_policy(user.tenant)
        
        # If no expiration set, password never expires
        if not policy.password_expiry_days:
            return False, None
        
        # Get most recent password from history
        latest_password = PasswordHistory.objects.filter(user=user).order_by('-created_at').first()
        
        if not latest_password:
            # No password history means password was set before history tracking
            # Check if user was created within expiration period
            if user.date_joined:
                days_old = (timezone.now() - user.date_joined).days
                is_expired = days_old > policy.password_expiry_days
                days_remaining = policy.password_expiry_days - days_old if not is_expired else None
                return is_expired, days_remaining
        
        # Check password age
        days_old = (timezone.now() - latest_password.created_at).days
        is_expired = days_old >= policy.password_expiry_days
        days_remaining = policy.password_expiry_days - days_old if not is_expired else None
        
        return is_expired, days_remaining
    
    @staticmethod
    def send_expiration_reminders():
        """Send password expiration reminders to users whose passwords will expire soon."""
        from .security_service import SecurityService
        
        users_to_remind = []
        
        # Get all active users
        active_users = User.objects.filter(is_active=True)
        
        for user in active_users:
            is_expired, days_remaining = PasswordExpirationService.check_password_expiration(user)
            
            # Send reminder if password expires in 7, 3, or 1 days
            if not is_expired and days_remaining and days_remaining in [7, 3, 1]:
                users_to_remind.append((user, days_remaining))
        
        # Send reminder emails
        for user, days_remaining in users_to_remind:
            try:
                SecurityEmailService.send_password_expiration_reminder(user, days_remaining)
            except Exception as e:
                logger.error(f"Failed to send expiration reminder to {user.email}: {str(e)}", exc_info=True)
        
        return len(users_to_remind)


"""
Notification service for sending and managing user notifications.
"""
from django.utils import timezone
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from typing import Optional, Dict, Any, List
import logging

from accounts.models import User
from .models import Tenant
from .notification_models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and sending notifications."""
    
    @staticmethod
    def get_or_create_preferences(user: User) -> NotificationPreference:
        """Get or create notification preferences for a user."""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=user,
            defaults={
                'email_enabled': True,
                'in_app_enabled': True,
                'push_enabled': True,
            }
        )
        return preferences
    
    @staticmethod
    def send_notification(
        user: User,
        title: str,
        message: str,
        notification_type: str = 'other',
        priority: str = 'normal',
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        icon: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tenant: Optional[Tenant] = None,
        expires_at: Optional[timezone.datetime] = None,
        send_email: bool = False,
        send_sms: bool = False,
    ) -> Notification:
        """
        Send a notification to a user.
        
        Args:
            user: User to send notification to
            title: Notification title
            message: Notification message
            notification_type: Type of notification (sale, inventory, etc.)
            priority: Priority level (low, normal, high, urgent)
            action_url: URL to navigate to when clicked
            action_text: Text for action button
            icon: Icon name or emoji
            metadata: Additional metadata
            tenant: Associated tenant (optional)
            expires_at: Expiration date (optional)
            send_email: Whether to send email notification
            send_sms: Whether to send SMS notification
            
        Returns:
            Created Notification instance
        """
        # Get user preferences
        preferences = NotificationService.get_or_create_preferences(user)
        
        # Check if in-app notifications are enabled for this type
        in_app_enabled = preferences.in_app_enabled
        if notification_type == 'sale' and not preferences.in_app_sales:
            in_app_enabled = False
        elif notification_type == 'inventory' and not preferences.in_app_inventory:
            in_app_enabled = False
        elif notification_type == 'customer' and not preferences.in_app_customer:
            in_app_enabled = False
        elif notification_type == 'system' and not preferences.in_app_system:
            in_app_enabled = False
        elif notification_type == 'security' and not preferences.in_app_security:
            in_app_enabled = False
        
        # Create notification if in-app is enabled
        notification = None
        if in_app_enabled:
            notification = Notification.objects.create(
                user=user,
                tenant=tenant or (user.tenant if hasattr(user, 'tenant') else None),
                type=notification_type,
                title=title,
                message=message,
                priority=priority,
                action_url=action_url or '',
                action_text=action_text or '',
                icon=icon or NotificationService._get_default_icon(notification_type),
                metadata=metadata or {},
                expires_at=expires_at,
            )
            
            # Send real-time notification via WebSocket
            NotificationService._send_websocket_notification(user, notification)
        
        # Send email if enabled
        if send_email and preferences.email_enabled:
            NotificationService._send_email_notification(user, title, message, notification_type)
        
        # Send SMS if enabled (only for urgent)
        if send_sms and preferences.sms_enabled and (priority == 'urgent' or not preferences.sms_urgent_only):
            NotificationService._send_sms_notification(user, title, message)
        
        return notification
    
    @staticmethod
    def send_bulk_notifications(
        users: List[User],
        title: str,
        message: str,
        notification_type: str = 'system',
        priority: str = 'normal',
        **kwargs
    ) -> List[Notification]:
        """Send notifications to multiple users."""
        notifications = []
        for user in users:
            try:
                notification = NotificationService.send_notification(
                    user=user,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    priority=priority,
                    **kwargs
                )
                if notification:
                    notifications.append(notification)
            except Exception as e:
                logger.error(f"Failed to send notification to user {user.id}: {str(e)}", exc_info=True)
        return notifications
    
    @staticmethod
    def send_tenant_notification(
        tenant: Tenant,
        title: str,
        message: str,
        notification_type: str = 'system',
        priority: str = 'normal',
        user_filter: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> List[Notification]:
        """
        Send notification to all users in a tenant (or filtered subset).
        
        Args:
            tenant: Tenant to send notifications to
            title: Notification title
            message: Notification message
            notification_type: Type of notification
            priority: Priority level
            user_filter: Optional filter dict for users (e.g., {'role': 'tenant_admin'})
            **kwargs: Additional arguments for send_notification
        """
        from accounts.models import User
        
        # Get users for tenant
        users_query = User.objects.filter(tenant=tenant, is_active=True)
        
        # Apply filters if provided
        if user_filter:
            users_query = users_query.filter(**user_filter)
        
        users = list(users_query)
        return NotificationService.send_bulk_notifications(
            users=users,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            tenant=tenant,
            **kwargs
        )
    
    @staticmethod
    def _send_websocket_notification(user: User, notification: Notification):
        """Send notification via WebSocket."""
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user.id}_notifications",
                    {
                        'type': 'notification_message',
                        'message': {
                            'id': notification.id,
                            'type': notification.type,
                            'title': notification.title,
                            'message': notification.message,
                            'priority': notification.priority,
                            'action_url': notification.action_url,
                            'action_text': notification.action_text,
                            'icon': notification.icon,
                            'metadata': notification.metadata,
                            'created_at': notification.created_at.isoformat(),
                            'is_read': notification.is_read,
                        }
                    }
                )
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification: {str(e)}", exc_info=True)
    
    @staticmethod
    def _send_email_notification(user: User, title: str, message: str, notification_type: str):
        """Send email notification."""
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            # Check if email is enabled for this notification type
            preferences = NotificationService.get_or_create_preferences(user)
            if not preferences.email_enabled:
                return
            
            if notification_type == 'sale' and not preferences.email_sales:
                return
            elif notification_type == 'inventory' and not preferences.email_inventory:
                return
            elif notification_type == 'customer' and not preferences.email_customer:
                return
            elif notification_type == 'system' and not preferences.email_system:
                return
            elif notification_type == 'security' and not preferences.email_security:
                return
            
            subject = f"[RetailCloud] {title}"
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com'),
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}", exc_info=True)
    
    @staticmethod
    def _send_sms_notification(user: User, title: str, message: str):
        """Send SMS notification."""
        try:
            from accounts.sms_service import SMSService
            
            if not user.phone:
                return
            
            sms_message = f"{title}: {message[:100]}"  # Limit SMS length
            success, error = SMSService.send_sms(user.phone, sms_message)
            if not success:
                logger.warning(f"Failed to send SMS notification: {error}")
        except Exception as e:
            logger.error(f"Failed to send SMS notification: {str(e)}", exc_info=True)
    
    @staticmethod
    def _get_default_icon(notification_type: str) -> str:
        """Get default icon for notification type."""
        icons = {
            'sale': '💰',
            'inventory': '📦',
            'customer': '👤',
            'purchase': '🛒',
            'system': '⚙️',
            'security': '🔒',
            'marketing': '📢',
            'payment': '💳',
            'report': '📊',
            'other': '🔔',
        }
        return icons.get(notification_type, '🔔')
    
    @staticmethod
    def mark_as_read(notification_id: int, user: User) -> bool:
        """Mark a notification as read."""
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False
    
    @staticmethod
    def mark_all_as_read(user: User) -> int:
        """Mark all notifications as read for a user."""
        count = Notification.objects.filter(
            user=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        return count
    
    @staticmethod
    def get_unread_count(user: User) -> int:
        """Get count of unread notifications for a user."""
        return Notification.objects.filter(user=user, is_read=False).count()
    
    @staticmethod
    def delete_expired_notifications():
        """Delete expired notifications (run as scheduled task)."""
        count = Notification.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()[0]
        logger.info(f"Deleted {count} expired notifications")
        return count



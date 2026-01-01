"""
Notification models for user notifications.
"""
from django.db import models
from django.utils import timezone
from accounts.models import User
from .models import Tenant


class Notification(models.Model):
    """User notification model."""
    
    NOTIFICATION_TYPES = [
        ('sale', 'Sale'),
        ('inventory', 'Inventory'),
        ('customer', 'Customer'),
        ('purchase', 'Purchase'),
        ('system', 'System'),
        ('security', 'Security'),
        ('marketing', 'Marketing'),
        ('payment', 'Payment'),
        ('report', 'Report'),
        ('other', 'Other'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )
    
    # Notification content
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='other')
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='normal')
    
    # Action/URL
    action_url = models.CharField(max_length=500, blank=True, help_text="URL to navigate to when clicked")
    action_text = models.CharField(max_length=100, blank=True, help_text="Text for action button")
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional data for the notification")
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name or emoji")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Auto-archive after this date")
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['tenant', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    @property
    def is_expired(self):
        """Check if notification has expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class NotificationPreference(models.Model):
    """User notification preferences."""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Email preferences
    email_enabled = models.BooleanField(default=True)
    email_sales = models.BooleanField(default=True)
    email_inventory = models.BooleanField(default=True)
    email_customer = models.BooleanField(default=True)
    email_system = models.BooleanField(default=True)
    email_security = models.BooleanField(default=True)
    
    # In-app preferences
    in_app_enabled = models.BooleanField(default=True)
    in_app_sales = models.BooleanField(default=True)
    in_app_inventory = models.BooleanField(default=True)
    in_app_customer = models.BooleanField(default=True)
    in_app_system = models.BooleanField(default=True)
    in_app_security = models.BooleanField(default=True)
    
    # SMS preferences (optional, requires SMS gateway)
    sms_enabled = models.BooleanField(default=False)
    sms_urgent_only = models.BooleanField(default=True, help_text="Only send SMS for urgent notifications")
    
    # Push notification preferences (for mobile apps)
    push_enabled = models.BooleanField(default=True)
    
    # Quiet hours (don't send notifications during these hours)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_preferences'
    
    def __str__(self):
        return f"Notification preferences for {self.user.email}"


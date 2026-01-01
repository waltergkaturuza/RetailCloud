"""
Audit logging system for tracking all system activities.
"""
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
from accounts.models import User


class AuditLog(models.Model):
    """Comprehensive audit log for all system activities."""
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('void', 'Void'),
        ('refund', 'Refund'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
    ]
    
    tenant = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='audit_logs',
        null=True,
        blank=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='audit_logs',
        null=True,
        blank=True
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    object_repr = models.CharField(max_length=255)
    
    # Generic foreign key to any model
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    changes = models.JSONField(default=dict, help_text="Field changes (old -> new)")
    metadata = models.JSONField(default=dict, help_text="Additional context")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['model_name', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user or 'System'} - {self.action} - {self.model_name} at {self.created_at}"


class AuditLogMixin:
    """Mixin to automatically log model changes."""
    
    def log_change(self, user, action, changes=None, metadata=None, request=None):
        """Log a change to this model."""
        from core.models import Tenant
        
        tenant = None
        if hasattr(self, 'tenant'):
            tenant = self.tenant
        elif hasattr(user, 'tenant'):
            tenant = user.tenant
        
        ip_address = None
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        AuditLog.objects.create(
            tenant=tenant,
            user=user,
            action=action,
            model_name=self.__class__.__name__,
            object_id=self.pk,
            object_repr=str(self),
            content_type=ContentType.objects.get_for_model(self),
            changes=changes or {},
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip





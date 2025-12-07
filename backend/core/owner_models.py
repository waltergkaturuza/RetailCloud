"""
Models for System Owner/Super Admin functionality.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Tenant

User = get_user_model()


class SystemSettings(models.Model):
    """System-wide settings managed by owner."""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    data_type = models.CharField(
        max_length=20,
        choices=[
            ('string', 'String'),
            ('number', 'Number'),
            ('boolean', 'Boolean'),
            ('json', 'JSON'),
        ],
        default='string'
    )
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=50,
        choices=[
            ('currency', 'Currency & Exchange Rates'),
            ('payment', 'Payment Methods'),
            ('tax', 'Tax & Compliance'),
            ('pos', 'POS Settings'),
            ('integration', 'Integrations'),
            ('security', 'Security'),
            ('notification', 'Notifications'),
            ('other', 'Other'),
        ],
        default='other'
    )
    is_public = models.BooleanField(
        default=False,
        help_text="If True, tenants can view this setting"
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='updated_settings'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_settings'
        verbose_name_plural = 'System Settings'
        ordering = ['category', 'key']
    
    def __str__(self):
        return f"{self.category}.{self.key}"
    
    def get_value(self):
        """Get typed value."""
        if self.data_type == 'number':
            try:
                if '.' in self.value:
                    return float(self.value)
                return int(self.value)
            except ValueError:
                return 0
        elif self.data_type == 'boolean':
            return self.value.lower() in ('true', '1', 'yes')
        elif self.data_type == 'json':
            import json
            try:
                return json.loads(self.value)
            except:
                return {}
        return self.value


class OwnerAuditLog(models.Model):
    """Audit log for owner/admin actions."""
    ACTION_TYPES = [
        ('tenant_create', 'Tenant Created'),
        ('tenant_update', 'Tenant Updated'),
        ('tenant_delete', 'Tenant Deleted'),
        ('tenant_suspend', 'Tenant Suspended'),
        ('tenant_activate', 'Tenant Activated'),
        ('user_create', 'User Created'),
        ('user_update', 'User Updated'),
        ('user_delete', 'User Deleted'),
        ('user_suspend', 'User Suspended'),
        ('setting_change', 'Setting Changed'),
        ('subscription_change', 'Subscription Changed'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('data_export', 'Data Exported'),
        ('data_import', 'Data Imported'),
        ('backup_created', 'Backup Created'),
        ('system_update', 'System Updated'),
        ('security_alert', 'Security Alert'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='owner_audit_logs'
    )
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    description = models.TextField()
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owner_audit_logs'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'owner_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['action_type']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['tenant', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_action_type_display()} by {self.user or 'System'} at {self.created_at}"


class SystemHealthMetric(models.Model):
    """System health and performance metrics."""
    metric_type = models.CharField(
        max_length=50,
        choices=[
            ('api_uptime', 'API Uptime'),
            ('server_load', 'Server Load'),
            ('database_connections', 'Database Connections'),
            ('active_pos_terminals', 'Active POS Terminals'),
            ('sync_errors', 'Sync Errors'),
            ('active_tenants', 'Active Tenants'),
            ('total_transactions', 'Total Transactions'),
            ('response_time', 'Response Time'),
            ('error_rate', 'Error Rate'),
            ('storage_usage', 'Storage Usage'),
        ]
    )
    value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('healthy', 'Healthy'),
            ('warning', 'Warning'),
            ('critical', 'Critical'),
        ],
        default='healthy'
    )
    metadata = models.JSONField(default=dict, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'system_health_metrics'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['-recorded_at', 'metric_type']),
            models.Index(fields=['metric_type', '-recorded_at']),
        ]
    
    def __str__(self):
        return f"{self.get_metric_type_display()}: {self.value} {self.unit}"


class SystemAnnouncement(models.Model):
    """System-wide announcements from owner to tenants."""
    title = models.CharField(max_length=255)
    message = models.TextField()
    announcement_type = models.CharField(
        max_length=50,
        choices=[
            ('info', 'Information'),
            ('warning', 'Warning'),
            ('maintenance', 'Maintenance'),
            ('update', 'Update'),
            ('important', 'Important'),
        ],
        default='info'
    )
    target_tenants = models.ManyToManyField(
        Tenant,
        blank=True,
        help_text="Leave empty to send to all tenants"
    )
    is_active = models.BooleanField(default=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_announcements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_announcements'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class TenantBackup(models.Model):
    """Backup records for tenant data."""
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='backups'
    )
    backup_type = models.CharField(
        max_length=50,
        choices=[
            ('full', 'Full Backup'),
            ('incremental', 'Incremental'),
            ('database_only', 'Database Only'),
            ('files_only', 'Files Only'),
        ],
        default='full'
    )
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(help_text="Size in bytes")
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_backups'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'tenant_backups'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.tenant.name} - {self.backup_type} - {self.created_at}"


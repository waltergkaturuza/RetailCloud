"""
Admin configuration for Owner/Super Admin models.
"""
from django.contrib import admin
from .owner_models import (
    SystemSettings, OwnerAuditLog, SystemHealthMetric,
    SystemAnnouncement, TenantBackup
)


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['key', 'category', 'data_type', 'is_public', 'updated_by', 'updated_at']
    list_filter = ['category', 'data_type', 'is_public']
    search_fields = ['key', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Setting', {
            'fields': ('key', 'value', 'data_type', 'description', 'category')
        }),
        ('Visibility', {
            'fields': ('is_public',)
        }),
        ('Metadata', {
            'fields': ('updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(OwnerAuditLog)
class OwnerAuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action_type', 'tenant', 'ip_address', 'created_at']
    list_filter = ['action_type', 'created_at', 'tenant']
    search_fields = ['user__email', 'description', 'tenant__name']
    readonly_fields = ['user', 'action_type', 'description', 'tenant', 'ip_address', 'user_agent', 'metadata', 'created_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(SystemHealthMetric)
class SystemHealthMetricAdmin(admin.ModelAdmin):
    list_display = ['metric_type', 'value', 'unit', 'status', 'recorded_at']
    list_filter = ['metric_type', 'status', 'recorded_at']
    readonly_fields = ['recorded_at']
    date_hierarchy = 'recorded_at'
    ordering = ['-recorded_at']


@admin.register(SystemAnnouncement)
class SystemAnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'announcement_type', 'is_active', 'created_by', 'created_at']
    list_filter = ['announcement_type', 'is_active', 'created_at']
    search_fields = ['title', 'message']
    filter_horizontal = ['target_tenants']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TenantBackup)
class TenantBackupAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'backup_type', 'status', 'file_size', 'created_by', 'created_at']
    list_filter = ['backup_type', 'status', 'created_at']
    search_fields = ['tenant__name', 'notes']
    readonly_fields = ['created_at', 'completed_at']



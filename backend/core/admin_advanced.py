"""
Advanced admin configurations for new models.
"""
from django.contrib import admin
from .audit import AuditLog
from .webhooks import Webhook, WebhookDelivery
from .performance import PerformanceMetric, ErrorLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'model_name', 'object_repr', 'created_at']
    list_filter = ['action', 'model_name', 'created_at']
    search_fields = ['user__email', 'model_name', 'object_repr']
    readonly_fields = ['created_at', 'user', 'action', 'model_name', 'object_id', 'object_repr', 'changes', 'metadata', 'ip_address', 'user_agent']
    date_hierarchy = 'created_at'


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ['name', 'url', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'url']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ['webhook', 'event_type', 'success', 'response_status', 'created_at']
    list_filter = ['success', 'event_type', 'created_at']
    search_fields = ['webhook__name', 'event_type']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(PerformanceMetric)
class PerformanceMetricAdmin(admin.ModelAdmin):
    list_display = ['metric_type', 'value', 'recorded_at']
    list_filter = ['metric_type', 'recorded_at']
    readonly_fields = ['recorded_at']
    date_hierarchy = 'recorded_at'


@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = ['severity', 'error_type', 'resolved', 'created_at']
    list_filter = ['severity', 'resolved', 'created_at']
    search_fields = ['error_type', 'error_message']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    actions = ['mark_resolved']
    
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        queryset.update(resolved=True, resolved_at=timezone.now())
    mark_resolved.short_description = "Mark selected errors as resolved"


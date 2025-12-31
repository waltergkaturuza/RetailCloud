from django.contrib import admin
from .models import (
    MarketingCampaign, CampaignRecipient, EmailTemplate,
    AutomationWorkflow, AutomationExecution,
    PushNotification, SocialMediaIntegration
)


@admin.register(MarketingCampaign)
class MarketingCampaignAdmin(admin.ModelAdmin):
    list_display = ['name', 'campaign_type', 'status', 'tenant', 'scheduled_at', 'sent_count', 'total_recipients']
    list_filter = ['campaign_type', 'status', 'tenant', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'sent_count', 'delivered_count', 'opened_count', 'clicked_count']


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'tenant', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'tenant']
    search_fields = ['name', 'subject']


@admin.register(AutomationWorkflow)
class AutomationWorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'trigger_type', 'tenant', 'is_active', 'total_triggered', 'total_completed']
    list_filter = ['trigger_type', 'is_active', 'tenant']
    search_fields = ['name', 'description']


@admin.register(PushNotification)
class PushNotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'tenant', 'scheduled_at', 'sent_count']
    list_filter = ['status', 'tenant']
    search_fields = ['title', 'message']


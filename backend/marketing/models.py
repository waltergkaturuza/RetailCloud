"""
Marketing automation models for campaigns, email/SMS marketing, and automation workflows.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
from core.models import Tenant, Branch
from customers.models import Customer
from inventory.models import Product, Category


class MarketingCampaign(models.Model):
    """Marketing campaign (email, SMS, push notification, etc.)."""
    CAMPAIGN_TYPES = [
        ('email', 'Email Campaign'),
        ('sms', 'SMS Campaign'),
        ('push', 'Push Notification'),
        ('combined', 'Combined Campaign'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sending', 'Sending'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='marketing_campaigns')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='marketing_campaigns')
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    campaign_type = models.CharField(max_length=50, choices=CAMPAIGN_TYPES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    
    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Targeting
    target_segment = models.CharField(
        max_length=50,
        choices=[
            ('all', 'All Customers'),
            ('segment', 'Customer Segment'),
            ('custom', 'Custom Filter'),
        ],
        default='all'
    )
    customer_segment_id = models.IntegerField(null=True, blank=True)
    custom_filter = models.JSONField(default=dict, blank=True, help_text="Custom filter criteria")
    
    # Content
    subject = models.CharField(max_length=255, blank=True, help_text="Email subject or SMS preview")
    message_template = models.TextField(help_text="Message template with variables")
    html_content = models.TextField(blank=True, help_text="HTML content for emails")
    
    # Settings
    is_automated = models.BooleanField(default=False, help_text="Is this an automated campaign?")
    automation_trigger = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('purchase', 'After Purchase'),
            ('abandoned_cart', 'Abandoned Cart'),
            ('birthday', 'Birthday'),
            ('anniversary', 'Account Anniversary'),
            ('low_stock', 'Low Stock Alert'),
            ('new_product', 'New Product'),
            ('sale', 'Sale/Promotion'),
            ('custom', 'Custom Trigger'),
        ]
    )
    
    # Limits
    max_recipients = models.IntegerField(null=True, blank=True)
    
    # Statistics
    total_recipients = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    opened_count = models.IntegerField(default=0)
    clicked_count = models.IntegerField(default=0)
    converted_count = models.IntegerField(default=0)
    bounce_count = models.IntegerField(default=0)
    unsubscribe_count = models.IntegerField(default=0)
    
    # Metadata
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_campaigns'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'marketing_campaigns'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['campaign_type', 'status']),
            models.Index(fields=['scheduled_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_campaign_type_display()})"
    
    def get_open_rate(self):
        """Calculate open rate percentage."""
        if self.sent_count == 0:
            return 0.0
        return (self.opened_count / self.sent_count) * 100
    
    def get_click_rate(self):
        """Calculate click rate percentage."""
        if self.opened_count == 0:
            return 0.0
        return (self.clicked_count / self.opened_count) * 100
    
    def get_conversion_rate(self):
        """Calculate conversion rate percentage."""
        if self.sent_count == 0:
            return 0.0
        return (self.converted_count / self.sent_count) * 100


class CampaignRecipient(models.Model):
    """Track individual campaign recipients and their status."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('converted', 'Converted'),
        ('bounced', 'Bounced'),
        ('failed', 'Failed'),
        ('unsubscribed', 'Unsubscribed'),
    ]
    
    campaign = models.ForeignKey(MarketingCampaign, on_delete=models.CASCADE, related_name='recipients')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='campaign_recipients')
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    email_address = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    converted_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking data
    open_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)
    last_opened_at = models.DateTimeField(null=True, blank=True)
    last_clicked_at = models.DateTimeField(null=True, blank=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'campaign_recipients'
        unique_together = [['campaign', 'customer']]
        indexes = [
            models.Index(fields=['campaign', 'status']),
            models.Index(fields=['customer']),
        ]
    
    def __str__(self):
        return f"{self.customer.email} - {self.campaign.name}"


class EmailTemplate(models.Model):
    """Reusable email templates for campaigns."""
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='email_templates',
        null=True,
        blank=True,
        help_text="Null for system-wide templates"
    )
    
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    html_content = models.TextField(help_text="HTML template with variables like {{customer_name}}, {{product_name}}, etc.")
    plain_text_content = models.TextField(blank=True, help_text="Plain text version")
    
    category = models.CharField(
        max_length=50,
        choices=[
            ('transactional', 'Transactional'),
            ('promotional', 'Promotional'),
            ('newsletter', 'Newsletter'),
            ('notification', 'Notification'),
            ('custom', 'Custom'),
        ],
        default='promotional'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'email_templates'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name


class AutomationWorkflow(models.Model):
    """Marketing automation workflow definition."""
    TRIGGER_TYPES = [
        ('purchase', 'After Purchase'),
        ('abandoned_cart', 'Abandoned Cart'),
        ('birthday', 'Customer Birthday'),
        ('anniversary', 'Account Anniversary'),
        ('low_stock', 'Low Stock Alert'),
        ('new_product', 'New Product Added'),
        ('price_drop', 'Price Drop'),
        ('back_in_stock', 'Back in Stock'),
        ('cart_reminder', 'Cart Reminder'),
        ('welcome', 'Welcome Series'),
        ('win_back', 'Win-Back Campaign'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='automation_workflows')
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_TYPES)
    is_active = models.BooleanField(default=True)
    
    # Trigger conditions (JSON)
    trigger_conditions = models.JSONField(default=dict, blank=True, help_text="Additional trigger conditions")
    
    # Workflow steps (JSON array of actions)
    workflow_steps = models.JSONField(
        default=list,
        help_text="Array of workflow steps, e.g., [{'action': 'send_email', 'template_id': 1, 'delay': 0}, ...]"
    )
    
    # Statistics
    total_triggered = models.IntegerField(default=0)
    total_completed = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'automation_workflows'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_trigger_type_display()})"


class AutomationExecution(models.Model):
    """Track automation workflow executions."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    workflow = models.ForeignKey(AutomationWorkflow, on_delete=models.CASCADE, related_name='executions')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='automation_executions')
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    current_step = models.IntegerField(default=0)
    
    triggered_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Context data
    trigger_data = models.JSONField(default=dict, blank=True)
    execution_data = models.JSONField(default=dict, blank=True)
    
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'automation_executions'
        ordering = ['-triggered_at']
        indexes = [
            models.Index(fields=['workflow', 'status']),
            models.Index(fields=['customer', 'status']),
        ]
    
    def __str__(self):
        return f"{self.workflow.name} - {self.customer.email} ({self.status})"


class PushNotification(models.Model):
    """Push notification records."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='push_notifications')
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    url = models.URLField(blank=True, help_text="URL to open when notification is clicked")
    image_url = models.URLField(blank=True)
    
    # Targeting
    target_audience = models.CharField(
        max_length=50,
        choices=[
            ('all', 'All Users'),
            ('customer', 'Specific Customer'),
            ('segment', 'Customer Segment'),
        ],
        default='all'
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True, related_name='push_notifications')
    
    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('delivered', 'Delivered'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    
    # Statistics
    sent_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    clicked_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'push_notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"


class SocialMediaIntegration(models.Model):
    """Social media platform integration settings."""
    PLATFORM_CHOICES = [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('twitter', 'Twitter/X'),
        ('linkedin', 'LinkedIn'),
        ('tiktok', 'TikTok'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='social_media_integrations')
    
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES)
    is_active = models.BooleanField(default=True)
    
    # OAuth tokens
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Platform-specific data
    platform_account_id = models.CharField(max_length=255, blank=True)
    platform_username = models.CharField(max_length=255, blank=True)
    platform_data = models.JSONField(default=dict, blank=True)
    
    # Settings
    auto_post_new_products = models.BooleanField(default=False)
    auto_post_promotions = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'social_media_integrations'
        unique_together = [['tenant', 'platform']]
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.get_platform_display()}"


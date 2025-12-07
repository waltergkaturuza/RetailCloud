"""
Webhook system for event-driven integrations.
"""
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
import hmac
import hashlib
import json
import requests
from urllib.parse import urlparse


# Webhook events
WEBHOOK_EVENTS = [
    ('sale.created', 'Sale Created'),
    ('sale.updated', 'Sale Updated'),
    ('sale.voided', 'Sale Voided'),
    ('product.created', 'Product Created'),
    ('product.updated', 'Product Updated'),
    ('product.deleted', 'Product Deleted'),
    ('stock.low', 'Low Stock Alert'),
    ('stock.adjusted', 'Stock Adjusted'),
    ('customer.created', 'Customer Created'),
    ('purchase_order.created', 'Purchase Order Created'),
    ('purchase_order.received', 'Purchase Order Received'),
    ('payment.received', 'Payment Received'),
]


class Webhook(models.Model):
    """Webhook configuration for external integrations."""
    tenant = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='webhooks',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=255)
    url = models.URLField(help_text="Endpoint URL to receive webhook events")
    secret = models.CharField(max_length=255, help_text="Secret key for signing webhooks")
    events = models.JSONField(default=list, help_text="List of event types to subscribe to")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Headers for authentication
    headers = models.JSONField(
        default=dict,
        help_text="Additional headers to include in webhook requests"
    )
    
    class Meta:
        db_table = 'webhooks'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.url}"
    
    def generate_signature(self, payload: str) -> str:
        """Generate HMAC signature for webhook payload."""
        return hmac.new(
            self.secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def send_webhook(self, event_type: str, data: dict):
        """Send webhook event."""
        if not self.is_active:
            return
        
        if event_type not in self.events:
            return
        
        payload = {
            'event': event_type,
            'timestamp': timezone.now().isoformat(),
            'data': data
        }
        
        payload_json = json.dumps(payload, default=str)
        signature = self.generate_signature(payload_json)
        
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event_type,
            **self.headers
        }
        
        try:
            response = requests.post(
                self.url,
                data=payload_json,
                headers=headers,
                timeout=10
            )
            
            # Log webhook delivery
            WebhookDelivery.objects.create(
                webhook=self,
                event_type=event_type,
                payload=payload,
                response_status=response.status_code,
                response_body=response.text[:1000],  # Limit response body
                success=200 <= response.status_code < 300
            )
        except Exception as e:
            # Log failed delivery
            WebhookDelivery.objects.create(
                webhook=self,
                event_type=event_type,
                payload=payload,
                error_message=str(e),
                success=False
            )


class WebhookDelivery(models.Model):
    """Webhook delivery logs."""
    webhook = models.ForeignKey(
        Webhook,
        on_delete=models.CASCADE,
        related_name='deliveries'
    )
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    response_status = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    success = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'webhook_deliveries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['webhook', '-created_at']),
            models.Index(fields=['success', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.webhook.name} - {self.event_type} - {self.created_at}"


def send_webhook_event(event_type: str, data: dict, tenant=None):
    """Helper function to send webhook events."""
    webhooks = Webhook.objects.filter(is_active=True, events__contains=[event_type])
    
    if tenant:
        webhooks = webhooks.filter(tenant=tenant)
    
    for webhook in webhooks:
        webhook.send_webhook(event_type, data)


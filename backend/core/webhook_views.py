"""
API views for webhook management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .webhooks import Webhook, WebhookDelivery, send_webhook_event
from django.shortcuts import get_object_or_404
from django.utils import timezone
import secrets


class WebhookViewSet(viewsets.ModelViewSet):
    """Webhook management viewset."""
    queryset = Webhook.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter webhooks by tenant."""
        queryset = super().get_queryset()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    def perform_create(self, serializer):
        """Set tenant and generate secret on create."""
        instance = serializer.save()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            instance.tenant = self.request.tenant
        
        # Generate secret if not provided
        if not instance.secret:
            instance.secret = secrets.token_urlsafe(32)
        
        instance.save()
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test webhook delivery."""
        webhook = self.get_object()
        
        test_data = {
            'test': True,
            'message': 'This is a test webhook',
            'timestamp': timezone.now().isoformat()
        }
        
        webhook.send_webhook('test', test_data)
        
        return Response({
            'message': 'Test webhook sent',
            'webhook': webhook.id
        })
    
    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        """Get webhook delivery history."""
        webhook = self.get_object()
        deliveries = webhook.deliveries.all()[:50]
        
        data = [{
            'id': d.id,
            'event_type': d.event_type,
            'success': d.success,
            'response_status': d.response_status,
            'error_message': d.error_message,
            'created_at': d.created_at
        } for d in deliveries]
        
        return Response(data)


class WebhookDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    """Webhook delivery history viewset."""
    queryset = WebhookDelivery.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter deliveries by tenant."""
        queryset = super().get_queryset()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(webhook__tenant=self.request.tenant)
        return queryset


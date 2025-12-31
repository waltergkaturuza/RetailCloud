"""
Views for marketing campaigns and automation.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import (
    MarketingCampaign, CampaignRecipient, EmailTemplate,
    AutomationWorkflow, AutomationExecution,
    PushNotification, SocialMediaIntegration
)
from .serializers import (
    MarketingCampaignSerializer, CampaignRecipientSerializer,
    EmailTemplateSerializer, AutomationWorkflowSerializer,
    AutomationExecutionSerializer, PushNotificationSerializer,
    SocialMediaIntegrationSerializer
)
from .services import CampaignService, EmailMarketingService, SMSMarketingService, AutomationService
from core.models import Tenant
from core.utils import get_tenant_from_request


class MarketingCampaignViewSet(viewsets.ModelViewSet):
    """Manage marketing campaigns."""
    serializer_class = MarketingCampaignSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = MarketingCampaign.objects.all()
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant)
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set tenant and created_by automatically."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Tenant is required.")
        serializer.save(tenant=tenant, created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a campaign."""
        campaign = self.get_object()
        
        if campaign.status != 'draft':
            return Response(
                {'error': 'Campaign can only be executed if status is draft.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stats = CampaignService.execute_campaign(campaign)
        
        return Response({
            'message': 'Campaign executed successfully.',
            'statistics': stats
        })
    
    @action(detail=True, methods=['get'])
    def recipients(self, request, pk=None):
        """Get campaign recipients."""
        campaign = self.get_object()
        recipients = campaign.recipients.all()
        serializer = CampaignRecipientSerializer(recipients, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get campaign statistics."""
        campaign = self.get_object()
        return Response({
            'total_recipients': campaign.total_recipients,
            'sent_count': campaign.sent_count,
            'delivered_count': campaign.delivered_count,
            'opened_count': campaign.opened_count,
            'clicked_count': campaign.clicked_count,
            'converted_count': campaign.converted_count,
            'bounce_count': campaign.bounce_count,
            'unsubscribe_count': campaign.unsubscribe_count,
            'open_rate': campaign.get_open_rate(),
            'click_rate': campaign.get_click_rate(),
            'conversion_rate': campaign.get_conversion_rate(),
        })


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """Manage email templates."""
    serializer_class = EmailTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = EmailTemplate.objects.all()
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant) | queryset.filter(tenant=None)
        return queryset.filter(tenant=None)
    
    def perform_create(self, serializer):
        """Set tenant automatically."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)


class AutomationWorkflowViewSet(viewsets.ModelViewSet):
    """Manage automation workflows."""
    serializer_class = AutomationWorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = AutomationWorkflow.objects.all()
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant)
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set tenant automatically."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Tenant is required.")
        serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['post'])
    def trigger(self, request, pk=None):
        """Manually trigger a workflow for a customer."""
        workflow = self.get_object()
        customer_id = request.data.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': 'customer_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from customers.models import Customer
        try:
            customer = Customer.objects.get(id=customer_id, tenant=workflow.tenant)
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        execution = AutomationService.trigger_workflow(
            workflow=workflow,
            customer=customer,
            trigger_data=request.data.get('trigger_data', {})
        )
        
        serializer = AutomationExecutionSerializer(execution)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PushNotificationViewSet(viewsets.ModelViewSet):
    """Manage push notifications."""
    serializer_class = PushNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = PushNotification.objects.all()
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant)
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set tenant automatically."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Tenant is required.")
        serializer.save(tenant=tenant)


class SocialMediaIntegrationViewSet(viewsets.ModelViewSet):
    """Manage social media integrations."""
    serializer_class = SocialMediaIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = SocialMediaIntegration.objects.all()
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant)
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set tenant automatically."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Tenant is required.")
        serializer.save(tenant=tenant)


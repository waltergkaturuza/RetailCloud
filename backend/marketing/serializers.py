"""
Serializers for marketing models.
"""
from rest_framework import serializers
from .models import (
    MarketingCampaign, CampaignRecipient, EmailTemplate,
    AutomationWorkflow, AutomationExecution,
    PushNotification, SocialMediaIntegration
)


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class MarketingCampaignSerializer(serializers.ModelSerializer):
    open_rate = serializers.ReadOnlyField()
    click_rate = serializers.ReadOnlyField()
    conversion_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = MarketingCampaign
        fields = '__all__'
        read_only_fields = [
            'created_at', 'updated_at', 'sent_count', 'delivered_count',
            'opened_count', 'clicked_count', 'converted_count', 'bounce_count',
            'unsubscribe_count', 'total_recipients', 'open_rate', 'click_rate', 'conversion_rate'
        ]


class CampaignRecipientSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_email = serializers.EmailField(source='customer.email', read_only=True)
    
    class Meta:
        model = CampaignRecipient
        fields = '__all__'
        read_only_fields = ['sent_at', 'delivered_at', 'opened_at', 'clicked_at', 'converted_at']


class AutomationWorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationWorkflow
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'total_triggered', 'total_completed']


class AutomationExecutionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    
    class Meta:
        model = AutomationExecution
        fields = '__all__'
        read_only_fields = ['triggered_at', 'started_at', 'completed_at']


class PushNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushNotification
        fields = '__all__'
        read_only_fields = ['created_at', 'sent_count', 'delivered_count', 'clicked_count']


class SocialMediaIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialMediaIntegration
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'access_token': {'write_only': True},
            'refresh_token': {'write_only': True},
        }


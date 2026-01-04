"""
Serializers for notification models.
"""
from rest_framework import serializers
from .notification_models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'priority',
            'action_url', 'action_text', 'icon', 'metadata',
            'is_read', 'read_at', 'created_at', 'expires_at',
            'is_expired'
        ]
        read_only_fields = ['id', 'created_at', 'is_expired']
    
    is_expired = serializers.BooleanField(read_only=True)


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification lists."""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'priority',
            'action_url', 'action_text', 'icon',
            'is_read', 'created_at'
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for NotificationPreference model."""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'email_enabled', 'email_sales', 'email_inventory',
            'email_customer', 'email_system', 'email_security',
            'in_app_enabled', 'in_app_sales', 'in_app_inventory',
            'in_app_customer', 'in_app_system', 'in_app_security',
            'sms_enabled', 'sms_urgent_only',
            'push_enabled',
            'quiet_hours_start', 'quiet_hours_end',
            'updated_at', 'created_at'
        ]
        read_only_fields = ['updated_at', 'created_at']


class MarkAsReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read."""
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of notification IDs to mark as read. If empty, marks all as read."
    )



"""
Serializers for AI Chatbot.
"""
from rest_framework import serializers
from .models import ChatConversation, ChatMessage, ChatContext
from accounts.serializers import UserSerializer


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages."""
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'metadata', 'created_at']
        read_only_fields = ['created_at']


class ChatConversationSerializer(serializers.ModelSerializer):
    """Serializer for chat conversations."""
    message_count = serializers.IntegerField(read_only=True)
    user_name = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatConversation
        fields = [
            'id', 'title', 'user', 'user_name', 'created_at', 'updated_at',
            'is_archived', 'message_count', 'last_message_preview'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None
    
    def get_last_message_preview(self, obj):
        last_msg = obj.last_message
        if last_msg:
            return last_msg.content[:100] + ('...' if len(last_msg.content) > 100 else '')
        return None


class ChatConversationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with messages."""
    messages = ChatMessageSerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatConversation
        fields = [
            'id', 'title', 'user', 'user_name', 'created_at', 'updated_at',
            'is_archived', 'messages'
        ]
        read_only_fields = ['created_at', 'updated_at', 'messages']
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None


class ChatMessageCreateSerializer(serializers.Serializer):
    """Serializer for creating a new chat message."""
    message = serializers.CharField(required=True, allow_blank=False)
    conversation_id = serializers.IntegerField(required=False, allow_null=True)


class ChatContextSerializer(serializers.ModelSerializer):
    """Serializer for chat context."""
    
    class Meta:
        model = ChatContext
        fields = ['business_summary', 'key_metrics', 'preferences', 'last_updated']
        read_only_fields = ['last_updated']


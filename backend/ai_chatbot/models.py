"""
AI CEO Chatbot models for conversation and message storage.
"""
from django.db import models
from django.utils import timezone
from core.models import Tenant
from accounts.models import User
import json


class ChatConversation(models.Model):
    """A conversation session with the AI CEO chatbot."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='chat_conversations')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='chat_conversations')
    title = models.CharField(max_length=255, blank=True, help_text="Auto-generated title from first message")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'chat_conversations'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['tenant', 'user', '-updated_at']),
        ]
    
    def __str__(self):
        return f"Chat {self.id} - {self.tenant.company_name} - {self.title or 'Untitled'}"
    
    @property
    def message_count(self):
        return self.messages.count()
    
    @property
    def last_message(self):
        return self.messages.order_by('-created_at').first()


class ChatMessage(models.Model):
    """A message in a chatbot conversation."""
    
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'AI Assistant'),
        ('system', 'System'),
    ]
    
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField(help_text="Message content")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata (sources, citations, etc.)")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class ChatContext(models.Model):
    """Stored context data for the chatbot to learn about the business."""
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='chat_context')
    business_summary = models.TextField(blank=True, help_text="Auto-generated business summary")
    key_metrics = models.JSONField(default=dict, blank=True, help_text="Recent key business metrics")
    preferences = models.JSONField(default=dict, blank=True, help_text="User preferences for chatbot behavior")
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_contexts'
    
    def __str__(self):
        return f"Chat Context - {self.tenant.company_name}"


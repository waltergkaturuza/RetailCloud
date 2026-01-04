"""
Admin configuration for AI Chatbot.
"""
from django.contrib import admin
from .models import ChatConversation, ChatMessage, ChatContext


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'tenant', 'user', 'message_count', 'is_archived', 'created_at', 'updated_at']
    list_filter = ['is_archived', 'created_at', 'tenant']
    search_fields = ['title', 'tenant__company_name', 'user__username', 'user__email']
    date_hierarchy = 'created_at'
    raw_id_fields = ['tenant', 'user']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'role', 'content_preview', 'created_at']
    list_filter = ['role', 'created_at', 'conversation__tenant']
    search_fields = ['content', 'conversation__title']
    date_hierarchy = 'created_at'
    raw_id_fields = ['conversation']
    readonly_fields = ['created_at']
    
    def content_preview(self, obj):
        return obj.content[:100] + ('...' if len(obj.content) > 100 else '')
    content_preview.short_description = 'Content'


@admin.register(ChatContext)
class ChatContextAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'last_updated']
    search_fields = ['tenant__company_name']
    raw_id_fields = ['tenant']
    readonly_fields = ['last_updated']


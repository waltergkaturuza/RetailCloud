"""
Views for AI CEO Chatbot.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import ChatConversation, ChatMessage, ChatContext
from .serializers import (
    ChatConversationSerializer, ChatConversationDetailSerializer,
    ChatMessageSerializer, ChatMessageCreateSerializer, ChatContextSerializer
)
from .services import AIChatbotService
from core.utils import get_tenant_from_request
from core.permissions import HasModuleAccess


class ChatConversationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing chat conversations."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = 'ai_chatbot'
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return ChatConversation.objects.none()
        
        queryset = ChatConversation.objects.filter(tenant=tenant)
        
        # Filter by archived status
        archived = self.request.query_params.get('archived', 'false').lower() == 'true'
        queryset = queryset.filter(is_archived=archived)
        
        # Filter by user if not admin
        if not (self.request.user.role == 'tenant_admin' or self.request.user.role == 'super_admin'):
            queryset = queryset.filter(user=self.request.user)
        
        return queryset.select_related('user', 'tenant').prefetch_related('messages')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatConversationDetailSerializer
        return ChatConversationSerializer
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant, user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a conversation."""
        conversation = self.get_object()
        conversation.is_archived = True
        conversation.save()
        return Response(ChatConversationSerializer(conversation).data)
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive a conversation."""
        conversation = self.get_object()
        conversation.is_archived = False
        conversation.save()
        return Response(ChatConversationSerializer(conversation).data)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in a conversation."""
        conversation = self.get_object()
        user_message = request.data.get('message', '').strip()
        
        if not user_message:
            return Response(
                {'error': 'Message cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = get_tenant_from_request(request)
        chatbot_service = AIChatbotService(tenant)
        
        try:
            assistant_message = chatbot_service.process_message(
                conversation=conversation,
                user_message=user_message,
                user=request.user
            )
            
            # Return both user and assistant messages
            user_msg = ChatMessage.objects.filter(
                conversation=conversation,
                role='user'
            ).order_by('-created_at').first()
            
            return Response({
                'user_message': ChatMessageSerializer(user_msg).data if user_msg else None,
                'assistant_message': ChatMessageSerializer(assistant_message).data,
                'conversation': ChatConversationSerializer(conversation).data,
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to process message: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def new_conversation(self, request):
        """Create a new conversation and send the first message."""
        user_message = request.data.get('message', '').strip()
        
        if not user_message:
            return Response(
                {'error': 'Message cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = get_tenant_from_request(request)
        chatbot_service = AIChatbotService(tenant)
        
        try:
            with transaction.atomic():
                conversation = chatbot_service.create_conversation(user=request.user)
                assistant_message = chatbot_service.process_message(
                    conversation=conversation,
                    user_message=user_message,
                    user=request.user
                )
                
                # Return conversation with messages
                serializer = ChatConversationDetailSerializer(conversation)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Failed to create conversation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def context(self, request):
        """Get chat context for the tenant."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        chatbot_service = AIChatbotService(tenant)
        context = chatbot_service.context
        
        serializer = ChatContextSerializer(context)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def update_context(self, request):
        """Update chat context with latest business data."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        chatbot_service = AIChatbotService(tenant)
        context = chatbot_service.update_context()
        
        serializer = ChatContextSerializer(context)
        return Response(serializer.data)


"""
API views for notification management.
"""
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from .notification_models import Notification, NotificationPreference
from .notification_serializers import (
    NotificationSerializer, NotificationListSerializer,
    NotificationPreferenceSerializer, MarkAsReadSerializer
)
from .notification_service import NotificationService
from .utils import get_tenant_from_request


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing user notifications."""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get notifications for current user."""
        user = self.request.user
        queryset = Notification.objects.filter(user=user).order_by('-created_at')
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Filter by type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by date range
        days = self.request.query_params.get('days')
        if days:
            try:
                days_int = int(days)
                cutoff_date = timezone.now() - timedelta(days=days_int)
                queryset = queryset.filter(created_at__gte=cutoff_date)
            except ValueError:
                pass
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = NotificationService.get_unread_count(request.user)
        return Response({'count': count})
    
    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """Mark one or more notifications as read."""
        serializer = MarkAsReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data.get('notification_ids', [])
        
        if notification_ids:
            # Mark specific notifications as read
            count = 0
            for notification_id in notification_ids:
                if NotificationService.mark_as_read(notification_id, request.user):
                    count += 1
            return Response({
                'message': f'{count} notification(s) marked as read',
                'marked_count': count
            })
        else:
            # Mark all as read
            count = NotificationService.mark_all_as_read(request.user)
            return Response({
                'message': f'All notifications marked as read',
                'marked_count': count
            })
    
    @action(detail=True, methods=['post'])
    def mark_single_as_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        if notification.user != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        notification.mark_as_read()
        return Response(NotificationSerializer(notification).data)
    
    @action(detail=False, methods=['delete'])
    def delete_read(self, request):
        """Delete all read notifications."""
        deleted_count = Notification.objects.filter(
            user=request.user,
            is_read=True
        ).delete()[0]
        
        return Response({
            'message': f'{deleted_count} read notification(s) deleted',
            'deleted_count': deleted_count
        })
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent notifications (last 10)."""
        notifications = self.get_queryset()[:10]
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification preferences."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationPreferenceSerializer
    
    def get_queryset(self):
        """Get preferences for current user."""
        return NotificationPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create preferences for current user."""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return preferences
    
    def perform_create(self, serializer):
        """Create preferences for current user."""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Update preferences for current user."""
        serializer.save(user=self.request.user)


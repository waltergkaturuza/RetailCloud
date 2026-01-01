"""
API views for Module management.
"""
from rest_framework import viewsets, permissions
from .models import Module
from subscriptions.serializers import ModuleSerializer


class ModuleViewSet(viewsets.ReadOnlyModelViewSet):
    """List all available modules."""
    queryset = Module.objects.filter(is_active=True).order_by('sort_order', 'name')
    serializer_class = ModuleSerializer
    permission_classes = [permissions.AllowAny]




"""
Views for branch management.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from .models import Branch
from .branch_serializers import BranchSerializer, BranchListSerializer
from core.utils import get_tenant_from_request


class BranchViewSet(viewsets.ModelViewSet):
    """Full CRUD branch management for tenants."""
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter branches by tenant."""
        tenant = get_tenant_from_request(self.request)
        
        queryset = Branch.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            # If no tenant found, return empty queryset (or all if super_admin)
            if not (self.request.user.is_authenticated and hasattr(self.request.user, 'role') and self.request.user.role == 'super_admin'):
                queryset = queryset.none()
        
        return queryset.select_related('manager', 'tenant').order_by('-is_main', 'name')
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return BranchListSerializer
        return BranchSerializer
    
    def perform_create(self, serializer):
        """Create branch with tenant assignment."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            raise ValidationError("Cannot create branch: No tenant associated with this request.")
        
        branch = serializer.save(tenant=tenant)
        
        # If this is the first branch or marked as main, set as main
        if not Branch.objects.filter(tenant=tenant).exclude(pk=branch.pk).exists() or branch.is_main:
            branch.is_main = True
            branch.save()
            # Ensure no other branch is main
            Branch.objects.filter(tenant=tenant, is_main=True).exclude(pk=branch.pk).update(is_main=False)
    
    def perform_update(self, serializer):
        """Update branch with validation."""
        instance = serializer.save()
        
        # If setting as main branch, ensure no other branch is main
        if instance.is_main:
            Branch.objects.filter(
                tenant=instance.tenant,
                is_main=True
            ).exclude(pk=instance.pk).update(is_main=False)
    
    def perform_destroy(self, instance):
        """Delete branch with validation."""
        # Prevent deleting the main branch if it's the only one
        if instance.is_main and instance.tenant.branches.count() == 1:
            raise ValidationError("Cannot delete the only branch. Please create another branch first or assign a different branch as main.")
        
        # If deleting main branch, assign another branch as main
        if instance.is_main:
            other_branch = instance.tenant.branches.exclude(pk=instance.pk).first()
            if other_branch:
                other_branch.is_main = True
                other_branch.save()
        
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def set_main(self, request, pk=None):
        """Set this branch as the main branch."""
        branch = self.get_object()
        
        # Unset other main branches
        Branch.objects.filter(
            tenant=branch.tenant,
            is_main=True
        ).exclude(pk=branch.pk).update(is_main=False)
        
        # Set this branch as main
        branch.is_main = True
        branch.save()
        
        return Response({'status': 'success', 'message': f'{branch.name} is now the main branch.'})
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle branch active status."""
        branch = self.get_object()
        branch.is_active = not branch.is_active
        branch.save()
        
        status_text = 'activated' if branch.is_active else 'deactivated'
        return Response({
            'status': 'success',
            'message': f'{branch.name} has been {status_text}.',
            'is_active': branch.is_active
        })


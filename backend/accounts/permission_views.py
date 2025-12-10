"""
Views for user permissions and role templates.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import User, UserPermission
from .permission_serializers import (
    UserPermissionSerializer, UserPermissionBulkSerializer,
    ModuleSerializer, RoleTemplateSerializer
)
from core.models import Module

# Define available modules and permissions
AVAILABLE_MODULES = {
    'inventory': 'Inventory Management',
    'pos': 'Point of Sale',
    'sales': 'Sales Management',
    'customers': 'Customer Management',
    'suppliers': 'Supplier Management',
    'purchases': 'Purchase Management',
    'reports': 'Reports & Analytics',
    'analytics': 'Advanced Analytics',
    'settings': 'Settings',
    'users': 'User Management',
}

PERMISSION_TYPES = ['view', 'create', 'update', 'delete']

# Role templates with default permissions
ROLE_TEMPLATES = {
    'cashier': {
        'name': 'Cashier',
        'description': 'POS access and basic sales operations',
        'permissions': {
            'pos': ['view', 'create'],
            'sales': ['view'],
            'customers': ['view'],
        }
    },
    'supervisor': {
        'name': 'Supervisor',
        'description': 'Oversight, approvals, and reporting',
        'permissions': {
            'inventory': ['view', 'update'],
            'pos': ['view', 'create', 'update'],
            'sales': ['view', 'create', 'update'],
            'customers': ['view', 'create', 'update'],
            'suppliers': ['view'],
            'purchases': ['view'],
            'reports': ['view'],
        }
    },
    'stock_controller': {
        'name': 'Stock Controller',
        'description': 'Inventory and stock management',
        'permissions': {
            'inventory': ['view', 'create', 'update', 'delete'],
            'suppliers': ['view', 'create', 'update'],
            'purchases': ['view', 'create', 'update'],
            'reports': ['view'],
        }
    },
    'accountant': {
        'name': 'Accountant',
        'description': 'Financial reporting and accounting',
        'permissions': {
            'sales': ['view'],
            'customers': ['view'],
            'suppliers': ['view'],
            'purchases': ['view'],
            'reports': ['view'],
            'analytics': ['view'],
        }
    },
    'auditor': {
        'name': 'Auditor',
        'description': 'Read-only access for auditing',
        'permissions': {
            'inventory': ['view'],
            'pos': ['view'],
            'sales': ['view'],
            'customers': ['view'],
            'suppliers': ['view'],
            'purchases': ['view'],
            'reports': ['view'],
            'analytics': ['view'],
        }
    },
    'manager': {
        'name': 'Manager',
        'description': 'Full operational access',
        'permissions': {
            'inventory': ['view', 'create', 'update'],
            'pos': ['view', 'create', 'update'],
            'sales': ['view', 'create', 'update'],
            'customers': ['view', 'create', 'update'],
            'suppliers': ['view', 'create', 'update'],
            'purchases': ['view', 'create', 'update'],
            'reports': ['view'],
            'analytics': ['view'],
        }
    },
    'tenant_admin': {
        'name': 'Tenant Admin',
        'description': 'Full access to all modules',
        'permissions': {
            module: PERMISSION_TYPES for module in AVAILABLE_MODULES.keys()
        }
    },
}


class UserPermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user permissions."""
    serializer_class = UserPermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter permissions by user and tenant."""
        queryset = UserPermission.objects.select_related('user').all()
        
        # Filter by user if provided
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by tenant (only show permissions for users in same tenant)
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(user__tenant=self.request.tenant)
        
        # Only tenant_admin or super_admin can manage permissions
        if self.request.user.role not in ['tenant_admin', 'super_admin']:
            queryset = queryset.none()
        
        return queryset.order_by('module', 'permission')
    
    @action(detail=False, methods=['get'])
    def available_modules(self, request):
        """Get list of available modules and permissions."""
        modules = []
        for code, name in AVAILABLE_MODULES.items():
            modules.append({
                'code': code,
                'name': name,
                'permissions': PERMISSION_TYPES
            })
        return Response(modules)
    
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """Get all permissions for a specific user."""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check tenant access
            if hasattr(request, 'tenant') and request.tenant:
                if user.tenant != request.tenant:
                    return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        permissions = UserPermission.objects.filter(user_id=user_id)
        serializer = self.get_serializer(permissions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """Bulk update permissions for a user."""
        serializer = UserPermissionBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check tenant access
            if hasattr(request, 'tenant') and request.tenant:
                if user.tenant != request.tenant:
                    return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        permissions_data = serializer.validated_data['permissions']
        
        with transaction.atomic():
            # Delete existing permissions for this user
            UserPermission.objects.filter(user=user).delete()
            
            # Create new permissions
            permissions_to_create = []
            for perm_data in permissions_data:
                permissions_to_create.append(
                    UserPermission(
                        user=user,
                        module=perm_data['module'],
                        permission=perm_data['permission'],
                        granted=perm_data.get('granted', True)
                    )
                )
            
            UserPermission.objects.bulk_create(permissions_to_create)
        
        # Return updated permissions
        permissions = UserPermission.objects.filter(user=user)
        return Response(UserPermissionSerializer(permissions, many=True).data)
    
    @action(detail=False, methods=['post'], url_path='apply-template')
    def apply_template(self, request):
        """Apply role template permissions to a user."""
        user_id = request.data.get('user_id')
        role = request.data.get('role')
        
        if not user_id or not role:
            return Response(
                {'error': 'user_id and role are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if role not in ROLE_TEMPLATES:
            return Response(
                {'error': f'Invalid role template. Available: {", ".join(ROLE_TEMPLATES.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check tenant access
            if hasattr(request, 'tenant') and request.tenant:
                if user.tenant != request.tenant:
                    return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        template = ROLE_TEMPLATES[role]
        permissions_to_create = []
        
        with transaction.atomic():
            # Clear existing permissions
            UserPermission.objects.filter(user=user).delete()
            
            # Create permissions from template
            for module, perms in template['permissions'].items():
                for perm in perms:
                    permissions_to_create.append(
                        UserPermission(
                            user=user,
                            module=module,
                            permission=perm,
                            granted=True
                        )
                    )
            
            UserPermission.objects.bulk_create(permissions_to_create)
        
        # Return updated permissions
        permissions = UserPermission.objects.filter(user=user)
        return Response({
            'message': f'Template "{template["name"]}" applied successfully',
            'permissions': UserPermissionSerializer(permissions, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get available role templates."""
        templates = []
        for role, template in ROLE_TEMPLATES.items():
            templates.append({
                'role': role,
                'name': template['name'],
                'description': template['description'],
                'permission_count': sum(len(perms) for perms in template['permissions'].values())
            })
        return Response(templates)
    
    @action(detail=False, methods=['get'])
    def matrix(self, request):
        """Get permissions matrix for all users in tenant."""
        if hasattr(request, 'tenant') and request.tenant:
            users = User.objects.filter(tenant=request.tenant, role__in=[
                'cashier', 'supervisor', 'stock_controller', 'accountant', 'auditor', 'manager'
            ]).exclude(role__in=['super_admin', 'tenant_admin'])
        else:
            return Response({'error': 'Tenant context required'}, status=status.HTTP_400_BAD_REQUEST)
        
        matrix = []
        for user in users:
            user_permissions = UserPermission.objects.filter(user=user)
            perm_dict = {}
            for perm in user_permissions:
                key = f"{perm.module}.{perm.permission}"
                perm_dict[key] = perm.granted
            
            matrix.append({
                'user_id': user.id,
                'user_name': user.get_full_name() or user.email,
                'user_email': user.email,
                'role': user.role,
                'role_display': user.get_role_display(),
                'permissions': perm_dict
            })
        
        return Response({
            'modules': AVAILABLE_MODULES,
            'permission_types': PERMISSION_TYPES,
            'matrix': matrix
        })



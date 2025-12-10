"""
Serializers for user permissions and role templates.
"""
from rest_framework import serializers
from .models import UserPermission
from core.models import Module


class UserPermissionSerializer(serializers.ModelSerializer):
    """Serializer for user permissions."""
    module_display = serializers.CharField(source='module', read_only=True)
    permission_display = serializers.CharField(source='permission', read_only=True)
    
    class Meta:
        model = UserPermission
        fields = ['id', 'user', 'module', 'module_display', 'permission', 'permission_display', 'granted', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserPermissionBulkSerializer(serializers.Serializer):
    """Serializer for bulk permission operations."""
    permissions = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of permission objects: [{'module': 'pos', 'permission': 'view', 'granted': True}, ...]"
    )
    
    def validate_permissions(self, value):
        """Validate permission structure."""
        valid_permissions = ['view', 'create', 'update', 'delete']
        valid_modules = [
            'inventory', 'pos', 'sales', 'customers', 'suppliers', 
            'purchases', 'reports', 'analytics', 'settings', 'users'
        ]
        
        for perm in value:
            if 'module' not in perm or 'permission' not in perm:
                raise serializers.ValidationError("Each permission must have 'module' and 'permission' fields.")
            if perm.get('permission') not in valid_permissions:
                raise serializers.ValidationError(f"Permission must be one of: {', '.join(valid_permissions)}")
            if perm.get('module') not in valid_modules:
                raise serializers.ValidationError(f"Module must be one of: {', '.join(valid_modules)}")
        
        return value


class ModuleSerializer(serializers.ModelSerializer):
    """Serializer for system modules."""
    class Meta:
        model = Module
        fields = ['id', 'name', 'code', 'description', 'category']


class RoleTemplateSerializer(serializers.Serializer):
    """Serializer for role permission templates."""
    role = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    permissions = serializers.DictField(
        help_text="Dictionary mapping modules to permission lists: {'inventory': ['view', 'create', 'update'], ...}"
    )



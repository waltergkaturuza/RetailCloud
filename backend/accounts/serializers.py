"""
Serializers for user accounts.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, UserPermission


class UserSerializer(serializers.ModelSerializer):
    """User serializer."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'role', 'role_display', 'tenant', 'tenant_name',
            'branch', 'is_active', 'is_email_verified', 'avatar',
            'permissions', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_email_verified']
    
    def get_permissions(self, obj):
        """Get user's granular permissions."""
        from .permission_serializers import UserPermissionSerializer
        permissions = obj.permissions.all()
        return UserPermissionSerializer(permissions, many=True).data


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone', 'role', 'branch'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    """Login serializer."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    tenant_slug = serializers.CharField(required=False, allow_blank=True)
    two_factor_token = serializers.CharField(required=False, allow_blank=True)
    backup_code = serializers.CharField(required=False, allow_blank=True)


class PasswordChangeSerializer(serializers.Serializer):
    """Password change serializer."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Passwords don't match."})
        return attrs


class PINSetSerializer(serializers.Serializer):
    """PIN set serializer for POS."""
    pin = serializers.CharField(min_length=4, max_length=4)
    pin_confirm = serializers.CharField(min_length=4, max_length=4)
    
    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        return value
    
    def validate(self, attrs):
        if attrs['pin'] != attrs['pin_confirm']:
            raise serializers.ValidationError({"pin": "PINs don't match."})
        return attrs


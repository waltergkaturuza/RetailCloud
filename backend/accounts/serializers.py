"""
Serializers for user accounts.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, UserPermission


class UserSerializer(serializers.ModelSerializer):
    """User serializer."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    tenant_name = serializers.SerializerMethodField()
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
    
    def get_tenant_name(self, obj):
        """Get tenant company name safely."""
        if obj.tenant:
            return obj.tenant.company_name
        return None
    
    def get_permissions(self, obj):
        """Get user's granular permissions."""
        try:
            from .permission_serializers import UserPermissionSerializer
            permissions = obj.permissions.all()
            return UserPermissionSerializer(permissions, many=True).data
        except Exception as e:
            # Log error but don't fail serialization
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to serialize permissions for user {obj.id}: {str(e)}")
            return []


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
    
    def validate_email(self, value):
        """Ensure email is unique across all users.
        
        Special case: Tenant admin users can share the tenant's email,
        but regular users cannot use an email that's already a tenant contact email.
        """
        if not value:
            raise serializers.ValidationError("Email is required.")
        
        # Normalize email (lowercase, strip whitespace)
        value = value.lower().strip()
        
        # Check if email already exists as a User (excluding current instance if updating)
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this email already exists. Please use a different email."
            )
        
        # Check if email is used by a Tenant
        # If creating a tenant_admin user, we'll handle this in the view/special case
        # For all other users, reject if email is already a tenant contact email
        from core.models import Tenant
        tenant_with_email = Tenant.objects.filter(email__iexact=value).first()
        
        if tenant_with_email:
            # If this is a tenant admin being created for this tenant, allow it
            # (This will be handled in the view that creates tenant admin users)
            # For regular user creation, reject tenant emails
            if not self.instance:  # Creating new user
                # Check if this will be a tenant admin - we can't determine this here,
                # so we'll allow it and let the view handle it, OR reject all tenant emails
                # Actually, we should reject to be safe - tenant admins should be created through tenant creation
                raise serializers.ValidationError(
                    f"This email is already registered as a tenant contact email for '{tenant_with_email.company_name}'. "
                    "Please use a different email for the user account."
                )
            elif hasattr(self.instance, 'tenant') and self.instance.tenant and self.instance.role == 'tenant_admin':
                # Updating tenant admin: allow if it's for the same tenant
                if self.instance.tenant == tenant_with_email:
                    return value
                # Different tenant: reject
                raise serializers.ValidationError(
                    f"This email is already registered as a tenant contact email for '{tenant_with_email.company_name}'. "
                    "Tenant admin email must match the tenant contact email."
                )
            else:
                # Regular user or different scenario: reject
                raise serializers.ValidationError(
                    f"This email is already registered as a tenant contact email for '{tenant_with_email.company_name}'. "
                    "Please use a different email for the user account."
                )
        
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        # Ensure email is normalized (lowercase, trimmed) before saving
        if 'email' in validated_data:
            validated_data['email'] = validated_data['email'].lower().strip()
        # Ensure username is normalized
        if 'username' in validated_data:
            validated_data['username'] = validated_data['username'].strip()
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


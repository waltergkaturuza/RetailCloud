"""
Serializers for security features (2FA, password policies, sessions, etc.)
"""
from rest_framework import serializers
from .security_models import (
    PasswordPolicy, TwoFactorAuth, LoginAttempt, UserSession,
    IPWhitelist, PasswordHistory, SecurityEvent
)
from core.models import Tenant


class PasswordPolicySerializer(serializers.ModelSerializer):
    """Password policy serializer."""
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    
    class Meta:
        model = PasswordPolicy
        fields = [
            'id', 'tenant', 'tenant_name',
            'min_length', 'require_uppercase', 'require_lowercase',
            'require_digits', 'require_special_chars', 'special_chars',
            'password_expiry_days', 'password_history_count',
            'max_login_attempts', 'lockout_duration_minutes',
            'session_timeout_minutes', 'max_concurrent_sessions',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TwoFactorAuthSerializer(serializers.ModelSerializer):
    """Two-Factor Authentication serializer."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    qr_code = serializers.SerializerMethodField()
    totp_uri = serializers.SerializerMethodField()
    
    class Meta:
        model = TwoFactorAuth
        fields = [
            'id', 'user', 'user_email',
            'is_enabled', 'sms_enabled', 'phone_number',
            'recovery_email', 'backup_codes',
            'enabled_at', 'last_used_at',
            'qr_code', 'totp_uri',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'enabled_at', 'last_used_at',
            'qr_code', 'totp_uri', 'created_at', 'updated_at'
        ]
    
    def get_qr_code(self, obj):
        """Get QR code for TOTP setup (only if not enabled yet)."""
        if not obj.is_enabled and obj.secret_key:
            return obj.generate_qr_code()
        return None
    
    def get_totp_uri(self, obj):
        """Get TOTP URI for manual entry."""
        if not obj.is_enabled and obj.secret_key:
            return obj.get_totp_uri()
        return None


class TwoFactorSetupSerializer(serializers.Serializer):
    """Serializer for 2FA setup."""
    totp_token = serializers.CharField(
        max_length=6,
        help_text="6-digit code from authenticator app to verify setup"
    )


class TwoFactorVerifySerializer(serializers.Serializer):
    """Serializer for 2FA verification during login."""
    totp_token = serializers.CharField(
        max_length=6,
        required=False,
        help_text="6-digit TOTP code"
    )
    backup_code = serializers.CharField(
        max_length=10,
        required=False,
        help_text="Backup recovery code"
    )


class UserSessionSerializer(serializers.ModelSerializer):
    """User session serializer."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'user_email', 'session_key',
            'ip_address', 'user_agent', 'device_name',
            'device_type', 'browser', 'os', 'location',
            'is_active', 'last_activity', 'created_at', 'expires_at',
            'is_expired'
        ]
        read_only_fields = [
            'id', 'user', 'session_key', 'ip_address', 'user_agent',
            'device_name', 'device_type', 'browser', 'os', 'location',
            'last_activity', 'created_at', 'expires_at', 'is_expired'
        ]
    
    def get_is_expired(self, obj):
        """Check if session is expired."""
        return obj.is_expired()


class IPWhitelistSerializer(serializers.ModelSerializer):
    """IP whitelist/blacklist serializer."""
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = IPWhitelist
        fields = [
            'id', 'tenant', 'tenant_name',
            'ip_address', 'ip_range',
            'is_whitelist', 'description',
            'is_active', 'created_by', 'created_by_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LoginAttemptSerializer(serializers.ModelSerializer):
    """Login attempt serializer."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = LoginAttempt
        fields = [
            'id', 'user', 'user_email', 'username',
            'ip_address', 'user_agent', 'success',
            'failure_reason', 'attempted_at'
        ]
        read_only_fields = ['id', 'user', 'username', 'ip_address', 'user_agent', 'success', 'failure_reason', 'attempted_at']


class SecurityEventSerializer(serializers.ModelSerializer):
    """Security event serializer."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    tenant_name = serializers.CharField(source='tenant.company_name', read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'user', 'user_email', 'tenant', 'tenant_name',
            'event_type', 'ip_address', 'user_agent',
            'description', 'metadata', 'severity', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'tenant', 'event_type', 'ip_address', 'user_agent', 'description', 'metadata', 'severity', 'created_at']


class PasswordChangeWithPolicySerializer(serializers.Serializer):
    """Password change serializer with policy validation."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate password change."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return attrs
    
    def validate_new_password(self, value):
        """Validate new password against policy."""
        from .security_service import SecurityService
        from core.utils import get_tenant_from_request
        
        request = self.context.get('request')
        tenant = get_tenant_from_request(request) if request else None
        user = request.user if request and request.user.is_authenticated else None
        
        is_valid, errors = SecurityService.validate_password(value, tenant, user)
        if not is_valid:
            raise serializers.ValidationError(errors)
        
        return value




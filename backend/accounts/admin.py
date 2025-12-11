"""
Admin for accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserPermission
from .security_models import (
    PasswordPolicy, TwoFactorAuth, LoginAttempt, UserSession,
    IPWhitelist, PasswordHistory, SecurityEvent
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'first_name', 'last_name', 'role', 'tenant', 'is_active']
    list_filter = ['role', 'is_active', 'is_email_verified', 'tenant']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Tenant Info', {'fields': ('tenant', 'branch')}),
        ('Role & Permissions', {'fields': ('role', 'pin')}),
        ('Additional Info', {'fields': ('phone', 'avatar', 'last_login_ip')}),
    )


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'module', 'permission', 'granted']
    list_filter = ['module', 'permission', 'granted']
    search_fields = ['user__email', 'module']


@admin.register(PasswordPolicy)
class PasswordPolicyAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'min_length', 'password_expiry_days', 'max_login_attempts', 'is_active']
    list_filter = ['is_active', 'password_expiry_days']
    search_fields = ['tenant__company_name', 'tenant__name']
    fieldsets = (
        ('Tenant', {'fields': ('tenant',)}),
        ('Complexity Requirements', {
            'fields': ('min_length', 'require_uppercase', 'require_lowercase', 'require_digits', 'require_special_chars', 'special_chars')
        }),
        ('Expiration', {
            'fields': ('password_expiry_days', 'password_history_count')
        }),
        ('Account Lockout', {
            'fields': ('max_login_attempts', 'lockout_duration_minutes')
        }),
        ('Session Management', {
            'fields': ('session_timeout_minutes', 'max_concurrent_sessions')
        }),
        ('Status', {'fields': ('is_active',)}),
    )


@admin.register(TwoFactorAuth)
class TwoFactorAuthAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_enabled', 'sms_enabled', 'enabled_at', 'last_used_at']
    list_filter = ['is_enabled', 'sms_enabled']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['secret_key', 'enabled_at', 'last_used_at', 'created_at', 'updated_at']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return self.readonly_fields + ['user']
        return self.readonly_fields


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ['username', 'ip_address', 'success', 'failure_reason', 'attempted_at']
    list_filter = ['success', 'failure_reason', 'attempted_at']
    search_fields = ['username', 'ip_address']
    readonly_fields = ['user', 'username', 'ip_address', 'user_agent', 'success', 'failure_reason', 'attempted_at']
    date_hierarchy = 'attempted_at'


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'device_name', 'device_type', 'ip_address', 'is_active', 'last_activity', 'created_at']
    list_filter = ['is_active', 'device_type', 'created_at']
    search_fields = ['user__email', 'user__username', 'ip_address', 'device_name']
    readonly_fields = ['session_key', 'created_at', 'last_activity']


@admin.register(IPWhitelist)
class IPWhitelistAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'ip_address', 'ip_range', 'is_whitelist', 'is_active', 'created_at']
    list_filter = ['is_whitelist', 'is_active', 'created_at']
    search_fields = ['tenant__company_name', 'ip_address', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PasswordHistory)
class PasswordHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['user', 'password_hash', 'created_at']
    date_hierarchy = 'created_at'


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'user', 'tenant', 'ip_address', 'severity', 'created_at']
    list_filter = ['event_type', 'severity', 'created_at']
    search_fields = ['user__email', 'user__username', 'ip_address', 'description']
    readonly_fields = ['user', 'tenant', 'event_type', 'ip_address', 'user_agent', 'description', 'metadata', 'severity', 'created_at']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Security events are created automatically



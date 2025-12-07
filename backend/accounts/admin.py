"""
Admin for accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserPermission


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


from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from .user_agreement_models import UserAgreement


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']


@admin.register(UserAgreement)
class UserAgreementAdmin(admin.ModelAdmin):
    list_display = ['user', 'terms_accepted', 'privacy_accepted', 'first_accepted_at', 'last_updated_at']
    list_filter = ['terms_accepted', 'privacy_accepted', 'first_accepted_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['first_accepted_at', 'last_updated_at', 'terms_accepted_at', 'privacy_accepted_at']
    date_hierarchy = 'first_accepted_at'

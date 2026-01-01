"""
URLs for accounts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import AuthViewSet, UserViewSet
from .permission_views import UserPermissionViewSet
from .debug_views import debug_user_tenant_info
from .security_views import (
    PasswordPolicyViewSet, TwoFactorAuthViewSet,
    UserSessionViewSet, IPWhitelistViewSet, SecurityEventViewSet,
    PasswordExpirationViewSet
)
from .sms_2fa_views import SMS2FAViewSet

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'users', UserViewSet, basename='users')
router.register(r'permissions', UserPermissionViewSet, basename='permissions')
router.register(r'security/password-policies', PasswordPolicyViewSet, basename='password-policy')
router.register(r'security/2fa', TwoFactorAuthViewSet, basename='2fa')
router.register(r'security/sessions', UserSessionViewSet, basename='user-session')
router.register(r'security/ip-whitelist', IPWhitelistViewSet, basename='ip-whitelist')
router.register(r'security/events', SecurityEventViewSet, basename='security-event')
router.register(r'security/password-expiration', PasswordExpirationViewSet, basename='password-expiration')
router.register(r'security/sms-2fa', SMS2FAViewSet, basename='sms-2fa')

urlpatterns = [
    path('', include(router.urls)),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('debug/user-tenant-info/', debug_user_tenant_info, name='debug-user-tenant-info'),
]


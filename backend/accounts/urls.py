"""
URLs for accounts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import AuthViewSet, UserViewSet
from .permission_views import UserPermissionViewSet
from .debug_views import debug_user_tenant_info

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'users', UserViewSet, basename='users')
router.register(r'permissions', UserPermissionViewSet, basename='permissions')

urlpatterns = [
    path('', include(router.urls)),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('debug/user-tenant-info/', debug_user_tenant_info, name='debug-user-tenant-info'),
]


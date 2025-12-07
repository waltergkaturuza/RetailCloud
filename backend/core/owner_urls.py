"""
URLs for Owner/Super Admin Portal.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .owner_views import (
    OwnerDashboardView,
    SystemSettingsViewSet,
    OwnerTenantViewSet,
    OwnerUserViewSet,
    OwnerAuditLogViewSet,
    SystemHealthViewSet,
    SystemAnnouncementViewSet,
    TenantBackupViewSet,
    AnalyticsView,
)

router = DefaultRouter()
router.register(r'settings', SystemSettingsViewSet, basename='system-settings')
router.register(r'tenants', OwnerTenantViewSet, basename='owner-tenants')
router.register(r'users', OwnerUserViewSet, basename='owner-users')
router.register(r'audit-logs', OwnerAuditLogViewSet, basename='owner-audit-logs')
router.register(r'health', SystemHealthViewSet, basename='system-health')
router.register(r'announcements', SystemAnnouncementViewSet, basename='system-announcements')
router.register(r'backups', TenantBackupViewSet, basename='tenant-backups')

urlpatterns = [
    path('dashboard/', OwnerDashboardView.as_view(), name='owner-dashboard'),
    path('analytics/', AnalyticsView.as_view(), name='owner-analytics'),
    path('', include(router.urls)),
]


"""
URLs for subscriptions app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubscriptionViewSet, PackageViewSet, InvoiceViewSet, PaymentViewSet
from .module_views import TenantModuleViewSet

router = DefaultRouter()
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'packages', PackageViewSet, basename='package')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'tenant-modules', TenantModuleViewSet, basename='tenant-module')

urlpatterns = [
    path('', include(router.urls)),
    path('modules/', SubscriptionViewSet.as_view({'get': 'enabled_modules'}), name='modules-list'),
]


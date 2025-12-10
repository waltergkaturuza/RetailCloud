"""
URL patterns for business category management.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .business_category_views import BusinessCategoryViewSet, TenantCategoryView

router = DefaultRouter()
router.register(r'categories', BusinessCategoryViewSet, basename='business-category')

urlpatterns = [
    path('', include(router.urls)),
    path('tenant/category/', TenantCategoryView.as_view(), name='tenant-category'),
]



"""
URL patterns for bulk inventory operations.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .bulk_operations_api import (
    BulkInventoryViewSet,
    ProductLocationViewSet,
    WarehouseZoneViewSet,
    SerialPatternViewSet
)

router = DefaultRouter()
router.register(r'bulk', BulkInventoryViewSet, basename='bulk-inventory')
router.register(r'locations', ProductLocationViewSet, basename='product-location')
router.register(r'zones', WarehouseZoneViewSet, basename='warehouse-zone')
router.register(r'serial-patterns', SerialPatternViewSet, basename='serial-pattern')

urlpatterns = [
    path('', include(router.urls)),
]


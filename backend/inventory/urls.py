"""
URLs for inventory app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet, StockLevelViewSet,
    StockMovementViewSet, BatchViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'stock-levels', StockLevelViewSet, basename='stock-level')
router.register(r'stock-movements', StockMovementViewSet, basename='stock-movement')
router.register(r'batches', BatchViewSet, basename='batch')

urlpatterns = [
    path('', include(router.urls)),
]



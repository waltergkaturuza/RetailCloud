"""
URLs for suppliers app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, SupplierTransactionViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'transactions', SupplierTransactionViewSet, basename='supplier-transaction')

urlpatterns = [
    path('', include(router.urls)),
]





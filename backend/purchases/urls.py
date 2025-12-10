"""
URLs for purchases app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseOrderViewSet, GoodsReceivedNoteViewSet

router = DefaultRouter()
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'grns', GoodsReceivedNoteViewSet, basename='grn')

urlpatterns = [
    path('', include(router.urls)),
]



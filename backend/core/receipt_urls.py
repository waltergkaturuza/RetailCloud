"""
URL patterns for receipt management.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .receipt_views import ReceiptTemplateViewSet, ReceiptPrintLogViewSet, LogReceiptPrintView

router = DefaultRouter()
router.register(r'templates', ReceiptTemplateViewSet, basename='receipt-template')
router.register(r'print-logs', ReceiptPrintLogViewSet, basename='receipt-print-log')

urlpatterns = [
    path('', include(router.urls)),
    path('log-print/', LogReceiptPrintView.as_view(), name='log-receipt-print'),
]



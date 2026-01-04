"""
URLs for quotes and invoicing.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuotationViewSet, CustomerInvoiceViewSet

router = DefaultRouter()
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'invoices', CustomerInvoiceViewSet, basename='customer-invoice')

urlpatterns = [
    path('', include(router.urls)),
]


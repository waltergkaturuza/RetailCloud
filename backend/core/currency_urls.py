"""
URL patterns for currency management.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .currency_views import CurrencyViewSet, ExchangeRateViewSet, TenantCurrencyViewSet

router = DefaultRouter()
router.register(r'currencies', CurrencyViewSet, basename='currency')
router.register(r'exchange-rates', ExchangeRateViewSet, basename='exchange-rate')
router.register(r'tenant-currencies', TenantCurrencyViewSet, basename='tenant-currency')

urlpatterns = [
    path('', include(router.urls)),
]



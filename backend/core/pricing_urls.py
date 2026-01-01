"""
URLs for pricing models.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .pricing_views import PricingRuleViewSet, ModulePricingViewSet

router = DefaultRouter()
router.register(r'pricing-rules', PricingRuleViewSet, basename='pricing-rule')
router.register(r'module-pricing', ModulePricingViewSet, basename='module-pricing')

urlpatterns = [
    path('', include(router.urls)),
]




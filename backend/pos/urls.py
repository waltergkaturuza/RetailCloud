"""
URLs for POS app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet
from .till_views import TillFloatViewSet, CashTransactionViewSet, SuspendedSaleViewSet, DayEndReportView
from .promotion_views import PromotionViewSet, PromotionApplyView, PriceOverrideViewSet
from .return_views import SaleReturnViewSet, PurchaseReturnViewSet

router = DefaultRouter()
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'sale-returns', SaleReturnViewSet, basename='sale-return')
router.register(r'purchase-returns', PurchaseReturnViewSet, basename='purchase-return')
router.register(r'till-floats', TillFloatViewSet, basename='till-float')
router.register(r'cash-transactions', CashTransactionViewSet, basename='cash-transaction')
router.register(r'suspended-sales', SuspendedSaleViewSet, basename='suspended-sale')
router.register(r'promotions', PromotionViewSet, basename='promotion')
router.register(r'price-overrides', PriceOverrideViewSet, basename='price-override')

urlpatterns = [
    path('', include(router.urls)),
    path('day-end-reports/', DayEndReportView.as_view(), name='day-end-reports'),
    path('promotions/apply/', PromotionApplyView.as_view(), name='apply-promotion'),
]


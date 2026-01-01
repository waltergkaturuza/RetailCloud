"""
URLs for customers app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, CustomerTransactionViewSet
from .crm_views import (
    CustomerSegmentViewSet, CustomerSegmentMembershipViewSet,
    CustomerRFMScoreViewSet, CustomerLifetimeValueViewSet,
    CustomerTouchpointViewSet, CustomerJourneyStageViewSet,
    LoyaltyTierViewSet, CustomerLoyaltyTierViewSet,
    LoyaltyRewardViewSet, LoyaltyRedemptionViewSet
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'transactions', CustomerTransactionViewSet, basename='customer-transaction')

# CRM routes
router.register(r'segments', CustomerSegmentViewSet, basename='customer-segment')
router.register(r'segment-memberships', CustomerSegmentMembershipViewSet, basename='segment-membership')
router.register(r'rfm-scores', CustomerRFMScoreViewSet, basename='rfm-score')
router.register(r'clv', CustomerLifetimeValueViewSet, basename='customer-clv')
router.register(r'touchpoints', CustomerTouchpointViewSet, basename='customer-touchpoint')
router.register(r'journey-stages', CustomerJourneyStageViewSet, basename='journey-stage')
router.register(r'loyalty-tiers', LoyaltyTierViewSet, basename='loyalty-tier')
router.register(r'loyalty-memberships', CustomerLoyaltyTierViewSet, basename='loyalty-membership')
router.register(r'loyalty-rewards', LoyaltyRewardViewSet, basename='loyalty-reward')
router.register(r'loyalty-redemptions', LoyaltyRedemptionViewSet, basename='loyalty-redemption')

urlpatterns = [
    path('', include(router.urls)),
]





"""
URLs for reports app.
"""
from django.urls import path
from .views import SalesReportView, InventoryReportView, ProfitLossReportView
from .advanced_views import (
    ProductAnalyticsView,
    BranchComparisonView,
    TaxBreakdownView,
    TrendAnalysisView,
    PeriodComparisonView
)
from .recommendation_views import RecommendationsView

urlpatterns = [
    path('sales/', SalesReportView.as_view(), name='sales-report'),
    path('inventory/', InventoryReportView.as_view(), name='inventory-report'),
    path('profit-loss/', ProfitLossReportView.as_view(), name='profit-loss-report'),
    
    # Advanced Analytics Endpoints
    path('analytics/products/', ProductAnalyticsView.as_view(), name='product-analytics'),
    path('analytics/branches/', BranchComparisonView.as_view(), name='branch-comparison'),
    path('analytics/tax/', TaxBreakdownView.as_view(), name='tax-breakdown'),
    path('analytics/trends/', TrendAnalysisView.as_view(), name='trend-analysis'),
    path('analytics/compare/', PeriodComparisonView.as_view(), name='period-comparison'),
    
    # Recommendations
    path('recommendations/', RecommendationsView.as_view(), name='recommendations'),
]



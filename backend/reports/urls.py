"""
URLs for reports app.
"""
from django.urls import path
from .views import SalesReportView, InventoryReportView, ProfitLossReportView

urlpatterns = [
    path('sales/', SalesReportView.as_view(), name='sales-report'),
    path('inventory/', InventoryReportView.as_view(), name='inventory-report'),
    path('profit-loss/', ProfitLossReportView.as_view(), name='profit-loss-report'),
]


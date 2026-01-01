from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseCategoryViewSet, ExpenseViewSet, TaxTransactionViewSet
from .tax_views import (
    TaxConfigurationViewSet, TaxPeriodViewSet, TaxLiabilityViewSet,
    TaxReportingView, TaxCalendarView
)

router = DefaultRouter()
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expensecategory')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'tax-transactions', TaxTransactionViewSet, basename='taxtransaction')
router.register(r'tax-configuration', TaxConfigurationViewSet, basename='taxconfiguration')
router.register(r'tax-periods', TaxPeriodViewSet, basename='taxperiod')
router.register(r'tax-liabilities', TaxLiabilityViewSet, basename='taxliability')

urlpatterns = [
    path('', include(router.urls)),
    path('tax-reporting/', TaxReportingView.as_view(), name='tax-reporting'),
    path('tax-calendar/', TaxCalendarView.as_view(), name='tax-calendar'),
]




from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseCategoryViewSet, ExpenseViewSet, TaxTransactionViewSet
from .tax_views import (
    TaxConfigurationViewSet, TaxPeriodViewSet, TaxLiabilityViewSet,
    TaxReportingView, TaxCalendarView
)

# Import double-entry views (premium feature)
try:
    from .double_entry_views import (
        ChartOfAccountsViewSet,
        JournalEntryViewSet,
        GeneralLedgerViewSet,
        AccountingReportsView
    )
    DOUBLE_ENTRY_AVAILABLE = True
except ImportError:
    DOUBLE_ENTRY_AVAILABLE = False

router = DefaultRouter()
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expensecategory')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'tax-transactions', TaxTransactionViewSet, basename='taxtransaction')
router.register(r'tax-configuration', TaxConfigurationViewSet, basename='taxconfiguration')
router.register(r'tax-periods', TaxPeriodViewSet, basename='taxperiod')
router.register(r'tax-liabilities', TaxLiabilityViewSet, basename='taxliability')

# Double-entry bookkeeping routes (premium feature)
if DOUBLE_ENTRY_AVAILABLE:
    router.register(r'chart-of-accounts', ChartOfAccountsViewSet, basename='chartofaccounts')
    router.register(r'journal-entries', JournalEntryViewSet, basename='journalentry')
    router.register(r'general-ledger', GeneralLedgerViewSet, basename='generalledger')

urlpatterns = [
    path('', include(router.urls)),
    path('tax-reporting/', TaxReportingView.as_view(), name='tax-reporting'),
    path('tax-calendar/', TaxCalendarView.as_view(), name='tax-calendar'),
]

# Double-entry bookkeeping report routes (premium feature)
if DOUBLE_ENTRY_AVAILABLE:
    urlpatterns += [
        path('reports/<str:report_type>/', AccountingReportsView.as_view(), name='accounting-reports'),
    ]




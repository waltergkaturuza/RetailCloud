from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseCategoryViewSet, ExpenseViewSet, TaxTransactionViewSet

router = DefaultRouter()
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expensecategory')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'tax-transactions', TaxTransactionViewSet, basename='taxtransaction')

urlpatterns = [
    path('', include(router.urls)),
]




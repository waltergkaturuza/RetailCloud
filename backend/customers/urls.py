"""
URLs for customers app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, CustomerTransactionViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'transactions', CustomerTransactionViewSet, basename='customer-transaction')

urlpatterns = [
    path('', include(router.urls)),
]



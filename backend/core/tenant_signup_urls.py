"""
URLs for tenant signup.
"""
from django.urls import path
from .tenant_signup_views import TenantSignupView

urlpatterns = [
    path('signup/', TenantSignupView.as_view(), name='tenant-signup'),
]




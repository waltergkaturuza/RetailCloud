"""
URLs for Tenant Branding Settings.
"""
from django.urls import path
from .branding_views import TenantBrandingView

urlpatterns = [
    path('branding/', TenantBrandingView.as_view(), name='tenant-branding'),
]


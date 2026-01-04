"""
URL configuration for Retail SaaS Platform.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import home, favicon_view

urlpatterns = [
    path('favicon.ico', favicon_view, name='favicon'),
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/inventory/bulk/', include('inventory.bulk_urls')),
    path('api/pos/', include('pos.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/purchases/', include('purchases.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/suppliers/', include('suppliers.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/accounting/', include('accounting.urls')),
    path('api/webhooks/', include('core.webhook_urls')),
    path('api/currency/', include('core.currency_urls')),
    path('api/receipts/', include('core.receipt_urls')),
    path('api/core/', include('core.branch_urls')),
    path('api/core/', include('core.branding_urls')),
    path('api/core/', include('core.pricing_urls')),
    path('api/core/', include('core.module_urls')),
    path('api/notifications/', include('core.notification_urls')),
    path('api/industry/', include('core.industry_urls')),
    path('api/business-categories/', include('core.business_category_urls')),
    path('api/tenant/', include('core.tenant_signup_urls')),
    path('api/owner/', include('core.owner_urls')),
    path('api/auth/', include('core.email_verification_urls')),
    path('api/marketing/', include('marketing.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/quotes/', include('quotes.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


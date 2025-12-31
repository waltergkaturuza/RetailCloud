"""
URLs for marketing app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MarketingCampaignViewSet, EmailTemplateViewSet,
    AutomationWorkflowViewSet, PushNotificationViewSet,
    SocialMediaIntegrationViewSet
)

router = DefaultRouter()
router.register(r'campaigns', MarketingCampaignViewSet, basename='marketing-campaign')
router.register(r'email-templates', EmailTemplateViewSet, basename='email-template')
router.register(r'automation-workflows', AutomationWorkflowViewSet, basename='automation-workflow')
router.register(r'push-notifications', PushNotificationViewSet, basename='push-notification')
router.register(r'social-media', SocialMediaIntegrationViewSet, basename='social-media')

urlpatterns = [
    path('', include(router.urls)),
]


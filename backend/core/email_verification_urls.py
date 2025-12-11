"""
URL configuration for email verification.
"""
from django.urls import path
from .email_verification_views import SendVerificationEmailView, VerifyEmailView

urlpatterns = [
    path('send-verification/', SendVerificationEmailView.as_view(), name='send-verification'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
]


"""
URLs for accounts app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet
from .agreement_views import UserAgreementView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('agreement/', UserAgreementView.as_view(), name='user-agreement'),
]

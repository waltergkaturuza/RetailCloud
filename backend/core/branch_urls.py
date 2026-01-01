"""
URL patterns for branch management.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .branch_views import BranchViewSet

router = DefaultRouter()
router.register(r'branches', BranchViewSet, basename='branch')

urlpatterns = [
    path('', include(router.urls)),
]





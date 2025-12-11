"""
URL configuration for modules.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .module_views import ModuleViewSet

router = DefaultRouter()
router.register(r'modules', ModuleViewSet, basename='module')

urlpatterns = [
    path('', include(router.urls)),
]


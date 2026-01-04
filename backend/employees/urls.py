"""
URLs for Employee Management & HR.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, ShiftTemplateViewSet, ShiftViewSet,
    TimeOffRequestViewSet, EmployeeAvailabilityViewSet,
    PerformanceReviewViewSet, EmployeeGoalViewSet
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'shift-templates', ShiftTemplateViewSet, basename='shift-template')
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'time-off-requests', TimeOffRequestViewSet, basename='time-off-request')
router.register(r'availabilities', EmployeeAvailabilityViewSet, basename='availability')
router.register(r'performance-reviews', PerformanceReviewViewSet, basename='performance-review')
router.register(r'goals', EmployeeGoalViewSet, basename='goal')

urlpatterns = [
    path('', include(router.urls)),
]



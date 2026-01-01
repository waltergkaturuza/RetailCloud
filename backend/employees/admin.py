"""
Django Admin for Employee Management & HR.
"""
from django.contrib import admin
from .models import (
    Employee, ShiftTemplate, Shift, TimeOffRequest,
    EmployeeAvailability, PerformanceReview, EmployeeGoal
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'full_name', 'email', 'phone', 'job_title', 'status', 'branch', 'is_active']
    list_filter = ['status', 'employment_type', 'branch', 'department', 'is_active']
    search_fields = ['employee_id', 'first_name', 'last_name', 'email', 'phone']
    readonly_fields = ['created_at', 'updated_at', 'full_name', 'display_name']
    fieldsets = (
        ('Basic Information', {
            'fields': ('employee_id', 'user', 'branch', 'first_name', 'last_name', 'middle_name', 'full_name', 'display_name')
        }),
        ('Personal Information', {
            'fields': ('date_of_birth', 'gender', 'national_id', 'email', 'phone', 'phone_alt', 'address', 'city', 'country', 'postal_code')
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship')
        }),
        ('Employment', {
            'fields': ('employment_type', 'status', 'hire_date', 'termination_date', 'termination_reason', 'job_title', 'department', 'reports_to')
        }),
        ('Compensation', {
            'fields': ('salary', 'hourly_rate', 'currency', 'bank_name', 'bank_account_number', 'bank_account_name', 'bank_branch')
        }),
        ('Additional', {
            'fields': ('skills', 'certifications', 'photo', 'documents', 'notes', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ShiftTemplate)
class ShiftTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'branch', 'weekday', 'start_time', 'end_time', 'is_recurring', 'is_active']
    list_filter = ['branch', 'weekday', 'is_recurring', 'is_active']
    search_fields = ['name']


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'start_time', 'end_time', 'status', 'clock_in_time', 'clock_out_time']
    list_filter = ['status', 'date', 'branch']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']
    readonly_fields = ['scheduled_hours', 'actual_hours', 'is_late', 'created_at', 'updated_at']
    date_hierarchy = 'date'


@admin.register(TimeOffRequest)
class TimeOffRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'type', 'start_date', 'end_date', 'duration_days', 'status', 'approved_by']
    list_filter = ['type', 'status', 'start_date']
    search_fields = ['employee__first_name', 'employee__last_name']
    readonly_fields = ['duration_days', 'created_at', 'updated_at']


@admin.register(EmployeeAvailability)
class EmployeeAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['employee', 'preferred_hours_per_week', 'max_hours_per_week']
    search_fields = ['employee__first_name', 'employee__last_name']


@admin.register(PerformanceReview)
class PerformanceReviewAdmin(admin.ModelAdmin):
    list_display = ['employee', 'review_period_start', 'review_period_end', 'overall_rating', 'reviewed_by', 'review_date']
    list_filter = ['review_date', 'overall_rating']
    search_fields = ['employee__first_name', 'employee__last_name']
    date_hierarchy = 'review_date'


@admin.register(EmployeeGoal)
class EmployeeGoalAdmin(admin.ModelAdmin):
    list_display = ['employee', 'title', 'target_value', 'current_value', 'progress_percentage', 'status', 'target_date']
    list_filter = ['status', 'target_date']
    search_fields = ['employee__first_name', 'employee__last_name', 'title']
    readonly_fields = ['progress_percentage', 'created_at', 'updated_at']


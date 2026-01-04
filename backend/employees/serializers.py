"""
Serializers for Employee Management & HR.
"""
from rest_framework import serializers
from django.utils import timezone
from .models import (
    Employee, ShiftTemplate, Shift, TimeOffRequest,
    EmployeeAvailability, PerformanceReview, EmployeeGoal
)
from accounts.models import User
from core.models import Branch


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer for Employee model."""
    
    full_name = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    reports_to_name = serializers.CharField(source='reports_to.full_name', read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'tenant', 'user', 'user_email', 'branch', 'branch_name',
            'first_name', 'last_name', 'middle_name', 'full_name', 'display_name',
            'date_of_birth', 'gender', 'national_id',
            'email', 'phone', 'phone_alt', 'address', 'city', 'country', 'postal_code',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'employment_type', 'status', 'hire_date', 'termination_date', 'termination_reason',
            'job_title', 'department', 'reports_to', 'reports_to_name',
            'salary', 'hourly_rate', 'currency',
            'bank_name', 'bank_account_number', 'bank_account_name', 'bank_branch',
            'skills', 'certifications', 'photo', 'documents', 'notes',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name', 'display_name']
    
    def validate_employee_id(self, value):
        """Ensure employee ID is unique per tenant."""
        tenant = self.context['request'].user.tenant if hasattr(self.context['request'].user, 'tenant') else None
        if not tenant:
            raise serializers.ValidationError("Tenant is required")
        
        queryset = Employee.objects.filter(tenant=tenant, employee_id=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Employee ID already exists for this tenant")
        return value


class ShiftTemplateSerializer(serializers.ModelSerializer):
    """Serializer for ShiftTemplate model."""
    
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = ShiftTemplate
        fields = [
            'id', 'name', 'tenant', 'branch', 'branch_name',
            'start_time', 'end_time', 'break_duration',
            'weekday', 'weekday_display', 'is_recurring',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShiftSerializer(serializers.ModelSerializer):
    """Serializer for Shift model."""
    
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    scheduled_hours = serializers.FloatField(read_only=True)
    actual_hours = serializers.FloatField(read_only=True)
    is_late = serializers.BooleanField(read_only=True)
    swapped_with_employee = serializers.CharField(source='swapped_with.employee.full_name', read_only=True)
    
    class Meta:
        model = Shift
        fields = [
            'id', 'tenant', 'employee', 'employee_name', 'employee_id',
            'branch', 'branch_name', 'shift_template',
            'date', 'start_time', 'end_time', 'break_duration',
            'status', 'status_display',
            'clock_in_time', 'clock_out_time', 'break_start_time', 'break_end_time',
            'clock_in_location', 'clock_out_location',
            'notes', 'manager_notes',
            'swapped_with', 'swapped_with_employee', 'swap_requested_at', 'swap_approved_by',
            'scheduled_hours', 'actual_hours', 'is_late',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'scheduled_hours', 'actual_hours', 'is_late'
        ]


class TimeOffRequestSerializer(serializers.ModelSerializer):
    """Serializer for TimeOffRequest model."""
    
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TimeOffRequest
        fields = [
            'id', 'tenant', 'employee', 'employee_name', 'employee_id',
            'type', 'type_display', 'start_date', 'end_date', 'duration_days',
            'reason', 'status', 'status_display',
            'approved_by', 'approved_by_name', 'approved_at', 'rejection_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'duration_days', 'approved_at'
        ]
    
    def validate(self, data):
        """Validate that end_date is after start_date."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })
        return data


class EmployeeAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for EmployeeAvailability model."""
    
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    preferred_shifts_data = ShiftTemplateSerializer(source='preferred_shifts', many=True, read_only=True)
    
    class Meta:
        model = EmployeeAvailability
        fields = [
            'id', 'tenant', 'employee', 'employee_name',
            'monday_start', 'monday_end', 'monday_available',
            'tuesday_start', 'tuesday_end', 'tuesday_available',
            'wednesday_start', 'wednesday_end', 'wednesday_available',
            'thursday_start', 'thursday_end', 'thursday_available',
            'friday_start', 'friday_end', 'friday_available',
            'saturday_start', 'saturday_end', 'saturday_available',
            'sunday_start', 'sunday_end', 'sunday_available',
            'preferred_hours_per_week', 'max_hours_per_week',
            'preferred_shifts', 'preferred_shifts_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PerformanceReviewSerializer(serializers.ModelSerializer):
    """Serializer for PerformanceReview model."""
    
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    overall_rating_display = serializers.CharField(source='get_overall_rating_display', read_only=True)
    
    class Meta:
        model = PerformanceReview
        fields = [
            'id', 'tenant', 'employee', 'employee_name', 'employee_id',
            'review_period_start', 'review_period_end', 'review_date',
            'overall_rating', 'overall_rating_display',
            'punctuality_rating', 'quality_rating', 'teamwork_rating', 'communication_rating',
            'strengths', 'areas_for_improvement', 'goals',
            'reviewer_notes', 'kpi_data', 'employee_comments',
            'reviewed_by', 'reviewed_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmployeeGoalSerializer(serializers.ModelSerializer):
    """Serializer for EmployeeGoal model."""
    
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    
    class Meta:
        model = EmployeeGoal
        fields = [
            'id', 'tenant', 'employee', 'employee_name', 'employee_id',
            'performance_review', 'title', 'description',
            'target_value', 'current_value', 'unit',
            'start_date', 'target_date', 'completed_date',
            'status', 'status_display', 'progress_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'progress_percentage', 'completed_date'
        ]
    
    def validate(self, data):
        """Validate that target_date is after start_date."""
        start_date = data.get('start_date')
        target_date = data.get('target_date')
        
        if start_date and target_date and target_date < start_date:
            raise serializers.ValidationError({
                'target_date': 'Target date must be after start date'
            })
        return data


class ShiftClockInSerializer(serializers.Serializer):
    """Serializer for clock in action."""
    
    location = serializers.JSONField(required=False, help_text="GPS coordinates {lat, lng}")
    notes = serializers.CharField(required=False, allow_blank=True)


class ShiftClockOutSerializer(serializers.Serializer):
    """Serializer for clock out action."""
    
    location = serializers.JSONField(required=False, help_text="GPS coordinates {lat, lng}")
    notes = serializers.CharField(required=False, allow_blank=True)


class ShiftBreakStartSerializer(serializers.Serializer):
    """Serializer for break start action."""
    pass


class ShiftBreakEndSerializer(serializers.Serializer):
    """Serializer for break end action."""
    pass



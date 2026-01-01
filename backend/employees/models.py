"""
Employee Management & HR Models
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from accounts.models import User
from core.models import Tenant, Branch


class Employee(models.Model):
    """Employee profile with full HR information."""
    
    EMPLOYMENT_TYPES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('temporary', 'Temporary'),
        ('intern', 'Intern'),
        ('volunteer', 'Volunteer'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('on_leave', 'On Leave'),
        ('suspended', 'Suspended'),
        ('terminated', 'Terminated'),
        ('inactive', 'Inactive'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='employees')
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='employee_profile',
        null=True,
        blank=True,
        help_text="Link to user account if exists"
    )
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    
    # Employee ID
    employee_id = models.CharField(max_length=50, unique=True, db_index=True, help_text="Unique employee ID")
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=[
            ('male', 'Male'),
            ('female', 'Female'),
            ('other', 'Other'),
            ('prefer_not_to_say', 'Prefer Not to Say'),
        ],
        blank=True
    )
    national_id = models.CharField(max_length=50, blank=True, help_text="National ID/Passport number")
    
    # Contact Information
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20)
    phone_alt = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Zimbabwe')
    postal_code = models.CharField(max_length=20, blank=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True)
    
    # Employment Details
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPES, default='full_time')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    hire_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)
    termination_reason = models.TextField(blank=True)
    
    # Job Details
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    reports_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subordinates',
        help_text="Manager/Supervisor"
    )
    
    # Compensation
    salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Base salary"
    )
    hourly_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Hourly rate for part-time employees"
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Banking Details (for payroll)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_account_name = models.CharField(max_length=100, blank=True)
    bank_branch = models.CharField(max_length=100, blank=True)
    
    # Skills & Certifications
    skills = models.JSONField(default=list, blank=True, help_text="List of skills")
    certifications = models.JSONField(default=list, blank=True, help_text="List of certifications")
    
    # Documents & Attachments
    photo = models.ImageField(upload_to='employee_photos/', null=True, blank=True)
    documents = models.JSONField(
        default=list,
        blank=True,
        help_text="List of document URLs/names (resume, ID copy, etc.)"
    )
    
    # Notes
    notes = models.TextField(blank=True, help_text="Internal notes about the employee")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'employees'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['employee_id']),
            models.Index(fields=['branch', 'status']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"
    
    @property
    def full_name(self):
        """Get full name."""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    
    @property
    def display_name(self):
        """Display name with employee ID."""
        return f"{self.full_name} - {self.employee_id}"


class ShiftTemplate(models.Model):
    """Template for recurring shifts."""
    
    WEEKDAYS = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='shift_templates')
    name = models.CharField(max_length=100, help_text="e.g., Morning Shift, Evening Shift")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True, related_name='shift_templates')
    
    # Shift Times
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_duration = models.IntegerField(default=0, help_text="Break duration in minutes")
    
    # Recurrence
    weekday = models.IntegerField(choices=WEEKDAYS, null=True, blank=True, help_text="Day of week (if recurring)")
    is_recurring = models.BooleanField(default=True, help_text="Repeat weekly")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'shift_templates'
        ordering = ['weekday', 'start_time']
    
    def __str__(self):
        day = self.get_weekday_display() if self.weekday is not None else 'All Days'
        return f"{self.name} - {day} ({self.start_time} - {self.end_time})"


class Shift(models.Model):
    """Individual shift assignment."""
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='shifts')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='shifts')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='shifts')
    
    # Shift Details
    shift_template = models.ForeignKey(
        ShiftTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shift_instances'
    )
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_duration = models.IntegerField(default=0, help_text="Break duration in minutes")
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Clock Times (actual)
    clock_in_time = models.DateTimeField(null=True, blank=True)
    clock_out_time = models.DateTimeField(null=True, blank=True)
    break_start_time = models.DateTimeField(null=True, blank=True)
    break_end_time = models.DateTimeField(null=True, blank=True)
    
    # GPS/Location (for verification)
    clock_in_location = models.JSONField(null=True, blank=True, help_text="Latitude, longitude")
    clock_out_location = models.JSONField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    manager_notes = models.TextField(blank=True)
    
    # Swapping
    swapped_with = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='swapped_from',
        help_text="If this shift was swapped with another"
    )
    swap_requested_at = models.DateTimeField(null=True, blank=True)
    swap_approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_swaps'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'shifts'
        ordering = ['-date', 'start_time']
        indexes = [
            models.Index(fields=['tenant', 'date']),
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['branch', 'date']),
            models.Index(fields=['status', 'date']),
        ]
        unique_together = [['employee', 'date', 'start_time']]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.date} {self.start_time}-{self.end_time}"
    
    @property
    def scheduled_hours(self):
        """Calculate scheduled hours."""
        from datetime import datetime, timedelta
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        if end <= start:
            end += timedelta(days=1)  # Overnight shift
        duration = end - start
        break_duration_obj = timedelta(minutes=self.break_duration)
        return (duration - break_duration_obj).total_seconds() / 3600
    
    @property
    def actual_hours(self):
        """Calculate actual worked hours."""
        if not self.clock_in_time or not self.clock_out_time:
            return None
        duration = self.clock_out_time - self.clock_in_time
        if self.break_start_time and self.break_end_time:
            break_duration = self.break_end_time - self.break_start_time
            duration -= break_duration
        return duration.total_seconds() / 3600
    
    @property
    def is_late(self):
        """Check if employee clocked in late."""
        from datetime import timedelta
        if not self.clock_in_time:
            return None
        scheduled_start = timezone.make_aware(
            timezone.datetime.combine(self.date, self.start_time)
        )
        return self.clock_in_time > scheduled_start + timedelta(minutes=5)  # 5 min grace period


class TimeOffRequest(models.Model):
    """Time off/leave requests."""
    
    TYPE_CHOICES = [
        ('vacation', 'Vacation'),
        ('sick', 'Sick Leave'),
        ('personal', 'Personal'),
        ('bereavement', 'Bereavement'),
        ('maternity', 'Maternity'),
        ('paternity', 'Paternity'),
        ('unpaid', 'Unpaid Leave'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='time_off_requests')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='time_off_requests')
    
    # Request Details
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='vacation')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_time_off_requests'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'time_off_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['employee', 'start_date']),
        ]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.start_date} to {self.end_date} ({self.get_status_display()})"
    
    @property
    def duration_days(self):
        """Calculate duration in days."""
        return (self.end_date - self.start_date).days + 1


class EmployeeAvailability(models.Model):
    """Employee availability/preferences for scheduling."""
    
    WEEKDAYS = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='employee_availabilities')
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='availability')
    
    # Availability by day
    monday_start = models.TimeField(null=True, blank=True)
    monday_end = models.TimeField(null=True, blank=True)
    monday_available = models.BooleanField(default=True)
    
    tuesday_start = models.TimeField(null=True, blank=True)
    tuesday_end = models.TimeField(null=True, blank=True)
    tuesday_available = models.BooleanField(default=True)
    
    wednesday_start = models.TimeField(null=True, blank=True)
    wednesday_end = models.TimeField(null=True, blank=True)
    wednesday_available = models.BooleanField(default=True)
    
    thursday_start = models.TimeField(null=True, blank=True)
    thursday_end = models.TimeField(null=True, blank=True)
    thursday_available = models.BooleanField(default=True)
    
    friday_start = models.TimeField(null=True, blank=True)
    friday_end = models.TimeField(null=True, blank=True)
    friday_available = models.BooleanField(default=True)
    
    saturday_start = models.TimeField(null=True, blank=True)
    saturday_end = models.TimeField(null=True, blank=True)
    saturday_available = models.BooleanField(default=True)
    
    sunday_start = models.TimeField(null=True, blank=True)
    sunday_end = models.TimeField(null=True, blank=True)
    sunday_available = models.BooleanField(default=True)
    
    # Preferences
    preferred_hours_per_week = models.IntegerField(null=True, blank=True)
    max_hours_per_week = models.IntegerField(null=True, blank=True)
    preferred_shifts = models.ManyToManyField(ShiftTemplate, blank=True, related_name='preferred_by')
    
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'employee_availabilities'
    
    def __str__(self):
        return f"Availability for {self.employee.full_name}"


class PerformanceReview(models.Model):
    """Employee performance reviews."""
    
    RATING_CHOICES = [
        (1, 'Poor'),
        (2, 'Below Average'),
        (3, 'Average'),
        (4, 'Good'),
        (5, 'Excellent'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='performance_reviews')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='performance_reviews')
    
    # Review Details
    review_period_start = models.DateField()
    review_period_end = models.DateField()
    review_date = models.DateField(default=timezone.now)
    
    # Ratings
    overall_rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    punctuality_rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    quality_rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    teamwork_rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    communication_rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    
    # Feedback
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    goals = models.TextField(blank=True, help_text="Goals for next period")
    reviewer_notes = models.TextField(blank=True)
    
    # KPIs (can be JSON for flexibility)
    kpi_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Key performance indicators (sales, transactions, etc.)"
    )
    
    # Reviewers
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reviews_conducted')
    employee_comments = models.TextField(blank=True, help_text="Employee self-assessment")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'performance_reviews'
        ordering = ['-review_date']
        indexes = [
            models.Index(fields=['tenant', 'employee']),
            models.Index(fields=['review_date']),
        ]
    
    def __str__(self):
        return f"Review for {self.employee.full_name} - {self.review_period_start} to {self.review_period_end}"


class EmployeeGoal(models.Model):
    """Employee goals and objectives."""
    
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='employee_goals')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='goals')
    performance_review = models.ForeignKey(
        PerformanceReview,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='employee_goals'
    )
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    target_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    current_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    unit = models.CharField(max_length=50, blank=True, help_text="e.g., sales, transactions, hours")
    
    # Dates
    start_date = models.DateField()
    target_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'employee_goals'
        ordering = ['-target_date']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['target_date']),
        ]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.title}"
    
    @property
    def progress_percentage(self):
        """Calculate progress percentage."""
        if not self.target_value or self.target_value == 0:
            return 0
        return min(100, (self.current_value / self.target_value) * 100)


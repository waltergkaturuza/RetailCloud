"""
API Views for Employee Management & HR.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Sum, Avg, Count
from django.db import transaction
from datetime import datetime, timedelta, date

from .models import (
    Employee, ShiftTemplate, Shift, TimeOffRequest,
    EmployeeAvailability, PerformanceReview, EmployeeGoal
)
from .serializers import (
    EmployeeSerializer, ShiftTemplateSerializer, ShiftSerializer,
    TimeOffRequestSerializer, EmployeeAvailabilitySerializer,
    PerformanceReviewSerializer, EmployeeGoalSerializer,
    ShiftClockInSerializer, ShiftClockOutSerializer,
    ShiftBreakStartSerializer, ShiftBreakEndSerializer
)
from core.utils import get_tenant_from_request


class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for Employee management."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'employment_type', 'branch', 'department', 'job_title']
    search_fields = ['first_name', 'last_name', 'employee_id', 'email', 'phone']
    ordering_fields = ['created_at', 'hire_date', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter employees by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = Employee.objects.filter(tenant=tenant)
        
        # Filter by active status if requested
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        """Set tenant when creating employee."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Get employee's schedule for a date range."""
        employee = self.get_object()
        start_date = request.query_params.get('start_date', date.today().isoformat())
        end_date = request.query_params.get('end_date', (date.today() + timedelta(days=30)).isoformat())
        
        shifts = Shift.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date', 'start_time')
        
        serializer = ShiftSerializer(shifts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def attendance_summary(self, request, pk=None):
        """Get attendance summary for employee."""
        employee = self.get_object()
        start_date = request.query_params.get('start_date', (date.today() - timedelta(days=30)).isoformat())
        end_date = request.query_params.get('end_date', date.today().isoformat())
        
        shifts = Shift.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date
        )
        
        total_shifts = shifts.count()
        completed_shifts = shifts.filter(status='completed').count()
        no_show = shifts.filter(status='no_show').count()
        total_hours = shifts.filter(status='completed').aggregate(
            total=Sum('actual_hours')
        )['total'] or 0
        
        return Response({
            'total_shifts': total_shifts,
            'completed_shifts': completed_shifts,
            'no_show': no_show,
            'total_hours': round(total_hours, 2),
            'attendance_rate': round((completed_shifts / total_shifts * 100) if total_shifts > 0 else 0, 2)
        })
    
    @action(detail=True, methods=['get'])
    def performance_summary(self, request, pk=None):
        """Get performance summary for employee."""
        employee = self.get_object()
        
        latest_review = PerformanceReview.objects.filter(employee=employee).order_by('-review_date').first()
        active_goals = EmployeeGoal.objects.filter(employee=employee, status__in=['not_started', 'in_progress']).count()
        completed_goals = EmployeeGoal.objects.filter(employee=employee, status='completed').count()
        
        return Response({
            'latest_review': PerformanceReviewSerializer(latest_review).data if latest_review else None,
            'active_goals': active_goals,
            'completed_goals': completed_goals,
        })


class ShiftTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for ShiftTemplate management."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = ShiftTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch', 'weekday', 'is_recurring', 'is_active']
    search_fields = ['name']
    
    def get_queryset(self):
        """Filter shift templates by tenant."""
        tenant = get_tenant_from_request(self.request)
        return ShiftTemplate.objects.filter(tenant=tenant).order_by('weekday', 'start_time')
    
    def perform_create(self, serializer):
        """Set tenant when creating shift template."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['post'])
    def generate_shifts(self, request, pk=None):
        """Generate shifts from template for a date range."""
        template = self.get_object()
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        employee_ids = request.data.get('employee_ids', [])
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = get_tenant_from_request(request)
        employees = Employee.objects.filter(id__in=employee_ids, tenant=tenant) if employee_ids else []
        branch = template.branch
        
        created_shifts = []
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        current = start
        
        with transaction.atomic():
            while current <= end:
                if template.weekday is None or current.weekday() == template.weekday:
                    for employee in employees:
                        shift, created = Shift.objects.get_or_create(
                            tenant=tenant,
                            employee=employee,
                            branch=branch,
                            date=current,
                            start_time=template.start_time,
                            defaults={
                                'end_time': template.end_time,
                                'break_duration': template.break_duration,
                                'shift_template': template,
                                'status': 'scheduled'
                            }
                        )
                        if created:
                            created_shifts.append(shift)
                current += timedelta(days=1)
        
        serializer = ShiftSerializer(created_shifts, many=True)
        return Response({
            'created': len(created_shifts),
            'shifts': serializer.data
        })


class ShiftViewSet(viewsets.ModelViewSet):
    """ViewSet for Shift management."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = ShiftSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['employee', 'branch', 'status', 'date']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']
    ordering_fields = ['date', 'start_time', 'created_at']
    ordering = ['-date', 'start_time']
    
    def get_queryset(self):
        """Filter shifts by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = Shift.objects.filter(tenant=tenant).select_related('employee', 'branch')
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set tenant when creating shift."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['post'])
    def clock_in(self, request, pk=None):
        """Clock in for a shift."""
        shift = self.get_object()
        
        if shift.clock_in_time:
            return Response(
                {'error': 'Already clocked in'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ShiftClockInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        shift.clock_in_time = timezone.now()
        shift.status = 'in_progress'
        if serializer.validated_data.get('location'):
            shift.clock_in_location = serializer.validated_data['location']
        if serializer.validated_data.get('notes'):
            shift.notes = serializer.validated_data['notes']
        shift.save()
        
        return Response(ShiftSerializer(shift).data)
    
    @action(detail=True, methods=['post'])
    def clock_out(self, request, pk=None):
        """Clock out from a shift."""
        shift = self.get_object()
        
        if not shift.clock_in_time:
            return Response(
                {'error': 'Must clock in first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if shift.clock_out_time:
            return Response(
                {'error': 'Already clocked out'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ShiftClockOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        shift.clock_out_time = timezone.now()
        shift.status = 'completed'
        if serializer.validated_data.get('location'):
            shift.clock_out_location = serializer.validated_data['location']
        if serializer.validated_data.get('notes'):
            shift.notes += f"\n{serializer.validated_data['notes']}"
        shift.save()
        
        return Response(ShiftSerializer(shift).data)
    
    @action(detail=True, methods=['post'])
    def start_break(self, request, pk=None):
        """Start break."""
        shift = self.get_object()
        
        if not shift.clock_in_time:
            return Response(
                {'error': 'Must clock in first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if shift.break_start_time:
            return Response(
                {'error': 'Break already started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shift.break_start_time = timezone.now()
        shift.save()
        
        return Response(ShiftSerializer(shift).data)
    
    @action(detail=True, methods=['post'])
    def end_break(self, request, pk=None):
        """End break."""
        shift = self.get_object()
        
        if not shift.break_start_time:
            return Response(
                {'error': 'Must start break first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if shift.break_end_time:
            return Response(
                {'error': 'Break already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shift.break_end_time = timezone.now()
        shift.save()
        
        return Response(ShiftSerializer(shift).data)
    
    @action(detail=True, methods=['post'])
    def swap_request(self, request, pk=None):
        """Request to swap this shift with another employee."""
        shift = self.get_object()
        target_shift_id = request.data.get('target_shift_id')
        
        if not target_shift_id:
            return Response(
                {'error': 'target_shift_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_shift = Shift.objects.get(pk=target_shift_id, tenant=shift.tenant)
        except Shift.DoesNotExist:
            return Response(
                {'error': 'Target shift not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Swap the employees
        temp_employee = shift.employee
        shift.employee = target_shift.employee
        target_shift.employee = temp_employee
        shift.swapped_with = target_shift
        shift.swap_requested_at = timezone.now()
        
        shift.save()
        target_shift.save()
        
        return Response({
            'message': 'Shift swap requested',
            'shift': ShiftSerializer(shift).data,
            'target_shift': ShiftSerializer(target_shift).data
        })


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for TimeOffRequest management."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = TimeOffRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'type', 'status', 'start_date', 'end_date']
    ordering_fields = ['created_at', 'start_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter time off requests by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = TimeOffRequest.objects.filter(tenant=tenant).select_related('employee', 'approved_by')
        
        # Filter by employee if user is not admin
        user = self.request.user
        if user.role not in ['super_admin', 'tenant_admin', 'manager']:
            try:
                employee = Employee.objects.get(user=user, tenant=tenant)
                queryset = queryset.filter(employee=employee)
            except Employee.DoesNotExist:
                queryset = queryset.none()
        
        return queryset
    
    def perform_create(self, serializer):
        """Set tenant and employee when creating time off request."""
        tenant = get_tenant_from_request(self.request)
        user = self.request.user
        
        # If employee doesn't specify, use current user's employee profile
        if 'employee' not in serializer.validated_data:
            try:
                employee = Employee.objects.get(user=user, tenant=tenant)
                serializer.save(tenant=tenant, employee=employee)
            except Employee.DoesNotExist:
                serializer.save(tenant=tenant)
        else:
            serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a time off request."""
        time_off = self.get_object()
        
        if time_off.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_off.status = 'approved'
        time_off.approved_by = request.user
        time_off.approved_at = timezone.now()
        time_off.save()
        
        return Response(TimeOffRequestSerializer(time_off).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a time off request."""
        time_off = self.get_object()
        rejection_reason = request.data.get('rejection_reason', '')
        
        if time_off.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_off.status = 'rejected'
        time_off.approved_by = request.user
        time_off.approved_at = timezone.now()
        time_off.rejection_reason = rejection_reason
        time_off.save()
        
        return Response(TimeOffRequestSerializer(time_off).data)


class EmployeeAvailabilityViewSet(viewsets.ModelViewSet):
    """ViewSet for EmployeeAvailability management."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeAvailabilitySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee']
    
    def get_queryset(self):
        """Filter availabilities by tenant."""
        tenant = get_tenant_from_request(self.request)
        return EmployeeAvailability.objects.filter(tenant=tenant).select_related('employee')
    
    def perform_create(self, serializer):
        """Set tenant when creating availability."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)


class PerformanceReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for PerformanceReview management."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = PerformanceReviewSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'review_date']
    ordering_fields = ['review_date']
    ordering = ['-review_date']
    
    def get_queryset(self):
        """Filter performance reviews by tenant."""
        tenant = get_tenant_from_request(self.request)
        return PerformanceReview.objects.filter(tenant=tenant).select_related('employee', 'reviewed_by')
    
    def perform_create(self, serializer):
        """Set tenant when creating performance review."""
        tenant = get_tenant_from_request(self.request)
        if 'reviewed_by' not in serializer.validated_data:
            serializer.save(tenant=tenant, reviewed_by=self.request.user)
        else:
            serializer.save(tenant=tenant)


class EmployeeGoalViewSet(viewsets.ModelViewSet):
    """ViewSet for EmployeeGoal management."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeGoalSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'status', 'performance_review']
    ordering_fields = ['target_date', 'created_at']
    ordering = ['-target_date']
    
    def get_queryset(self):
        """Filter goals by tenant."""
        tenant = get_tenant_from_request(self.request)
        return EmployeeGoal.objects.filter(tenant=tenant).select_related('employee', 'performance_review')
    
    def perform_create(self, serializer):
        """Set tenant when creating goal."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update goal progress."""
        goal = self.get_object()
        current_value = request.data.get('current_value')
        
        if current_value is None:
            return Response(
                {'error': 'current_value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        goal.current_value = current_value
        
        # Auto-update status based on progress
        if goal.current_value >= goal.target_value:
            goal.status = 'completed'
            goal.completed_date = date.today()
        elif goal.current_value > 0:
            goal.status = 'in_progress'
        
        goal.save()
        
        return Response(EmployeeGoalSerializer(goal).data)


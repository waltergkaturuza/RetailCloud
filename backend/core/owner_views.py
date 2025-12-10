"""
Views for Owner/Super Admin Portal.
"""
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.conf import settings
from datetime import datetime, timedelta
from .owner_permissions import IsSuperAdmin
from .owner_models import (
    SystemSettings, OwnerAuditLog, SystemHealthMetric,
    SystemAnnouncement, TenantBackup
)
from .owner_serializers import (
    SystemSettingsSerializer, OwnerAuditLogSerializer,
    SystemHealthMetricSerializer, SystemAnnouncementSerializer,
    TenantBackupSerializer, OwnerDashboardStatsSerializer, TenantSummarySerializer,
    TenantDetailSerializer, TenantCreateUpdateSerializer, OwnerUserSerializer
)
from .models import Tenant
from accounts.models import User
from subscriptions.models import Subscription
from pos.models import Sale

User = get_user_model()


def log_audit(user, action_type, description, tenant=None, metadata=None, request=None):
    """Helper function to log audit events."""
    OwnerAuditLog.objects.create(
        user=user,
        action_type=action_type,
        description=description,
        tenant=tenant,
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
        metadata=metadata or {}
    )


class OwnerDashboardView(views.APIView):
    """Owner dashboard with system-wide statistics."""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        end_of_day = timezone.make_aware(datetime.combine(today, datetime.max.time()))
        
        # Tenant statistics
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(subscription_status='active').count()
        suspended_tenants = Tenant.objects.filter(subscription_status='suspended').count()
        trial_tenants = Tenant.objects.filter(subscription_status='trial').count()
        
        # User and branch statistics
        total_users = User.objects.filter(tenant__isnull=False).count()
        total_branches = Tenant.objects.aggregate(total=Count('branches'))['total'] or 0
        
        # Sales statistics
        sales_today = Sale.objects.filter(date__date=today)
        total_sales_today_usd = sales_today.filter(currency='USD').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        total_sales_today_zwl = sales_today.filter(currency='ZWL').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        total_transactions_today = sales_today.count()
        
        # System health
        latest_health = SystemHealthMetric.objects.filter(
            metric_type='api_uptime'
        ).order_by('-recorded_at').first()
        system_health_status = latest_health.status if latest_health else 'healthy'
        
        # Recent audit logs
        recent_logs = OwnerAuditLog.objects.all()[:10]
        
        # Top tenants by sales
        top_tenants = Tenant.objects.annotate(
            total_sales=Sum('sales__total_amount')
        ).order_by('-total_sales')[:10]
        
        top_tenants_list = [
            {
                'id': t.id,
                'name': t.name,
                'total_sales': float(t.total_sales or 0)
            }
            for t in top_tenants
        ]
        
        # Industry distribution
        industry_dist = Tenant.objects.values(
            'business_category__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        industry_distribution = {
            item['business_category__name'] or 'Uncategorized': item['count']
            for item in industry_dist
        }
        
        data = {
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'suspended_tenants': suspended_tenants,
            'trial_tenants': trial_tenants,
            'total_users': total_users,
            'total_branches': total_branches,
            'total_sales_today_usd': float(total_sales_today_usd),
            'total_sales_today_zwl': float(total_sales_today_zwl),
            'total_transactions_today': total_transactions_today,
            'active_pos_terminals': 0,  # TODO: Implement POS terminal tracking
            'system_health_status': system_health_status,
            'recent_audit_logs': OwnerAuditLogSerializer(recent_logs, many=True).data,
            'top_tenants_by_sales': top_tenants_list,
            'industry_distribution': industry_distribution,
        }
        
        return Response(data)


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """Manage system-wide settings."""
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    lookup_field = 'key'
    
    def perform_create(self, serializer):
        """Create setting with audit log."""
        instance = serializer.save(updated_by=self.request.user)
        log_audit(
            self.request.user,
            'setting_change',
            f"Created setting: {instance.key}",
            metadata={'key': instance.key, 'value': instance.value, 'category': instance.category},
            request=self.request
        )
    
    def perform_update(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        log_audit(
            self.request.user,
            'setting_change',
            f"Updated setting: {instance.key}",
            metadata={'key': instance.key, 'old_value': '...', 'new_value': instance.value},
            request=self.request
        )
    
    def perform_destroy(self, instance):
        """Delete setting with audit log."""
        key = instance.key
        super().perform_destroy(instance)
        log_audit(
            self.request.user,
            'setting_change',
            f"Deleted setting: {key}",
            metadata={'key': key},
            request=self.request
        )
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get settings grouped by category."""
        settings = SystemSettings.objects.all().order_by('category', 'key')
        grouped = {}
        for setting in settings:
            if setting.category not in grouped:
                grouped[setting.category] = []
            grouped[setting.category].append(SystemSettingsSerializer(setting).data)
        return Response(grouped)
    
    @action(detail=False, methods=['get'])
    def public(self, request):
        """Get public settings (for tenants)."""
        settings = SystemSettings.objects.filter(is_public=True)
        return Response(SystemSettingsSerializer(settings, many=True).data)


class OwnerTenantViewSet(viewsets.ModelViewSet):
    """Full tenant management for owners."""
    queryset = Tenant.objects.all().order_by('-created_at')
    serializer_class = TenantSummarySerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    search_fields = ['name', 'company_name', 'email', 'slug']
    filterset_fields = ['subscription_status', 'business_category']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TenantDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TenantCreateUpdateSerializer
        return TenantSummarySerializer
    
    @transaction.atomic
    def create(self, request):
        """Create a new tenant."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = serializer.save()
        
        log_audit(
            request.user,
            'tenant_create',
            f"Created tenant: {tenant.company_name}",
            tenant=tenant,
            metadata={'tenant_id': tenant.id, 'tenant_name': tenant.company_name},
            request=request
        )
        
        return Response(TenantDetailSerializer(tenant).data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete a tenant."""
        tenant = self.get_object()
        tenant_name = tenant.company_name
        tenant_id = tenant.id
        
        self.perform_destroy(tenant)
        
        log_audit(
            request.user,
            'tenant_delete',
            f"Deleted tenant: {tenant_name}",
            metadata={'tenant_id': tenant_id, 'tenant_name': tenant_name},
            request=request
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a tenant."""
        tenant = self.get_object()
        tenant.subscription_status = 'suspended'
        tenant.save()
        
        log_audit(
            request.user,
            'tenant_suspend',
            f"Suspended tenant: {tenant.company_name}",
            tenant=tenant,
            request=request
        )
        
        return Response({'status': 'suspended'})
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a tenant."""
        tenant = self.get_object()
        tenant.subscription_status = 'active'
        tenant.save()
        
        log_audit(
            request.user,
            'tenant_activate',
            f"Activated tenant: {tenant.company_name}",
            tenant=tenant,
            request=request
        )
        
        return Response({'status': 'active'})
    
    @action(detail=True, methods=['get'])
    def detailed_stats(self, request, pk=None):
        """Get comprehensive detailed statistics for a tenant."""
        tenant = self.get_object()
        serializer = TenantDetailSerializer(tenant)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def subscription(self, request, pk=None):
        """Get tenant subscription details."""
        from subscriptions.serializers import SubscriptionSerializer
        tenant = self.get_object()
        try:
            subscription = Subscription.objects.get(tenant=tenant)
            return Response(SubscriptionSerializer(subscription).data)
        except Subscription.DoesNotExist:
            # Return null with 200 status instead of 404 so frontend can handle gracefully
            return Response({
                'id': None,
                'tenant': tenant.id,
                'tenant_name': tenant.company_name,
                'subscription_status': tenant.subscription_status,
                'package': None,
                'package_name': None,
                'billing_cycle': None,
                'status': tenant.subscription_status,
                'started_at': None,
                'current_period_start': None,
                'current_period_end': None,
                'cancelled_at': None,
                'is_active': False
            }, status=status.HTTP_200_OK)


class OwnerUserViewSet(viewsets.ModelViewSet):
    """Global user management for owners - view all users across all tenants."""
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = OwnerUserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    filterset_fields = ['role', 'tenant', 'is_active', 'is_email_verified']
    
    def get_queryset(self):
        """Filter out super_admin users (owners) from list unless specifically requested."""
        queryset = super().get_queryset()
        # Only show tenant users by default, not system owners
        show_owners = self.request.query_params.get('include_owners', 'false').lower() == 'true'
        if not show_owners:
            queryset = queryset.filter(tenant__isnull=False)
        return queryset
    
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete a user with audit log."""
        user = self.get_object()
        user_email = user.email
        user_id = user.id
        tenant = user.tenant
        
        # Prevent deleting owner users
        if user.role == 'super_admin' and not user.tenant:
            return Response(
                {'error': 'Cannot delete system owner users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        self.perform_destroy(user)
        
        log_audit(
            request.user,
            'user_delete',
            f"Deleted user: {user_email}",
            tenant=tenant,
            metadata={'user_id': user_id, 'user_email': user_email},
            request=request
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a user account."""
        user = self.get_object()
        user.is_active = False
        user.save()
        
        log_audit(
            request.user,
            'user_suspend',
            f"Suspended user: {user.email}",
            tenant=user.tenant,
            metadata={'user_id': user.id, 'user_email': user.email},
            request=request
        )
        
        return Response({'status': 'suspended', 'is_active': False})
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a user account."""
        user = self.get_object()
        user.is_active = True
        user.save()
        
        log_audit(
            request.user,
            'user_suspend',  # Using same action type for consistency
            f"Activated user: {user.email}",
            tenant=user.tenant,
            metadata={'user_id': user.id, 'user_email': user.email},
            request=request
        )
        
        return Response({'status': 'active', 'is_active': True})
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password (owner action)."""
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response(
                {'error': 'new_password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        log_audit(
            request.user,
            'user_update',
            f"Reset password for user: {user.email}",
            tenant=user.tenant,
            metadata={'user_id': user.id, 'user_email': user.email},
            request=request
        )
        
        return Response({'message': 'Password reset successfully'})


class OwnerAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """View audit logs."""
    queryset = OwnerAuditLog.objects.all().order_by('-created_at')
    serializer_class = OwnerAuditLogSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filterset_fields = ['action_type', 'user', 'tenant']
    search_fields = ['description', 'user_name', 'user_email', 'tenant_name']
    
    def get_queryset(self):
        """Add date range filtering."""
        queryset = super().get_queryset()
        
        # Date range filtering
        created_after = self.request.query_params.get('created_after')
        created_before = self.request.query_params.get('created_before')
        
        if created_after:
            try:
                from datetime import datetime
                date = datetime.strptime(created_after, '%Y-%m-%d')
                queryset = queryset.filter(created_at__gte=date)
            except ValueError:
                pass
        
        if created_before:
            try:
                from datetime import datetime
                date = datetime.strptime(created_before, '%Y-%m-%d')
                # Add one day to include the entire end date
                from datetime import timedelta
                date = date + timedelta(days=1)
                queryset = queryset.filter(created_at__lt=date)
            except ValueError:
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent audit logs."""
        count = int(request.query_params.get('count', 50))
        logs = self.queryset[:count]
        return Response(OwnerAuditLogSerializer(logs, many=True).data)


class SystemHealthViewSet(viewsets.ReadOnlyModelViewSet):
    """View system health metrics."""
    queryset = SystemHealthMetric.objects.all().order_by('-recorded_at')
    serializer_class = SystemHealthMetricSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filterset_fields = ['metric_type', 'status']
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current system health status."""
        metrics = {}
        for metric_type, _ in SystemHealthMetric.metric_type.field.choices:
            latest = self.queryset.filter(metric_type=metric_type).first()
            if latest:
                metrics[metric_type] = SystemHealthMetricSerializer(latest).data
        return Response(metrics)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get historical metrics for charts."""
        metric_type = request.query_params.get('metric_type')
        hours = int(request.query_params.get('hours', 24))
        
        if not metric_type:
            return Response({'error': 'metric_type is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from datetime import timedelta
        since = timezone.now() - timedelta(hours=hours)
        
        metrics = self.queryset.filter(
            metric_type=metric_type,
            recorded_at__gte=since
        ).order_by('recorded_at')
        
        data = {
            'labels': [],
            'values': [],
            'statuses': [],
        }
        
        for metric in metrics:
            data['labels'].append(metric.recorded_at.strftime('%Y-%m-%d %H:%M'))
            data['values'].append(float(metric.value))
            data['statuses'].append(metric.status)
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Get current alerts (warning and critical metrics)."""
        alerts = self.queryset.filter(
            status__in=['warning', 'critical']
        ).order_by('-recorded_at')[:50]
        
        return Response(SystemHealthMetricSerializer(alerts, many=True).data)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get historical metrics for charts."""
        metric_type = request.query_params.get('metric_type')
        hours = int(request.query_params.get('hours', 24))
        
        if not metric_type:
            return Response({'error': 'metric_type is required'}, status=400)
        
        from datetime import timedelta
        since = timezone.now() - timedelta(hours=hours)
        
        metrics = self.queryset.filter(
            metric_type=metric_type,
            recorded_at__gte=since
        ).order_by('recorded_at')
        
        data = {
            'labels': [],
            'values': [],
            'statuses': [],
        }
        
        for metric in metrics:
            data['labels'].append(metric.recorded_at.strftime('%Y-%m-%d %H:%M'))
            data['values'].append(float(metric.value))
            data['statuses'].append(metric.status)
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Get current alerts (warning and critical metrics)."""
        alerts = self.queryset.filter(
            status__in=['warning', 'critical']
        ).order_by('-recorded_at')[:50]
        
        return Response(SystemHealthMetricSerializer(alerts, many=True).data)


class SystemAnnouncementViewSet(viewsets.ModelViewSet):
    """Manage system announcements."""
    queryset = SystemAnnouncement.objects.all().order_by('-created_at')
    serializer_class = SystemAnnouncementSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filterset_fields = ['announcement_type', 'is_active']
    search_fields = ['title', 'message']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        instance = serializer.save()
        log_audit(
            self.request.user,
            'other',
            f"Updated announcement: {instance.title}",
            metadata={'announcement_id': instance.id, 'title': instance.title},
            request=self.request
        )
    
    def perform_destroy(self, instance):
        title = instance.title
        announcement_id = instance.id
        super().perform_destroy(instance)
        log_audit(
            self.request.user,
            'other',
            f"Deleted announcement: {title}",
            metadata={'announcement_id': announcement_id, 'title': title},
            request=self.request
        )


class TenantBackupViewSet(viewsets.ModelViewSet):
    """Manage tenant backups."""
    queryset = TenantBackup.objects.all().order_by('-created_at')
    serializer_class = TenantBackupSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filterset_fields = ['tenant', 'backup_type', 'status']
    search_fields = ['notes', 'tenant__name', 'tenant__company_name']
    
    def perform_create(self, serializer):
        """Create backup record and initiate backup process."""
        backup = serializer.save(created_by=self.request.user, status='pending')
        log_audit(
            self.request.user,
            'backup_created',
            f"Created backup for tenant: {backup.tenant.name}",
            metadata={
                'backup_id': backup.id,
                'tenant_id': backup.tenant.id,
                'backup_type': backup.backup_type
            },
            request=self.request
        )
        # In production, trigger async backup task here (Celery)
        # For now, simulate backup creation
        self._create_backup_file(backup)
    
    def perform_destroy(self, instance):
        """Delete backup and audit."""
        tenant_name = instance.tenant.name
        backup_id = instance.id
        backup_type = instance.backup_type
        
        # Delete file if exists
        if instance.file_path:
            import os
            file_path = os.path.join(settings.MEDIA_ROOT, 'backups', instance.file_path)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass  # Log error in production
        
        super().perform_destroy(instance)
        log_audit(
            self.request.user,
            'other',
            f"Deleted backup for tenant: {tenant_name}",
            metadata={
                'backup_id': backup_id,
                'tenant_name': tenant_name,
                'backup_type': backup_type
            },
            request=self.request
        )
    
    def _create_backup_file(self, backup):
        """Simulate backup file creation (replace with actual backup logic in production)."""
        import os
        import json
        from django.utils import timezone
        from datetime import datetime
        
        # Create backups directory if it doesn't exist
        backup_dir = os.path.join(settings.MEDIA_ROOT, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{backup.tenant.slug}_{backup.backup_type}_{timestamp}.json"
        file_path = os.path.join(backup_dir, filename)
        
        # Update backup status
        backup.status = 'in_progress'
        backup.file_path = filename
        backup.save()
        
        # Simulate backup data (in production, use django dumpdata or similar)
        backup_data = {
            'tenant': {
                'id': backup.tenant.id,
                'name': backup.tenant.name,
                'company_name': backup.tenant.company_name,
            },
            'backup_type': backup.backup_type,
            'created_at': timezone.now().isoformat(),
            'notes': 'This is a simulated backup. In production, this would contain actual tenant data.',
        }
        
        try:
            # Write backup file
            with open(file_path, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            # Update backup record
            file_size = os.path.getsize(file_path)
            backup.file_size = file_size
            backup.status = 'completed'
            backup.completed_at = timezone.now()
            backup.save()
        except Exception as e:
            backup.status = 'failed'
            backup.notes = f"{backup.notes}\nError: {str(e)}" if backup.notes else f"Error: {str(e)}"
            backup.save()
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download backup file."""
        backup = self.get_object()
        
        if backup.status != 'completed':
            return Response(
                {'error': 'Backup is not completed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not backup.file_path:
            return Response(
                {'error': 'Backup file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        import os
        from django.http import FileResponse
        from django.conf import settings
        
        file_path = os.path.join(settings.MEDIA_ROOT, 'backups', backup.file_path)
        
        if not os.path.exists(file_path):
            return Response(
                {'error': 'Backup file not found on disk'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        log_audit(
            request.user,
            'data_export',
            f"Downloaded backup for tenant: {backup.tenant.name}",
            metadata={
                'backup_id': backup.id,
                'tenant_id': backup.tenant.id,
                'backup_type': backup.backup_type
            },
            request=request
        )
        
        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=backup.file_path
        )
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore tenant from backup."""
        backup = self.get_object()
        
        if backup.status != 'completed':
            return Response(
                {'error': 'Backup is not completed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        confirm = request.data.get('confirm', False)
        if not confirm:
            return Response(
                {'error': 'Restore confirmation required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # In production, implement actual restore logic here
        # This is a placeholder
        log_audit(
            request.user,
            'data_import',
            f"Restored backup for tenant: {backup.tenant.name}",
            metadata={
                'backup_id': backup.id,
                'tenant_id': backup.tenant.id,
                'backup_type': backup.backup_type
            },
            request=request
        )
        
        return Response({
            'message': 'Backup restore initiated. This is a simulated restore. In production, this would restore tenant data.',
            'backup_id': backup.id,
            'tenant': backup.tenant.name
        })


class AnalyticsView(views.APIView):
    """Advanced analytics and reporting for owner."""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        """Get comprehensive analytics data."""
        period = request.query_params.get('period', '30')  # days
        period = int(period)
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=period)
        
        # Revenue Analytics
        revenue_data = self._get_revenue_analytics(start_date, end_date, period)
        
        # Tenant Analytics
        tenant_data = self._get_tenant_analytics()
        
        # Growth Metrics
        growth_data = self._get_growth_metrics(start_date, end_date, period)
        
        # Usage Statistics
        usage_data = self._get_usage_statistics(start_date, end_date)
        
        # Industry Analytics
        industry_data = self._get_industry_analytics()
        
        # Transaction Analytics
        transaction_data = self._get_transaction_analytics(start_date, end_date, period)
        
        return Response({
            'revenue': revenue_data,
            'tenants': tenant_data,
            'growth': growth_data,
            'usage': usage_data,
            'industry': industry_data,
            'transactions': transaction_data,
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        })
    
    def _get_revenue_analytics(self, start_date, end_date, period):
        """Get revenue analytics with trends."""
        # Daily revenue
        daily_revenue = []
        daily_labels = []
        
        current_date = start_date
        while current_date <= end_date:
            date_start = timezone.make_aware(datetime.combine(current_date.date(), datetime.min.time()))
            date_end = timezone.make_aware(datetime.combine(current_date.date(), datetime.max.time()))
            
            day_sales = Sale.objects.filter(date__gte=date_start, date__lte=date_end)
            total_usd = day_sales.filter(currency='USD').aggregate(
                total=Sum('total_amount')
            )['total'] or 0
            
            daily_revenue.append(float(total_usd))
            daily_labels.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)
        
        # Total revenue
        total_revenue = sum(daily_revenue)
        avg_daily_revenue = total_revenue / period if period > 0 else 0
        
        # Revenue by currency
        revenue_by_currency = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).values('currency').annotate(
            total=Sum('total_amount')
        )
        
        currency_breakdown = {
            item['currency'] or 'USD': float(item['total'] or 0)
            for item in revenue_by_currency
        }
        
        # Top tenants by revenue
        top_tenants_revenue = Tenant.objects.annotate(
            total_revenue=Sum('sales__total_amount', filter=Q(sales__date__gte=start_date, sales__date__lte=end_date))
        ).filter(total_revenue__gt=0).order_by('-total_revenue')[:10]
        
        top_tenants = [
            {
                'id': t.id,
                'name': t.name or t.company_name,
                'revenue': float(t.total_revenue or 0)
            }
            for t in top_tenants_revenue
        ]
        
        return {
            'daily': {
                'labels': daily_labels,
                'values': daily_revenue
            },
            'total': total_revenue,
            'average_daily': avg_daily_revenue,
            'currency_breakdown': currency_breakdown,
            'top_tenants': top_tenants
        }
    
    def _get_tenant_analytics(self):
        """Get tenant statistics and distribution."""
        total = Tenant.objects.count()
        active = Tenant.objects.filter(subscription_status='active').count()
        trial = Tenant.objects.filter(subscription_status='trial').count()
        suspended = Tenant.objects.filter(subscription_status='suspended').count()
        
        # Subscription plan distribution
        plan_dist = Tenant.objects.values('subscription__package__name').annotate(
            count=Count('id')
        )
        
        plan_distribution = {
            (item.get('subscription__package__name') or 'No Plan'): item['count']
            for item in plan_dist
        }
        
        # New tenants over time (last 12 months)
        monthly_new = []
        monthly_labels = []
        for i in range(11, -1, -1):
            month_start = timezone.now() - timedelta(days=30 * i)
            month_end = month_start + timedelta(days=30)
            new_count = Tenant.objects.filter(
                created_at__gte=month_start, created_at__lt=month_end
            ).count()
            monthly_new.append(new_count)
            monthly_labels.append(month_start.strftime('%b %Y'))
        
        return {
            'total': total,
            'active': active,
            'trial': trial,
            'suspended': suspended,
            'plan_distribution': plan_distribution,
            'monthly_new': {
                'labels': monthly_labels,
                'values': monthly_new
            }
        }
    
    def _get_growth_metrics(self, start_date, end_date, period):
        """Calculate growth metrics."""
        # Compare with previous period
        prev_start = start_date - timedelta(days=period)
        
        # Revenue growth
        current_revenue = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        prev_revenue = Sale.objects.filter(
            date__gte=prev_start, date__lt=start_date
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        revenue_growth = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
        
        # Tenant growth
        current_new_tenants = Tenant.objects.filter(
            created_at__gte=start_date, created_at__lte=end_date
        ).count()
        
        prev_new_tenants = Tenant.objects.filter(
            created_at__gte=prev_start, created_at__lt=start_date
        ).count()
        
        tenant_growth = ((current_new_tenants - prev_new_tenants) / prev_new_tenants * 100) if prev_new_tenants > 0 else 0
        
        # Transaction growth
        current_transactions = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).count()
        
        prev_transactions = Sale.objects.filter(
            date__gte=prev_start, date__lt=start_date
        ).count()
        
        transaction_growth = ((current_transactions - prev_transactions) / prev_transactions * 100) if prev_transactions > 0 else 0
        
        return {
            'revenue_growth': round(revenue_growth, 2),
            'tenant_growth': round(tenant_growth, 2),
            'transaction_growth': round(transaction_growth, 2),
            'current_revenue': float(current_revenue),
            'previous_revenue': float(prev_revenue),
        }
    
    def _get_usage_statistics(self, start_date, end_date):
        """Get system usage statistics."""
        total_users = User.objects.filter(tenant__isnull=False).count()
        total_branches = Tenant.objects.aggregate(
            total=Count('branches')
        )['total'] or 0
        
        # Active users (users who made sales or logged in recently)
        active_users = User.objects.filter(
            Q(tenant__sales__date__gte=start_date) | Q(last_login__gte=start_date)
        ).distinct().count()
        
        # Transactions
        total_transactions = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).count()
        
        # Products
        from inventory.models import Product
        total_products = Product.objects.count()
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'total_branches': total_branches,
            'total_transactions': total_transactions,
            'total_products': total_products,
        }
    
    def _get_industry_analytics(self):
        """Get analytics by industry/business category."""
        from core.business_category_models import BusinessCategory
        
        industry_stats = []
        
        for category in BusinessCategory.objects.all():
            tenants = Tenant.objects.filter(business_category=category)
            tenant_count = tenants.count()
            
            if tenant_count == 0:
                continue
            
            # Revenue for this category
            category_revenue = Sale.objects.filter(
                tenant__business_category=category
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            industry_stats.append({
                'category': category.name,
                'tenant_count': tenant_count,
                'revenue': float(category_revenue),
                'avg_revenue_per_tenant': float(category_revenue / tenant_count) if tenant_count > 0 else 0
            })
        
        # Sort by revenue
        industry_stats.sort(key=lambda x: x['revenue'], reverse=True)
        
        return industry_stats[:10]  # Top 10 industries
    
    def _get_transaction_analytics(self, start_date, end_date, period):
        """Get transaction analytics."""
        # Daily transaction count
        daily_transactions = []
        daily_labels = []
        
        current_date = start_date
        while current_date <= end_date:
            date_start = timezone.make_aware(datetime.combine(current_date.date(), datetime.min.time()))
            date_end = timezone.make_aware(datetime.combine(current_date.date(), datetime.max.time()))
            
            count = Sale.objects.filter(date__gte=date_start, date__lte=date_end).count()
            daily_transactions.append(count)
            daily_labels.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)
        
        # Average transaction value
        avg_transaction_value = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).aggregate(avg=Avg('total_amount'))['avg'] or 0
        
        # Payment method distribution
        payment_methods = Sale.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).values('payment_method').annotate(count=Count('id'))
        
        payment_distribution = {
            item['payment_method'] or 'Unknown': item['count']
            for item in payment_methods
        }
        
        return {
            'daily': {
                'labels': daily_labels,
                'values': daily_transactions
            },
            'total': sum(daily_transactions),
            'average_value': float(avg_transaction_value),
            'payment_methods': payment_distribution
        }
    
    @action(detail=False, methods=['post'])
    def create_backup(self, request):
        """Create a new backup with specified parameters."""
        tenant_id = request.data.get('tenant')
        backup_type = request.data.get('backup_type', 'full')
        notes = request.data.get('notes', '')
        
        if not tenant_id:
            return Response(
                {'error': 'tenant is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        backup = TenantBackup.objects.create(
            tenant=tenant,
            backup_type=backup_type,
            notes=notes,
            created_by=request.user,
            status='pending'
        )
        
        # Trigger backup creation
        self._create_backup_file(backup)
        
        return Response(TenantBackupSerializer(backup).data, status=status.HTTP_201_CREATED)

"""
Performance monitoring and error tracking.
"""
from django.db import models
from django.utils import timezone
from django.core.cache import cache
import time
import traceback
import logging

logger = logging.getLogger(__name__)


class PerformanceMetric(models.Model):
    """Performance metrics for monitoring."""
    METRIC_TYPES = [
        ('api_response_time', 'API Response Time'),
        ('db_query_time', 'Database Query Time'),
        ('cache_hit_rate', 'Cache Hit Rate'),
        ('request_count', 'Request Count'),
        ('error_count', 'Error Count'),
    ]
    
    tenant = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='performance_metrics',
        null=True,
        blank=True
    )
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES)
    value = models.FloatField()
    metadata = models.JSONField(default=dict)
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'performance_metrics'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['metric_type', '-recorded_at']),
            models.Index(fields=['tenant', '-recorded_at']),
        ]
    
    def __str__(self):
        return f"{self.metric_type}: {self.value} at {self.recorded_at}"


class ErrorLog(models.Model):
    """Error logging and tracking."""
    SEVERITY_LEVELS = [
        ('critical', 'Critical'),
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    
    tenant = models.ForeignKey(
        'core.Tenant',
        on_delete=models.SET_NULL,
        related_name='error_logs',
        null=True,
        blank=True
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    error_type = models.CharField(max_length=255)
    error_message = models.TextField()
    stack_trace = models.TextField(blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'error_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['severity', '-created_at']),
            models.Index(fields=['resolved', '-created_at']),
            models.Index(fields=['tenant', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.severity}: {self.error_type} at {self.created_at}"


class PerformanceMonitor:
    """Performance monitoring utilities."""
    
    @staticmethod
    def record_metric(metric_type: str, value: float, tenant=None, metadata=None):
        """Record a performance metric."""
        PerformanceMetric.objects.create(
            tenant=tenant,
            metric_type=metric_type,
            value=value,
            metadata=metadata or {}
        )
    
    @staticmethod
    def record_api_response_time(path: str, method: str, duration: float, tenant=None):
        """Record API response time."""
        PerformanceMonitor.record_metric(
            'api_response_time',
            duration,
            tenant=tenant,
            metadata={'path': path, 'method': method}
        )
    
    @staticmethod
    def log_error(
        error: Exception,
        severity: str = 'error',
        request=None,
        user=None,
        tenant=None,
        metadata=None
    ):
        """Log an error."""
        ErrorLog.objects.create(
            tenant=tenant,
            user=user,
            severity=severity,
            error_type=type(error).__name__,
            error_message=str(error),
            stack_trace=traceback.format_exc(),
            request_path=request.path if request else '',
            request_method=request.method if request else '',
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            ip_address=PerformanceMonitor.get_client_ip(request) if request else None,
            metadata=metadata or {}
        )
    
    @staticmethod
    def get_client_ip(request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def get_cache_stats() -> dict:
        """Get cache statistics."""
        # This would need Redis INFO command for real stats
        return {
            'hits': cache.get('cache_stats:hits', 0),
            'misses': cache.get('cache_stats:misses', 0),
            'hit_rate': 0
        }


class PerformanceMiddleware:
    """Middleware to monitor API performance."""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        
        # Record performance metric
        if request.path.startswith('/api/'):
            tenant = getattr(request, 'tenant', None)
            PerformanceMonitor.record_api_response_time(
                request.path,
                request.method,
                duration,
                tenant=tenant
            )
        
        # Add performance header
        response['X-Response-Time'] = f"{duration:.3f}s"
        
        return response


class ErrorHandlingMiddleware:
    """Middleware to catch and log errors."""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            tenant = getattr(request, 'tenant', None)
            user = getattr(request, 'user', None) if hasattr(request, 'user') else None
            
            PerformanceMonitor.log_error(
                e,
                severity='error',
                request=request,
                user=user if user and user.is_authenticated else None,
                tenant=tenant
            )
            
            # Re-raise for default error handling
            raise



"""
Advanced Analytics Views with ML/AI capabilities.
"""
import logging
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta, datetime
from .analytics_service import AdvancedAnalyticsService
from core.utils import get_tenant_from_request

logger = logging.getLogger(__name__)


class ProductAnalyticsView(views.APIView):
    """Product-level analytics with trend analysis."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get comprehensive product analytics."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service = AdvancedAnalyticsService(tenant)
        
        # Get parameters
        product_id = request.query_params.get('product_id')
        if product_id:
            try:
                product_id = int(product_id)
            except (ValueError, TypeError):
                product_id = None
        
        branch_id = request.query_params.get('branch_id')
        if branch_id:
            try:
                branch_id = int(branch_id)
            except (ValueError, TypeError):
                branch_id = None
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        period = request.query_params.get('period', 'daily')  # daily, weekly, monthly, yearly
        
        # Parse dates
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
                start_date = timezone.make_aware(start_date)
            except:
                start_date = timezone.now() - timedelta(days=90)
        else:
            start_date = timezone.now() - timedelta(days=90)
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
                end_date = timezone.make_aware(end_date)
            except:
                end_date = timezone.now()
        else:
            end_date = timezone.now()
        
        try:
            analytics = service.get_product_analytics(
                product_id=product_id,
                start_date=start_date,
                end_date=end_date,
                branch_id=branch_id,
                period=period
            )
            return Response(analytics)
        except Exception as e:
            import traceback
            logger.error(f'Error generating product analytics: {str(e)}\n{traceback.format_exc()}')
            return Response(
                {'error': f'Error generating product analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BranchComparisonView(views.APIView):
    """Branch performance comparison."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Compare branch performance."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service = AdvancedAnalyticsService(tenant)
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_ids = request.query_params.getlist('branch_ids') or request.query_params.get('branch_ids')
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
                start_date = timezone.make_aware(start_date)
            except:
                start_date = timezone.now() - timedelta(days=30)
        else:
            start_date = timezone.now() - timedelta(days=30)
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
                end_date = timezone.make_aware(end_date)
            except:
                end_date = timezone.now()
        else:
            end_date = timezone.now()
        
        if branch_ids and isinstance(branch_ids, str):
            branch_ids = [int(bid) for bid in branch_ids.split(',')]
        elif branch_ids:
            branch_ids = [int(bid) for bid in branch_ids if bid]
        
        try:
            comparison = service.get_branch_comparison(
                start_date=start_date,
                end_date=end_date,
                branch_ids=branch_ids
            )
            return Response(comparison)
        except Exception as e:
            return Response(
                {'error': f'Error generating branch comparison: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaxBreakdownView(views.APIView):
    """Tax analysis and breakdown."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get detailed tax breakdown."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service = AdvancedAnalyticsService(tenant)
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        group_by = request.query_params.get('group_by', 'product')  # product, category, branch, date
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
                start_date = timezone.make_aware(start_date)
            except:
                start_date = timezone.now() - timedelta(days=30)
        else:
            start_date = timezone.now() - timedelta(days=30)
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
                end_date = timezone.make_aware(end_date)
            except:
                end_date = timezone.now()
        else:
            end_date = timezone.now()
        
        try:
            breakdown = service.get_tax_breakdown(
                start_date=start_date,
                end_date=end_date,
                group_by=group_by
            )
            return Response(breakdown)
        except Exception as e:
            import traceback
            logger.error(f'Error generating tax breakdown: {str(e)}\n{traceback.format_exc()}')
            return Response(
                {'error': f'Error generating tax breakdown: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TrendAnalysisView(views.APIView):
    """Advanced trend analysis with ML insights."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get trend analysis with forecasting and anomaly detection."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service = AdvancedAnalyticsService(tenant)
        
        metric = request.query_params.get('metric', 'revenue')  # revenue, profit, quantity, customers
        period = request.query_params.get('period', 'daily')  # daily, weekly, monthly
        branch_id = request.query_params.get('branch_id')
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
                start_date = timezone.make_aware(start_date)
            except:
                start_date = timezone.now() - timedelta(days=90)
        else:
            start_date = timezone.now() - timedelta(days=90)
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
                end_date = timezone.make_aware(end_date)
            except:
                end_date = timezone.now()
        else:
            end_date = timezone.now()
        
        if branch_id:
            try:
                branch_id = int(branch_id)
            except:
                branch_id = None
        
        try:
            trends = service.get_trend_analysis(
                metric=metric,
                start_date=start_date,
                end_date=end_date,
                period=period,
                branch_id=branch_id
            )
            return Response(trends)
        except Exception as e:
            import traceback
            logger.error(f'Error generating trend analysis: {str(e)}\n{traceback.format_exc()}')
            return Response(
                {'error': f'Error generating trend analysis: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PeriodComparisonView(views.APIView):
    """Compare different time periods."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Compare two time periods (e.g., this month vs last month)."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service = AdvancedAnalyticsService(tenant)
        
        metric = request.query_params.get('metric', 'revenue')
        branch_id = request.query_params.get('branch_id')
        
        # Current period
        current_start = request.query_params.get('current_start')
        current_end = request.query_params.get('current_end')
        
        # Previous period
        previous_start = request.query_params.get('previous_start')
        previous_end = request.query_params.get('previous_end')
        
        # Or use relative periods
        comparison_type = request.query_params.get('comparison_type')  # month, week, year, quarter
        
        now = timezone.now()
        
        if comparison_type == 'month':
            # This month vs last month
            current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            current_end = now
            last_month = (now.replace(day=1) - timedelta(days=1))
            previous_start = last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            previous_end = last_month.replace(hour=23, minute=59, second=59)
        
        elif comparison_type == 'week':
            # This week vs last week
            days_since_monday = now.weekday()
            current_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
            current_end = now
            previous_start = current_start - timedelta(days=7)
            previous_end = current_start - timedelta(seconds=1)
        
        elif comparison_type == 'year':
            # This year vs last year
            current_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            current_end = now
            previous_start = current_start.replace(year=current_start.year - 1)
            previous_end = current_start - timedelta(seconds=1)
        
        else:
            # Use provided dates
            if current_start:
                current_start = datetime.strptime(current_start, '%Y-%m-%d')
                current_start = timezone.make_aware(current_start)
            else:
                current_start = now - timedelta(days=30)
            
            if current_end:
                current_end = datetime.strptime(current_end, '%Y-%m-%d')
                current_end = timezone.make_aware(current_end)
            else:
                current_end = now
            
            if previous_start:
                previous_start = datetime.strptime(previous_start, '%Y-%m-%d')
                previous_start = timezone.make_aware(previous_start)
            else:
                previous_start = current_start - timedelta(days=30)
            
            if previous_end:
                previous_end = datetime.strptime(previous_end, '%Y-%m-%d')
                previous_end = timezone.make_aware(previous_end)
            else:
                previous_end = current_start - timedelta(seconds=1)
        
        if branch_id:
            try:
                branch_id = int(branch_id)
            except:
                branch_id = None
        
        try:
            comparison = service.get_time_period_comparison(
                current_start=current_start,
                current_end=current_end,
                previous_start=previous_start,
                previous_end=previous_end,
                metric=metric,
                branch_id=branch_id
            )
            return Response(comparison)
        except Exception as e:
            return Response(
                {'error': f'Error generating period comparison: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


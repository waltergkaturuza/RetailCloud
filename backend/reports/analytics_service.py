"""
Advanced Analytics Service with ML/AI capabilities.
Provides comprehensive analytics including trend analysis, forecasting, anomaly detection,
and granular product/branch comparisons.
"""
import logging
from decimal import Decimal
from datetime import timedelta, datetime
from django.db.models import (
    Sum, Count, Avg, Max, Min, Q, F, FloatField, 
    Case, When, Value, IntegerField
)
from django.utils import timezone
from django.db.models.functions import ExtractYear, ExtractMonth, ExtractWeek, ExtractDay, TruncDate, TruncMonth, TruncYear, Coalesce
from collections import defaultdict
from typing import Dict, List, Any, Optional, Tuple

from pos.models import Sale, SaleItem
from inventory.models import Product, StockLevel
from core.models import Branch, Tenant

logger = logging.getLogger(__name__)


class TimeSeriesAnalyzer:
    """Analyzes time-series data for trends and patterns."""
    
    @staticmethod
    def calculate_growth_rate(current: float, previous: float) -> float:
        """Calculate percentage growth rate."""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100.0
    
    @staticmethod
    def calculate_moving_average(data: List[float], window: int = 7) -> List[float]:
        """Calculate simple moving average."""
        if len(data) < window:
            return data
        result = []
        for i in range(len(data)):
            if i < window - 1:
                result.append(sum(data[:i+1]) / (i + 1))
            else:
                result.append(sum(data[i-window+1:i+1]) / window)
        return result
    
    @staticmethod
    def detect_trend(data: List[float]) -> Dict[str, Any]:
        """Detect trend direction (upward, downward, stable)."""
        if len(data) < 2:
            return {'direction': 'insufficient_data', 'strength': 0, 'rate': 0}
        
        # Simple linear regression slope
        n = len(data)
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(data) / n
        
        numerator = sum((x[i] - x_mean) * (data[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        
        # Determine direction and strength
        if abs(slope) < 0.01:
            direction = 'stable'
            strength = 'weak'
        elif slope > 0:
            direction = 'upward'
            strength = 'strong' if slope > (y_mean * 0.05) else 'moderate'
        else:
            direction = 'downward'
            strength = 'strong' if abs(slope) > (y_mean * 0.05) else 'moderate'
        
        return {
            'direction': direction,
            'strength': strength,
            'rate': slope,
            'growth_rate': TimeSeriesAnalyzer.calculate_growth_rate(data[-1], data[0]) if data[0] != 0 else 0
        }


class MLForecaster:
    """Machine Learning forecasting using simple time series methods."""
    
    @staticmethod
    def simple_linear_forecast(data: List[float], periods: int = 30) -> List[float]:
        """
        Simple linear regression forecast.
        For production, use libraries like Prophet, ARIMA, or LSTM.
        """
        if len(data) < 2:
            return [data[0] if data else 0] * periods
        
        n = len(data)
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(data) / n
        
        numerator = sum((x[i] - x_mean) * (data[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        
        # Forecast future periods
        forecasts = []
        for i in range(n, n + periods):
            forecasts.append(intercept + slope * i)
        
        return forecasts
    
    @staticmethod
    def seasonal_adjusted_forecast(daily_data: List[Dict], periods: int = 30) -> List[float]:
        """
        Forecast with seasonal adjustments (day of week patterns).
        """
        if not daily_data:
            return [0] * periods
        
        # Calculate day-of-week averages
        day_averages = defaultdict(list)
        for item in daily_data:
            day = item.get('day_of_week', 0)
            value = item.get('value', 0)
            if isinstance(value, (int, float, Decimal)):
                day_averages[day].append(float(value))
        
        # Average per day of week
        day_means = {day: sum(values) / len(values) if values else 0 
                    for day, values in day_averages.items()}
        
        # Overall average
        overall_avg = sum(day_means.values()) / len(day_means) if day_means else 0
        
        # Seasonal factors
        seasonal_factors = {day: (mean / overall_avg) if overall_avg > 0 else 1.0
                          for day, mean in day_means.items()}
        
        # Simple trend forecast
        values = [float(item.get('value', 0)) for item in daily_data]
        base_forecast = MLForecaster.simple_linear_forecast(values, periods)
        
        # Apply seasonal adjustment
        today = timezone.now().date()
        forecast_with_season = []
        for i, base in enumerate(base_forecast):
            day_of_week = (today + timedelta(days=i)).weekday()
            factor = seasonal_factors.get(day_of_week, 1.0)
            forecast_with_season.append(base * factor)
        
        return forecast_with_season


class AnomalyDetector:
    """Detect anomalies in sales data using statistical methods."""
    
    @staticmethod
    def detect_outliers_zscore(data: List[float], threshold: float = 2.5) -> List[int]:
        """
        Detect outliers using Z-score method.
        Returns indices of outliers.
        """
        if len(data) < 3:
            return []
        
        mean = sum(data) / len(data)
        variance = sum((x - mean) ** 2 for x in data) / len(data)
        std_dev = variance ** 0.5
        
        if std_dev == 0:
            return []
        
        outliers = []
        for i, value in enumerate(data):
            z_score = abs((value - mean) / std_dev)
            if z_score > threshold:
                outliers.append(i)
        
        return outliers
    
    @staticmethod
    def detect_anomalies_iqr(data: List[float]) -> List[Dict[str, Any]]:
        """
        Detect anomalies using Interquartile Range (IQR) method.
        Returns list of anomaly details.
        """
        if len(data) < 4:
            return []
        
        sorted_data = sorted(data)
        n = len(sorted_data)
        
        q1_idx = n // 4
        q3_idx = 3 * n // 4
        
        q1 = sorted_data[q1_idx]
        q3 = sorted_data[q3_idx]
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        anomalies = []
        for i, value in enumerate(data):
            if value < lower_bound or value > upper_bound:
                anomalies.append({
                    'index': i,
                    'value': value,
                    'type': 'low' if value < lower_bound else 'high',
                    'severity': 'high' if abs(value - (q1 + q3) / 2) > 2 * iqr else 'medium'
                })
        
        return anomalies


class AdvancedAnalyticsService:
    """Comprehensive analytics service with ML/AI capabilities."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
    
    def get_product_analytics(
        self, 
        product_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        branch_id: Optional[int] = None,
        period: str = 'daily'  # daily, weekly, monthly, yearly
    ) -> Dict[str, Any]:
        """
        Comprehensive product-level analytics.
        """
        if not start_date:
            start_date = timezone.now() - timedelta(days=90)
        if not end_date:
            end_date = timezone.now()
        
        # Base query
        sale_items = SaleItem.objects.filter(
            sale__tenant=self.tenant,
            sale__status='completed',
            sale__date__gte=start_date,
            sale__date__lte=end_date
        ).select_related('product', 'sale', 'sale__branch')
        
        if product_id:
            sale_items = sale_items.filter(product_id=product_id)
        
        if branch_id:
            sale_items = sale_items.filter(sale__branch_id=branch_id)
        
        # Time period extraction - use Django's truncation functions
        if period == 'daily':
            # Group by date only
            product_stats = sale_items.annotate(
                period=TruncDate('sale__date')
            ).values('product_id', 'product__name', 'period')
        elif period == 'weekly':
            # For weekly, we'll use a simple approach - group by week number
            # Note: SQLite doesn't have great week support, so we'll do it in Python
            from collections import defaultdict
            weekly_data = defaultdict(lambda: {
                'product_id': None,
                'product__name': '',
                'total_sold': 0,
                'total_revenue': 0,
                'total_cost': 0,
                'total_tax': 0,
                'sale_count': set()
            })
            for item in sale_items.select_related('product', 'sale'):
                sale_date = item.sale.date.date()
                year, week, _ = sale_date.isocalendar()
                period_key = f"{year}-W{week:02d}"
                key = (item.product_id, period_key)
                if not weekly_data[key]['product_id']:
                    weekly_data[key]['product_id'] = item.product_id
                    weekly_data[key]['product__name'] = item.product.name
                weekly_data[key]['total_sold'] += item.quantity
                weekly_data[key]['total_revenue'] += float(item.quantity * item.unit_price)
                weekly_data[key]['total_cost'] += float(item.quantity * item.cost_price or 0)
                weekly_data[key]['total_tax'] += float(item.tax_amount or 0)
                weekly_data[key]['sale_count'].add(item.sale.id)
            # Convert to list format
            product_stats = [
                {
                    'product_id': v['product_id'],
                    'product__name': v['product__name'],
                    'period': period_key,
                    'total_sold': v['total_sold'],
                    'total_revenue': v['total_revenue'],
                    'total_cost': v['total_cost'],
                    'total_tax': v['total_tax'],
                    'sale_count': len(v['sale_count'])
                }
                for (_, period_key), v in weekly_data.items()
            ]
            # Skip the annotate step for weekly
            if product_stats:
                # Process weekly stats
                pass
        elif period == 'monthly':
            # Group by year-month
            product_stats = sale_items.annotate(
                period=TruncMonth('sale__date')
            ).values('product_id', 'product__name', 'period')
        else:  # yearly
            # Group by year
            product_stats = sale_items.annotate(
                period=TruncYear('sale__date')
            ).values('product_id', 'product__name', 'period')
        
        # Aggregate by product and time (unless weekly which is already processed)
        if period != 'weekly':
            product_stats = product_stats.annotate(
                total_sold=Sum('quantity'),
                total_revenue=Sum(F('quantity') * F('unit_price')),
                total_cost=Sum(F('quantity') * Coalesce('cost_price', Value(Decimal('0')))),
                total_tax=Sum('tax_amount'),
                avg_price=Avg('unit_price'),
                sale_count=Count('sale', distinct=True)
            ).order_by('product_id', 'period')
        
        # Calculate profit margins
        products_data = []
        
        # Convert QuerySet to list if needed (for weekly, it's already a list)
        if period != 'weekly':
            try:
                product_stats_list = list(product_stats)
            except Exception as e:
                logger.error(f'Error converting product_stats to list: {str(e)}')
                product_stats_list = []
        else:
            product_stats_list = product_stats
        
        for stat in product_stats_list:
            if period == 'weekly':
                # Weekly stats already have computed values
                revenue = stat.get('total_revenue', 0)
                cost = stat.get('total_cost', 0)
                quantity = stat.get('total_sold', 0)
                tax = stat.get('total_tax', 0)
                sale_count = stat.get('sale_count', 0)
                avg_price = revenue / quantity if quantity > 0 else 0
            else:
                revenue = float(stat.get('total_revenue') or 0)
                cost = float(stat.get('total_cost') or 0)
                quantity = stat.get('total_sold', 0)
                tax = float(stat.get('total_tax') or 0)
                avg_price = float(stat.get('avg_price') or 0)
                sale_count = stat.get('sale_count', 0)
            
            profit = revenue - cost
            margin = (profit / revenue * 100) if revenue > 0 else 0
            
            # Format period for display
            period_str = str(stat['period'])
            if hasattr(stat['period'], 'strftime'):
                if period == 'daily':
                    period_str = stat['period'].strftime('%Y-%m-%d')
                elif period == 'monthly':
                    period_str = stat['period'].strftime('%Y-%m')
                elif period == 'yearly':
                    period_str = stat['period'].strftime('%Y')
            
            products_data.append({
                'product_id': stat['product_id'],
                'product_name': stat['product__name'],
                'period': period_str,
                'quantity_sold': quantity,
                'revenue': revenue,
                'cost': cost,
                'profit': profit,
                'profit_margin': round(margin, 2),
                'total_tax': tax,
                'avg_price': round(avg_price, 2),
                'sale_count': sale_count
            })
        
        # Overall product summary
        overall = sale_items.aggregate(
            total_revenue=Sum(F('quantity') * F('unit_price')),
            total_cost=Sum(F('quantity') * Coalesce('cost_price', Value(Decimal('0')))),
            total_quantity=Sum('quantity'),
            total_tax=Sum('tax_amount')
        )
        
        overall_revenue = float(overall['total_revenue'] or 0)
        overall_cost = float(overall['total_cost'] or 0)
        overall_profit = overall_revenue - overall_cost
        
        # Aggregate products for overall summary
        products_summary = {}
        for item in products_data:
            product_id = item['product_id']
            if product_id not in products_summary:
                products_summary[product_id] = {
                    'product_id': product_id,
                    'product_name': item['product_name'],
                    'total_revenue': 0,
                    'total_cost': 0,
                    'total_profit': 0,
                    'total_quantity_sold': 0,
                    'total_tax': 0
                }
            products_summary[product_id]['total_revenue'] += item['revenue']
            products_summary[product_id]['total_cost'] += item['cost']
            products_summary[product_id]['total_profit'] += item['profit']
            products_summary[product_id]['total_quantity_sold'] += item['quantity_sold']
            products_summary[product_id]['total_tax'] += item['total_tax']
        
        # Calculate margins for products
        products_list = []
        for product_id, stats in products_summary.items():
            margin = (stats['total_profit'] / stats['total_revenue'] * 100) if stats['total_revenue'] > 0 else 0
            products_list.append({
                **stats,
                'profit_margin': round(margin, 2)
            })
        
        # Sort by revenue
        products_list.sort(key=lambda x: x['total_revenue'], reverse=True)
        
        return {
            'period_type': period,
            'products': products_list,  # Changed from period_data to products
            'period_data': products_data,  # Keep for detailed breakdown
            'summary': {
                'total_revenue': overall_revenue,
                'total_cost': overall_cost,
                'total_profit': overall_profit,
                'profit_margin': round((overall_profit / overall_revenue * 100) if overall_revenue > 0 else 0, 2),
                'total_quantity_sold': overall['total_quantity'] or 0,
                'total_tax': float(overall['total_tax'] or 0)
            }
        }
    
    def get_branch_comparison(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        branch_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Compare performance across branches.
        """
        if not start_date:
            start_date = timezone.now() - timedelta(days=30)
        if not end_date:
            end_date = timezone.now()
        
        branches = Branch.objects.filter(tenant=self.tenant, is_active=True)
        if branch_ids:
            branches = branches.filter(id__in=branch_ids)
        
        branch_data = []
        for branch in branches:
            sales = Sale.objects.filter(
                tenant=self.tenant,
                branch=branch,
                status='completed',
                date__gte=start_date,
                date__lte=end_date
            )
            
            stats = sales.aggregate(
                total_sales=Count('id'),
                total_revenue=Sum('total_amount'),
                total_tax=Sum('tax_amount'),
                avg_sale=Avg('total_amount'),
                total_customers=Count('customer', distinct=True)
            )
            
            # Calculate COGS properly
            cogs = 0
            for sale in sales.prefetch_related('items'):
                for item in sale.items.all():
                    cogs += float(item.cost_price or 0) * float(item.quantity or 0)
            
            revenue = float(stats['total_revenue'] or 0)
            profit = revenue - cogs
            margin = (profit / revenue * 100) if revenue > 0 else 0
            
            # Daily breakdown for trends
            daily_qs = sales.annotate(
                day=TruncDate('date')
            ).values('day').annotate(
                revenue=Sum('total_amount'),
                count=Count('id')
            ).order_by('day')
            
            daily_list = []
            for item in daily_qs:
                day_val = item['day']
                day_str = day_val.isoformat() if hasattr(day_val, 'isoformat') else str(day_val)
                daily_list.append({
                    'date': day_str,
                    'revenue': float(item['revenue'] or 0),
                    'count': item['count']
                })
            
            branch_data.append({
                'branch_id': branch.id,
                'branch_name': branch.name,
                'total_sales': stats['total_sales'] or 0,
                'total_revenue': revenue,
                'cost_of_goods': cogs,
                'total_profit': profit,
                'profit_margin': round(margin, 2),
                'total_tax': float(stats['total_tax'] or 0),
                'avg_sale_value': float(stats['avg_sale'] or 0),
                'total_customers': stats['total_customers'] or 0,
                'daily_breakdown': daily_list
            })
        
        # Calculate rankings and comparisons
        branch_data.sort(key=lambda x: x['total_revenue'], reverse=True)
        for i, branch in enumerate(branch_data):
            branch['rank'] = i + 1
        
        # Best and worst performers
        best_performer = branch_data[0] if branch_data else None
        worst_performer = branch_data[-1] if branch_data else None
        
        return {
            'branches': branch_data,
            'summary': {
                'total_branches': len(branch_data),
                'best_performer': best_performer,
                'worst_performer': worst_performer,
                'total_revenue': sum(b['total_revenue'] for b in branch_data),
                'total_profit': sum(b['total_profit'] for b in branch_data)
            }
        }
    
    def get_tax_breakdown(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        group_by: str = 'product'  # product, category, branch, date
    ) -> Dict[str, Any]:
        """
        Detailed tax analysis and breakdown.
        """
        if not start_date:
            start_date = timezone.now() - timedelta(days=30)
        if not end_date:
            end_date = timezone.now()
        
        sales = Sale.objects.filter(
            tenant=self.tenant,
            status='completed',
            date__gte=start_date,
            date__lte=end_date
        )
        
        if group_by == 'product':
            # Tax by product
            items = SaleItem.objects.filter(
                sale__in=sales
            ).values('product_id', 'product__name').annotate(
                total_revenue=Sum(F('quantity') * F('unit_price')),
                total_tax=Sum('tax_amount'),
                quantity_sold=Sum('quantity')
            ).order_by('-total_tax')
            
            breakdown = [
                {
                    'product_id': item['product_id'],
                    'product_name': item['product__name'],
                    'revenue': float(item['total_revenue'] or 0),
                    'tax_amount': float(item['total_tax'] or 0),
                    'tax_rate': (float(item['total_tax'] or 0) / float(item['total_revenue'] or 1) * 100) if item['total_revenue'] else 0,
                    'quantity_sold': item['quantity_sold']
                }
                for item in items
            ]
        
        elif group_by == 'category':
            items = SaleItem.objects.filter(
                sale__in=sales
            ).values('product__category_id', 'product__category__name').annotate(
                total_revenue=Sum(F('quantity') * F('unit_price')),
                total_tax=Sum('tax_amount'),
                quantity_sold=Sum('quantity')
            ).order_by('-total_tax')
            
            breakdown = [
                {
                    'category_id': item['product__category_id'],
                    'category_name': item['product__category__name'] or 'Uncategorized',
                    'revenue': float(item['total_revenue'] or 0),
                    'tax_amount': float(item['total_tax'] or 0),
                    'tax_rate': (float(item['total_tax'] or 0) / float(item['total_revenue'] or 1) * 100) if item['total_revenue'] else 0,
                    'quantity_sold': item['quantity_sold']
                }
                for item in items
            ]
        
        elif group_by == 'branch':
            branch_stats = sales.values('branch_id', 'branch__name').annotate(
                total_revenue=Sum('total_amount'),
                total_tax=Sum('tax_amount')
            ).order_by('-total_tax')
            
            breakdown = [
                {
                    'branch_id': item['branch_id'],
                    'branch_name': item['branch__name'],
                    'revenue': float(item['total_revenue'] or 0),
                    'tax_amount': float(item['total_tax'] or 0),
                    'tax_rate': (float(item['total_tax'] or 0) / float(item['total_revenue'] or 1) * 100) if item['total_revenue'] else 0
                }
                for item in branch_stats
            ]
        
        else:  # date
            daily = sales.annotate(
                day=TruncDate('date')
            ).values('day').annotate(
                total_revenue=Sum('total_amount'),
                total_tax=Sum('tax_amount')
            ).order_by('day')
            
            breakdown = [
                {
                    'date': item['day'].isoformat() if hasattr(item['day'], 'isoformat') else str(item['day']),
                    'revenue': float(item['total_revenue'] or 0),
                    'tax_amount': float(item['total_tax'] or 0),
                    'tax_rate': (float(item['total_tax'] or 0) / float(item['total_revenue'] or 1) * 100) if item['total_revenue'] else 0
                }
                for item in daily
            ]
        
        total_tax = sum(b['tax_amount'] for b in breakdown)
        total_revenue = sum(b['revenue'] for b in breakdown)
        
        return {
            'group_by': group_by,
            'breakdown': breakdown,
            'summary': {
                'total_tax': total_tax,
                'total_revenue': total_revenue,
                'average_tax_rate': (total_tax / total_revenue * 100) if total_revenue > 0 else 0
            }
        }
    
    def get_trend_analysis(
        self,
        metric: str = 'revenue',  # revenue, profit, quantity, customers
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        period: str = 'daily',  # daily, weekly, monthly
        branch_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Advanced trend analysis with ML insights.
        """
        if not start_date:
            start_date = timezone.now() - timedelta(days=90)
        if not end_date:
            end_date = timezone.now()
        
        sales = Sale.objects.filter(
            tenant=self.tenant,
            status='completed',
            date__gte=start_date,
            date__lte=end_date
        )
        
        if branch_id:
            sales = sales.filter(branch_id=branch_id)
        
        # Extract time period - use Django's database-agnostic functions
        if period == 'daily':
            if metric == 'revenue':
                data = sales.annotate(
                    period=TruncDate('date')
                ).values('period').annotate(
                    value=Sum('total_amount')
                ).order_by('period')
            elif metric == 'profit':
                # Calculate profit per day
                daily_profit = {}
                for sale in sales.prefetch_related('items'):
                    day = sale.date.date()
                    revenue = float(sale.total_amount or 0)
                    cogs = sum(float(item.cost_price or 0) * float(item.quantity or 0) for item in sale.items.all())
                    profit = revenue - cogs
                    daily_profit[day] = daily_profit.get(day, 0) + profit
                data = [{'period': day, 'value': profit} for day, profit in sorted(daily_profit.items())]
            elif metric == 'quantity':
                from pos.models import SaleItem
                data = SaleItem.objects.filter(
                    sale__in=sales
                ).annotate(
                    period=TruncDate('sale__date')
                ).values('period').annotate(
                    value=Sum('quantity')
                ).order_by('period')
            else:  # customers
                data = sales.annotate(
                    period=TruncDate('date')
                ).values('period').annotate(
                    value=Count('customer', distinct=True)
                ).order_by('period')
        elif period == 'weekly':
            # Weekly grouping - use Python for SQLite compatibility
            weekly_data = {}
            for sale in sales.prefetch_related('items'):
                sale_date = sale.date.date()
                year, week, _ = sale_date.isocalendar()
                period_key = f"{year}-W{week:02d}"
                
                if period_key not in weekly_data:
                    weekly_data[period_key] = 0
                
                if metric == 'revenue':
                    weekly_data[period_key] += float(sale.total_amount or 0)
                elif metric == 'profit':
                    revenue = float(sale.total_amount or 0)
                    cogs = sum(float(item.cost_price or 0) * float(item.quantity or 0) for item in sale.items.all())
                    weekly_data[period_key] += (revenue - cogs)
                elif metric == 'quantity':
                    from pos.models import SaleItem
                    quantity = SaleItem.objects.filter(sale=sale).aggregate(total=Sum('quantity'))['total'] or 0
                    weekly_data[period_key] += quantity
                else:  # customers
                    weekly_data[period_key] += 1 if sale.customer else 0
            
            data = [{'period': period_key, 'value': value} for period_key, value in sorted(weekly_data.items())]
        elif period == 'monthly':
            if metric == 'revenue':
                data = sales.annotate(
                    period=TruncMonth('date')
                ).values('period').annotate(
                    value=Sum('total_amount')
                ).order_by('period')
            elif metric == 'profit':
                # Calculate profit per month
                monthly_profit = {}
                for sale in sales.prefetch_related('items'):
                    month_key = sale.date.replace(day=1).date()
                    revenue = float(sale.total_amount or 0)
                    cogs = sum(float(item.cost_price or 0) * float(item.quantity or 0) for item in sale.items.all())
                    profit = revenue - cogs
                    monthly_profit[month_key] = monthly_profit.get(month_key, 0) + profit
                data = [{'period': month_key, 'value': profit} for month_key, profit in sorted(monthly_profit.items())]
            elif metric == 'quantity':
                from pos.models import SaleItem
                data = SaleItem.objects.filter(
                    sale__in=sales
                ).annotate(
                    period=TruncMonth('sale__date')
                ).values('period').annotate(
                    value=Sum('quantity')
                ).order_by('period')
            else:  # customers
                data = sales.annotate(
                    period=TruncMonth('date')
                ).values('period').annotate(
                    value=Count('customer', distinct=True)
                ).order_by('period')
        else:  # yearly
            if metric == 'revenue':
                data = sales.annotate(
                    period=TruncYear('date')
                ).values('period').annotate(
                    value=Sum('total_amount')
                ).order_by('period')
            elif metric == 'profit':
                # Calculate profit per year
                yearly_profit = {}
                for sale in sales.prefetch_related('items'):
                    year_key = sale.date.replace(month=1, day=1).date()
                    revenue = float(sale.total_amount or 0)
                    cogs = sum(float(item.cost_price or 0) * float(item.quantity or 0) for item in sale.items.all())
                    profit = revenue - cogs
                    yearly_profit[year_key] = yearly_profit.get(year_key, 0) + profit
                data = [{'period': year_key, 'value': profit} for year_key, profit in sorted(yearly_profit.items())]
            elif metric == 'quantity':
                from pos.models import SaleItem
                data = SaleItem.objects.filter(
                    sale__in=sales
                ).annotate(
                    period=TruncYear('sale__date')
                ).values('period').annotate(
                    value=Sum('quantity')
                ).order_by('period')
            else:  # customers
                data = sales.annotate(
                    period=TruncYear('date')
                ).values('period').annotate(
                    value=Count('customer', distinct=True)
                ).order_by('period')
        
        # Convert period to string format
        formatted_data = []
        for item in data:
            period_val = item['period']
            if hasattr(period_val, 'strftime'):
                if period == 'daily':
                    period_str = period_val.strftime('%Y-%m-%d')
                elif period == 'monthly':
                    period_str = period_val.strftime('%Y-%m')
                elif period == 'yearly':
                    period_str = period_val.strftime('%Y')
                else:
                    period_str = str(period_val)
            else:
                period_str = str(period_val)
            formatted_data.append({
                'period': period_str,
                'value': item['value']
            })
        
        values = [float(item['value'] or 0) for item in formatted_data]
        labels = [item['period'] for item in formatted_data]
        
        # Trend detection
        trend = TimeSeriesAnalyzer.detect_trend(values)
        
        # Moving average
        moving_avg = TimeSeriesAnalyzer.calculate_moving_average(values, window=7 if period == 'daily' else 3)
        
        # Forecast
        forecasts = MLForecaster.simple_linear_forecast(values, periods=30)
        
        # Anomaly detection
        anomalies = AnomalyDetector.detect_anomalies_iqr(values)
        
        # Period comparisons
        if len(values) >= 2:
            current_period = values[-1]
            previous_period = values[-2] if len(values) > 1 else values[0]
            growth = TimeSeriesAnalyzer.calculate_growth_rate(current_period, previous_period)
        else:
            growth = 0
        
        # Format forecast for response
        forecast_data_points = []
        if forecasts and len(forecasts) > 0:
            # Generate future dates
            for i, forecast_value in enumerate(forecasts[:30]):  # Limit to 30 days
                try:
                    forecast_data_points.append({
                        'period': f'forecast_{i+1}',
                        'predicted_value': float(forecast_value)
                    })
                except (ValueError, TypeError):
                    continue
        
        # Format data points for response
        data_points = []
        for label, value in zip(labels, values):
            try:
                data_points.append({
                    'period': str(label),
                    'value': float(value)
                })
            except (ValueError, TypeError):
                continue
        
        return {
            'metric': metric,
            'period': period,
            'data_points': data_points,
            'trend_direction': trend.get('direction', 'stable'),
            'trend_strength': trend.get('strength', 'weak'),
            'growth_rate': round(growth, 2),
            'forecast': forecast_data_points,
            'anomalies': anomalies or [],
            'current_value': values[-1] if values else 0,
            'previous_value': values[-2] if len(values) >= 2 else 0,
            # Keep backward compatibility
            'data': {
                'labels': labels,
                'values': values,
                'moving_average': moving_avg
            },
            'insights': {
                'trend': trend,
                'growth_rate': round(growth, 2),
                'forecast': forecasts[:30] if forecasts else [],
                'anomalies': anomalies or [],
                'current_value': values[-1] if values else 0,
                'previous_value': values[-2] if len(values) >= 2 else 0
            }
        }
    
    def get_time_period_comparison(
        self,
        current_start: datetime,
        current_end: datetime,
        previous_start: datetime,
        previous_end: datetime,
        metric: str = 'revenue',
        branch_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Compare two time periods (e.g., this month vs last month, this year vs last year).
        """
        def get_period_stats(start, end):
            sales = Sale.objects.filter(
                tenant=self.tenant,
                status='completed',
                date__gte=start,
                date__lte=end
            )
            
            if branch_id:
                sales = sales.filter(branch_id=branch_id)
            
            if metric == 'revenue':
                result = sales.aggregate(value=Sum('total_amount'))
            elif metric == 'profit':
                # Calculate profit
                revenue = sales.aggregate(r=Sum('total_amount'))['r'] or 0
                cogs = 0
                for sale in sales.prefetch_related('items'):
                    for item in sale.items.all():
                        cogs += float(item.cost_price or 0) * float(item.quantity or 0)
                result = {'value': revenue - cogs}
            elif metric == 'quantity':
                result = sales.aggregate(value=Sum('items__quantity'))
            else:  # customers
                result = sales.aggregate(value=Count('customer', distinct=True))
            
            # Additional stats
            stats = sales.aggregate(
                count=Count('id'),
                avg_value=Avg('total_amount') if metric == 'revenue' else None
            )
            
            return {
                'value': float(result['value'] or 0),
                'count': stats['count'] or 0,
                'avg_value': float(stats['avg_value'] or 0) if stats['avg_value'] else None
            }
        
        current = get_period_stats(current_start, current_end)
        previous = get_period_stats(previous_start, previous_end)
        
        growth = TimeSeriesAnalyzer.calculate_growth_rate(current['value'], previous['value'])
        absolute_change = current['value'] - previous['value']
        
        return {
            'metric': metric,
            'current_period': {
                'start': current_start.isoformat(),
                'end': current_end.isoformat(),
                **current
            },
            'previous_period': {
                'start': previous_start.isoformat(),
                'end': previous_end.isoformat(),
                **previous
            },
            'comparison': {
                'growth_rate': round(growth, 2),
                'absolute_change': round(absolute_change, 2),
                'is_improving': growth > 0,
                'change_percentage': abs(growth)
            }
        }


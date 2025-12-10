"""
Advanced analytics and ML-powered insights.
"""
from django.db.models import Sum, Count, Avg, F, Q
from django.db.models.functions import TruncDate, TruncMonth, TruncYear
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict
import statistics


class AnalyticsEngine:
    """Advanced analytics engine with predictive capabilities."""
    
    @staticmethod
    def calculate_trend(data_points: list, period: int = 7) -> dict:
        """Calculate trend direction and percentage change."""
        if len(data_points) < period * 2:
            return {'direction': 'stable', 'change': 0}
        
        recent = sum(data_points[-period:]) / period
        previous = sum(data_points[-period*2:-period]) / period
        
        if previous == 0:
            return {'direction': 'stable', 'change': 0}
        
        change_percent = ((recent - previous) / previous) * 100
        
        if change_percent > 5:
            direction = 'up'
        elif change_percent < -5:
            direction = 'down'
        else:
            direction = 'stable'
        
        return {
            'direction': direction,
            'change': round(change_percent, 2),
            'current': recent,
            'previous': previous
        }
    
    @staticmethod
    def predict_sales(sales_data: list, days: int = 7) -> list:
        """Simple linear regression for sales prediction."""
        if len(sales_data) < 3:
            return []
        
        # Calculate moving average
        window = min(7, len(sales_data))
        moving_avg = sum(sales_data[-window:]) / window
        
        # Calculate trend
        recent_avg = sum(sales_data[-3:]) / 3
        older_avg = sum(sales_data[-6:-3]) / 3 if len(sales_data) >= 6 else recent_avg
        
        trend = (recent_avg - older_avg) / older_avg if older_avg > 0 else 0
        
        # Predict next days
        predictions = []
        for i in range(days):
            predicted = moving_avg * (1 + trend * (i + 1) / 7)
            predictions.append(max(0, predicted))  # Ensure non-negative
        
        return predictions
    
    @staticmethod
    def calculate_seasonality(sales_data: list) -> dict:
        """Detect seasonal patterns."""
        if len(sales_data) < 28:  # Need at least 4 weeks
            return {}
        
        # Group by day of week
        weekly_pattern = defaultdict(list)
        for i, value in enumerate(sales_data[-28:]):
            day_of_week = i % 7
            weekly_pattern[day_of_week].append(value)
        
        avg_by_day = {
            day: sum(values) / len(values)
            for day, values in weekly_pattern.items()
        }
        
        overall_avg = sum(avg_by_day.values()) / 7
        
        seasonality = {
            day: round((avg / overall_avg - 1) * 100, 2) if overall_avg > 0 else 0
            for day, avg in avg_by_day.items()
        }
        
        return seasonality
    
    @staticmethod
    def identify_anomalies(values: list, threshold: float = 2.0) -> list:
        """Identify statistical anomalies using Z-score."""
        if len(values) < 3:
            return []
        
        mean = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 1 else 0
        
        if stdev == 0:
            return []
        
        anomalies = []
        for i, value in enumerate(values):
            z_score = abs((value - mean) / stdev)
            if z_score > threshold:
                anomalies.append({
                    'index': i,
                    'value': value,
                    'z_score': round(z_score, 2)
                })
        
        return anomalies


class SalesInsights:
    """Sales-specific analytics."""
    
    def __init__(self, sales_queryset):
        self.sales = sales_queryset
    
    def get_top_products(self, limit: int = 10, days: int = 30) -> list:
        """Get top-selling products."""
        from pos.models import SaleItem
        from django.utils import timezone
        from datetime import timedelta
        
        date_from = timezone.now() - timedelta(days=days)
        
        top_products = (
            SaleItem.objects
            .filter(sale__date__gte=date_from)
            .values('product__name', 'product__id')
            .annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum(F('quantity') * F('unit_price'))
            )
            .order_by('-total_revenue')[:limit]
        )
        
        return list(top_products)
    
    def get_customer_lifetime_value(self, days: int = 90) -> dict:
        """Calculate customer lifetime value metrics."""
        from customers.models import Customer
        from pos.models import Sale
        from django.utils import timezone
        from datetime import timedelta
        
        date_from = timezone.now() - timedelta(days=days)
        
        customers = Customer.objects.annotate(
            total_purchases=Count('sales', filter=Q(sales__date__gte=date_from)),
            total_spent=Sum('sales__total_amount', filter=Q(sales__date__gte=date_from))
        ).filter(total_purchases__gt=0)
        
        avg_order_value = customers.aggregate(
            avg=Avg('total_spent')
        )['avg'] or 0
        
        avg_frequency = customers.aggregate(
            avg=Avg('total_purchases')
        )['avg'] or 0
        
        return {
            'avg_order_value': round(avg_order_value, 2),
            'avg_purchase_frequency': round(avg_frequency, 2),
            'customer_count': customers.count()
        }
    
    def get_sales_velocity(self, days: int = 7) -> dict:
        """Calculate sales velocity (revenue per day)."""
        from django.utils import timezone
        from datetime import timedelta
        
        date_from = timezone.now() - timedelta(days=days)
        
        sales_stats = self.sales.filter(date__gte=date_from).aggregate(
            total_revenue=Sum('total_amount'),
            total_sales=Count('id')
        )
        
        revenue = sales_stats['total_revenue'] or 0
        count = sales_stats['total_sales'] or 0
        
        return {
            'revenue_per_day': round(revenue / days, 2) if days > 0 else 0,
            'sales_per_day': round(count / days, 2) if days > 0 else 0,
            'total_revenue': revenue,
            'total_sales': count
        }



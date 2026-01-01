"""
Demand Forecasting Service
ML-powered demand forecasting with seasonal analysis and trend analysis
"""
from django.db.models import Sum, Avg, Count, Q
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta, datetime
from collections import defaultdict
import math

from .models import Product, ProductVariant, StockMovement, Batch
from .advanced_models import SafetyStock


class DemandForecastingService:
    """Service for demand forecasting and reorder optimization."""
    
    @staticmethod
    def calculate_simple_moving_average(product, branch, days=30, variant=None):
        """Calculate simple moving average for demand."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        movements = StockMovement.objects.filter(
            product=product,
            branch=branch,
            variant=variant,
            movement_type='sale',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(
            total=Sum('quantity')
        )['total'] or 0
        
        return Decimal(movements) / Decimal(days)
    
    @staticmethod
    def calculate_weighted_moving_average(product, branch, periods=4, variant=None):
        """Calculate weighted moving average (more recent periods weighted higher)."""
        end_date = timezone.now()
        period_days = 7  # Weekly periods
        
        total_demand = Decimal('0.00')
        total_weight = Decimal('0.00')
        
        for i in range(periods):
            period_start = end_date - timedelta(days=(i + 1) * period_days)
            period_end = end_date - timedelta(days=i * period_days)
            weight = periods - i  # Higher weight for more recent periods
            
            movements = StockMovement.objects.filter(
                product=product,
                branch=branch,
                variant=variant,
                movement_type='sale',
                created_at__gte=period_start,
                created_at__lt=period_end
            ).aggregate(
                total=Sum('quantity')
            )['total'] or 0
            
            total_demand += Decimal(movements) * Decimal(weight)
            total_weight += Decimal(weight)
        
        if total_weight > 0:
            return total_demand / total_weight
        return Decimal('0.00')
    
    @staticmethod
    def calculate_exponential_smoothing(product, branch, alpha=0.3, days=90, variant=None):
        """
        Exponential smoothing forecast.
        alpha: smoothing factor (0-1), higher = more weight to recent data
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        movements = StockMovement.objects.filter(
            product=product,
            branch=branch,
            variant=variant,
            movement_type='sale',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('created_at')
        
        if not movements.exists():
            return Decimal('0.00')
        
        # Group by day
        daily_demand = defaultdict(int)
        for movement in movements:
            date_key = movement.created_at.date()
            daily_demand[date_key] += movement.quantity
        
        # Calculate exponential smoothing
        forecast = Decimal('0.00')
        sorted_dates = sorted(daily_demand.keys())
        
        if sorted_dates:
            # Initialize with first value
            forecast = Decimal(daily_demand[sorted_dates[0]])
            
            # Apply exponential smoothing
            for date in sorted_dates[1:]:
                actual = Decimal(daily_demand[date])
                forecast = alpha * actual + (1 - alpha) * forecast
        
        return forecast
    
    @staticmethod
    def detect_seasonality(product, branch, years=2, variant=None):
        """Detect seasonal patterns in demand."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=years * 365)
        
        movements = StockMovement.objects.filter(
            product=product,
            branch=branch,
            variant=variant,
            movement_type='sale',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).extra(
            select={'month': 'EXTRACT(month FROM created_at)'}
        ).values('month').annotate(
            total=Sum('quantity'),
            count=Count('id')
        ).order_by('month')
        
        monthly_totals = {}
        for item in movements:
            monthly_totals[int(item['month'])] = item['total']
        
        # Calculate average
        if monthly_totals:
            avg_demand = sum(monthly_totals.values()) / len(monthly_totals)
            
            # Calculate seasonal indices
            seasonal_indices = {}
            for month, total in monthly_totals.items():
                if avg_demand > 0:
                    seasonal_indices[month] = total / avg_demand
                else:
                    seasonal_indices[month] = Decimal('1.00')
            
            return seasonal_indices, avg_demand
        
        return {}, Decimal('0.00')
    
    @staticmethod
    def seasonal_forecast(product, branch, days_ahead=30, variant=None):
        """Generate seasonal forecast."""
        current_month = timezone.now().month
        seasonal_indices, avg_demand = DemandForecastingService.detect_seasonality(
            product, branch, variant=variant
        )
        
        # Get base forecast (simple moving average)
        base_forecast = DemandForecastingService.calculate_simple_moving_average(
            product, branch, days=90, variant=variant
        )
        
        # Apply seasonal adjustment
        if current_month in seasonal_indices:
            seasonal_factor = seasonal_indices[current_month]
        else:
            seasonal_factor = Decimal('1.00')
        
        forecast = base_forecast * seasonal_factor * Decimal(days_ahead)
        
        return {
            'forecast': forecast,
            'base_forecast': base_forecast,
            'seasonal_factor': seasonal_factor,
            'month': current_month,
            'days_ahead': days_ahead
        }
    
    @staticmethod
    def calculate_trend(product, branch, days=90, variant=None):
        """Calculate demand trend (increasing/decreasing)."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        movements = StockMovement.objects.filter(
            product=product,
            branch=branch,
            variant=variant,
            movement_type='sale',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).extra(
            select={'week': "DATE_TRUNC('week', created_at)"}
        ).values('week').annotate(
            total=Sum('quantity')
        ).order_by('week')
        
        if len(movements) < 2:
            return {'trend': 'stable', 'slope': Decimal('0.00'), 'r_squared': Decimal('0.00')}
        
        # Simple linear regression
        weeks = list(range(len(movements)))
        demands = [item['total'] for item in movements]
        
        n = len(weeks)
        sum_x = sum(weeks)
        sum_y = sum(demands)
        sum_xy = sum(x * y for x, y in zip(weeks, demands))
        sum_x2 = sum(x * x for x in weeks)
        
        if n * sum_x2 - sum_x * sum_x != 0:
            slope = Decimal(n * sum_xy - sum_x * sum_y) / Decimal(n * sum_x2 - sum_x * sum_x)
        else:
            slope = Decimal('0.00')
        
        # Determine trend
        if slope > Decimal('0.1'):
            trend = 'increasing'
        elif slope < Decimal('-0.1'):
            trend = 'decreasing'
        else:
            trend = 'stable'
        
        return {
            'trend': trend,
            'slope': slope,
            'direction': 'up' if slope > 0 else 'down' if slope < 0 else 'stable'
        }
    
    @staticmethod
    def calculate_safety_stock_statistical(product, branch, service_level=95, lead_time_days=7, variant=None):
        """
        Calculate safety stock using statistical method.
        Safety Stock = Z * σ * √(Lead Time)
        where Z is the service level factor and σ is standard deviation
        """
        # Get historical demand
        end_date = timezone.now()
        start_date = end_date - timedelta(days=90)
        
        movements = StockMovement.objects.filter(
            product=product,
            branch=branch,
            variant=variant,
            movement_type='sale',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).extra(
            select={'day': 'DATE(created_at)'}
        ).values('day').annotate(
            daily_demand=Sum('quantity')
        ).values_list('daily_demand', flat=True)
        
        if not movements:
            return Decimal('0.00')
        
        demands = list(movements)
        n = len(demands)
        
        if n < 2:
            return Decimal('0.00')
        
        # Calculate mean
        mean = sum(demands) / n
        
        # Calculate standard deviation
        variance = sum((x - mean) ** 2 for x in demands) / (n - 1)
        std_dev = math.sqrt(variance)
        
        # Z-score for service level (95% = 1.645, 99% = 2.326)
        z_scores = {
            90: 1.282,
            95: 1.645,
            97: 1.881,
            99: 2.326,
            99.9: 3.090
        }
        z = z_scores.get(service_level, 1.645)
        
        # Calculate safety stock
        safety_stock = Decimal(z) * Decimal(std_dev) * Decimal(math.sqrt(lead_time_days))
        
        return max(safety_stock, Decimal('0.00'))
    
    @staticmethod
    def calculate_reorder_point(product, branch, variant=None):
        """Calculate reorder point (ROP = Lead Time Demand + Safety Stock)."""
        # Get lead time
        lead_time_days = Decimal('7.00')  # Default, can be configured per product
        
        # Calculate average daily demand
        avg_daily_demand = DemandForecastingService.calculate_simple_moving_average(
            product, branch, days=30, variant=variant
        )
        
        # Calculate lead time demand
        lead_time_demand = avg_daily_demand * lead_time_days
        
        # Calculate safety stock
        safety_stock = DemandForecastingService.calculate_safety_stock_statistical(
            product, branch, service_level=95, lead_time_days=float(lead_time_days), variant=variant
        )
        
        # Reorder point
        reorder_point = lead_time_demand + safety_stock
        
        return {
            'reorder_point': reorder_point,
            'lead_time_demand': lead_time_demand,
            'safety_stock': safety_stock,
            'average_daily_demand': avg_daily_demand,
            'lead_time_days': lead_time_days
        }
    
    @staticmethod
    def optimize_reorder_quantity(product, branch, variant=None, holding_cost_rate=0.20, ordering_cost=50):
        """
        Economic Order Quantity (EOQ) calculation.
        EOQ = √(2 * D * S / H)
        where D = annual demand, S = ordering cost, H = holding cost per unit
        """
        # Calculate annual demand
        avg_daily_demand = DemandForecastingService.calculate_simple_moving_average(
            product, branch, days=90, variant=variant
        )
        annual_demand = avg_daily_demand * Decimal('365')
        
        # Get unit cost
        unit_cost = variant.cost_price if variant and variant.cost_price else product.cost_price
        if not unit_cost:
            unit_cost = Decimal('1.00')
        
        # Holding cost per unit per year
        holding_cost_per_unit = unit_cost * Decimal(holding_cost_rate)
        
        if holding_cost_per_unit > 0:
            # Calculate EOQ
            eoq = math.sqrt((2 * float(annual_demand) * ordering_cost) / float(holding_cost_per_unit))
            eoq = Decimal(eoq).quantize(Decimal('1'))
        else:
            eoq = Decimal('50.00')  # Default
        
        # Calculate optimal order frequency
        orders_per_year = annual_demand / eoq if eoq > 0 else Decimal('12.00')
        days_between_orders = Decimal('365') / orders_per_year if orders_per_year > 0 else Decimal('30.00')
        
        return {
            'eoq': eoq,
            'annual_demand': annual_demand,
            'orders_per_year': orders_per_year,
            'days_between_orders': days_between_orders,
            'total_ordering_cost': orders_per_year * Decimal(ordering_cost),
            'total_holding_cost': (eoq / 2) * holding_cost_per_unit,
            'total_cost': (orders_per_year * Decimal(ordering_cost)) + ((eoq / 2) * holding_cost_per_unit)
        }
    
    @staticmethod
    def comprehensive_forecast(product, branch, days_ahead=30, variant=None):
        """Generate comprehensive forecast with all factors."""
        # Base forecast
        base_forecast = DemandForecastingService.calculate_weighted_moving_average(
            product, branch, periods=4, variant=variant
        )
        
        # Seasonal adjustment
        seasonal_forecast_data = DemandForecastingService.seasonal_forecast(
            product, branch, days_ahead=days_ahead, variant=variant
        )
        
        # Trend analysis
        trend_data = DemandForecastingService.calculate_trend(
            product, branch, days=90, variant=variant
        )
        
        # Apply trend to forecast
        trend_adjusted_forecast = seasonal_forecast_data['forecast']
        if trend_data['trend'] == 'increasing':
            trend_adjusted_forecast *= Decimal('1.05')  # 5% increase
        elif trend_data['trend'] == 'decreasing':
            trend_adjusted_forecast *= Decimal('0.95')  # 5% decrease
        
        # Safety stock and reorder point
        reorder_data = DemandForecastingService.calculate_reorder_point(product, branch, variant=variant)
        
        # EOQ optimization
        eoq_data = DemandForecastingService.optimize_reorder_quantity(product, branch, variant=variant)
        
        return {
            'forecast_demand': trend_adjusted_forecast,
            'base_forecast': base_forecast,
            'seasonal_factor': seasonal_forecast_data.get('seasonal_factor', Decimal('1.00')),
            'trend': trend_data,
            'reorder_point': reorder_data,
            'optimal_order_quantity': eoq_data,
            'days_ahead': days_ahead,
            'confidence': 'medium'  # Can be enhanced with confidence intervals
        }



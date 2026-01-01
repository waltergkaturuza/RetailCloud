"""
Stock Analysis Services
ABC/XYZ Analysis, Dead Stock Detection, Stock Aging, Supplier Performance
"""
from django.db.models import Sum, Avg, Count, Q, F, StdDev
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from collections import defaultdict

from .models import Product, ProductVariant, StockLevel, StockMovement, Batch
from .advanced_models import ABCAnalysis, DeadStock, StockAging, SupplierPerformance


class ABCAnalysisService:
    """Service for ABC/XYZ analysis."""
    
    @staticmethod
    def perform_abc_analysis(tenant, analysis_date=None, branch=None):
        """
        Perform ABC analysis based on annual usage value.
        A: Top 80% of value (usually ~20% of items)
        B: Next 15% of value (usually ~30% of items)
        C: Remaining 5% of value (usually ~50% of items)
        """
        if not analysis_date:
            analysis_date = timezone.now().date()
        
        # Get sales data for the past year
        start_date = analysis_date - timedelta(days=365)
        
        products = Product.objects.filter(tenant=tenant, is_active=True)
        if branch:
            products = products.filter(stock_levels__branch=branch).distinct()
        
        product_data = []
        
        for product in products:
            # Get annual usage
            movements = StockMovement.objects.filter(
                product=product,
                movement_type='sale',
                created_at__date__gte=start_date,
                created_at__date__lte=analysis_date
            )
            
            if branch:
                movements = movements.filter(branch=branch)
            
            annual_quantity = movements.aggregate(total=Sum('quantity'))['total'] or 0
            unit_price = product.selling_price
            annual_value = Decimal(annual_quantity) * unit_price
            
            product_data.append({
                'product': product,
                'quantity': annual_quantity,
                'value': annual_value
            })
        
        # Sort by value descending
        product_data.sort(key=lambda x: x['value'], reverse=True)
        
        # Calculate cumulative percentages
        total_value = sum(item['value'] for item in product_data)
        total_quantity = sum(item['quantity'] for item in product_data)
        
        cumulative_value = Decimal('0.00')
        cumulative_quantity = 0
        abc_class = 'A'
        results = []
        
        for item in product_data:
            cumulative_value += item['value']
            cumulative_quantity += item['quantity']
            
            cumulative_value_pct = (cumulative_value / total_value * 100) if total_value > 0 else 0
            cumulative_quantity_pct = (cumulative_quantity / total_quantity * 100) if total_quantity > 0 else 0
            
            # Classify
            if cumulative_value_pct <= 80:
                abc_class = 'A'
            elif cumulative_value_pct <= 95:
                abc_class = 'B'
            else:
                abc_class = 'C'
            
            # Create or update ABC analysis record
            analysis, created = ABCAnalysis.objects.update_or_create(
                tenant=tenant,
                product=item['product'],
                variant=None,
                analysis_date=analysis_date,
                analysis_type='abc',
                defaults={
                    'abc_class': abc_class,
                    'cumulative_value_percent': cumulative_value_pct,
                    'cumulative_quantity_percent': cumulative_quantity_pct,
                    'annual_usage_value': item['value'],
                    'annual_usage_quantity': item['quantity']
                }
            )
            
            results.append(analysis)
        
        return results
    
    @staticmethod
    def perform_xyz_analysis(tenant, analysis_date=None, branch=None):
        """
        Perform XYZ analysis based on demand variability.
        X: Low variability (CV < 0.25)
        Y: Medium variability (0.25 <= CV < 0.75)
        Z: High variability (CV >= 0.75)
        """
        if not analysis_date:
            analysis_date = timezone.now().date()
        
        start_date = analysis_date - timedelta(days=365)
        
        products = Product.objects.filter(tenant=tenant, is_active=True)
        if branch:
            products = products.filter(stock_levels__branch=branch).distinct()
        
        results = []
        
        for product in products:
            # Get monthly demand
            movements = StockMovement.objects.filter(
                product=product,
                movement_type='sale',
                created_at__date__gte=start_date,
                created_at__date__lte=analysis_date
            )
            
            if branch:
                movements = movements.filter(branch=branch)
            
            # Group by month
            monthly_demand = defaultdict(int)
            for movement in movements:
                month_key = movement.created_at.strftime('%Y-%m')
                monthly_demand[month_key] += movement.quantity
            
            if len(monthly_demand) < 2:
                continue
            
            demands = list(monthly_demand.values())
            
            # Calculate coefficient of variation
            mean = sum(demands) / len(demands)
            if mean == 0:
                continue
            
            variance = sum((x - mean) ** 2 for x in demands) / len(demands)
            std_dev = (variance ** 0.5)
            cv = std_dev / mean if mean > 0 else 0
            
            # Classify
            if cv < 0.25:
                xyz_class = 'X'
            elif cv < 0.75:
                xyz_class = 'Y'
            else:
                xyz_class = 'Z'
            
            # Create or update XYZ analysis
            analysis, created = ABCAnalysis.objects.update_or_create(
                tenant=tenant,
                product=product,
                variant=None,
                analysis_date=analysis_date,
                analysis_type='xyz',
                defaults={
                    'xyz_class': xyz_class,
                    'coefficient_of_variation': Decimal(cv)
                }
            )
            
            results.append(analysis)
        
        return results
    
    @staticmethod
    def perform_combined_analysis(tenant, analysis_date=None, branch=None):
        """Perform combined ABC-XYZ analysis."""
        abc_results = ABCAnalysisService.perform_abc_analysis(tenant, analysis_date, branch)
        xyz_results = ABCAnalysisService.perform_xyz_analysis(tenant, analysis_date, branch)
        
        # Create combined classifications
        abc_dict = {a.product_id: a.abc_class for a in abc_results}
        xyz_dict = {x.product_id: x.xyz_class for x in xyz_results}
        
        results = []
        for product_id in set(abc_dict.keys()) | set(xyz_dict.keys()):
            abc_class = abc_dict.get(product_id, 'C')
            xyz_class = xyz_dict.get(product_id, 'Z')
            combined = f"{abc_class}{xyz_class}"
            
            # Get recommendation
            recommendation = ABCAnalysisService._get_recommendation(abc_class, xyz_class)
            
            # Update analysis record
            analysis = ABCAnalysis.objects.filter(
                tenant=tenant,
                product_id=product_id,
                analysis_date=analysis_date,
                analysis_type='abc_xyz'
            ).first()
            
            if not analysis:
                analysis = ABCAnalysis.objects.create(
                    tenant_id=tenant.id,
                    product_id=product_id,
                    analysis_date=analysis_date,
                    analysis_type='abc_xyz',
                    abc_class=abc_class,
                    xyz_class=xyz_class,
                    combined_class=combined,
                    recommendation=recommendation
                )
            else:
                analysis.combined_class = combined
                analysis.recommendation = recommendation
                analysis.save()
            
            results.append(analysis)
        
        return results
    
    @staticmethod
    def _get_recommendation(abc_class, xyz_class):
        """Get inventory management recommendation based on ABC-XYZ classification."""
        recommendations = {
            ('A', 'X'): 'Tight control, frequent reviews, safety stock optimization',
            ('A', 'Y'): 'Tight control, regular reviews, moderate safety stock',
            ('A', 'Z'): 'Very tight control, frequent reviews, high safety stock',
            ('B', 'X'): 'Regular monitoring, standard procedures',
            ('B', 'Y'): 'Regular monitoring, moderate safety stock',
            ('B', 'Z'): 'Close monitoring, flexible ordering',
            ('C', 'X'): 'Simple procedures, minimal safety stock',
            ('C', 'Y'): 'Simple procedures, periodic review',
            ('C', 'Z'): 'Simple procedures, higher safety stock or make-to-order'
        }
        return recommendations.get((abc_class, xyz_class), 'Standard inventory management')


class DeadStockService:
    """Service for detecting dead and slow-moving stock."""
    
    @staticmethod
    def identify_dead_stock(tenant, branch=None, days_threshold=90):
        """Identify dead and slow-moving stock."""
        analysis_date = timezone.now().date()
        
        products = Product.objects.filter(tenant=tenant, is_active=True)
        if branch:
            stock_levels = StockLevel.objects.filter(branch=branch, quantity__gt=0)
        else:
            stock_levels = StockLevel.objects.filter(tenant=tenant, quantity__gt=0)
        
        results = []
        
        for stock_level in stock_levels:
            product = stock_level.product
            variant = stock_level.variant
            
            # Get last sale date
            last_sale = StockMovement.objects.filter(
                product=product,
                variant=variant,
                branch=stock_level.branch,
                movement_type='sale'
            ).order_by('-created_at').first()
            
            days_since_last_sale = None
            if last_sale:
                days_since_last_sale = (analysis_date - last_sale.created_at.date()).days
            
            # Get last movement date
            last_movement = StockMovement.objects.filter(
                product=product,
                variant=variant,
                branch=stock_level.branch
            ).order_by('-created_at').first()
            
            days_since_last_movement = None
            if last_movement:
                days_since_last_movement = (analysis_date - last_movement.created_at.date()).days
            
            # Calculate current value
            unit_cost = variant.cost_price if variant and variant.cost_price else product.cost_price
            current_value = Decimal(stock_level.quantity) * unit_cost
            
            # Classify
            classification = 'active'
            recommendation = 'continue'
            
            if days_since_last_sale is None or days_since_last_sale > 365:
                classification = 'dead'
                recommendation = 'dispose'
            elif days_since_last_sale > 180:
                classification = 'very_slow'
                recommendation = 'liquidate'
            elif days_since_last_sale > days_threshold:
                classification = 'slow_moving'
                recommendation = 'promote'
            
            # Calculate average days to sell
            sales_count = StockMovement.objects.filter(
                product=product,
                variant=variant,
                branch=stock_level.branch,
                movement_type='sale',
                created_at__gte=analysis_date - timedelta(days=365)
            ).count()
            
            avg_days_to_sell = None
            if sales_count > 0:
                avg_days_to_sell = Decimal(365) / Decimal(sales_count)
            
            # Projected sell-through days
            projected_days = None
            if avg_days_to_sell:
                projected_days = avg_days_to_sell * Decimal(stock_level.quantity)
            
            # Create or update dead stock record
            dead_stock, created = DeadStock.objects.update_or_create(
                tenant=tenant,
                product=product,
                variant=variant,
                branch=stock_level.branch,
                analysis_date=analysis_date,
                defaults={
                    'current_quantity': stock_level.quantity,
                    'current_value': current_value,
                    'days_since_last_sale': days_since_last_sale,
                    'days_since_last_movement': days_since_last_movement,
                    'average_days_to_sell': avg_days_to_sell,
                    'projected_sell_through_days': projected_days,
                    'classification': classification,
                    'recommendation': recommendation
                }
            )
            
            results.append(dead_stock)
        
        return results


class StockAgingService:
    """Service for stock aging analysis."""
    
    @staticmethod
    def analyze_stock_aging(tenant, branch=None, analysis_date=None):
        """Analyze stock aging by age buckets."""
        if not analysis_date:
            analysis_date = timezone.now().date()
        
        stock_levels = StockLevel.objects.filter(tenant=tenant, quantity__gt=0)
        if branch:
            stock_levels = stock_levels.filter(branch=branch)
        
        results = []
        
        for stock_level in stock_levels:
            product = stock_level.product
            variant = stock_level.variant
            
            # Get oldest stock date (from batches or movements)
            oldest_date = None
            
            # Check batches
            batches = Batch.objects.filter(
                product=product,
                variant=variant if variant else None,
                branch=stock_level.branch,
                remaining_quantity__gt=0
            ).order_by('received_date').first()
            
            if batches:
                oldest_date = batches.received_date
            
            # Check stock movements if no batch
            if not oldest_date:
                first_movement = StockMovement.objects.filter(
                    product=product,
                    variant=variant,
                    branch=stock_level.branch,
                    movement_type__in=['in', 'transfer_in']
                ).order_by('created_at').first()
                
                if first_movement:
                    oldest_date = first_movement.created_at.date()
            
            if not oldest_date:
                continue
            
            # Calculate age buckets
            age_days = (analysis_date - oldest_date).days
            
            quantity = stock_level.quantity
            unit_cost = variant.cost_price if variant and variant.cost_price else product.cost_price
            total_value = Decimal(quantity) * unit_cost
            
            # Distribute quantity by age (simplified - in real system, track each unit)
            qty_0_30 = quantity if age_days <= 30 else 0
            qty_31_60 = quantity if 31 <= age_days <= 60 else 0
            qty_61_90 = quantity if 61 <= age_days <= 90 else 0
            qty_91_180 = quantity if 91 <= age_days <= 180 else 0
            qty_181_365 = quantity if 181 <= age_days <= 365 else 0
            qty_over_365 = quantity if age_days > 365 else 0
            
            # For simplicity, if quantity is in multiple buckets, distribute evenly
            # In production, this should track individual units
            if quantity > 1 and age_days > 365:
                # Distribute across buckets
                qty_over_365 = quantity // 2
                qty_181_365 = quantity - qty_over_365
            
            value_0_30 = Decimal(qty_0_30) * unit_cost
            value_31_60 = Decimal(qty_31_60) * unit_cost
            value_61_90 = Decimal(qty_61_90) * unit_cost
            value_91_180 = Decimal(qty_91_180) * unit_cost
            value_181_365 = Decimal(qty_181_365) * unit_cost
            value_over_365 = Decimal(qty_over_365) * unit_cost
            
            # Create or update stock aging record
            aging, created = StockAging.objects.update_or_create(
                tenant=tenant,
                product=product,
                variant=variant,
                branch=stock_level.branch,
                analysis_date=analysis_date,
                defaults={
                    'total_quantity': quantity,
                    'quantity_0_30_days': qty_0_30,
                    'quantity_31_60_days': qty_31_60,
                    'quantity_61_90_days': qty_61_90,
                    'quantity_91_180_days': qty_91_180,
                    'quantity_181_365_days': qty_181_365,
                    'quantity_over_365_days': qty_over_365,
                    'total_value': total_value,
                    'value_0_30_days': value_0_30,
                    'value_31_60_days': value_31_60,
                    'value_61_90_days': value_61_90,
                    'value_91_180_days': value_91_180,
                    'value_181_365_days': value_181_365,
                    'value_over_365_days': value_over_365,
                    'oldest_stock_date': oldest_date
                }
            )
            
            results.append(aging)
        
        return results



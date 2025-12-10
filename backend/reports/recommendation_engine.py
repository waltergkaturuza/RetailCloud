"""
Intelligent Recommendation Engine for Tenants.
Analyzes business data and provides actionable insights and recommendations.
"""
import logging
from decimal import Decimal
from datetime import timedelta, datetime
from django.db.models import (
    Sum, Count, Avg, Max, Min, Q, F, FloatField,
    Case, When, Value
)
from django.utils import timezone
from typing import Dict, List, Any, Optional
from collections import defaultdict

from pos.models import Sale, SaleItem
from inventory.models import Product, StockLevel, StockMovement
from customers.models import Customer
from core.models import Branch, Tenant

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Intelligent recommendation engine for business insights."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.now = timezone.now()
        self.today = self.now.date()
        self.last_30_days = self.today - timedelta(days=30)
        self.last_7_days = self.today - timedelta(days=7)
    
    def generate_all_recommendations(self, include_low_priority: bool = False) -> Dict[str, Any]:
        """
        Generate comprehensive recommendations across all business areas.
        Returns prioritized, actionable insights.
        """
        recommendations = {
            'inventory': self.get_inventory_recommendations(),
            'sales': self.get_sales_recommendations(),
            'products': self.get_product_recommendations(),
            'pricing': self.get_pricing_recommendations(),
            'branch': self.get_branch_recommendations(),
            'customers': self.get_customer_recommendations(),
            'financial': self.get_financial_recommendations(),
        }
        
        # Flatten and prioritize
        all_recommendations = []
        for category, recs in recommendations.items():
            for rec in recs:
                rec['category'] = category
                all_recommendations.append(rec)
        
        # Sort by priority and impact
        all_recommendations.sort(
            key=lambda x: (x.get('priority', 0), x.get('impact_score', 0)),
            reverse=True
        )
        
        # Filter low priority if needed
        if not include_low_priority:
            all_recommendations = [r for r in all_recommendations if r.get('priority', 0) >= 3]
        
        # Generate summary
        summary = self._generate_summary(all_recommendations, recommendations)
        
        return {
            'summary': summary,
            'recommendations': all_recommendations[:20],  # Top 20
            'by_category': recommendations,
            'generated_at': self.now.isoformat()
        }
    
    def get_inventory_recommendations(self) -> List[Dict[str, Any]]:
        """Inventory management recommendations."""
        recommendations = []
        
        # Out of stock items
        out_of_stock = StockLevel.objects.filter(
            tenant=self.tenant,
            quantity=0,
            product__is_active=True
        ).select_related('product', 'branch')
        
        if out_of_stock.exists():
            products = list(out_of_stock.values_list('product__name', flat=True).distinct()[:5])
            recommendations.append({
                'type': 'out_of_stock',
                'title': f'{out_of_stock.count()} Products Out of Stock',
                'description': f'Products out of stock: {", ".join(products)}. Restock to avoid lost sales.',
                'priority': 5,  # Critical
                'impact_score': 9,
                'action': 'restock',
                'action_url': '/inventory',
                'count': out_of_stock.count(),
                'products': products[:5]
            })
        
        # Low stock items
        low_stock_items = []
        for stock in StockLevel.objects.filter(
            tenant=self.tenant,
            product__is_active=True
        ).select_related('product', 'branch'):
            if stock.is_low_stock:
                low_stock_items.append(stock)
        
        if low_stock_items:
            recommendations.append({
                'type': 'low_stock',
                'title': f'{len(low_stock_items)} Products Running Low',
                'description': f'{len(low_stock_items)} products are below reorder level. Consider restocking soon.',
                'priority': 4,
                'impact_score': 7,
                'action': 'review_stock',
                'action_url': '/inventory',
                'count': len(low_stock_items)
            })
        
        # Slow-moving products
        slow_movers = self._identify_slow_moving_products()
        if slow_movers:
            recommendations.append({
                'type': 'slow_movers',
                'title': f'{len(slow_movers)} Slow-Moving Products',
                'description': f'Products with low sales in the last 30 days. Consider promotions or price adjustments.',
                'priority': 3,
                'impact_score': 5,
                'action': 'review_pricing',
                'action_url': '/products',
                'products': slow_movers[:5],
                'count': len(slow_movers)
            })
        
        # Overstocked items
        overstocked = self._identify_overstocked_products()
        if overstocked:
            recommendations.append({
                'type': 'overstocked',
                'title': f'{len(overstocked)} Potentially Overstocked Products',
                'description': f'Products with high stock levels but low sales velocity. Consider promotions or reducing orders.',
                'priority': 2,
                'impact_score': 4,
                'action': 'review_inventory',
                'action_url': '/inventory',
                'products': overstocked[:5],
                'count': len(overstocked)
            })
        
        return recommendations
    
    def get_sales_recommendations(self) -> List[Dict[str, Any]]:
        """Sales strategy recommendations."""
        recommendations = []
        
        # Sales trend analysis
        recent_sales = Sale.objects.filter(
            tenant=self.tenant,
            status='completed',
            date__date__gte=self.last_30_days
        )
        
        if not recent_sales.exists():
            recommendations.append({
                'type': 'no_recent_sales',
                'title': 'No Sales in Last 30 Days',
                'description': 'No sales recorded in the past 30 days. Check your POS system and sales processes.',
                'priority': 5,
                'impact_score': 10,
                'action': 'check_system',
                'action_url': '/pos'
            })
            return recommendations
        
        # Compare this week vs last week
        this_week_start = self.today - timedelta(days=self.today.weekday())
        last_week_start = this_week_start - timedelta(days=7)
        last_week_end = this_week_start - timedelta(days=1)
        
        this_week_sales = recent_sales.filter(date__date__gte=this_week_start)
        last_week_sales = recent_sales.filter(
            date__date__gte=last_week_start,
            date__date__lte=last_week_end
        )
        
        this_week_revenue = this_week_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        last_week_revenue = last_week_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        
        if last_week_revenue > 0:
            change_pct = ((this_week_revenue - last_week_revenue) / last_week_revenue) * 100
            if change_pct < -10:
                recommendations.append({
                    'type': 'sales_decline',
                    'title': 'Sales Declining This Week',
                    'description': f'Sales down {abs(change_pct):.1f}% compared to last week. Consider promotions or marketing.',
                    'priority': 4,
                    'impact_score': 8,
                    'action': 'create_promotion',
                    'action_url': '/promotions',
                    'change_percentage': change_pct
                })
        
        # Peak hours analysis
        peak_hours = self._analyze_peak_hours()
        if peak_hours:
            recommendations.append({
                'type': 'peak_hours',
                'title': 'Peak Sales Hours Identified',
                'description': f'Busiest hours: {", ".join(peak_hours[:3])}. Ensure adequate staff during these times.',
                'priority': 3,
                'impact_score': 6,
                'action': 'view_details',
                'action_url': '/reports',
                'hours': peak_hours
            })
        
        # Payment method optimization
        payment_rec = self._analyze_payment_methods()
        if payment_rec:
            recommendations.append(payment_rec)
        
        return recommendations
    
    def get_product_recommendations(self) -> List[Dict[str, Any]]:
        """Product-specific recommendations."""
        recommendations = []
        
        # Top performers - suggest restocking
        top_products = SaleItem.objects.filter(
            sale__tenant=self.tenant,
            sale__status='completed',
            sale__date__date__gte=self.last_30_days
        ).values('product_id', 'product__name').annotate(
            total_sold=Sum('quantity'),
            revenue=Sum(F('quantity') * F('unit_price'))
        ).order_by('-total_sold')[:5]
        
        if top_products:
            recommendations.append({
                'type': 'top_products',
                'title': 'Top Selling Products',
                'description': f'Your best sellers in the last 30 days. Ensure these are always well-stocked.',
                'priority': 4,
                'impact_score': 8,
                'action': 'view_products',
                'action_url': '/products',
                'products': [p['product__name'] for p in top_products]  # Just product names for display
            })
        
        # Products with declining sales
        declining = self._identify_declining_products()
        if declining:
            recommendations.append({
                'type': 'declining_products',
                'title': f'{len(declining)} Products with Declining Sales',
                'description': 'These products show declining sales trends. Consider promotions, bundling, or price adjustments.',
                'priority': 3,
                'impact_score': 6,
                'action': 'review_pricing',
                'action_url': '/products',
                'products': declining[:5],
                'count': len(declining)
            })
        
        # New product opportunities
        opportunities = self._identify_product_opportunities()
        if opportunities:
            recommendations.append({
                'type': 'product_opportunities',
                'title': 'Product Expansion Opportunities',
                'description': 'Based on customer purchase patterns, consider adding these complementary products.',
                'priority': 2,
                'impact_score': 5,
                'action': 'add_products',
                'action_url': '/products',
                'suggestions': opportunities[:5]
            })
        
        return recommendations
    
    def get_pricing_recommendations(self) -> List[Dict[str, Any]]:
        """Pricing strategy recommendations."""
        recommendations = []
        
        # Products with high profit margins - potential price increase
        high_margin = self._identify_high_margin_products()
        if high_margin:
            recommendations.append({
                'type': 'pricing_opportunity',
                'title': 'Pricing Optimization Opportunities',
                'description': f'{len(high_margin)} products have high demand and margins. Consider testing slight price increases.',
                'priority': 2,
                'impact_score': 4,
                'action': 'review_pricing',
                'action_url': '/products',
                'count': len(high_margin)
            })
        
        # Products with low margins
        low_margin = self._identify_low_margin_products()
        if low_margin:
            recommendations.append({
                'type': 'low_margin_alert',
                'title': f'{len(low_margin)} Products with Low Profit Margins',
                'description': 'These products have low profit margins. Consider cost reduction, price increase, or discontinuation.',
                'priority': 3,
                'impact_score': 6,
                'action': 'review_costs',
                'action_url': '/products',
                'count': len(low_margin)
            })
        
        return recommendations
    
    def get_branch_recommendations(self) -> List[Dict[str, Any]]:
        """Branch performance recommendations."""
        recommendations = []
        
        branches = Branch.objects.filter(tenant=self.tenant, is_active=True)
        if branches.count() < 2:
            return recommendations  # No comparison needed for single branch
        
        # Compare branch performance
        branch_performance = []
        for branch in branches:
            sales = Sale.objects.filter(
                tenant=self.tenant,
                branch=branch,
                status='completed',
                date__date__gte=self.last_30_days
            )
            revenue = sales.aggregate(total=Sum('total_amount'))['total'] or 0
            count = sales.count()
            branch_performance.append({
                'branch_id': branch.id,
                'branch_name': branch.name,
                'revenue': float(revenue),
                'sales_count': count
            })
        
        if branch_performance:
            branch_performance.sort(key=lambda x: x['revenue'], reverse=True)
            best = branch_performance[0]
            worst = branch_performance[-1]
            
            if worst['revenue'] > 0:
                difference = ((best['revenue'] - worst['revenue']) / worst['revenue']) * 100
                if difference > 30:
                    recommendations.append({
                        'type': 'branch_performance_gap',
                        'title': 'Significant Branch Performance Gap',
                        'description': f'{best["branch_name"]} is performing {difference:.1f}% better than {worst["branch_name"]}. Consider sharing best practices.',
                        'priority': 3,
                        'impact_score': 7,
                        'action': 'view_comparison',
                        'action_url': '/reports',
                        'best_branch': best['branch_name'],
                        'worst_branch': worst['branch_name'],
                        'difference': difference
                    })
        
        return recommendations
    
    def get_customer_recommendations(self) -> List[Dict[str, Any]]:
        """Customer-related recommendations."""
        recommendations = []
        
        # Customer retention
        recent_customers = Customer.objects.filter(
            tenant=self.tenant,
            created_at__gte=self.now - timedelta(days=90)
        ).count()
        
        total_customers = Customer.objects.filter(tenant=self.tenant).count()
        
        if total_customers > 0:
            retention_rate = (recent_customers / total_customers) * 100
            if retention_rate < 30:
                recommendations.append({
                    'type': 'low_customer_retention',
                    'title': 'Low Customer Retention',
                    'description': f'Only {retention_rate:.1f}% of customers made purchases in the last 90 days. Consider loyalty programs or re-engagement campaigns.',
                    'priority': 3,
                    'impact_score': 7,
                    'action': 'create_loyalty_program',
                    'action_url': '/customers',
                    'retention_rate': retention_rate
                })
        
        # Top customers
        top_customers = Sale.objects.filter(
            tenant=self.tenant,
            status='completed',
            date__date__gte=self.last_30_days,
            customer__isnull=False
        ).values('customer_id', 'customer__first_name', 'customer__last_name').annotate(
            total_spent=Sum('total_amount'),
            visit_count=Count('id')
        ).order_by('-total_spent')[:5]
        
        if top_customers:
            recommendations.append({
                'type': 'top_customers',
                'title': 'Focus on Your Top Customers',
                'description': 'Your top 5 customers generate significant revenue. Consider VIP programs or personalized offers.',
                'priority': 2,
                'impact_score': 5,
                'action': 'view_customers',
                'action_url': '/customers',
                'customer_count': len(top_customers)
            })
        
        return recommendations
    
    def get_financial_recommendations(self) -> List[Dict[str, Any]]:
        """Financial health recommendations."""
        recommendations = []
        
        # Profit margin analysis
        sales = Sale.objects.filter(
            tenant=self.tenant,
            status='completed',
            date__date__gte=self.last_30_days
        )
        
        revenue = sales.aggregate(total=Sum('total_amount'))['total'] or 0
        
        if revenue > 0:
            # Calculate COGS
            cogs = 0
            for sale in sales.prefetch_related('items'):
                for item in sale.items.all():
                    cogs += float(item.cost_price or 0) * float(item.quantity or 0)
            
            gross_profit = float(revenue) - cogs
            margin = (gross_profit / float(revenue)) * 100 if revenue > 0 else 0
            
            if margin < 20:
                recommendations.append({
                    'type': 'low_profit_margin',
                    'title': 'Low Profit Margin Alert',
                    'description': f'Your profit margin is {margin:.1f}%, which is below the recommended 20%. Review costs and pricing.',
                    'priority': 4,
                    'impact_score': 9,
                    'action': 'review_pricing',
                    'action_url': '/reports',
                    'current_margin': margin
                })
            elif margin > 40:
                recommendations.append({
                    'type': 'excellent_margin',
                    'title': 'Excellent Profit Margins',
                    'description': f'Great job! Your profit margin is {margin:.1f}%. Consider reinvesting in growth or expansion.',
                    'priority': 1,
                    'impact_score': 3,
                    'action': 'view_details',
                    'action_url': '/reports',
                    'current_margin': margin
                })
        
        return recommendations
    
    # Helper methods
    
    def _identify_slow_moving_products(self) -> List[str]:
        """Identify products with low sales velocity."""
        slow_movers = []
        
        # Products with stock but no sales in last 30 days
        products_with_stock = StockLevel.objects.filter(
            tenant=self.tenant,
            quantity__gt=0,
            product__is_active=True
        ).select_related('product')
        
        for stock in products_with_stock:
            sales_count = SaleItem.objects.filter(
                product=stock.product,
                sale__tenant=self.tenant,
                sale__status='completed',
                sale__date__date__gte=self.last_30_days
            ).aggregate(total=Sum('quantity'))['total'] or 0
            
            if sales_count == 0 and stock.quantity > stock.product.reorder_level:
                slow_movers.append(stock.product.name)
        
        return slow_movers[:10]
    
    def _identify_overstocked_products(self) -> List[str]:
        """Identify potentially overstocked items."""
        overstocked = []
        
        products = Product.objects.filter(tenant=self.tenant, is_active=True)
        
        for product in products[:50]:  # Limit check for performance
            stock_levels = StockLevel.objects.filter(
                tenant=self.tenant,
                product=product
            )
            
            total_stock = sum(sl.quantity for sl in stock_levels)
            
            # Sales in last 30 days
            sales_30d = SaleItem.objects.filter(
                product=product,
                sale__tenant=self.tenant,
                sale__status='completed',
                sale__date__date__gte=self.last_30_days
            ).aggregate(total=Sum('quantity'))['total'] or 0
            
            # If stock is 3x+ monthly sales, might be overstocked
            if total_stock > 0 and sales_30d > 0:
                months_of_stock = total_stock / sales_30d
                if months_of_stock > 3:
                    overstocked.append(product.name)
        
        return overstocked[:10]
    
    def _analyze_peak_hours(self) -> List[str]:
        """Identify peak sales hours."""
        sales = Sale.objects.filter(
            tenant=self.tenant,
            status='completed',
            date__date__gte=self.last_30_days
        )
        
        hour_counts = defaultdict(int)
        for sale in sales:
            hour = sale.date.hour
            hour_counts[hour] += 1
        
        if not hour_counts:
            return []
        
        # Get top 3 hours
        sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        return [f"{hour}:00" for hour, _ in sorted_hours]
    
    def _analyze_payment_methods(self) -> Optional[Dict[str, Any]]:
        """Analyze payment methods for optimization."""
        sales = Sale.objects.filter(
            tenant=self.tenant,
            status='completed',
            date__date__gte=self.last_30_days
        )
        
        payment_methods = sales.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        )
        
        if not payment_methods.exists():
            return None
        
        # Check if cash is dominant (might want to encourage digital)
        total_sales = sales.count()
        cash_sales = sales.filter(payment_method='cash').count()
        
        if cash_sales / total_sales > 0.7 and total_sales > 10:
            return {
                'type': 'payment_optimization',
                'title': 'Consider Promoting Digital Payments',
                'description': f'{cash_sales/total_sales*100:.1f}% of sales are cash. Digital payments reduce handling time and risk.',
                'priority': 2,
                'impact_score': 4,
                'action': 'view_settings',
                'action_url': '/settings',
                'cash_percentage': (cash_sales / total_sales) * 100
            }
        
        return None
    
    def _identify_declining_products(self) -> List[Dict[str, Any]]:
        """Identify products with declining sales trends."""
        declining = []
        
        # Compare last 14 days vs previous 14 days
        last_14_start = self.today - timedelta(days=14)
        prev_14_start = last_14_start - timedelta(days=14)
        prev_14_end = last_14_start - timedelta(days=1)
        
        products = Product.objects.filter(tenant=self.tenant, is_active=True)[:50]
        
        for product in products:
            recent_sales = SaleItem.objects.filter(
                product=product,
                sale__tenant=self.tenant,
                sale__status='completed',
                sale__date__date__gte=last_14_start
            ).aggregate(total=Sum('quantity'))['total'] or 0
            
            previous_sales = SaleItem.objects.filter(
                product=product,
                sale__tenant=self.tenant,
                sale__status='completed',
                sale__date__date__gte=prev_14_start,
                sale__date__date__lte=prev_14_end
            ).aggregate(total=Sum('quantity'))['total'] or 0
            
            if previous_sales > 0 and recent_sales > 0:
                decline = ((previous_sales - recent_sales) / previous_sales) * 100
                if decline > 30:  # 30%+ decline
                    declining.append(product.name)  # Just product name for display
        
        return declining
    
    def _identify_product_opportunities(self) -> List[str]:
        """Identify potential product opportunities."""
        # This is a placeholder - can be enhanced with market basket analysis
        # For now, return empty or basic suggestions
        return []
    
    def _identify_high_margin_products(self) -> List[str]:
        """Identify products with high profit margins."""
        high_margin = []
        
        products = Product.objects.filter(
            tenant=self.tenant,
            is_active=True,
            cost_price__isnull=False
        )[:50]
        
        for product in products:
            if product.cost_price and product.selling_price:
                margin = ((float(product.selling_price) - float(product.cost_price)) / float(product.selling_price)) * 100
                
                # High margin + good sales
                sales_30d = SaleItem.objects.filter(
                    product=product,
                    sale__tenant=self.tenant,
                    sale__status='completed',
                    sale__date__date__gte=self.last_30_days
                ).aggregate(total=Sum('quantity'))['total'] or 0
                
                if margin > 50 and sales_30d > 10:
                    high_margin.append(product.name)
        
        return high_margin
    
    def _identify_low_margin_products(self) -> List[str]:
        """Identify products with low profit margins."""
        low_margin = []
        
        products = Product.objects.filter(
            tenant=self.tenant,
            is_active=True,
            cost_price__isnull=False
        )[:50]
        
        for product in products:
            if product.cost_price and product.selling_price:
                margin = ((float(product.selling_price) - float(product.cost_price)) / float(product.selling_price)) * 100
                
                if margin < 10 and margin > 0:  # Low but not negative
                    low_margin.append(product.name)
        
        return low_margin
    
    def _generate_summary(self, all_recommendations: List[Dict], by_category: Dict) -> Dict[str, Any]:
        """Generate executive summary of recommendations."""
        critical_count = sum(1 for r in all_recommendations if r.get('priority', 0) == 5)
        high_count = sum(1 for r in all_recommendations if r.get('priority', 0) == 4)
        medium_count = sum(1 for r in all_recommendations if r.get('priority', 0) == 3)
        
        # Calculate potential impact
        total_impact = sum(r.get('impact_score', 0) for r in all_recommendations[:10])
        
        # Key insights
        key_insights = []
        if critical_count > 0:
            key_insights.append(f"{critical_count} critical issue{'' if critical_count == 1 else 's'} requiring immediate attention")
        if high_count > 0:
            key_insights.append(f"{high_count} high-priority recommendation{'' if high_count == 1 else 's'}")
        
        # Top 3 recommendations
        top_3 = all_recommendations[:3]
        
        return {
            'total_recommendations': len(all_recommendations),
            'critical_count': critical_count,
            'high_priority_count': high_count,
            'medium_priority_count': medium_count,
            'total_impact_score': total_impact,
            'key_insights': key_insights,
            'top_recommendations': [
                {
                    'title': r['title'],
                    'category': r['category'],
                    'priority': r.get('priority', 0)
                }
                for r in top_3
            ],
            'categories_covered': list(by_category.keys())
        }


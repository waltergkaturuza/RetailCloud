"""
Reports views.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, F, FloatField, Case, When, Value
from django.utils import timezone
from datetime import timedelta
from pos.models import Sale
from inventory.models import StockLevel, Product
from customers.models import Customer


class SalesReportView(views.APIView):
    """Sales reports."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get sales report."""
        # Get tenant from request or user
        tenant = getattr(request, 'tenant', None)
        if not tenant and request.user.is_authenticated and hasattr(request.user, 'tenant'):
            tenant = request.user.tenant
        
        if not tenant:
            return Response(
                {'error': 'No tenant found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.tenant = tenant
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_id = request.query_params.get('branch_id')
        
        # Default to today if no dates provided
        if not start_date:
            start_date = timezone.now().date()
        else:
            start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Build query
        queryset = Sale.objects.filter(
            tenant=tenant,
            date__date__gte=start_date,
            date__date__lte=end_date,
            status='completed'
        )
        
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Calculate totals
        totals = queryset.aggregate(
            total_sales=Count('id'),
            total_amount=Sum('total_amount'),
            total_tax=Sum('tax_amount'),
            total_discount=Sum('discount_amount')
        )
        
        # Sales by payment method
        payment_methods = queryset.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        )
        
        # Daily breakdown
        daily_sales = queryset.values('date__date').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        ).order_by('date__date')
        
        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'summary': totals,
            'payment_methods': payment_methods,
            'daily_breakdown': daily_sales
        })


class InventoryReportView(views.APIView):
    """Inventory reports."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get inventory report."""
        # Get tenant from request or user
        tenant = getattr(request, 'tenant', None)
        if not tenant and request.user.is_authenticated and hasattr(request.user, 'tenant'):
            tenant = request.user.tenant
        
        if not tenant:
            return Response(
                {'error': 'No tenant found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.tenant = tenant
        
        branch_id = request.query_params.get('branch_id')
        
        queryset = StockLevel.objects.filter(tenant=tenant)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Low stock items - filter in Python since is_low_stock is a property
        low_stock = []
        for stock in queryset.select_related('product', 'product__category'):
            if stock.is_low_stock:
                low_stock.append({
                    'product__name': stock.product.name if stock.product else '',
                    'product__sku': stock.product.sku if stock.product else '',
                    'quantity': stock.quantity,
                    'product__reorder_level': stock.product.reorder_level if stock.product else 10
                })
        
        # Out of stock
        out_of_stock = queryset.filter(quantity=0).values('product__name', 'product__sku')
        
        # Stock valuation - fix calculation
        stock_valuation = queryset.aggregate(
            total_value=Sum(
                Case(
                    When(product__cost_price__isnull=False, then=F('product__cost_price') * F('quantity')),
                    default=Value(0),
                    output_field=FloatField()
                )
            )
        ) or {'total_value': 0}
        
        return Response({
            'low_stock_items': low_stock,
            'out_of_stock_items': out_of_stock,
            'stock_valuation': stock_valuation
        })


class ProfitLossReportView(views.APIView):
    """Profit & Loss report."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get P&L report."""
        # Get tenant from request or user
        tenant = getattr(request, 'tenant', None)
        if not tenant and request.user.is_authenticated and hasattr(request.user, 'tenant'):
            tenant = request.user.tenant
        
        if not tenant:
            return Response(
                {'error': 'No tenant found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.tenant = tenant
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date:
            start_date = timezone.now().date() - timedelta(days=30)
        else:
            start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Sales revenue
        sales = Sale.objects.filter(
            tenant=tenant,
            date__date__gte=start_date,
            date__date__lte=end_date,
            status='completed'
        )
        
        revenue = sales.aggregate(total=Sum('total_amount'))['total'] or 0
        cost_of_goods = 0  # Calculate from sale items
        
        # TODO: Calculate COGS from sale items
        for sale in sales:
            for item in sale.items.all():
                cost_of_goods += (item.cost_price or 0) * item.quantity
        
        gross_profit = revenue - cost_of_goods
        gross_profit_margin = (gross_profit / revenue * 100) if revenue > 0 else 0
        
        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'revenue': revenue,
            'cost_of_goods_sold': cost_of_goods,
            'gross_profit': gross_profit,
            'gross_profit_margin': round(gross_profit_margin, 2)
        })


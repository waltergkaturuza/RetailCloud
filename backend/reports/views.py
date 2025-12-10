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
from core.utils import get_tenant_from_request


class SalesReportView(views.APIView):
    """Sales reports."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get sales report."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
            # Validate branch belongs to tenant
            from core.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id, tenant=tenant)
                queryset = queryset.filter(branch_id=branch_id)
            except Branch.DoesNotExist:
                return Response(
                    {'error': f'Branch {branch_id} not found or does not belong to your tenant.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
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
        
        # Daily breakdown - ensure dates are serialized as strings
        daily_sales = queryset.values('date__date').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        ).order_by('date__date')
        
        # Convert daily breakdown to a list with properly formatted dates
        daily_breakdown = []
        for item in daily_sales:
            date_value = item.get('date__date')
            if date_value:
                if isinstance(date_value, str):
                    date_str = date_value
                else:
                    date_str = date_value.isoformat() if hasattr(date_value, 'isoformat') else str(date_value)
                daily_breakdown.append({
                    'date': date_str,
                    'date__date': date_str,
                    'count': item.get('count', 0),
                    'total': float(item.get('total', 0) or 0)
                })
        
        return Response({
            'period': {
                'start_date': start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date),
                'end_date': end_date.isoformat() if hasattr(end_date, 'isoformat') else str(end_date)
            },
            'summary': {
                'total_sales': totals.get('total_sales', 0),
                'total_amount': float(totals.get('total_amount', 0) or 0),
                'total_tax': float(totals.get('total_tax', 0) or 0),
                'total_discount': float(totals.get('total_discount', 0) or 0)
            },
            'payment_methods': [
                {
                    'payment_method': item.get('payment_method', 'unknown'),
                    'count': item.get('count', 0),
                    'total': float(item.get('total', 0) or 0)
                }
                for item in payment_methods
            ],
            'daily_breakdown': daily_breakdown
        })


class InventoryReportView(views.APIView):
    """Inventory reports."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get inventory report."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branch_id = request.query_params.get('branch_id')
        
        queryset = StockLevel.objects.filter(tenant=tenant)
        if branch_id:
            # Validate branch belongs to tenant
            from core.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id, tenant=tenant)
                queryset = queryset.filter(branch_id=branch_id)
            except Branch.DoesNotExist:
                return Response(
                    {'error': f'Branch {branch_id} not found or does not belong to your tenant.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
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
    """Comprehensive Trading Profit & Loss report."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get comprehensive P&L statement."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_id = request.query_params.get('branch_id')
        
        if not start_date:
            start_date = timezone.now().date() - timedelta(days=30)
        else:
            start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Use comprehensive P&L service
        from .pl_service import TradingProfitLossService
        
        branch_id_int = int(branch_id) if branch_id else None
        pl_service = TradingProfitLossService(tenant, start_date, end_date, branch_id_int)
        pl_statement = pl_service.generate_pl_statement()
        
        return Response(pl_statement)
    
    def post(self, request):
        """Generate and download P&L as PDF."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found. Please ensure you are associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_date = request.data.get('start_date') or request.query_params.get('start_date')
        end_date = request.data.get('end_date') or request.query_params.get('end_date')
        branch_id = request.data.get('branch_id') or request.query_params.get('branch_id')
        
        if not start_date:
            start_date = timezone.now().date() - timedelta(days=30)
        else:
            start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
        
        try:
            from .pl_service import TradingProfitLossService
            from .pdf_service import PLStatementPDF
            from core.receipt_models import ReceiptTemplate
            import os
            from django.conf import settings
            
            branch_id_int = int(branch_id) if branch_id else None
            pl_service = TradingProfitLossService(tenant, start_date, end_date, branch_id_int)
            pl_statement = pl_service.generate_pl_statement()
            
            # Try to get logo from Tenant model first, fallback to ReceiptTemplate
            logo_path = None
            try:
                # First try tenant logo
                if tenant.logo:
                    logo_path = tenant.logo.path
                    if not os.path.exists(logo_path):
                        logo_path = None
                
                # Fallback to ReceiptTemplate logo
                if not logo_path:
                    receipt_template = ReceiptTemplate.objects.filter(
                        tenant=tenant,
                        is_default=True
                    ).first()
                    
                    if receipt_template and receipt_template.logo:
                        logo_path = receipt_template.logo.path
                        if not os.path.exists(logo_path):
                            logo_path = None
            except Exception:
                # If logo retrieval fails, continue without it
                logo_path = None
            
            # Generate PDF
            pdf_generator = PLStatementPDF(pl_statement, tenant, logo_path=logo_path)
            pdf_buffer = pdf_generator.generate_pdf()
            
            from django.http import HttpResponse
            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            filename = f"P&L_{start_date}_{end_date}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except ImportError as e:
            return Response(
                {'error': f'PDF generation requires reportlab. Install with: pip install reportlab. Error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            import traceback
            import sys
            error_details = traceback.format_exc()
            print(f"PDF Generation Error: {str(e)}", file=sys.stderr)
            print(error_details, file=sys.stderr)
            return Response(
                {'error': f'Error generating PDF: {str(e)}', 'details': error_details},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


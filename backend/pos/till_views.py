"""
Views for till float and cash management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Sum, Q
from datetime import date, datetime
from .till_models import TillFloat, CashTransaction, SuspendedSale, DayEndReport
from .till_serializers import (
    TillFloatSerializer, TillFloatCreateSerializer,
    CashTransactionSerializer, CashTransactionCreateSerializer,
    SuspendedSaleSerializer, DayEndReportSerializer
)
from .models import Sale, SaleItem, PaymentSplit


class TillFloatViewSet(viewsets.ModelViewSet):
    """Till float viewset."""
    serializer_class = TillFloatSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = TillFloat.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        
        # Filter by branch if provided
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by cashier if provided
        cashier_id = self.request.query_params.get('cashier')
        if cashier_id:
            queryset = queryset.filter(cashier_id=cashier_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-shift_date', '-shift_start')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TillFloatCreateSerializer
        return TillFloatSerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current open till float for cashier."""
        branch_id = request.query_params.get('branch')
        if not branch_id:
            return Response(
                {'error': 'branch parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        today = timezone.now().date()
        till_float = self.get_queryset().filter(
            branch_id=branch_id,
            cashier=request.user,
            shift_date=today,
            status='open'
        ).first()
        
        if not till_float:
            return Response({'error': 'No open till float found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(TillFloatSerializer(till_float).data)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close till float and generate summary."""
        till_float = self.get_object()
        
        if till_float.status != 'open':
            return Response(
                {'error': 'Till float is not open'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        closing_cash_usd = request.data.get('closing_cash_usd')
        closing_cash_zwl = request.data.get('closing_cash_zwl')
        notes = request.data.get('notes', '')
        
        till_float.closing_cash_usd = closing_cash_usd
        till_float.closing_cash_zwl = closing_cash_zwl
        till_float.shift_end = timezone.now()
        till_float.status = 'closed'
        till_float.notes = notes
        till_float.save()
        
        return Response(TillFloatSerializer(till_float).data)


class CashTransactionViewSet(viewsets.ModelViewSet):
    """Cash transaction viewset."""
    serializer_class = CashTransactionSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = CashTransaction.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        
        # Filter by branch if provided
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by till_float if provided
        till_float_id = self.request.query_params.get('till_float')
        if till_float_id:
            queryset = queryset.filter(till_float_id=till_float_id)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CashTransactionCreateSerializer
        return CashTransactionSerializer
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve cash transaction."""
        transaction = self.get_object()
        
        if not request.user.role in ['super_admin', 'tenant_admin', 'supervisor', 'manager']:
            return Response(
                {'error': 'Permission denied. Only supervisors can approve transactions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not transaction.requires_approval:
            return Response(
                {'error': 'Transaction does not require approval'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transaction.approved_by = request.user
        transaction.approved_at = timezone.now()
        transaction.requires_approval = False
        transaction.save()
        
        return Response(CashTransactionSerializer(transaction).data)


class SuspendedSaleViewSet(viewsets.ModelViewSet):
    """Suspended sale viewset."""
    serializer_class = SuspendedSaleSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = SuspendedSale.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', 'suspended')
        queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-suspended_at')
    
    def perform_create(self, serializer):
        """Create suspended sale."""
        serializer.save(
            tenant=self.request.tenant,
            cashier=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume suspended sale (creates actual sale)."""
        suspended_sale = self.get_object()
        
        if suspended_sale.status != 'suspended':
            return Response(
                {'error': 'Sale is not suspended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create sale from cart data
        # This would be handled by the POS endpoint
        return Response({
            'message': 'Sale resume should be handled by POS endpoint',
            'suspended_sale_id': suspended_sale.id
        })


class DayEndReportView(APIView):
    """Generate day-end reports (X-Report, Z-Report)."""
    
    def post(self, request):
        """Generate report."""
        report_type = request.data.get('report_type', 'x_report')  # x_report or z_report
        branch_id = request.data.get('branch_id')
        till_float_id = request.data.get('till_float_id')
        
        if not branch_id:
            return Response(
                {'error': 'branch_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get date range
        report_date = request.data.get('report_date', timezone.now().date())
        if isinstance(report_date, str):
            report_date = datetime.strptime(report_date, '%Y-%m-%d').date()
        
        # Get sales for the day
        sales = Sale.objects.filter(
            tenant=request.tenant,
            branch_id=branch_id,
            date__date=report_date,
            status='completed'
        )
        
        # Calculate totals
        totals = {
            'total_sales_usd': 0,
            'total_sales_zwl': 0,
            'total_sales_zar': 0,
            'cash_usd': 0,
            'cash_zwl': 0,
            'ecocash': 0,
            'onemoney': 0,
            'card': 0,
            'zipit': 0,
            'rtgs': 0,
            'credit': 0,
            'total_transactions': sales.count(),
            'total_items_sold': 0,
            'total_discounts': 0,
            'total_tax': 0,
        }
        
        for sale in sales:
            # Sum by currency
            if sale.currency == 'USD':
                totals['total_sales_usd'] += float(sale.total_amount)
            elif sale.currency == 'ZWL':
                totals['total_sales_zwl'] += float(sale.total_amount)
            elif sale.currency == 'ZAR':
                totals['total_sales_zar'] += float(sale.total_amount)
            
            # Sum by payment method
            if sale.payment_method == 'cash' or sale.payment_method == 'usd':
                if sale.currency == 'USD':
                    totals['cash_usd'] += float(sale.total_amount)
                elif sale.currency == 'ZWL':
                    totals['cash_zwl'] += float(sale.total_amount)
            elif sale.payment_method == 'ecocash':
                totals['ecocash'] += float(sale.total_amount)
            elif sale.payment_method == 'onemoney':
                totals['onemoney'] += float(sale.total_amount)
            elif sale.payment_method == 'card':
                totals['card'] += float(sale.total_amount)
            elif sale.payment_method == 'zipit':
                totals['zipit'] += float(sale.total_amount)
            elif sale.payment_method == 'rtgs':
                totals['rtgs'] += float(sale.total_amount)
            elif sale.payment_method == 'credit':
                totals['credit'] += float(sale.total_amount)
            
            # Handle payment splits
            for split in sale.payment_splits.all():
                if split.currency == 'USD' and split.payment_method in ['cash', 'usd']:
                    totals['cash_usd'] += float(split.amount)
                elif split.currency == 'ZWL' and split.payment_method in ['cash', 'zwl']:
                    totals['cash_zwl'] += float(split.amount)
                elif split.payment_method == 'ecocash':
                    totals['ecocash'] += float(split.amount)
                elif split.payment_method == 'onemoney':
                    totals['onemoney'] += float(split.amount)
            
            totals['total_items_sold'] += sale.items.count()
            totals['total_discounts'] += float(sale.discount_amount or 0)
            totals['total_tax'] += float(sale.tax_amount or 0)
        
        # Get till float if provided
        till_float = None
        if till_float_id:
            try:
                till_float = TillFloat.objects.get(id=till_float_id, tenant=request.tenant)
            except TillFloat.DoesNotExist:
                pass
        
        # Calculate variances if till float exists
        if till_float:
            totals['expected_cash_usd'] = float(totals['cash_usd'])
            totals['expected_cash_zwl'] = float(totals['cash_zwl'])
            totals['actual_cash_usd'] = float(request.data.get('actual_cash_usd', totals['expected_cash_usd']))
            totals['actual_cash_zwl'] = float(request.data.get('actual_cash_zwl', totals['expected_cash_zwl']))
            totals['variance_usd'] = totals['actual_cash_usd'] - totals['expected_cash_usd']
            totals['variance_zwl'] = totals['actual_cash_zwl'] - totals['expected_cash_zwl']
        
        # Create report record
        report_data = {
            'sales_summary': totals,
            'sales_by_hour': {},  # Can be enhanced
            'top_products': [],  # Can be enhanced
        }
        
        report = DayEndReport.objects.create(
            tenant=request.tenant,
            branch_id=branch_id,
            till_float=till_float,
            report_type=report_type,
            generated_by=request.user,
            **totals,
            report_data=report_data
        )
        
        # If Z-Report, close till float
        if report_type == 'z_report' and till_float:
            till_float.status = 'reconciled'
            till_float.save()
        
        return Response(DayEndReportSerializer(report).data)
    
    def get(self, request):
        """Get reports."""
        branch_id = request.query_params.get('branch_id')
        report_type = request.query_params.get('report_type')
        
        queryset = DayEndReport.objects.filter(tenant=request.tenant)
        
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        
        queryset = queryset.order_by('-generated_at')[:50]
        
        return Response(DayEndReportSerializer(queryset, many=True).data)


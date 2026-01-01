"""
Tax Management API Views
Comprehensive tax management for Zimbabwe businesses
"""
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from core.utils import get_tenant_from_request

from .tax_config_models import TaxConfiguration, TaxPeriod, TaxLiability
from .tax_calculation_service import TaxCalculationService
from .models import TaxTransaction


class TaxConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for tax configuration."""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return TaxConfiguration.objects.none()
        return TaxConfiguration.objects.filter(tenant=tenant)
    
    def get_serializer_class(self):
        from .tax_serializers import TaxConfigurationSerializer
        return TaxConfigurationSerializer
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            raise ValidationError("Tenant not found")
        serializer.save(tenant=tenant)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current tenant's tax configuration."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        config, created = TaxConfiguration.objects.get_or_create(tenant=tenant)
        serializer = self.get_serializer(config)
        return Response(serializer.data)


class TaxPeriodViewSet(viewsets.ModelViewSet):
    """ViewSet for tax periods."""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return TaxPeriod.objects.none()
        
        queryset = TaxPeriod.objects.filter(tenant=tenant)
        
        # Filter by period type
        period_type = self.request.query_params.get('period_type')
        if period_type:
            queryset = queryset.filter(period_type=period_type)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(filing_status=status_filter)
        
        return queryset.order_by('-period_end')
    
    def get_serializer_class(self):
        from .tax_serializers import TaxPeriodSerializer
        return TaxPeriodSerializer
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            raise ValidationError("Tenant not found")
        serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """Calculate tax for a period."""
        period = self.get_object()
        tax_service = TaxCalculationService(period.tenant)
        
        if period.period_type == 'vat':
            # Calculate VAT return
            result = tax_service.calculate_vat_return(
                period.period_start,
                period.period_end
            )
            # Update period with calculated amount
            period.tax_payable = Decimal(str(result['vat_payable']))
            period.save()
            return Response(result)
        elif period.period_type == 'income_tax':
            # Calculate income tax
            taxable_income = tax_service.calculate_taxable_income(
                period.period_start,
                period.period_end
            )
            result = tax_service.calculate_income_tax(taxable_income)
            period.tax_payable = result['tax_amount']
            period.save()
            return Response(result)
        
        return Response({'error': 'Unsupported period type'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_filed(self, request, pk=None):
        """Mark period as filed."""
        period = self.get_object()
        period.filing_status = 'filed'
        period.filed_date = timezone.now().date()
        period.return_reference = request.data.get('return_reference', '')
        period.save()
        return Response({'status': 'filed', 'filed_date': period.filed_date})


class TaxLiabilityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing tax liabilities (read-only, created automatically)."""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return TaxLiability.objects.none()
        
        queryset = TaxLiability.objects.filter(tenant=tenant)
        
        # Filter by tax type
        tax_type = self.request.query_params.get('tax_type')
        if tax_type:
            queryset = queryset.filter(tax_type=tax_type)
        
        # Filter by settlement status
        is_settled = self.request.query_params.get('is_settled')
        if is_settled is not None:
            queryset = queryset.filter(is_settled=is_settled.lower() == 'true')
        
        # Filter by period
        period_start = self.request.query_params.get('period_start')
        period_end = self.request.query_params.get('period_end')
        if period_start:
            queryset = queryset.filter(tax_period_start__gte=period_start)
        if period_end:
            queryset = queryset.filter(tax_period_end__lte=period_end)
        
        return queryset.order_by('-transaction_date')
    
    def get_serializer_class(self):
        from .tax_serializers import TaxLiabilitySerializer
        return TaxLiabilitySerializer


class TaxReportingView(views.APIView):
    """Tax reporting and analytics."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get tax reports and summaries."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        tax_service = TaxCalculationService(tenant)
        
        # Get date range
        period_start = request.query_params.get('period_start')
        period_end = request.query_params.get('period_end')
        
        if not period_start or not period_end:
            # Default to current month
            today = timezone.now().date()
            period_start = date(today.year, today.month, 1)
            if today.month == 12:
                period_end = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                period_end = date(today.year, today.month + 1, 1) - timedelta(days=1)
        else:
            period_start = date.fromisoformat(period_start)
            period_end = date.fromisoformat(period_end)
        
        # Calculate VAT return
        vat_return = tax_service.calculate_vat_return(period_start, period_end)
        
        # Get tax liabilities summary
        liabilities = TaxLiability.objects.filter(
            tenant=tenant,
            tax_period_start=period_start,
            tax_period_end=period_end,
            is_settled=False
        ).values('tax_type').annotate(
            total_amount=Sum('tax_amount'),
            count=Count('id')
        )
        
        # Get overdue periods
        overdue_periods = TaxPeriod.objects.filter(
            tenant=tenant,
            filing_status__in=['not_started', 'in_progress'],
            filing_due_date__lt=timezone.now().date()
        ).order_by('filing_due_date')
        
        return Response({
            'period_start': period_start,
            'period_end': period_end,
            'vat_return': vat_return,
            'tax_liabilities_summary': list(liabilities),
            'overdue_periods': [
                {
                    'id': p.id,
                    'period_type': p.period_type,
                    'period_label': p.period_label,
                    'filing_due_date': p.filing_due_date,
                    'outstanding_amount': float(p.outstanding_amount),
                    'days_overdue': (timezone.now().date() - p.filing_due_date).days
                }
                for p in overdue_periods[:10]
            ]
        })
    
    def post(self, request):
        """Calculate VAT return for a period."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        branch_id = request.data.get('branch_id')
        
        if not period_start or not period_end:
            return Response(
                {'error': 'period_start and period_end are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        period_start = date.fromisoformat(period_start)
        period_end = date.fromisoformat(period_end)
        
        tax_service = TaxCalculationService(tenant)
        branch = None
        if branch_id:
            from core.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id, tenant=tenant)
            except Branch.DoesNotExist:
                pass
        
        result = tax_service.calculate_vat_return(period_start, period_end, branch)
        return Response(result)


class TaxCalendarView(views.APIView):
    """Tax calendar and due dates."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get upcoming tax due dates."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        today = timezone.now().date()
        next_90_days = today + timedelta(days=90)
        
        # Get upcoming periods
        upcoming_periods = TaxPeriod.objects.filter(
            tenant=tenant,
            filing_due_date__gte=today,
            filing_due_date__lte=next_90_days,
            filing_status__in=['not_started', 'in_progress']
        ).order_by('filing_due_date')
        
        # Get overdue periods
        overdue_periods = TaxPeriod.objects.filter(
            tenant=tenant,
            filing_due_date__lt=today,
            filing_status__in=['not_started', 'in_progress']
        ).order_by('filing_due_date')
        
        return Response({
            'upcoming': [
                {
                    'id': p.id,
                    'period_type': p.period_type,
                    'period_label': p.period_label,
                    'filing_due_date': p.filing_due_date,
                    'payment_due_date': p.payment_due_date,
                    'tax_payable': float(p.tax_payable),
                    'days_until_due': (p.filing_due_date - today).days
                }
                for p in upcoming_periods
            ],
            'overdue': [
                {
                    'id': p.id,
                    'period_type': p.period_type,
                    'period_label': p.period_label,
                    'filing_due_date': p.filing_due_date,
                    'payment_due_date': p.payment_due_date,
                    'outstanding_amount': float(p.outstanding_amount),
                    'days_overdue': (today - p.filing_due_date).days
                }
                for p in overdue_periods
            ]
        })


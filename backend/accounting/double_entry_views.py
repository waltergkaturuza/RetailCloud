"""
API views for double-entry bookkeeping (premium feature).
"""
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from datetime import date, datetime
from decimal import Decimal
from .double_entry_models import (
    ChartOfAccounts,
    JournalEntry,
    JournalLine,
    GeneralLedger
)
from .double_entry_serializers import (
    ChartOfAccountsSerializer,
    ChartOfAccountsListSerializer,
    JournalEntrySerializer,
    JournalEntryCreateUpdateSerializer,
    GeneralLedgerSerializer,
    TrialBalanceSerializer,
    BalanceSheetSerializer,
    CashFlowSerializer
)
from .accounting_services import (
    TrialBalanceService,
    BalanceSheetService,
    CashFlowService,
    AccountAgingService
)
from .permissions import HasAccountingModule
from core.utils import get_tenant_from_request


class ChartOfAccountsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Chart of Accounts.
    Requires accounting module activation.
    """
    permission_classes = [IsAuthenticated, HasAccountingModule]
    serializer_class = ChartOfAccountsSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return ChartOfAccounts.objects.none()
        
        queryset = ChartOfAccounts.objects.filter(tenant=tenant).select_related('parent', 'created_by')
        
        # Filter by account type if provided
        account_type = self.request.query_params.get('account_type')
        if account_type:
            queryset = queryset.filter(account_type=account_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by parent (for hierarchical view)
        parent = self.request.query_params.get('parent')
        if parent:
            if parent == 'null' or parent == 'none':
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent)
        
        return queryset.order_by('code')
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return ChartOfAccountsListSerializer
        return ChartOfAccountsSerializer
    
    def perform_create(self, serializer):
        """Set tenant and created_by."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )
    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """Get account balance as of a specific date."""
        account = self.get_object()
        as_of_date = request.query_params.get('as_of_date')
        
        if as_of_date:
            try:
                as_of_date = date.fromisoformat(as_of_date)
            except (ValueError, AttributeError):
                as_of_date = date.today()
        else:
            as_of_date = date.today()
        
        balance = account.get_balance(as_of_date)
        balance_display = account.get_balance_display(as_of_date)
        
        return Response({
            'account_id': account.id,
            'account_code': account.code,
            'account_name': account.name,
            'as_of_date': as_of_date,
            'net_balance': float(balance),
            'debit_balance': float(balance_display['debit']),
            'credit_balance': float(balance_display['credit']),
        })
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """Get all journal lines for this account."""
        account = self.get_object()
        lines = JournalLine.objects.filter(
            account=account,
            journal_entry__is_posted=True
        ).select_related('journal_entry').order_by('-journal_entry__date', '-id')
        
        from .double_entry_serializers import JournalLineSerializer
        serializer = JournalLineSerializer(lines, many=True)
        return Response(serializer.data)


class JournalEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Journal Entries.
    Requires accounting module activation.
    """
    permission_classes = [IsAuthenticated, HasAccountingModule]
    serializer_class = JournalEntrySerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return JournalEntry.objects.none()
        
        queryset = JournalEntry.objects.filter(tenant=tenant).select_related(
            'branch', 'created_by', 'posted_by', 'reversed_by'
        ).prefetch_related('journal_lines__account')
        
        # Filter by posted status
        is_posted = self.request.query_params.get('is_posted')
        if is_posted is not None:
            queryset = queryset.filter(is_posted=is_posted.lower() == 'true')
        
        # Filter by entry type
        entry_type = self.request.query_params.get('entry_type')
        if entry_type:
            queryset = queryset.filter(entry_type=entry_type)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        return queryset.order_by('-date', '-created_at')
    
    def get_serializer_class(self):
        """Use create/update serializer for create/update actions."""
        if self.action in ['create', 'update', 'partial_update']:
            return JournalEntryCreateUpdateSerializer
        return JournalEntrySerializer
    
    def perform_create(self, serializer):
        """Set tenant and created_by."""
        tenant = get_tenant_from_request(self.request)
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        """Post a journal entry (make it permanent)."""
        entry = self.get_object()
        
        if entry.is_posted:
            return Response(
                {'error': 'Entry is already posted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not entry.is_balanced():
            return Response(
                {
                    'error': 'Entry is not balanced',
                    'total_debits': float(entry.get_total_debits()),
                    'total_credits': float(entry.get_total_credits()),
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            entry.post(request.user)
            serializer = self.get_serializer(entry)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def reverse_entry(self, request, pk=None):
        """Create a reversing entry for this journal entry."""
        entry = self.get_object()
        
        reversal_date = request.data.get('reversal_date')
        if reversal_date:
            try:
                reversal_date = date.fromisoformat(reversal_date)
            except (ValueError, AttributeError):
                reversal_date = date.today()
        else:
            reversal_date = date.today()
        
        try:
            reversal = entry.reverse(request.user, reversal_date)
            serializer = self.get_serializer(reversal)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class GeneralLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing General Ledger.
    Requires accounting module activation.
    """
    permission_classes = [IsAuthenticated, HasAccountingModule]
    serializer_class = GeneralLedgerSerializer
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return GeneralLedger.objects.none()
        
        queryset = GeneralLedger.objects.filter(tenant=tenant).select_related('account')
        
        # Filter by period
        period_year = self.request.query_params.get('period_year')
        period_month = self.request.query_params.get('period_month')
        if period_year:
            queryset = queryset.filter(period_year=period_year)
        if period_month:
            queryset = queryset.filter(period_month=period_month)
        
        # Filter by account
        account = self.request.query_params.get('account')
        if account:
            queryset = queryset.filter(account_id=account)
        
        return queryset.order_by('account__code', 'period_year', 'period_month')


class AccountingReportsView(views.APIView):
    """
    View for generating accounting reports.
    Requires accounting module activation.
    """
    permission_classes = [IsAuthenticated, HasAccountingModule]
    
    def get(self, request, report_type):
        """Generate accounting reports."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if report_type == 'trial-balance':
            as_of_date = request.query_params.get('as_of_date')
            if as_of_date:
                try:
                    as_of_date = date.fromisoformat(as_of_date)
                except (ValueError, AttributeError):
                    as_of_date = date.today()
            else:
                as_of_date = date.today()
            
            include_zero = request.query_params.get('include_zero', 'false').lower() == 'true'
            
            result = TrialBalanceService.generate_trial_balance(
                tenant, as_of_date, include_zero
            )
            
            # Convert Decimal to float for JSON serialization
            result['total_debits'] = float(result['total_debits'])
            result['total_credits'] = float(result['total_credits'])
            result['difference'] = float(result['difference'])
            for account in result['accounts']:
                account['debit_balance'] = float(account['debit_balance'])
                account['credit_balance'] = float(account['credit_balance'])
                account['net_balance'] = float(account['net_balance'])
            
            return Response(result)
        
        elif report_type == 'balance-sheet':
            as_of_date = request.query_params.get('as_of_date')
            if as_of_date:
                try:
                    as_of_date = date.fromisoformat(as_of_date)
                except (ValueError, AttributeError):
                    as_of_date = date.today()
            else:
                as_of_date = date.today()
            
            result = BalanceSheetService.generate_balance_sheet(tenant, as_of_date)
            
            # Convert Decimal to float
            def convert_decimals(obj):
                if isinstance(obj, dict):
                    return {k: convert_decimals(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_decimals(item) for item in obj]
                elif isinstance(obj, Decimal):
                    return float(obj)
                return obj
            
            result = convert_decimals(result)
            return Response(result)
        
        elif report_type == 'cash-flow':
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            if not start_date or not end_date:
                return Response(
                    {'error': 'start_date and end_date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                start_date = date.fromisoformat(start_date)
                end_date = date.fromisoformat(end_date)
            except (ValueError, AttributeError):
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = CashFlowService.generate_cash_flow_statement(tenant, start_date, end_date)
            
            # Convert Decimal to float
            def convert_decimals(obj):
                if isinstance(obj, dict):
                    return {k: convert_decimals(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_decimals(item) for item in obj]
                elif isinstance(obj, Decimal):
                    return float(obj)
                return obj
            
            result = convert_decimals(result)
            return Response(result)
        
        elif report_type == 'ar-aging':
            as_of_date = request.query_params.get('as_of_date')
            if as_of_date:
                try:
                    as_of_date = date.fromisoformat(as_of_date)
                except (ValueError, AttributeError):
                    as_of_date = date.today()
            else:
                as_of_date = date.today()
            
            result = AccountAgingService.generate_ar_aging(tenant, as_of_date)
            return Response(result)
        
        elif report_type == 'ap-aging':
            as_of_date = request.query_params.get('as_of_date')
            if as_of_date:
                try:
                    as_of_date = date.fromisoformat(as_of_date)
                except (ValueError, AttributeError):
                    as_of_date = date.today()
            else:
                as_of_date = date.today()
            
            result = AccountAgingService.generate_ap_aging(tenant, as_of_date)
            return Response(result)
        
        else:
            return Response(
                {'error': f'Unknown report type: {report_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )


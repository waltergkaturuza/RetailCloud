from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from core.utils import get_tenant_from_request

from .models import ExpenseCategory, Expense, TaxTransaction
from .serializers import ExpenseCategorySerializer, ExpenseSerializer, TaxTransactionSerializer


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for expense categories."""
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        queryset = ExpenseCategory.objects.all()
        if tenant:
            queryset = queryset.filter(tenant=tenant, is_active=True)
        else:
            queryset = queryset.none()
        return queryset.order_by('name')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        tenant = get_tenant_from_request(self.request)
        if tenant:
            context['tenant'] = tenant
        return context
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            raise ValidationError("Tenant not found")
        serializer.save(tenant=tenant)


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for expenses."""
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        queryset = Expense.objects.select_related('category', 'branch', 'created_by', 'approved_by').all()
        
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        
        # Filter by branch
        branch_id = self.request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by expense type
        expense_type = self.request.query_params.get('expense_type')
        if expense_type:
            queryset = queryset.filter(expense_type=expense_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('-date', '-created_at')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        tenant = get_tenant_from_request(self.request)
        if tenant:
            context['tenant'] = tenant
        return context


class TaxTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for tax transactions."""
    serializer_class = TaxTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        queryset = TaxTransaction.objects.select_related('branch', 'created_by').all()
        
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        
        # Filter by branch
        branch_id = self.request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by tax type
        tax_type = self.request.query_params.get('tax_type')
        if tax_type:
            queryset = queryset.filter(tax_type=tax_type)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('-date', '-created_at')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        tenant = get_tenant_from_request(self.request)
        if tenant:
            context['tenant'] = tenant
        return context


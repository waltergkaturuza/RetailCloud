"""
Views for quotes and invoicing.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models import Quotation, QuotationLineItem, CustomerInvoice, InvoiceLineItem, InvoicePayment
from .serializers import (
    QuotationSerializer, QuotationCreateUpdateSerializer,
    CustomerInvoiceSerializer, CustomerInvoiceCreateUpdateSerializer,
    InvoicePaymentCreateSerializer
)
from core.utils import get_tenant_from_request
from core.permissions import HasModuleAccess
from .pdf_service import quotation_pdf_response, invoice_pdf_response


class QuotationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quotations."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = 'quotations_invoicing'
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return Quotation.objects.none()
        return Quotation.objects.filter(tenant=tenant).select_related('customer', 'branch', 'created_by')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QuotationCreateUpdateSerializer
        return QuotationSerializer
    
    def perform_create(self, serializer):
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def convert_to_invoice(self, request, pk=None):
        """Convert a quotation to an invoice."""
        quotation = self.get_object()
        
        if quotation.status == 'converted':
            return Response(
                {'error': 'This quotation has already been converted to an invoice.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if quotation.status != 'accepted':
            return Response(
                {'error': 'Only accepted quotations can be converted to invoices.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create invoice from quotation
            invoice = CustomerInvoice.objects.create(
                tenant=quotation.tenant,
                branch=quotation.branch,
                customer=quotation.customer,
                quotation=quotation,
                invoice_date=timezone.now().date(),
                due_date=quotation.valid_until,
                status='draft',
                subtotal=quotation.subtotal,
                tax_rate=quotation.tax_rate,
                tax_amount=quotation.tax_amount,
                discount_percentage=quotation.discount_percentage,
                discount_amount=quotation.discount_amount,
                total_amount=quotation.total_amount,
                currency=quotation.currency,
                terms_and_conditions=quotation.terms_and_conditions,
                notes=quotation.notes,
                internal_notes=quotation.internal_notes,
                created_by=request.user,
            )
            
            # Copy line items
            for quo_item in quotation.line_items.all():
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    item_description=quo_item.item_description,
                    quantity=quo_item.quantity,
                    unit_price=quo_item.unit_price,
                    sort_order=quo_item.sort_order,
                )
            
            # Update quotation status
            quotation.status = 'converted'
            quotation.invoice = invoice
            quotation.save()
            
            serializer = CustomerInvoiceSerializer(invoice)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Mark quotation as accepted."""
        quotation = self.get_object()
        quotation.status = 'accepted'
        quotation.accepted_at = timezone.now()
        quotation.save()
        return Response(QuotationSerializer(quotation).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Mark quotation as rejected."""
        quotation = self.get_object()
        quotation.status = 'rejected'
        quotation.save()
        return Response(QuotationSerializer(quotation).data)
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for quotation."""
        quotation = self.get_object()
        return quotation_pdf_response(quotation)


class CustomerInvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing customer invoices."""
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    required_module = 'quotations_invoicing'
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            return CustomerInvoice.objects.none()
        return CustomerInvoice.objects.filter(tenant=tenant).select_related('customer', 'branch', 'quotation', 'created_by').prefetch_related('payments')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CustomerInvoiceCreateUpdateSerializer
        return CustomerInvoiceSerializer
    
    def perform_create(self, serializer):
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a payment for an invoice."""
        invoice = self.get_object()
        
        serializer = InvoicePaymentCreateSerializer(
            data=request.data,
            context={'invoice': invoice, 'request': request}
        )
        
        if serializer.is_valid():
            payment = serializer.save()
            invoice.refresh_from_db()
            return Response(CustomerInvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Mark invoice as sent."""
        invoice = self.get_object()
        if invoice.status == 'draft':
            invoice.status = 'sent'
            invoice.save()
        return Response(CustomerInvoiceSerializer(invoice).data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue invoices."""
        queryset = self.get_queryset().filter(
            status__in=['sent', 'partially_paid'],
            due_date__lt=timezone.now().date()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for invoice."""
        invoice = self.get_object()
        return invoice_pdf_response(invoice)


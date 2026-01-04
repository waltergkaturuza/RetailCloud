"""
PDF Generation Service for Quotations and Invoices
Uses company branding from Tenant model
"""
from django.template.loader import render_to_string
from django.http import HttpResponse
from weasyprint import HTML, CSS
from io import BytesIO
from .models import Quotation, CustomerInvoice
from core.models import Tenant
import os


def generate_quotation_pdf(quotation: Quotation) -> BytesIO:
    """
    Generate a PDF for a quotation with company branding.
    
    Args:
        quotation: Quotation instance
        
    Returns:
        BytesIO: PDF file buffer
    """
    tenant = quotation.tenant
    
    # Prepare context data
    context = {
        'quotation': quotation,
        'tenant': tenant,
        'customer': quotation.customer,
        'line_items': quotation.line_items.all().order_by('sort_order', 'id'),
        'logo_url': tenant.logo.url if tenant.logo else None,
        'company_name': tenant.company_name,
        'company_address': f"{tenant.address}, {tenant.city}, {tenant.country}",
        'company_phone': tenant.phone,
        'company_email': tenant.email,
    }
    
    # Render HTML template
    html_string = render_to_string('quotes/quotation_pdf.html', context)
    
    # Generate PDF
    html = HTML(string=html_string, base_url=os.path.dirname(__file__))
    pdf_file = html.write_pdf()
    
    return BytesIO(pdf_file)


def generate_invoice_pdf(invoice: CustomerInvoice) -> BytesIO:
    """
    Generate a PDF for an invoice with company branding.
    
    Args:
        invoice: CustomerInvoice instance
        
    Returns:
        BytesIO: PDF file buffer
    """
    tenant = invoice.tenant
    
    # Prepare context data
    context = {
        'invoice': invoice,
        'tenant': tenant,
        'customer': invoice.customer,
        'line_items': invoice.line_items.all().order_by('sort_order', 'id'),
        'payments': invoice.payments.all().order_by('-payment_date'),
        'logo_url': tenant.logo.url if tenant.logo else None,
        'company_name': tenant.company_name,
        'company_address': f"{tenant.address}, {tenant.city}, {tenant.country}",
        'company_phone': tenant.phone,
        'company_email': tenant.email,
    }
    
    # Render HTML template
    html_string = render_to_string('quotes/invoice_pdf.html', context)
    
    # Generate PDF
    html = HTML(string=html_string, base_url=os.path.dirname(__file__))
    pdf_file = html.write_pdf()
    
    return BytesIO(pdf_file)


def quotation_pdf_response(quotation: Quotation) -> HttpResponse:
    """Return HTTP response with quotation PDF."""
    pdf_buffer = generate_quotation_pdf(quotation)
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="quotation_{quotation.quotation_number}.pdf"'
    return response


def invoice_pdf_response(invoice: CustomerInvoice) -> HttpResponse:
    """Return HTTP response with invoice PDF."""
    pdf_buffer = generate_invoice_pdf(invoice)
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="invoice_{invoice.invoice_number}.pdf"'
    return response


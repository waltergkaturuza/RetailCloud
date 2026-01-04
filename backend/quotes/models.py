"""
Quotations and Customer Invoicing models.
Separate from subscription invoices - these are for customer-facing documents.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
from core.models import Tenant, Branch
from accounts.models import User
from customers.models import Customer
import uuid


class Quotation(models.Model):
    """Quotation/Quote sent to customers."""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('converted', 'Converted to Invoice'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='quotations')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations')
    quotation_number = models.CharField(max_length=100, unique=True, help_text="Auto-generated quotation number")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='quotations')
    
    # Dates
    quotation_date = models.DateField(default=timezone.now)
    valid_until = models.DateField(help_text="Quotation expiration date")
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Pricing
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Tax rate as percentage")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Discount as percentage")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    currency = models.CharField(max_length=3, default='USD')
    
    # Terms and notes
    terms_and_conditions = models.TextField(blank=True, help_text="Terms and conditions for this quotation")
    notes = models.TextField(blank=True, help_text="Additional notes or instructions")
    internal_notes = models.TextField(blank=True, help_text="Internal notes (not shown to customer)")
    
    # Reference to invoice if converted
    invoice = models.ForeignKey('CustomerInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='source_quotation')
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='quotations_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='quotations_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quotations'
        ordering = ['-quotation_date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'quotation_date']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['quotation_number']),
        ]
    
    def __str__(self):
        return f"Quotation {self.quotation_number} - {self.customer.name}"
    
    def save(self, *args, **kwargs):
        if not self.quotation_number:
            self.quotation_number = self.generate_quotation_number()
        super().save(*args, **kwargs)
    
    def generate_quotation_number(self):
        """Generate unique quotation number."""
        prefix = getattr(self.tenant, 'quotation_prefix', 'QUO')
        date_str = timezone.now().strftime('%Y%m%d')
        tenant_code = self.tenant.slug[:4].upper()
        
        # Get last quotation for this tenant today
        last_quo = Quotation.objects.filter(
            tenant=self.tenant,
            quotation_number__startswith=f'{prefix}-{tenant_code}-{date_str}'
        ).order_by('-quotation_number').first()
        
        if last_quo:
            try:
                seq = int(last_quo.quotation_number.split('-')[-1]) + 1
            except:
                seq = 1
        else:
            seq = 1
        
        return f'{prefix}-{tenant_code}-{date_str}-{str(seq).zfill(4)}'
    
    def calculate_totals(self):
        """Calculate total amounts from line items."""
        line_items = self.line_items.all()
        self.subtotal = sum(item.line_total for item in line_items)
        
        # Apply discount
        if self.discount_percentage > 0:
            self.discount_amount = (self.subtotal * self.discount_percentage) / Decimal('100.00')
        subtotal_after_discount = self.subtotal - self.discount_amount
        
        # Calculate tax
        if self.tax_rate > 0:
            self.tax_amount = (subtotal_after_discount * self.tax_rate) / Decimal('100.00')
        else:
            self.tax_amount = Decimal('0.00')
        
        self.total_amount = subtotal_after_discount + self.tax_amount
        return self.total_amount


class QuotationLineItem(models.Model):
    """Line items for quotations."""
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='line_items')
    item_description = models.CharField(max_length=500, help_text="Item or service description")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'), validators=[MinValueValidator(Decimal('0.01'))])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    line_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    sort_order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'quotation_line_items'
        ordering = ['sort_order', 'id']
    
    def __str__(self):
        return f"{self.quotation.quotation_number} - {self.item_description[:50]}"
    
    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class CustomerInvoice(models.Model):
    """Customer Invoice (separate from subscription Invoice model)."""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('partially_paid', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customer_invoices')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_invoices')
    invoice_number = models.CharField(max_length=100, unique=True, help_text="Auto-generated invoice number")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices')
    
    # Reference to quotation if converted
    quotation = models.ForeignKey(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_invoices')
    
    # Dates
    invoice_date = models.DateField(default=timezone.now)
    due_date = models.DateField(help_text="Payment due date")
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Pricing
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Tax rate as percentage")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Discount as percentage")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    currency = models.CharField(max_length=3, default='USD')
    
    # Terms and notes
    terms_and_conditions = models.TextField(blank=True, help_text="Payment terms and conditions")
    notes = models.TextField(blank=True, help_text="Additional notes for customer")
    internal_notes = models.TextField(blank=True, help_text="Internal notes (not shown to customer)")
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invoices_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invoices_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_invoices'
        ordering = ['-invoice_date', '-created_at']
        indexes = [
            models.Index(fields=['tenant', 'invoice_date']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['due_date', 'status']),
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.customer.name}"
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        # Calculate balance
        self.balance_due = self.total_amount - self.paid_amount
        # Update status based on payment
        if self.paid_amount >= self.total_amount:
            self.status = 'paid'
            if not self.paid_at:
                self.paid_at = timezone.now()
        elif self.paid_amount > 0:
            self.status = 'partially_paid'
        elif self.due_date and timezone.now().date() > self.due_date and self.status not in ['paid', 'cancelled']:
            self.status = 'overdue'
        super().save(*args, **kwargs)
    
    def generate_invoice_number(self):
        """Generate unique invoice number."""
        prefix = getattr(self.tenant, 'invoice_prefix', 'INV')
        date_str = timezone.now().strftime('%Y%m%d')
        tenant_code = self.tenant.slug[:4].upper()
        
        # Get last invoice for this tenant today
        last_inv = CustomerInvoice.objects.filter(
            tenant=self.tenant,
            invoice_number__startswith=f'{prefix}-{tenant_code}-{date_str}'
        ).order_by('-invoice_number').first()
        
        if last_inv:
            try:
                seq = int(last_inv.invoice_number.split('-')[-1]) + 1
            except:
                seq = 1
        else:
            seq = 1
        
        return f'{prefix}-{tenant_code}-{date_str}-{str(seq).zfill(4)}'
    
    def calculate_totals(self):
        """Calculate total amounts from line items."""
        line_items = self.line_items.all()
        self.subtotal = sum(item.line_total for item in line_items)
        
        # Apply discount
        if self.discount_percentage > 0:
            self.discount_amount = (self.subtotal * self.discount_percentage) / Decimal('100.00')
        subtotal_after_discount = self.subtotal - self.discount_amount
        
        # Calculate tax
        if self.tax_rate > 0:
            self.tax_amount = (subtotal_after_discount * self.tax_rate) / Decimal('100.00')
        else:
            self.tax_amount = Decimal('0.00')
        
        self.total_amount = subtotal_after_discount + self.tax_amount
        self.balance_due = self.total_amount - self.paid_amount
        return self.total_amount


class InvoiceLineItem(models.Model):
    """Line items for invoices."""
    invoice = models.ForeignKey(CustomerInvoice, on_delete=models.CASCADE, related_name='line_items')
    item_description = models.CharField(max_length=500, help_text="Item or service description")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'), validators=[MinValueValidator(Decimal('0.01'))])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    line_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    sort_order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'invoice_line_items'
        ordering = ['sort_order', 'id']
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.item_description[:50]}"
    
    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class InvoicePayment(models.Model):
    """Payment records for customer invoices."""
    invoice = models.ForeignKey(CustomerInvoice, on_delete=models.CASCADE, related_name='payments')
    payment_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    payment_method = models.CharField(max_length=50, help_text="Payment method (cash, bank transfer, etc.)")
    reference = models.CharField(max_length=100, blank=True, help_text="Payment reference number")
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invoice_payments_recorded')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'invoice_payments'
        ordering = ['-payment_date', '-created_at']
    
    def __str__(self):
        return f"Payment {self.amount} for {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update invoice paid amount
        self.invoice.paid_amount = sum(p.amount for p in self.invoice.payments.all())
        self.invoice.save()


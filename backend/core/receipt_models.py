"""
Receipt customization and ZIMRA compliance models.
"""
from django.db import models
from django.core.validators import FileExtensionValidator
from core.models import Tenant, Branch


class ReceiptTemplate(models.Model):
    """Receipt template configuration."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='receipt_templates')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True, related_name='receipt_templates')
    
    name = models.CharField(max_length=255, default='Default Receipt')
    is_default = models.BooleanField(default=True)
    
    # Header
    header_text = models.TextField(blank=True, help_text="Custom header text")
    show_logo = models.BooleanField(default=True)
    logo = models.ImageField(
        upload_to='receipts/logos/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['png', 'jpg', 'jpeg'])]
    )
    
    # Company info
    show_company_name = models.BooleanField(default=True)
    show_address = models.BooleanField(default=True)
    show_phone = models.BooleanField(default=True)
    show_email = models.BooleanField(default=False)
    show_vat_number = models.BooleanField(default=True)
    
    # Receipt content
    show_item_description = models.BooleanField(default=True)
    show_item_sku = models.BooleanField(default=False)
    show_item_barcode = models.BooleanField(default=False)
    show_item_tax = models.BooleanField(default=True)
    show_item_discount = models.BooleanField(default=True)
    
    # Footer
    footer_text = models.TextField(
        blank=True,
        default='Thank you for your business!\nNo refunds after 7 days.',
        help_text="Custom footer message"
    )
    show_qr_code = models.BooleanField(default=True, help_text="Show QR code for verification")
    qr_code_data = models.CharField(
        max_length=500,
        blank=True,
        help_text="QR code data template. Use {invoice_number}, {date}, {amount} placeholders"
    )
    
    # ZIMRA Compliance
    show_zimra_info = models.BooleanField(default=True)
    fiscal_number_label = models.CharField(max_length=50, default='Fiscal Invoice No:', blank=True)
    device_code_label = models.CharField(max_length=50, default='Device Code:', blank=True)
    
    # Layout
    receipt_width = models.IntegerField(default=80, help_text="Receipt width in mm")
    font_size = models.IntegerField(default=12, help_text="Base font size in pt")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'receipt_templates'
        ordering = ['-is_default', 'name']
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.name}"


class ReceiptPrintLog(models.Model):
    """Track receipt prints for ZIMRA compliance."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='receipt_prints')
    sale = models.ForeignKey('pos.Sale', on_delete=models.CASCADE, related_name='print_logs')
    
    print_type = models.CharField(
        max_length=20,
        choices=[
            ('original', 'Original'),
            ('duplicate', 'Duplicate'),
            ('reprint', 'Reprint'),
        ],
        default='original'
    )
    
    printed_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='printed_receipts')
    printed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'receipt_print_logs'
        ordering = ['-printed_at']
    
    def __str__(self):
        return f"Receipt print: {self.sale.invoice_number} ({self.print_type})"



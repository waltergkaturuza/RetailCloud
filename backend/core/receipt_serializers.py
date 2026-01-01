"""
Serializers for receipt templates and printing.
"""
from rest_framework import serializers
from .receipt_models import ReceiptTemplate, ReceiptPrintLog


class ReceiptTemplateSerializer(serializers.ModelSerializer):
    """Receipt template serializer."""
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ReceiptTemplate
        fields = [
            'id', 'name', 'is_default',
            'header_text', 'show_logo', 'logo', 'logo_url',
            'show_company_name', 'show_address', 'show_phone', 'show_email', 'show_vat_number',
            'show_item_description', 'show_item_sku', 'show_item_barcode', 'show_item_tax', 'show_item_discount',
            'footer_text', 'show_qr_code', 'qr_code_data',
            'show_zimra_info', 'fiscal_number_label', 'device_code_label',
            'receipt_width', 'font_size',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'logo_url']
    
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
        return None


class ReceiptPrintLogSerializer(serializers.ModelSerializer):
    """Receipt print log serializer."""
    sale_invoice = serializers.CharField(source='sale.invoice_number', read_only=True)
    printed_by_name = serializers.CharField(source='printed_by.get_full_name', read_only=True)
    
    class Meta:
        model = ReceiptPrintLog
        fields = [
            'id', 'sale', 'sale_invoice', 'print_type',
            'printed_by', 'printed_by_name', 'printed_at', 'ip_address'
        ]
        read_only_fields = ['printed_at', 'printed_by']





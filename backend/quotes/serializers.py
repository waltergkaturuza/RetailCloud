"""
Serializers for quotes and invoicing.
"""
from rest_framework import serializers
from .models import Quotation, QuotationLineItem, CustomerInvoice, InvoiceLineItem, InvoicePayment
from customers.serializers import CustomerSerializer
from core.models import Branch


class QuotationLineItemSerializer(serializers.ModelSerializer):
    """Serializer for quotation line items."""
    
    class Meta:
        model = QuotationLineItem
        fields = ['id', 'item_description', 'quantity', 'unit_price', 'line_total', 'sort_order']
        read_only_fields = ['line_total']


class QuotationSerializer(serializers.ModelSerializer):
    """Serializer for quotations."""
    line_items = QuotationLineItemSerializer(many=True, read_only=True)
    customer_detail = CustomerSerializer(source='customer', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Quotation
        fields = [
            'id', 'tenant', 'branch', 'branch_name', 'quotation_number',
            'customer', 'customer_detail', 'quotation_date', 'valid_until',
            'status', 'status_display', 'accepted_at',
            'subtotal', 'tax_rate', 'tax_amount', 'discount_percentage',
            'discount_amount', 'total_amount', 'currency',
            'terms_and_conditions', 'notes', 'internal_notes',
            'invoice', 'line_items',
            'created_by', 'created_by_name', 'updated_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['quotation_number', 'created_at', 'updated_at', 'accepted_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class QuotationCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating quotations with line items."""
    line_items = QuotationLineItemSerializer(many=True)
    
    class Meta:
        model = Quotation
        fields = [
            'branch', 'customer', 'quotation_date', 'valid_until',
            'status', 'tax_rate', 'discount_percentage',
            'terms_and_conditions', 'notes', 'internal_notes',
            'line_items'
        ]
    
    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items')
        tenant = self.context['request'].tenant
        user = self.context['request'].user
        
        quotation = Quotation.objects.create(
            tenant=tenant,
            created_by=user,
            **validated_data
        )
        
        for item_data in line_items_data:
            QuotationLineItem.objects.create(quotation=quotation, **item_data)
        
        quotation.calculate_totals()
        quotation.save()
        
        return quotation
    
    def update(self, instance, validated_data):
        line_items_data = validated_data.pop('line_items', None)
        user = self.context['request'].user
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = user
        instance.save()
        
        if line_items_data is not None:
            # Delete existing line items
            instance.line_items.all().delete()
            # Create new ones
            for item_data in line_items_data:
                QuotationLineItem.objects.create(quotation=instance, **item_data)
        
        instance.calculate_totals()
        instance.save()
        
        return instance


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice line items."""
    
    class Meta:
        model = InvoiceLineItem
        fields = ['id', 'item_description', 'quantity', 'unit_price', 'line_total', 'sort_order']
        read_only_fields = ['line_total']


class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer for invoice payments."""
    recorded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'payment_date', 'amount', 'payment_method',
            'reference', 'notes', 'recorded_by', 'recorded_by_name', 'created_at'
        ]
        read_only_fields = ['created_at', 'recorded_by']
    
    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name() or obj.recorded_by.username
        return None


class CustomerInvoiceSerializer(serializers.ModelSerializer):
    """Serializer for customer invoices."""
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    customer_detail = CustomerSerializer(source='customer', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    quotation_number = serializers.CharField(source='quotation.quotation_number', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = CustomerInvoice
        fields = [
            'id', 'tenant', 'branch', 'branch_name', 'invoice_number',
            'customer', 'customer_detail', 'quotation', 'quotation_number',
            'invoice_date', 'due_date', 'status', 'status_display', 'paid_at',
            'subtotal', 'tax_rate', 'tax_amount', 'discount_percentage',
            'discount_amount', 'total_amount', 'paid_amount', 'balance_due', 'currency',
            'terms_and_conditions', 'notes', 'internal_notes',
            'line_items', 'payments',
            'created_by', 'created_by_name', 'updated_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['invoice_number', 'balance_due', 'created_at', 'updated_at', 'paid_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class CustomerInvoiceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating invoices with line items."""
    line_items = InvoiceLineItemSerializer(many=True)
    
    class Meta:
        model = CustomerInvoice
        fields = [
            'branch', 'customer', 'quotation', 'invoice_date', 'due_date',
            'status', 'tax_rate', 'discount_percentage',
            'terms_and_conditions', 'notes', 'internal_notes',
            'line_items'
        ]
    
    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items')
        tenant = self.context['request'].tenant
        user = self.context['request'].user
        
        invoice = CustomerInvoice.objects.create(
            tenant=tenant,
            created_by=user,
            **validated_data
        )
        
        for item_data in line_items_data:
            InvoiceLineItem.objects.create(invoice=invoice, **item_data)
        
        invoice.calculate_totals()
        invoice.save()
        
        return invoice
    
    def update(self, instance, validated_data):
        line_items_data = validated_data.pop('line_items', None)
        user = self.context['request'].user
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = user
        instance.save()
        
        if line_items_data is not None:
            # Delete existing line items
            instance.line_items.all().delete()
            # Create new ones
            for item_data in line_items_data:
                InvoiceLineItem.objects.create(invoice=instance, **item_data)
        
        instance.calculate_totals()
        instance.save()
        
        return instance


class InvoicePaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invoice payments."""
    
    class Meta:
        model = InvoicePayment
        fields = ['payment_date', 'amount', 'payment_method', 'reference', 'notes']
    
    def create(self, validated_data):
        invoice = self.context['invoice']
        user = self.context['request'].user
        
        payment = InvoicePayment.objects.create(
            invoice=invoice,
            recorded_by=user,
            **validated_data
        )
        
        # Update invoice paid amount (handled by signal or manually)
        invoice.refresh_from_db()
        invoice.save()
        
        return payment


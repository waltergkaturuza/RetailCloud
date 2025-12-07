"""
Purchase management models.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch
from inventory.models import Product, ProductVariant
from suppliers.models import Supplier


class PurchaseOrder(models.Model):
    """Purchase order."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='purchase_orders')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='purchase_orders')
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    
    po_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    
    # Totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('sent', 'Sent'),
            ('partially_received', 'Partially Received'),
            ('received', 'Received'),
            ('cancelled', 'Cancelled'),
        ],
        default='draft'
    )
    
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-date']
    
    def __str__(self):
        return f"PO {self.po_number} - {self.supplier.name}"
    
    def save(self, *args, **kwargs):
        if not self.po_number:
            from django.utils import timezone
            prefix = f"PO-{timezone.now().strftime('%Y%m%d')}"
            last_po = PurchaseOrder.objects.filter(po_number__startswith=prefix).order_by('-id').first()
            if last_po:
                num = int(last_po.po_number.split('-')[-1]) + 1
            else:
                num = 1
            self.po_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)


class PurchaseOrderItem(models.Model):
    """Purchase order items."""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    received_quantity = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'purchase_order_items'
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity} = {self.total}"


class GoodsReceivedNote(models.Model):
    """Goods Received Note."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='grns')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='grns')
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='grns')
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='grns')
    
    grn_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateTimeField(auto_now_add=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'goods_received_notes'
        ordering = ['-date']
    
    def __str__(self):
        return f"GRN {self.grn_number}"
    
    def save(self, *args, **kwargs):
        if not self.grn_number:
            from django.utils import timezone
            prefix = f"GRN-{timezone.now().strftime('%Y%m%d')}"
            last_grn = GoodsReceivedNote.objects.filter(grn_number__startswith=prefix).order_by('-id').first()
            if last_grn:
                num = int(last_grn.grn_number.split('-')[-1]) + 1
            else:
                num = 1
            self.grn_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)


class GRNItem(models.Model):
    """GRN items."""
    grn = models.ForeignKey(GoodsReceivedNote, on_delete=models.CASCADE, related_name='items')
    purchase_order_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.PROTECT)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    
    quantity_received = models.IntegerField(validators=[MinValueValidator(1)])
    batch_number = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'grn_items'
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_received}"


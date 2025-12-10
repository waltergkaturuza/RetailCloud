"""
Return models for sales and purchases.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch
from inventory.models import Product, ProductVariant
from customers.models import Customer
from suppliers.models import Supplier


class SaleReturn(models.Model):
    """Customer return/refund for a sale."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='sale_returns')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='sale_returns')
    sale = models.ForeignKey('Sale', on_delete=models.PROTECT, related_name='returns')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='returns')
    
    return_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateTimeField(auto_now_add=True)
    
    # Reason for return
    return_reason = models.CharField(
        max_length=50,
        choices=[
            ('defective', 'Defective/Damaged Product'),
            ('wrong_item', 'Wrong Item Received'),
            ('not_as_described', 'Not as Described'),
            ('changed_mind', 'Changed Mind'),
            ('duplicate', 'Duplicate Purchase'),
            ('expired', 'Expired Product'),
            ('other', 'Other'),
        ],
        default='other'
    )
    reason_details = models.TextField(blank=True, help_text="Additional details about the return")
    
    # Totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Refund details
    refund_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Cash Refund'),
            ('ecocash', 'EcoCash Refund'),
            ('card', 'Card Refund'),
            ('store_credit', 'Store Credit'),
            ('exchange', 'Exchange Only'),
            ('no_refund', 'No Refund'),
        ],
        default='cash'
    )
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Status and approval
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Approval'),
            ('approved', 'Approved'),
            ('processed', 'Processed'),
            ('rejected', 'Rejected'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    
    # Authorization
    processed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='returns_processed',
        help_text="Cashier who processed the return"
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='returns_approved',
        null=True,
        blank=True,
        help_text="Supervisor who approved the return"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sale_returns'
        ordering = ['-date']
    
    def __str__(self):
        return f"Return {self.return_number} for Sale {self.sale.invoice_number}"
    
    def save(self, *args, **kwargs):
        if not self.return_number:
            from django.utils import timezone
            prefix = f"RET-{timezone.now().strftime('%Y%m%d')}"
            last_return = SaleReturn.objects.filter(return_number__startswith=prefix).order_by('-id').first()
            if last_return:
                num = int(last_return.return_number.split('-')[-1]) + 1
            else:
                num = 1
            self.return_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)


class SaleReturnItem(models.Model):
    """Items in a sale return."""
    sale_return = models.ForeignKey(SaleReturn, on_delete=models.CASCADE, related_name='items')
    sale_item = models.ForeignKey('SaleItem', on_delete=models.PROTECT, related_name='return_items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    
    quantity_returned = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    condition = models.CharField(
        max_length=20,
        choices=[
            ('new', 'New/Unopened'),
            ('opened', 'Opened'),
            ('damaged', 'Damaged'),
            ('defective', 'Defective'),
        ],
        default='new'
    )
    condition_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sale_return_items'
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity_returned}"


class PurchaseReturn(models.Model):
    """Return goods to supplier."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='purchase_returns')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='purchase_returns')
    purchase_order = models.ForeignKey('purchases.PurchaseOrder', on_delete=models.PROTECT, related_name='purchase_returns')
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='returns')
    
    return_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateTimeField(auto_now_add=True)
    
    # Reason for return
    return_reason = models.CharField(
        max_length=50,
        choices=[
            ('defective', 'Defective/Damaged Goods'),
            ('wrong_item', 'Wrong Item Received'),
            ('overstocked', 'Overstocked'),
            ('expired', 'Expired Products'),
            ('quality_issue', 'Quality Issue'),
            ('customer_return', 'Customer Returned to Us'),
            ('other', 'Other'),
        ],
        default='other'
    )
    reason_details = models.TextField(blank=True)
    
    # Totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Status and approval
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Approval'),
            ('approved', 'Approved'),
            ('processed', 'Processed'),
            ('received_by_supplier', 'Received by Supplier'),
            ('rejected', 'Rejected'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    
    # Authorization
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='purchase_returns_created',
        help_text="User who created the return"
    )
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='purchase_returns_approved',
        null=True,
        blank=True,
        help_text="Supervisor who approved the return"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Supplier acknowledgment
    supplier_acknowledged = models.BooleanField(default=False)
    supplier_acknowledged_at = models.DateTimeField(null=True, blank=True)
    supplier_credit_note = models.CharField(max_length=100, blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_returns'
        ordering = ['-date']
    
    def __str__(self):
        return f"Return {self.return_number} for PO {self.purchase_order.po_number}"
    
    def save(self, *args, **kwargs):
        if not self.return_number:
            from django.utils import timezone
            prefix = f"PRET-{timezone.now().strftime('%Y%m%d')}"
            last_return = PurchaseReturn.objects.filter(return_number__startswith=prefix).order_by('-id').first()
            if last_return:
                num = int(last_return.return_number.split('-')[-1]) + 1
            else:
                num = 1
            self.return_number = f"{prefix}-{num:04d}"
        super().save(*args, **kwargs)


class PurchaseReturnItem(models.Model):
    """Items in a purchase return."""
    purchase_return = models.ForeignKey(PurchaseReturn, on_delete=models.CASCADE, related_name='items')
    purchase_order_item = models.ForeignKey('purchases.PurchaseOrderItem', on_delete=models.PROTECT)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    
    quantity_returned = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    condition = models.CharField(
        max_length=20,
        choices=[
            ('new', 'New/Unopened'),
            ('opened', 'Opened'),
            ('damaged', 'Damaged'),
            ('defective', 'Defective'),
            ('expired', 'Expired'),
        ],
        default='new'
    )
    condition_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'purchase_return_items'
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity_returned}"


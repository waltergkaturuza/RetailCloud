"""
Inventory and product management models.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch
from core.managers import tenant_filtered_manager


class Category(models.Model):
    """Product categories."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        unique_together = [['tenant', 'code']] if 'code' else None
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return f"{self.tenant.company_name} - {self.name}"


class Product(models.Model):
    """Product model."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, help_text="Stock Keeping Unit")
    barcode = models.CharField(max_length=100, blank=True, db_index=True)
    rfid_tag = models.CharField(max_length=255, blank=True, db_index=True, help_text="RFID tag identifier")
    description = models.TextField(blank=True)
    
    # Pricing
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Inventory
    track_inventory = models.BooleanField(default=True)
    reorder_level = models.IntegerField(default=10)
    reorder_quantity = models.IntegerField(default=50)
    
    # Attributes
    unit = models.CharField(max_length=20, default='piece', help_text="Unit of measurement")
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    is_taxable = models.BooleanField(default=True)
    allow_negative_stock = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'products'
        unique_together = [['tenant', 'sku']]
        indexes = [
            models.Index(fields=['tenant', 'sku']),
            models.Index(fields=['tenant', 'barcode']),
            models.Index(fields=['tenant', 'rfid_tag']),
            models.Index(fields=['category']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.sku})"
    
    @property
    def current_price(self):
        """Get current selling price (discount or regular)."""
        return self.discount_price if self.discount_price else self.selling_price


class ProductVariant(models.Model):
    """Product variants (size, color, etc.)."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100, help_text="e.g., Small, Red, 500ml")
    sku = models.CharField(max_length=100)
    barcode = models.CharField(max_length=100, blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reorder_level = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'product_variants'
        unique_together = [['product', 'sku']]
    
    def __str__(self):
        return f"{self.product.name} - {self.name}"


class StockLevel(models.Model):
    """Stock levels per branch."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='stock_levels')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stock_levels')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_levels')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, null=True, blank=True, related_name='stock_levels')
    quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0, help_text="Reserved for pending orders")
    last_counted_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'stock_levels'
        unique_together = [['branch', 'product', 'variant']]
        indexes = [
            models.Index(fields=['branch', 'product']),
            models.Index(fields=['tenant', 'product']),
        ]
    
    def __str__(self):
        return f"{self.product.name} @ {self.branch.name}: {self.quantity}"
    
    @property
    def available_quantity(self):
        """Get available quantity (total - reserved)."""
        return self.quantity - self.reserved_quantity
    
    @property
    def is_low_stock(self):
        """Check if stock is below reorder level."""
        try:
            reorder_level = self.variant.reorder_level if self.variant else (self.product.reorder_level if self.product else 10)
            return self.quantity <= reorder_level
        except (AttributeError, TypeError):
            # Fallback if product or variant is missing
            return self.quantity <= 10


class StockMovement(models.Model):
    """Stock movement history."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='stock_movements')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stock_movements')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    movement_type = models.CharField(
        max_length=30,
        choices=[
            ('in', 'Stock In'),
            ('out', 'Stock Out'),
            ('adjustment', 'Adjustment'),
            ('transfer_in', 'Transfer In'),
            ('transfer_out', 'Transfer Out'),
            ('sale', 'Sale'),
            ('return', 'Return'),
            ('return_restored', 'Return Restored to Inventory'),
            ('return_disposed', 'Return Disposed (Damaged)'),
            ('return_to_supplier', 'Return to Supplier'),
            ('purchase_return_disposed', 'Purchase Return Disposed (Cannot Return)'),
        ]
    )
    quantity = models.IntegerField()
    quantity_before = models.IntegerField()
    quantity_after = models.IntegerField()
    reference_type = models.CharField(max_length=50, blank=True, help_text="Sale, Purchase, Adjustment, etc.")
    reference_id = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'stock_movements'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', '-created_at']),
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['branch', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.movement_type}: {self.product.name} - {self.quantity}"


class Batch(models.Model):
    """Batch/expiry tracking (for groceries, pharmacies)."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='batches')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='batches')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField(null=True, blank=True)
    quantity = models.IntegerField()
    remaining_quantity = models.IntegerField()
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    received_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'batches'
        unique_together = [['tenant', 'branch', 'product', 'batch_number']]
    
    def __str__(self):
        return f"{self.product.name} - Batch: {self.batch_number}"
    
    @property
    def is_expired(self):
        """Check if batch is expired."""
        if self.expiry_date:
            from django.utils import timezone
            return timezone.now().date() > self.expiry_date
        return False
    
    @property
    def is_expiring_soon(self):
        """Check if batch expires within 30 days."""
        if self.expiry_date:
            from django.utils import timezone
            from datetime import timedelta
            return self.expiry_date <= (timezone.now().date() + timedelta(days=30))
        return False


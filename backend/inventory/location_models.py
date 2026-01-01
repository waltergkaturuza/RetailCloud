"""
Product Location and Bin Management Models.
Tracks physical locations of products in warehouses/stores.
"""
from django.db import models
from django.core.exceptions import ValidationError
from core.models import Tenant, Branch


class WarehouseZone(models.Model):
    """Zone within a warehouse (e.g., A, B, C, or 'Freezer', 'Refrigerated')."""
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='warehouse_zones')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='warehouse_zones', null=True, blank=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, help_text="Short code like 'A', 'B', 'FREEZER'")
    description = models.TextField(blank=True)
    zone_type = models.CharField(
        max_length=50,
        choices=[
            ('standard', 'Standard'),
            ('refrigerated', 'Refrigerated'),
            ('frozen', 'Frozen'),
            ('hazardous', 'Hazardous'),
            ('bulk', 'Bulk Storage'),
            ('quarantine', 'Quarantine'),
        ],
        default='standard'
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'warehouse_zones'
        unique_together = [['tenant', 'branch', 'code']]
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        branch_name = f" - {self.branch.name}" if self.branch else ""
        return f"{self.code}: {self.name}{branch_name}"


class ProductLocation(models.Model):
    """
    Physical location of a product (shelf, bin, rack position).
    Supports hierarchical locations like: Zone A > Aisle 3 > Shelf 2 > Bin 5
    """
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='product_locations')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='product_locations', null=True, blank=True)
    zone = models.ForeignKey(WarehouseZone, on_delete=models.SET_NULL, null=True, blank=True, related_name='locations')
    
    # Location hierarchy
    location_code = models.CharField(
        max_length=100,
        help_text="Full location code like 'A-3-2-5' or 'AISLE-3-SHELF-2-BIN-5'"
    )
    
    # Hierarchical components (optional, for easier querying)
    aisle = models.CharField(max_length=50, blank=True, help_text="Aisle number or identifier")
    shelf = models.CharField(max_length=50, blank=True, help_text="Shelf number or level")
    bin = models.CharField(max_length=50, blank=True, help_text="Bin or slot number")
    row = models.CharField(max_length=50, blank=True, help_text="Row number")
    level = models.CharField(max_length=50, blank=True, help_text="Level/floor")
    
    # Physical properties
    capacity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum quantity this location can hold"
    )
    
    dimensions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dimensions: {length, width, height, unit}"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_locations'
        unique_together = [['tenant', 'branch', 'location_code']]
        ordering = ['zone', 'location_code']
        indexes = [
            models.Index(fields=['tenant', 'branch', 'location_code']),
            models.Index(fields=['zone', 'location_code']),
        ]
    
    def __str__(self):
        branch_name = f" - {self.branch.name}" if self.branch else ""
        return f"{self.location_code}{branch_name}"
    
    def clean(self):
        """Validate location code format."""
        if not self.location_code:
            raise ValidationError("Location code is required")
        
        # Ensure uniqueness within tenant/branch
        existing = ProductLocation.objects.filter(
            tenant=self.tenant,
            branch=self.branch,
            location_code=self.location_code
        ).exclude(pk=self.pk)
        
        if existing.exists():
            raise ValidationError(f"Location code '{self.location_code}' already exists")


class ProductLocationMapping(models.Model):
    """
    Maps products to their physical locations.
    A product can be in multiple locations, and a location can hold multiple products.
    """
    
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='location_mappings'
    )
    location = models.ForeignKey(
        ProductLocation,
        on_delete=models.CASCADE,
        related_name='product_mappings'
    )
    
    # Quantity stored at this location
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Current quantity at this location"
    )
    
    # Preferred location (primary storage location)
    is_primary = models.BooleanField(
        default=False,
        help_text="Primary/default location for this product"
    )
    
    # Last updated
    last_stocked_at = models.DateTimeField(null=True, blank=True)
    last_picked_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_location_mappings'
        unique_together = [['product', 'location']]
        indexes = [
            models.Index(fields=['product', 'is_primary']),
            models.Index(fields=['location', 'quantity']),
        ]
    
    def __str__(self):
        return f"{self.product.name} @ {self.location.location_code} ({self.quantity})"


class SerialNumberPattern(models.Model):
    """
    Pattern definitions for serial number recognition.
    Used for intelligent bulk serial number capture.
    """
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='serial_patterns')
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='serial_patterns',
        null=True,
        blank=True,
        help_text="Specific product, or null for all products"
    )
    
    name = models.CharField(max_length=100, help_text="Pattern name")
    pattern_type = models.CharField(
        max_length=50,
        choices=[
            ('regex', 'Regular Expression'),
            ('prefix_suffix', 'Prefix + Suffix with Range'),
            ('sequential', 'Sequential Numbers'),
            ('alphanumeric', 'Alphanumeric Pattern'),
        ],
        default='prefix_suffix'
    )
    
    # Pattern definition (varies by type)
    pattern_config = models.JSONField(
        default=dict,
        help_text="Pattern configuration (prefix, suffix, range, regex, etc.)"
    )
    
    # Example: {"prefix": "SN-", "suffix": "", "start": 1000, "end": 9999, "padding": 4}
    # Example: {"regex": "^SN-[0-9]{4}$"}
    
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'serial_number_patterns'
        ordering = ['-is_active', 'name']
    
    def __str__(self):
        product_name = f" - {self.product.name}" if self.product else ""
        return f"{self.name}{product_name}"


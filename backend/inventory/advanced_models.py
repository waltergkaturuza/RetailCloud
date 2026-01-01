"""
Advanced Inventory & Warehouse Management Models
World-class level implementation
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from core.models import Tenant, Branch
from core.managers import tenant_filtered_manager


# ============================================================================
# WAREHOUSE MANAGEMENT SYSTEM (WMS)
# ============================================================================

class Warehouse(models.Model):
    """Warehouse/Location master data."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='warehouses')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='warehouses', null=True, blank=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    warehouse_type = models.CharField(
        max_length=30,
        choices=[
            ('main', 'Main Warehouse'),
            ('distribution', 'Distribution Center'),
            ('transit', 'Transit Warehouse'),
            ('store', 'Store Warehouse'),
            ('virtual', 'Virtual Warehouse'),
        ],
        default='main'
    )
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state_province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    capacity_cubic_meters = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    capacity_units = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'warehouses'
        unique_together = [['tenant', 'code']]
        indexes = [
            models.Index(fields=['tenant', 'code']),
            models.Index(fields=['branch']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class WarehouseLocation(models.Model):
    """Storage location within warehouse (Aisle, Shelf, Bin)."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='warehouse_locations')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='locations')
    location_code = models.CharField(max_length=100, help_text="e.g., A-01-S-02-B-03 (Aisle-Shelf-Bin)")
    aisle = models.CharField(max_length=50, blank=True)
    shelf = models.CharField(max_length=50, blank=True)
    bin = models.CharField(max_length=50, blank=True)
    zone = models.CharField(max_length=50, blank=True, help_text="Zone designation (Receiving, Picking, Storage, etc.)")
    location_type = models.CharField(
        max_length=30,
        choices=[
            ('receiving', 'Receiving'),
            ('picking', 'Picking'),
            ('storage', 'Storage'),
            ('quarantine', 'Quarantine'),
            ('damaged', 'Damaged Goods'),
            ('bulk', 'Bulk Storage'),
            ('cold_storage', 'Cold Storage'),
            ('frozen', 'Frozen Storage'),
        ],
        default='storage'
    )
    max_capacity = models.IntegerField(null=True, blank=True, help_text="Maximum units that can be stored")
    current_capacity = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    allows_mixed_items = models.BooleanField(default=False, help_text="Can store multiple products")
    is_fast_moving = models.BooleanField(default=False, help_text="Optimized for fast-moving items")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'warehouse_locations'
        unique_together = [['warehouse', 'location_code']]
        indexes = [
            models.Index(fields=['warehouse', 'location_code']),
            models.Index(fields=['warehouse', 'zone']),
            models.Index(fields=['tenant', 'location_type']),
        ]
    
    def __str__(self):
        return f"{self.warehouse.code}-{self.location_code}"


class StockLocation(models.Model):
    """Stock allocation to specific warehouse locations."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='stock_locations')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_allocations')
    location = models.ForeignKey(WarehouseLocation, on_delete=models.CASCADE, related_name='stock_items')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stock_locations')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='stock_locations')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(validators=[MinValueValidator(0)])
    reserved_quantity = models.IntegerField(default=0)
    put_away_date = models.DateTimeField(auto_now_add=True)
    last_picked_at = models.DateTimeField(null=True, blank=True)
    last_counted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'stock_locations'
        unique_together = [['location', 'product', 'variant', 'batch']]
        indexes = [
            models.Index(fields=['warehouse', 'location']),
            models.Index(fields=['product', 'warehouse']),
            models.Index(fields=['tenant', 'product']),
        ]
    
    @property
    def available_quantity(self):
        return self.quantity - self.reserved_quantity


class PickList(models.Model):
    """Warehouse picking list for order fulfillment."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='pick_lists')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='pick_lists')
    pick_list_number = models.CharField(max_length=100, unique=True)
    reference_type = models.CharField(
        max_length=50,
        choices=[
            ('sale', 'Sale Order'),
            ('transfer', 'Transfer Order'),
            ('return', 'Return'),
            ('adjustment', 'Adjustment'),
            ('custom', 'Custom'),
        ]
    )
    reference_id = models.CharField(max_length=255)
    status = models.CharField(
        max_length=30,
        choices=[
            ('pending', 'Pending'),
            ('assigned', 'Assigned'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('normal', 'Normal'),
            ('high', 'High'),
            ('urgent', 'Urgent'),
        ],
        default='normal'
    )
    assigned_to = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_pick_lists')
    picking_strategy = models.CharField(
        max_length=30,
        choices=[
            ('fifo', 'First In First Out'),
            ('fefo', 'First Expiry First Out'),
            ('lifo', 'Last In First Out'),
            ('manual', 'Manual Selection'),
        ],
        default='fifo'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_pick_lists')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'pick_lists'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['warehouse', 'status']),
            models.Index(fields=['tenant', '-created_at']),
            models.Index(fields=['assigned_to', 'status']),
        ]
    
    def __str__(self):
        return f"Pick List {self.pick_list_number}"


class PickListItem(models.Model):
    """Items to be picked in a pick list."""
    pick_list = models.ForeignKey(PickList, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    stock_location = models.ForeignKey(StockLocation, on_delete=models.SET_NULL, null=True, blank=True)
    quantity_required = models.IntegerField(validators=[MinValueValidator(1)])
    quantity_picked = models.IntegerField(default=0)
    sequence = models.IntegerField(default=0, help_text="Picking sequence order")
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('picking', 'Picking'),
            ('picked', 'Picked'),
            ('short', 'Short'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    notes = models.TextField(blank=True)
    picked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pick_list_items'
        ordering = ['sequence', 'id']
    
    @property
    def is_complete(self):
        return self.quantity_picked >= self.quantity_required


class PutAway(models.Model):
    """Put-away task for received goods."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='put_aways')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='put_aways')
    put_away_number = models.CharField(max_length=100, unique=True)
    reference_type = models.CharField(max_length=50, help_text="Purchase, Transfer In, etc.")
    reference_id = models.CharField(max_length=255)
    put_away_strategy = models.CharField(
        max_length=30,
        choices=[
            ('fixed', 'Fixed Location'),
            ('random', 'Random Location'),
            ('zone', 'Zone Based'),
            ('closest', 'Closest to Receiving'),
            ('fifo', 'First In First Out'),
            ('fefo', 'First Expiry First Out'),
        ],
        default='random'
    )
    status = models.CharField(
        max_length=30,
        choices=[
            ('pending', 'Pending'),
            ('assigned', 'Assigned'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    assigned_to = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_put_aways')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'put_aways'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Put-Away {self.put_away_number}"


class PutAwayItem(models.Model):
    """Items to be put away."""
    put_away = models.ForeignKey(PutAway, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    suggested_location = models.ForeignKey(WarehouseLocation, on_delete=models.SET_NULL, null=True, blank=True)
    actual_location = models.ForeignKey(WarehouseLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='put_away_items')
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('putting', 'Putting Away'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'put_away_items'


class CycleCount(models.Model):
    """Cycle counting (inventory auditing)."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='cycle_counts')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='cycle_counts')
    count_number = models.CharField(max_length=100, unique=True)
    count_type = models.CharField(
        max_length=30,
        choices=[
            ('full', 'Full Count'),
            ('partial', 'Partial Count'),
            ('spot', 'Spot Check'),
            ('location', 'Location Based'),
            ('category', 'Category Based'),
            ('abc', 'ABC Analysis Based'),
        ]
    )
    count_method = models.CharField(
        max_length=30,
        choices=[
            ('blind', 'Blind Count'),
            ('known', 'Known Count'),
            ('freeze', 'Freeze Count'),
        ],
        default='known'
    )
    status = models.CharField(
        max_length=30,
        choices=[
            ('planned', 'Planned'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('approved', 'Approved'),
            ('cancelled', 'Cancelled'),
        ],
        default='planned'
    )
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_cycle_counts')
    approved_at = models.DateTimeField(null=True, blank=True)
    variance_threshold_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('5.00'), help_text="Acceptable variance percentage")
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_cycle_counts')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'cycle_counts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Cycle Count {self.count_number}"


class CycleCountItem(models.Model):
    """Items counted in cycle count."""
    cycle_count = models.ForeignKey(CycleCount, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    location = models.ForeignKey(WarehouseLocation, on_delete=models.SET_NULL, null=True, blank=True)
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    system_quantity = models.IntegerField(help_text="Quantity according to system")
    counted_quantity = models.IntegerField(null=True, blank=True)
    variance = models.IntegerField(default=0, help_text="counted - system")
    variance_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    is_variance_acceptable = models.BooleanField(default=True)
    counted_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    counted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('counted', 'Counted'),
            ('verified', 'Verified'),
            ('adjusted', 'Adjusted'),
        ],
        default='pending'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cycle_count_items'
    
    def save(self, *args, **kwargs):
        if self.counted_quantity is not None:
            self.variance = self.counted_quantity - self.system_quantity
            if self.system_quantity > 0:
                self.variance_percent = (Decimal(self.variance) / Decimal(self.system_quantity)) * 100
            else:
                self.variance_percent = 100 if self.counted_quantity > 0 else 0
            
            threshold = abs(self.cycle_count.variance_threshold_percent)
            self.is_variance_acceptable = abs(self.variance_percent) <= threshold
        super().save(*args, **kwargs)


class WarehouseTransfer(models.Model):
    """Transfer stock between warehouses/branches."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='warehouse_transfers')
    transfer_number = models.CharField(max_length=100, unique=True)
    from_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='transfers_out')
    to_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='transfers_in')
    from_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='transfers_out', null=True, blank=True)
    to_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='transfers_in', null=True, blank=True)
    transfer_type = models.CharField(
        max_length=30,
        choices=[
            ('warehouse_to_warehouse', 'Warehouse to Warehouse'),
            ('warehouse_to_branch', 'Warehouse to Branch'),
            ('branch_to_warehouse', 'Branch to Warehouse'),
            ('branch_to_branch', 'Branch to Branch'),
        ]
    )
    status = models.CharField(
        max_length=30,
        choices=[
            ('draft', 'Draft'),
            ('requested', 'Requested'),
            ('approved', 'Approved'),
            ('shipped', 'Shipped'),
            ('in_transit', 'In Transit'),
            ('received', 'Received'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ],
        default='draft'
    )
    requested_date = models.DateTimeField(null=True, blank=True)
    approved_date = models.DateTimeField(null=True, blank=True)
    shipped_date = models.DateTimeField(null=True, blank=True)
    received_date = models.DateTimeField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    requested_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='requested_transfers')
    approved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_transfers')
    received_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='received_transfers')
    shipping_method = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'warehouse_transfers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['from_warehouse', 'status']),
            models.Index(fields=['to_warehouse', 'status']),
            models.Index(fields=['tenant', '-created_at']),
        ]
    
    def __str__(self):
        return f"Transfer {self.transfer_number}"


class WarehouseTransferItem(models.Model):
    """Items in a warehouse transfer."""
    transfer = models.ForeignKey(WarehouseTransfer, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    from_location = models.ForeignKey(WarehouseLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfer_out_items')
    to_location = models.ForeignKey(WarehouseLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfer_in_items')
    quantity_requested = models.IntegerField(validators=[MinValueValidator(1)])
    quantity_shipped = models.IntegerField(default=0)
    quantity_received = models.IntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'warehouse_transfer_items'
    
    @property
    def is_fully_shipped(self):
        return self.quantity_shipped >= self.quantity_requested
    
    @property
    def is_fully_received(self):
        return self.quantity_received >= self.quantity_requested


# ============================================================================
# ADVANCED STOCK MANAGEMENT
# ============================================================================

class SafetyStock(models.Model):
    """Safety stock calculations and configurations."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='safety_stocks')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='safety_stocks')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='safety_stocks', null=True, blank=True)
    calculation_method = models.CharField(
        max_length=30,
        choices=[
            ('fixed', 'Fixed Amount'),
            ('days_of_cover', 'Days of Cover'),
            ('statistical', 'Statistical (Std Dev)'),
            ('service_level', 'Service Level Based'),
            ('max_min', 'Max-Min Method'),
        ],
        default='statistical'
    )
    fixed_safety_stock = models.IntegerField(null=True, blank=True)
    days_of_cover = models.IntegerField(null=True, blank=True, help_text="Days of inventory to keep as safety stock")
    service_level_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('95.00'), help_text="Desired service level percentage")
    lead_time_days = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('7.00'))
    average_daily_demand = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    standard_deviation = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    calculated_safety_stock = models.IntegerField(null=True, blank=True)
    current_stock_level = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    last_calculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'safety_stocks'
        unique_together = [['product', 'variant', 'branch']]
        indexes = [
            models.Index(fields=['product', 'branch']),
            models.Index(fields=['tenant', 'product']),
        ]
    
    def __str__(self):
        return f"Safety Stock: {self.product.name}"


class ABCAnalysis(models.Model):
    """ABC/XYZ Analysis for inventory classification."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='abc_analyses')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='abc_analyses')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    analysis_date = models.DateField()
    analysis_type = models.CharField(
        max_length=10,
        choices=[
            ('abc', 'ABC Analysis (Value)'),
            ('xyz', 'XYZ Analysis (Variability)'),
            ('abc_xyz', 'ABC-XYZ Combined'),
        ]
    )
    # ABC Classification (Value-based)
    abc_class = models.CharField(
        max_length=1,
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C')],
        blank=True,
        help_text="A = High Value, B = Medium Value, C = Low Value"
    )
    cumulative_value_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    cumulative_quantity_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    annual_usage_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_usage_quantity = models.IntegerField(null=True, blank=True)
    # XYZ Classification (Variability-based)
    xyz_class = models.CharField(
        max_length=1,
        choices=[('X', 'X'), ('Y', 'Y'), ('Z', 'Z')],
        blank=True,
        help_text="X = Low Variability, Y = Medium Variability, Z = High Variability"
    )
    coefficient_of_variation = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    # Combined classification
    combined_class = models.CharField(max_length=3, blank=True, help_text="e.g., AX, BZ, CY")
    recommendation = models.TextField(blank=True, help_text="Recommended inventory management strategy")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'abc_analyses'
        unique_together = [['product', 'variant', 'analysis_date', 'analysis_type']]
        indexes = [
            models.Index(fields=['tenant', 'analysis_date']),
            models.Index(fields=['abc_class']),
            models.Index(fields=['xyz_class']),
        ]


class DeadStock(models.Model):
    """Dead/slow-moving stock identification."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='dead_stocks')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='dead_stock_analyses')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='dead_stocks', null=True, blank=True)
    analysis_date = models.DateField()
    current_quantity = models.IntegerField()
    current_value = models.DecimalField(max_digits=12, decimal_places=2)
    days_since_last_sale = models.IntegerField(null=True, blank=True)
    days_since_last_movement = models.IntegerField(null=True, blank=True)
    average_days_to_sell = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    projected_sell_through_days = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    classification = models.CharField(
        max_length=30,
        choices=[
            ('active', 'Active'),
            ('slow_moving', 'Slow Moving'),
            ('very_slow', 'Very Slow Moving'),
            ('dead', 'Dead Stock'),
            ('obsolete', 'Obsolete'),
        ]
    )
    recommendation = models.CharField(
        max_length=30,
        choices=[
            ('continue', 'Continue Selling'),
            ('promote', 'Promote/Discount'),
            ('return', 'Return to Supplier'),
            ('donate', 'Donate'),
            ('dispose', 'Dispose'),
            ('liquidate', 'Liquidate'),
        ],
        blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'dead_stocks'
        indexes = [
            models.Index(fields=['tenant', 'classification']),
            models.Index(fields=['analysis_date']),
        ]


class StockAging(models.Model):
    """Stock aging analysis."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='stock_agings')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='stock_agings')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stock_agings', null=True, blank=True)
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    analysis_date = models.DateField()
    total_quantity = models.IntegerField()
    quantity_0_30_days = models.IntegerField(default=0)
    quantity_31_60_days = models.IntegerField(default=0)
    quantity_61_90_days = models.IntegerField(default=0)
    quantity_91_180_days = models.IntegerField(default=0)
    quantity_181_365_days = models.IntegerField(default=0)
    quantity_over_365_days = models.IntegerField(default=0)
    total_value = models.DecimalField(max_digits=12, decimal_places=2)
    value_0_30_days = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    value_31_60_days = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    value_61_90_days = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    value_91_180_days = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    value_181_365_days = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    value_over_365_days = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    oldest_stock_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'stock_agings'
        indexes = [
            models.Index(fields=['tenant', 'analysis_date']),
            models.Index(fields=['product', 'branch']),
        ]


class SupplierPerformance(models.Model):
    """Supplier performance tracking."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='supplier_performances')
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE, related_name='performances')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='supplier_performances', null=True, blank=True)
    analysis_period_start = models.DateField()
    analysis_period_end = models.DateField()
    total_orders = models.IntegerField(default=0)
    total_quantity_ordered = models.IntegerField(default=0)
    total_quantity_received = models.IntegerField(default=0)
    total_value_ordered = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_value_received = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    on_time_deliveries = models.IntegerField(default=0)
    late_deliveries = models.IntegerField(default=0)
    early_deliveries = models.IntegerField(default=0)
    average_lead_time_days = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    on_time_delivery_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Percentage")
    fill_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Percentage of ordered quantity received")
    quality_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="1-10 scale")
    return_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="Percentage of items returned")
    overall_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True, help_text="Overall performance rating")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'supplier_performances'
        indexes = [
            models.Index(fields=['supplier', 'analysis_period_start']),
            models.Index(fields=['tenant', 'analysis_period_end']),
        ]


# ============================================================================
# INVENTORY VALUATION METHODS
# ============================================================================

class InventoryValuation(models.Model):
    """Inventory valuation configuration per product."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='inventory_valuations')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='valuations')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='valuations', null=True, blank=True)
    valuation_method = models.CharField(
        max_length=30,
        choices=[
            ('fifo', 'FIFO (First In First Out)'),
            ('lifo', 'LIFO (Last In First Out)'),
            ('weighted_average', 'Weighted Average'),
            ('specific_identification', 'Specific Identification'),
        ],
        default='fifo'
    )
    current_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Current weighted average cost")
    total_quantity = models.IntegerField(default=0)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    last_valuation_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'inventory_valuations'
        unique_together = [['product', 'variant', 'branch']]
        indexes = [
            models.Index(fields=['product', 'branch']),
            models.Index(fields=['tenant', 'valuation_method']),
        ]
    
    def __str__(self):
        return f"Valuation: {self.product.name} ({self.valuation_method.upper()})"


class CostLayer(models.Model):
    """Cost layers for FIFO/LIFO valuation."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='cost_layers')
    valuation = models.ForeignKey(InventoryValuation, on_delete=models.CASCADE, related_name='cost_layers')
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    receipt_date = models.DateField()
    quantity = models.IntegerField(validators=[MinValueValidator(0)])
    remaining_quantity = models.IntegerField(validators=[MinValueValidator(0)])
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'cost_layers'
        ordering = ['receipt_date', 'id']
        indexes = [
            models.Index(fields=['valuation', 'receipt_date']),
            models.Index(fields=['tenant', 'receipt_date']),
        ]


class CostAdjustment(models.Model):
    """Cost adjustments for inventory."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='cost_adjustments')
    adjustment_number = models.CharField(max_length=100, unique=True)
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='cost_adjustments')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='cost_adjustments', null=True, blank=True)
    adjustment_type = models.CharField(
        max_length=30,
        choices=[
            ('increase', 'Cost Increase'),
            ('decrease', 'Cost Decrease'),
            ('revaluation', 'Revaluation'),
            ('correction', 'Correction'),
        ]
    )
    old_cost = models.DecimalField(max_digits=10, decimal_places=2)
    new_cost = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField()
    adjustment_amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total adjustment value")
    reason = models.TextField()
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id = models.CharField(max_length=255, blank=True)
    approved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_cost_adjustments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'cost_adjustments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Cost Adjustment {self.adjustment_number}"


class InventoryWriteOff(models.Model):
    """Inventory write-offs (losses, damages, obsolescence)."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='inventory_write_offs')
    write_off_number = models.CharField(max_length=100, unique=True)
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='write_offs')
    variant = models.ForeignKey('ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='write_offs', null=True, blank=True)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey(WarehouseLocation, on_delete=models.SET_NULL, null=True, blank=True)
    batch = models.ForeignKey('Batch', on_delete=models.SET_NULL, null=True, blank=True)
    write_off_type = models.CharField(
        max_length=30,
        choices=[
            ('damage', 'Damaged'),
            ('loss', 'Loss/Theft'),
            ('obsolete', 'Obsolete'),
            ('expired', 'Expired'),
            ('quality', 'Quality Issue'),
            ('other', 'Other'),
        ]
    )
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_value = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    approval_status = models.CharField(
        max_length=30,
        choices=[
            ('pending', 'Pending Approval'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    approved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_write_offs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = tenant_filtered_manager()
    
    class Meta:
        db_table = 'inventory_write_offs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Write-Off {self.write_off_number}"


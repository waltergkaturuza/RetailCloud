"""
Warehouse Management System Services
World-class level implementation
"""
from django.db import transaction
from django.db.models import Q, Sum, F, Count
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import random
import string

from .advanced_models import (
    Warehouse, WarehouseLocation, StockLocation, PickList, PickListItem,
    PutAway, PutAwayItem, CycleCount, CycleCountItem, WarehouseTransfer, WarehouseTransferItem
)
from .models import Product, ProductVariant, Batch, StockLevel, StockMovement


class WarehouseLocationService:
    """Service for managing warehouse locations."""
    
    @staticmethod
    def create_location_code(warehouse, aisle=None, shelf=None, bin=None):
        """Generate standardized location code."""
        parts = []
        if aisle:
            parts.append(f"A-{aisle.zfill(2)}")
        if shelf:
            parts.append(f"S-{shelf.zfill(2)}")
        if bin:
            parts.append(f"B-{bin.zfill(2)}")
        
        if parts:
            return "-".join(parts)
        return f"LOC-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"
    
    @staticmethod
    def find_available_location(warehouse, product, quantity, strategy='random'):
        """
        Find available location for put-away.
        Strategies: fixed, random, zone, closest, fifo, fefo
        """
        from .advanced_models import StockLocation
        
        # Get existing locations for this product (fixed strategy)
        if strategy == 'fixed':
            existing = StockLocation.objects.filter(
                warehouse=warehouse,
                product=product,
                location__is_active=True
            ).exclude(location__max_capacity__lt=F('quantity') + quantity).first()
            
            if existing:
                return existing.location
        
        # Find empty or available location
        locations = WarehouseLocation.objects.filter(
            warehouse=warehouse,
            is_active=True,
            location_type='storage'
        ).annotate(
            current_qty=Sum('stock_items__quantity')
        )
        
        # Filter by capacity
        available_locations = locations.filter(
            Q(max_capacity__isnull=True) | 
            Q(max_capacity__gte=F('current_qty') + quantity)
        )
        
        if not available_locations.exists():
            return None
        
        # Apply strategy
        if strategy == 'random':
            return available_locations.order_by('?').first()
        elif strategy == 'zone':
            # Prefer fast-moving zone for fast-moving items
            return available_locations.filter(is_fast_moving=True).first() or available_locations.first()
        elif strategy == 'closest':
            # Prefer locations in picking zone
            return available_locations.filter(zone='picking').first() or available_locations.first()
        elif strategy == 'fifo' or strategy == 'fefo':
            # Prefer locations with existing stock
            return available_locations.order_by('stock_items__put_away_date').first() or available_locations.first()
        
        return available_locations.first()


class PickListService:
    """Service for managing pick lists."""
    
    @staticmethod
    def generate_pick_list_number(warehouse):
        """Generate unique pick list number."""
        date_str = timezone.now().strftime('%Y%m%d')
        count = PickList.objects.filter(
            warehouse=warehouse,
            pick_list_number__startswith=f"PL-{date_str}"
        ).count()
        return f"PL-{date_str}-{str(count + 1).zfill(4)}"
    
    @staticmethod
    @transaction.atomic
    def create_pick_list(warehouse, reference_type, reference_id, items, picking_strategy='fifo', priority='normal', assigned_to=None):
        """Create a new pick list with items."""
        pick_list = PickList.objects.create(
            tenant=warehouse.tenant,
            warehouse=warehouse,
            pick_list_number=PickListService.generate_pick_list_number(warehouse),
            reference_type=reference_type,
            reference_id=reference_id,
            picking_strategy=picking_strategy,
            priority=priority,
            assigned_to=assigned_to,
            status='pending',
            created_by=assigned_to
        )
        
        sequence = 1
        for item_data in items:
            product = item_data['product']
            variant = item_data.get('variant')
            batch = item_data.get('batch')
            quantity = item_data['quantity']
            
            # Find stock locations using picking strategy
            stock_locations = PickListService._find_stock_locations(
                warehouse, product, variant, batch, quantity, picking_strategy
            )
            
            for stock_loc in stock_locations:
                qty_to_pick = min(quantity, stock_loc.available_quantity)
                
                PickListItem.objects.create(
                    pick_list=pick_list,
                    product=product,
                    variant=variant,
                    batch=stock_loc.batch,
                    stock_location=stock_loc,
                    quantity_required=qty_to_pick,
                    sequence=sequence
                )
                
                # Reserve quantity
                stock_loc.reserved_quantity += qty_to_pick
                stock_loc.save()
                
                quantity -= qty_to_pick
                sequence += 1
                
                if quantity <= 0:
                    break
        
        return pick_list
    
    @staticmethod
    def _find_stock_locations(warehouse, product, variant, batch, quantity, strategy):
        """Find stock locations based on picking strategy."""
        query = Q(
            warehouse=warehouse,
            product=product,
            quantity__gt=F('reserved_quantity')
        )
        
        if variant:
            query &= Q(variant=variant)
        if batch:
            query &= Q(batch=batch)
        
        stock_locations = StockLocation.objects.filter(query).annotate(
            available_qty=F('quantity') - F('reserved_quantity')
        ).filter(available_qty__gt=0)
        
        if strategy == 'fifo':
            return stock_locations.order_by('put_away_date')
        elif strategy == 'fefo':
            # First expiry first out
            return stock_locations.select_related('batch').order_by('batch__expiry_date')
        elif strategy == 'lifo':
            return stock_locations.order_by('-put_away_date')
        else:
            return stock_locations
    
    @staticmethod
    @transaction.atomic
    def complete_pick_list_item(item, quantity_picked, user):
        """Complete picking of an item."""
        item.quantity_picked = quantity_picked
        item.status = 'picked' if quantity_picked >= item.quantity_required else 'short'
        item.picked_at = timezone.now()
        item.counted_by = user
        item.save()
        
        # Update stock location
        if item.stock_location:
            item.stock_location.reserved_quantity -= item.quantity_required
            item.stock_location.quantity -= quantity_picked
            item.stock_location.last_picked_at = timezone.now()
            item.stock_location.save()
        
        # Check if all items are picked
        pick_list = item.pick_list
        remaining = pick_list.items.filter(status__in=['pending', 'picking']).count()
        
        if remaining == 0:
            pick_list.status = 'completed'
            pick_list.completed_at = timezone.now()
            pick_list.save()
        
        return item


class PutAwayService:
    """Service for managing put-away operations."""
    
    @staticmethod
    def generate_put_away_number(warehouse):
        """Generate unique put-away number."""
        date_str = timezone.now().strftime('%Y%m%d')
        count = PutAway.objects.filter(
            warehouse=warehouse,
            put_away_number__startswith=f"PA-{date_str}"
        ).count()
        return f"PA-{date_str}-{str(count + 1).zfill(4)}"
    
    @staticmethod
    @transaction.atomic
    def create_put_away(warehouse, reference_type, reference_id, items, strategy='random', assigned_to=None):
        """Create a new put-away task."""
        put_away = PutAway.objects.create(
            tenant=warehouse.tenant,
            warehouse=warehouse,
            put_away_number=PutAwayService.generate_put_away_number(warehouse),
            reference_type=reference_type,
            reference_id=reference_id,
            put_away_strategy=strategy,
            assigned_to=assigned_to,
            status='pending',
            created_by=assigned_to
        )
        
        for item_data in items:
            product = item_data['product']
            variant = item_data.get('variant')
            batch = item_data.get('batch')
            quantity = item_data['quantity']
            
            # Suggest location based on strategy
            suggested_location = WarehouseLocationService.find_available_location(
                warehouse, product, quantity, strategy
            )
            
            PutAwayItem.objects.create(
                put_away=put_away,
                product=product,
                variant=variant,
                batch=batch,
                quantity=quantity,
                suggested_location=suggested_location
            )
        
        return put_away
    
    @staticmethod
    @transaction.atomic
    def complete_put_away_item(item, actual_location, user):
        """Complete putting away an item."""
        if not actual_location:
            actual_location = item.suggested_location
        
        if not actual_location:
            raise ValueError("Location must be specified")
        
        item.actual_location = actual_location
        item.status = 'completed'
        item.completed_at = timezone.now()
        item.save()
        
        # Create or update stock location
        stock_location, created = StockLocation.objects.get_or_create(
            tenant=item.put_away.tenant,
            warehouse=item.put_away.warehouse,
            location=actual_location,
            branch=item.put_away.warehouse.branch,
            product=item.product,
            variant=item.variant,
            batch=item.batch,
            defaults={'quantity': 0}
        )
        
        stock_location.quantity += item.quantity
        stock_location.save()
        
        # Update location capacity
        actual_location.current_capacity = StockLocation.objects.filter(
            location=actual_location
        ).aggregate(total=Sum('quantity'))['total'] or 0
        actual_location.save()
        
        # Check if all items are completed
        put_away = item.put_away
        remaining = put_away.items.filter(status__in=['pending', 'putting']).count()
        
        if remaining == 0:
            put_away.status = 'completed'
            put_away.completed_at = timezone.now()
            put_away.save()
        
        return item


class CycleCountService:
    """Service for managing cycle counts."""
    
    @staticmethod
    def generate_count_number(warehouse):
        """Generate unique cycle count number."""
        date_str = timezone.now().strftime('%Y%m%d')
        count = CycleCount.objects.filter(
            warehouse=warehouse,
            count_number__startswith=f"CC-{date_str}"
        ).count()
        return f"CC-{date_str}-{str(count + 1).zfill(4)}"
    
    @staticmethod
    @transaction.atomic
    def create_cycle_count(warehouse, count_type, count_method='known', items=None, location=None, category=None):
        """Create a new cycle count."""
        cycle_count = CycleCount.objects.create(
            tenant=warehouse.tenant,
            warehouse=warehouse,
            count_number=CycleCountService.generate_count_number(warehouse),
            count_type=count_type,
            count_method=count_method,
            status='planned'
        )
        
        # Generate items based on count type
        if items:
            # Use provided items
            for item_data in items:
                CycleCountItem.objects.create(
                    cycle_count=cycle_count,
                    product=item_data['product'],
                    variant=item_data.get('variant'),
                    location=item_data.get('location'),
                    batch=item_data.get('batch'),
                    system_quantity=item_data.get('system_quantity', 0)
                )
        elif location:
            # Count specific location
            stock_locations = StockLocation.objects.filter(
                warehouse=warehouse,
                location=location
            )
            for stock_loc in stock_locations:
                CycleCountItem.objects.create(
                    cycle_count=cycle_count,
                    product=stock_loc.product,
                    variant=stock_loc.variant,
                    location=location,
                    batch=stock_loc.batch,
                    system_quantity=stock_loc.quantity
                )
        elif category:
            # Count by category
            products = Product.objects.filter(category=category, tenant=warehouse.tenant)
            for product in products:
                stock_locations = StockLocation.objects.filter(
                    warehouse=warehouse,
                    product=product
                )
                for stock_loc in stock_locations:
                    CycleCountItem.objects.create(
                        cycle_count=cycle_count,
                        product=product,
                        variant=stock_loc.variant,
                        location=stock_loc.location,
                        batch=stock_loc.batch,
                        system_quantity=stock_loc.quantity
                    )
        else:
            # Full count
            stock_locations = StockLocation.objects.filter(warehouse=warehouse)
            for stock_loc in stock_locations:
                CycleCountItem.objects.create(
                    cycle_count=cycle_count,
                    product=stock_loc.product,
                    variant=stock_loc.variant,
                    location=stock_loc.location,
                    batch=stock_loc.batch,
                    system_quantity=stock_loc.quantity
                )
        
        return cycle_count
    
    @staticmethod
    @transaction.atomic
    def record_count(item, counted_quantity, user):
        """Record counted quantity for an item."""
        item.counted_quantity = counted_quantity
        item.counted_by = user
        item.counted_at = timezone.now()
        item.status = 'counted'
        item.save()
        
        # Calculate variance (handled by model save method)
        
        return item
    
    @staticmethod
    @transaction.atomic
    def adjust_variance(item, user):
        """Adjust inventory based on variance."""
        if item.counted_quantity is None:
            raise ValueError("Item must be counted first")
        
        variance = item.counted_quantity - item.system_quantity
        
        if variance != 0 and item.location:
            # Update stock location
            stock_location = StockLocation.objects.filter(
                location=item.location,
                product=item.product,
                variant=item.variant,
                batch=item.batch
            ).first()
            
            if stock_location:
                stock_location.quantity = item.counted_quantity
                stock_location.last_counted_at = timezone.now()
                stock_location.save()
                
                # Create stock movement
                from .models import StockMovement
                StockMovement.objects.create(
                    tenant=item.cycle_count.tenant,
                    branch=stock_location.branch,
                    product=item.product,
                    variant=item.variant,
                    movement_type='adjustment',
                    quantity=abs(variance),
                    quantity_before=item.system_quantity,
                    quantity_after=item.counted_quantity,
                    reference_type='Cycle Count',
                    reference_id=item.cycle_count.count_number,
                    notes=f"Cycle count adjustment: {variance:+d}",
                    user=user
                )
        
        item.status = 'adjusted'
        item.save()
        
        return item


class WarehouseTransferService:
    """Service for managing warehouse transfers."""
    
    @staticmethod
    def generate_transfer_number(tenant):
        """Generate unique transfer number."""
        date_str = timezone.now().strftime('%Y%m%d')
        count = WarehouseTransfer.objects.filter(
            tenant=tenant,
            transfer_number__startswith=f"TRF-{date_str}"
        ).count()
        return f"TRF-{date_str}-{str(count + 1).zfill(4)}"
    
    @staticmethod
    @transaction.atomic
    def create_transfer(from_warehouse, to_warehouse, items, transfer_type='warehouse_to_warehouse', requested_by=None):
        """Create a new warehouse transfer."""
        # Determine branches
        from_branch = from_warehouse.branch
        to_branch = to_warehouse.branch
        
        transfer = WarehouseTransfer.objects.create(
            tenant=from_warehouse.tenant,
            transfer_number=WarehouseTransferService.generate_transfer_number(from_warehouse.tenant),
            from_warehouse=from_warehouse,
            to_warehouse=to_warehouse,
            from_branch=from_branch,
            to_branch=to_branch,
            transfer_type=transfer_type,
            status='draft',
            requested_by=requested_by
        )
        
        for item_data in items:
            product = item_data['product']
            variant = item_data.get('variant')
            batch = item_data.get('batch')
            quantity = item_data['quantity']
            
            # Find stock location
            stock_location = StockLocation.objects.filter(
                warehouse=from_warehouse,
                product=product,
                variant=variant,
                batch=batch
            ).first()
            
            WarehouseTransferItem.objects.create(
                transfer=transfer,
                product=product,
                variant=variant,
                batch=batch,
                from_location=stock_location.location if stock_location else None,
                quantity_requested=quantity,
                unit_cost=item_data.get('unit_cost')
            )
        
        return transfer
    
    @staticmethod
    @transaction.atomic
    def ship_transfer(transfer, user, tracking_number=None, shipping_method=None):
        """Ship transfer (remove stock from source warehouse)."""
        transfer.status = 'shipped'
        transfer.shipped_date = timezone.now()
        transfer.tracking_number = tracking_number or ''
        transfer.shipping_method = shipping_method or ''
        transfer.save()
        
        # Process items
        for item in transfer.items.all():
            # Find and update stock location
            if item.from_location:
                stock_location = StockLocation.objects.filter(
                    warehouse=transfer.from_warehouse,
                    location=item.from_location,
                    product=item.product,
                    variant=item.variant,
                    batch=item.batch
                ).first()
                
                if stock_location:
                    shipped_qty = min(item.quantity_requested, stock_location.quantity)
                    stock_location.quantity -= shipped_qty
                    stock_location.save()
                    
                    item.quantity_shipped = shipped_qty
                    item.save()
                    
                    # Create stock movement
                    from .models import StockMovement
                    StockMovement.objects.create(
                        tenant=transfer.tenant,
                        branch=transfer.from_branch,
                        product=item.product,
                        variant=item.variant,
                        movement_type='transfer_out',
                        quantity=shipped_qty,
                        quantity_before=stock_location.quantity + shipped_qty,
                        quantity_after=stock_location.quantity,
                        reference_type='Transfer',
                        reference_id=transfer.transfer_number,
                        notes=f"Transfer to {transfer.to_warehouse.name}",
                        user=user
                    )
        
        return transfer
    
    @staticmethod
    @transaction.atomic
    def receive_transfer(transfer, user, received_items=None):
        """Receive transfer (add stock to destination warehouse)."""
        transfer.status = 'received'
        transfer.received_date = timezone.now()
        transfer.received_by = user
        transfer.save()
        
        # Process items
        for item in transfer.items.all():
            received_qty = item.quantity_shipped
            
            if received_items:
                # Use specified quantities
                item_data = next((i for i in received_items if i.get('item_id') == item.id), None)
                if item_data:
                    received_qty = item_data.get('quantity', item.quantity_shipped)
                    to_location_id = item_data.get('to_location_id')
                    if to_location_id:
                        item.to_location_id = to_location_id
            
            # Put away to location
            if not item.to_location:
                # Auto-assign location
                suggested_location = WarehouseLocationService.find_available_location(
                    transfer.to_warehouse, item.product, received_qty, 'random'
                )
                item.to_location = suggested_location
            
            if item.to_location:
                # Create or update stock location
                stock_location, created = StockLocation.objects.get_or_create(
                    tenant=transfer.tenant,
                    warehouse=transfer.to_warehouse,
                    location=item.to_location,
                    branch=transfer.to_branch,
                    product=item.product,
                    variant=item.variant,
                    batch=item.batch,
                    defaults={'quantity': 0}
                )
                
                stock_location.quantity += received_qty
                stock_location.save()
                
                # Create stock movement
                from .models import StockMovement
                StockMovement.objects.create(
                    tenant=transfer.tenant,
                    branch=transfer.to_branch,
                    product=item.product,
                    variant=item.variant,
                    movement_type='transfer_in',
                    quantity=received_qty,
                    quantity_before=stock_location.quantity - received_qty,
                    quantity_after=stock_location.quantity,
                    reference_type='Transfer',
                    reference_id=transfer.transfer_number,
                    notes=f"Transfer from {transfer.from_warehouse.name}",
                    user=user
                )
            
            item.quantity_received = received_qty
            item.save()
        
        # Check if all items received
        all_received = all(item.quantity_received >= item.quantity_shipped for item in transfer.items.all())
        if all_received:
            transfer.status = 'completed'
            transfer.completed_date = timezone.now()
            transfer.save()
        
        return transfer



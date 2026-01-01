"""
Inventory Valuation Service
FIFO, LIFO, and Weighted Average calculations
"""
from django.db.models import Sum, Avg
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from .advanced_models import InventoryValuation, CostLayer, CostAdjustment
from .models import Product, ProductVariant, Batch, StockMovement, StockLevel


class ValuationService:
    """Service for inventory valuation calculations."""
    
    @staticmethod
    @transaction.atomic
    def update_fifo_valuation(product, branch, variant=None, quantity_in=None, unit_cost=None):
        """Update FIFO valuation when stock is received."""
        valuation, created = InventoryValuation.objects.get_or_create(
            tenant=product.tenant,
            product=product,
            variant=variant,
            branch=branch,
            defaults={'valuation_method': 'fifo'}
        )
        
        if quantity_in and unit_cost:
            # Add new cost layer
            CostLayer.objects.create(
                tenant=product.tenant,
                valuation=valuation,
                receipt_date=timezone.now().date(),
                quantity=quantity_in,
                remaining_quantity=quantity_in,
                unit_cost=unit_cost,
                total_cost=Decimal(quantity_in) * unit_cost
            )
            
            # Update valuation totals
            layers = CostLayer.objects.filter(valuation=valuation, remaining_quantity__gt=0)
            valuation.total_quantity = sum(layer.remaining_quantity for layer in layers)
            valuation.total_value = sum(layer.remaining_quantity * layer.unit_cost for layer in layers)
            
            if valuation.total_quantity > 0:
                valuation.current_cost = valuation.total_value / Decimal(valuation.total_quantity)
            
            valuation.last_valuation_date = timezone.now()
            valuation.save()
        
        return valuation
    
    @staticmethod
    @transaction.atomic
    def consume_fifo_layers(valuation, quantity_out):
        """Consume stock using FIFO method."""
        remaining_to_consume = quantity_out
        total_cost = Decimal('0.00')
        
        # Get layers in FIFO order (oldest first)
        layers = CostLayer.objects.filter(
            valuation=valuation,
            remaining_quantity__gt=0
        ).order_by('receipt_date', 'id')
        
        for layer in layers:
            if remaining_to_consume <= 0:
                break
            
            consume_qty = min(remaining_to_consume, layer.remaining_quantity)
            cost = consume_qty * layer.unit_cost
            total_cost += cost
            
            layer.remaining_quantity -= consume_qty
            layer.save()
            
            remaining_to_consume -= consume_qty
        
        # Update valuation totals
        layers = CostLayer.objects.filter(valuation=valuation, remaining_quantity__gt=0)
        valuation.total_quantity = sum(layer.remaining_quantity for layer in layers)
        valuation.total_value = sum(layer.remaining_quantity * layer.unit_cost for layer in layers)
        
        if valuation.total_quantity > 0:
            valuation.current_cost = valuation.total_value / Decimal(valuation.total_quantity)
        else:
            valuation.current_cost = Decimal('0.00')
        
        valuation.last_valuation_date = timezone.now()
        valuation.save()
        
        return total_cost
    
    @staticmethod
    @transaction.atomic
    def update_lifo_valuation(product, branch, variant=None, quantity_in=None, unit_cost=None):
        """Update LIFO valuation when stock is received."""
        valuation, created = InventoryValuation.objects.get_or_create(
            tenant=product.tenant,
            product=product,
            variant=variant,
            branch=branch,
            defaults={'valuation_method': 'lifo'}
        )
        
        if quantity_in and unit_cost:
            # Add new cost layer (LIFO uses same structure, just consumed in reverse)
            CostLayer.objects.create(
                tenant=product.tenant,
                valuation=valuation,
                receipt_date=timezone.now().date(),
                quantity=quantity_in,
                remaining_quantity=quantity_in,
                unit_cost=unit_cost,
                total_cost=Decimal(quantity_in) * unit_cost
            )
            
            # Update totals (same as FIFO for receiving)
            layers = CostLayer.objects.filter(valuation=valuation, remaining_quantity__gt=0)
            valuation.total_quantity = sum(layer.remaining_quantity for layer in layers)
            valuation.total_value = sum(layer.remaining_quantity * layer.unit_cost for layer in layers)
            
            if valuation.total_quantity > 0:
                valuation.current_cost = valuation.total_value / Decimal(valuation.total_quantity)
            
            valuation.last_valuation_date = timezone.now()
            valuation.save()
        
        return valuation
    
    @staticmethod
    @transaction.atomic
    def consume_lifo_layers(valuation, quantity_out):
        """Consume stock using LIFO method (newest first)."""
        remaining_to_consume = quantity_out
        total_cost = Decimal('0.00')
        
        # Get layers in LIFO order (newest first)
        layers = CostLayer.objects.filter(
            valuation=valuation,
            remaining_quantity__gt=0
        ).order_by('-receipt_date', '-id')
        
        for layer in layers:
            if remaining_to_consume <= 0:
                break
            
            consume_qty = min(remaining_to_consume, layer.remaining_quantity)
            cost = consume_qty * layer.unit_cost
            total_cost += cost
            
            layer.remaining_quantity -= consume_qty
            layer.save()
            
            remaining_to_consume -= consume_qty
        
        # Update valuation totals
        layers = CostLayer.objects.filter(valuation=valuation, remaining_quantity__gt=0)
        valuation.total_quantity = sum(layer.remaining_quantity for layer in layers)
        valuation.total_value = sum(layer.remaining_quantity * layer.unit_cost for layer in layers)
        
        if valuation.total_quantity > 0:
            valuation.current_cost = valuation.total_value / Decimal(valuation.total_quantity)
        else:
            valuation.current_cost = Decimal('0.00')
        
        valuation.last_valuation_date = timezone.now()
        valuation.save()
        
        return total_cost
    
    @staticmethod
    @transaction.atomic
    def update_weighted_average_valuation(product, branch, variant=None, quantity_in=None, unit_cost=None, quantity_out=None):
        """Update weighted average valuation."""
        valuation, created = InventoryValuation.objects.get_or_create(
            tenant=product.tenant,
            product=product,
            variant=variant,
            branch=branch,
            defaults={'valuation_method': 'weighted_average'}
        )
        
        # Calculate new weighted average
        if quantity_in and unit_cost:
            # Receiving stock
            current_qty = valuation.total_quantity
            current_value = valuation.total_value
            new_qty = quantity_in
            new_value = Decimal(quantity_in) * unit_cost
            
            total_qty = current_qty + new_qty
            total_value = current_value + new_value
            
            if total_qty > 0:
                new_average_cost = total_value / Decimal(total_qty)
                
                valuation.total_quantity = total_qty
                valuation.total_value = total_value
                valuation.current_cost = new_average_cost
            else:
                valuation.current_cost = unit_cost
            
        elif quantity_out:
            # Selling stock - use current weighted average cost
            if valuation.total_quantity > 0:
                cost_per_unit = valuation.current_cost
                valuation.total_quantity -= quantity_out
                valuation.total_value = valuation.total_quantity * cost_per_unit
                
                if valuation.total_quantity <= 0:
                    valuation.total_quantity = 0
                    valuation.total_value = Decimal('0.00')
                    valuation.current_cost = Decimal('0.00')
        
        valuation.last_valuation_date = timezone.now()
        valuation.save()
        
        return valuation
    
    @staticmethod
    def get_valuation_cost(valuation, quantity):
        """Get cost for a quantity using the valuation method."""
        if valuation.valuation_method == 'fifo':
            # Calculate what the cost would be
            layers = CostLayer.objects.filter(
                valuation=valuation,
                remaining_quantity__gt=0
            ).order_by('receipt_date', 'id')
            
            total_cost = Decimal('0.00')
            remaining = quantity
            
            for layer in layers:
                if remaining <= 0:
                    break
                consume = min(remaining, layer.remaining_quantity)
                total_cost += consume * layer.unit_cost
                remaining -= consume
            
            return total_cost if quantity > 0 else Decimal('0.00')
            
        elif valuation.valuation_method == 'lifo':
            layers = CostLayer.objects.filter(
                valuation=valuation,
                remaining_quantity__gt=0
            ).order_by('-receipt_date', '-id')
            
            total_cost = Decimal('0.00')
            remaining = quantity
            
            for layer in layers:
                if remaining <= 0:
                    break
                consume = min(remaining, layer.remaining_quantity)
                total_cost += consume * layer.unit_cost
                remaining -= consume
            
            return total_cost if quantity > 0 else Decimal('0.00')
            
        else:  # weighted_average
            return quantity * valuation.current_cost if valuation.current_cost else Decimal('0.00')



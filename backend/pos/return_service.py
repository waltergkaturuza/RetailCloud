"""
Intelligent Returns Processing Service
Handles condition-based inventory restoration, financial impact, and write-offs.
"""
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from typing import Dict, List, Optional

from .return_models import SaleReturn, SaleReturnItem, PurchaseReturn, PurchaseReturnItem
from .till_models import TillFloat, CashTransaction
from inventory.models import StockLevel, StockMovement, Product
from .models import Sale, SaleItem


class ReturnProcessingService:
    """Service for intelligent return processing."""
    
    # Conditions that should NOT restore inventory
    NON_RESTORABLE_CONDITIONS = ['damaged', 'defective', 'expired']
    
    # Conditions that CAN restore inventory
    RESTORABLE_CONDITIONS = ['new', 'opened']
    
    @staticmethod
    def can_restore_to_inventory(condition: str) -> bool:
        """Check if goods in this condition can be restored to inventory."""
        return condition in ReturnProcessingService.RESTORABLE_CONDITIONS
    
    @staticmethod
    @transaction.atomic
    def process_sale_return(sale_return: SaleReturn, till_float_id: Optional[int] = None) -> Dict:
        """
        Process a sale return intelligently:
        - Check condition of returned items
        - Restore inventory only if condition allows
        - Process refunds and track cash
        - Calculate financial impact (loss on damaged goods)
        """
        if sale_return.status not in ['approved', 'pending']:
            raise ValueError(f"Cannot process return with status {sale_return.status}")
        
        results = {
            'inventory_restored': 0,
            'inventory_damaged': 0,
            'total_refund': Decimal('0.00'),
            'write_off_amount': Decimal('0.00'),
            'cogs_reversed': Decimal('0.00'),
            'profit_loss_impact': Decimal('0.00'),
            'items_processed': []
        }
        
        # Process each returned item
        for return_item in sale_return.items.all():
            item_result = ReturnProcessingService._process_sale_return_item(
                sale_return, return_item, till_float_id
            )
            results['items_processed'].append(item_result)
            results['inventory_restored'] += item_result['quantity_restored']
            results['inventory_damaged'] += item_result['quantity_damaged']
            results['total_refund'] += item_result['refund_amount']
            results['write_off_amount'] += item_result['write_off_amount']
            results['cogs_reversed'] += item_result['cogs_reversed']
            results['profit_loss_impact'] += item_result['profit_loss_impact']
        
        # Process refund payment if applicable
        if sale_return.refund_method != 'no_refund' and sale_return.refund_method != 'exchange':
            ReturnProcessingService._process_refund_payment(
                sale_return, till_float_id
            )
        
        # Update return status
        sale_return.status = 'processed'
        sale_return.save()
        
        # Update sale status if fully returned
        ReturnProcessingService._update_sale_status(sale_return)
        
        return results
    
    @staticmethod
    def _process_sale_return_item(
        sale_return: SaleReturn,
        return_item: SaleReturnItem,
        till_float_id: Optional[int]
    ) -> Dict:
        """Process a single sale return item."""
        result = {
            'product_id': return_item.product.id,
            'product_name': return_item.product.name,
            'quantity_returned': return_item.quantity_returned,
            'condition': return_item.condition,
            'quantity_restored': 0,
            'quantity_damaged': 0,
            'refund_amount': return_item.total,
            'write_off_amount': Decimal('0.00'),
            'cogs_reversed': Decimal('0.00'),
            'profit_loss_impact': Decimal('0.00'),
        }
        
        # Get original sale item to calculate COGS
        sale_item = return_item.sale_item
        cost_per_unit = sale_item.product.cost_price or Decimal('0.00')
        selling_price_per_unit = sale_item.unit_price
        
        # Check if condition allows inventory restoration
        if ReturnProcessingService.can_restore_to_inventory(return_item.condition):
            # Restore to inventory
            stock_level = StockLevel.objects.filter(
                tenant=sale_return.tenant,
                branch=sale_return.branch,
                product=return_item.product
            ).first()
            
            if stock_level:
                stock_level.quantity += return_item.quantity_returned
                stock_level.save()
                result['quantity_restored'] = return_item.quantity_returned
                
                # Create stock movement record
                stock_level_before = stock_level.quantity - return_item.quantity_returned
                StockMovement.objects.create(
                    tenant=sale_return.tenant,
                    branch=sale_return.branch,
                    product=return_item.product,
                    movement_type='return_restored',
                    quantity=return_item.quantity_returned,
                    quantity_before=stock_level_before,
                    quantity_after=stock_level.quantity,
                    reference_type='SaleReturn',
                    reference_id=str(sale_return.id),
                    notes=f"Customer return (restored) - Condition: {return_item.condition} - {sale_return.return_number}",
                    user=sale_return.processed_by
                )
                
                # Reverse COGS (cost was already accounted for in original sale)
                cogs_reversed = cost_per_unit * Decimal(str(return_item.quantity_returned))
                result['cogs_reversed'] = cogs_reversed
                # Profit impact: we get back the cost but lose the revenue
                # Net impact = -(revenue - cost) = -(profit)
                profit_loss = (selling_price_per_unit - cost_per_unit) * Decimal(str(return_item.quantity_returned))
                result['profit_loss_impact'] = -profit_loss  # Negative = loss
                
        else:
            # Damaged/defective/expired - cannot restore
            result['quantity_damaged'] = return_item.quantity_returned
            
            # Create write-off/disposal record
            stock_level = StockLevel.objects.filter(
                tenant=sale_return.tenant,
                branch=sale_return.branch,
                product=return_item.product
            ).first()
            qty_before = stock_level.quantity if stock_level else 0
            StockMovement.objects.create(
                tenant=sale_return.tenant,
                branch=sale_return.branch,
                product=return_item.product,
                movement_type='return_disposed',
                quantity=0,  # No quantity change (already out of stock)
                quantity_before=qty_before,
                quantity_after=qty_before,
                reference_type='SaleReturn',
                reference_id=str(sale_return.id),
                notes=f"Customer return (DISPOSED) - Condition: {return_item.condition} - {return_item.condition_notes} - {sale_return.return_number}",
                user=sale_return.processed_by
            )
            
            # Calculate write-off (cost of goods lost)
            write_off = cost_per_unit * Decimal(str(return_item.quantity_returned))
            result['write_off_amount'] = write_off
            
            # Financial impact: Lost revenue + lost cost = total loss
            # Revenue already lost (refund given), cost also lost (cannot recover)
            revenue_loss = selling_price_per_unit * Decimal(str(return_item.quantity_returned))
            cost_loss = write_off
            result['profit_loss_impact'] = -(revenue_loss + cost_loss)  # Total loss
        
        return result
    
    @staticmethod
    def _process_refund_payment(
        sale_return: SaleReturn,
        till_float_id: Optional[int]
    ):
        """Process refund payment and track in cash transactions."""
        if sale_return.refund_method == 'store_credit':
            # No cash transaction needed for store credit
            return
        
        # Get or find till float
        till_float = None
        if till_float_id:
            try:
                till_float = TillFloat.objects.get(id=till_float_id, status='open')
            except TillFloat.DoesNotExist:
                pass
        
        # If no till float specified, try to find current one
        if not till_float:
            till_float = TillFloat.objects.filter(
                tenant=sale_return.tenant,
                branch=sale_return.branch,
                cashier=sale_return.processed_by,
                shift_date=timezone.now().date(),
                status='open'
            ).first()
        
        # Determine currency from original sale
        currency = sale_return.sale.currency if hasattr(sale_return.sale, 'currency') else 'USD'
        
        # Create cash transaction for refund
        transaction_type = 'cash_out'
        if sale_return.refund_method == 'cash':
            transaction_type = 'cash_out'
        elif sale_return.refund_method in ['ecocash', 'card']:
            # Mobile money and card refunds may not directly affect cash float
            # but we still track them
            transaction_type = 'cash_out'
        
        CashTransaction.objects.create(
            tenant=sale_return.tenant,
            branch=sale_return.branch,
            till_float=till_float,
            transaction_type=transaction_type,
            currency=currency,
            amount=sale_return.refund_amount,
            reason=f"Refund for Return {sale_return.return_number}",
            reference=sale_return.return_number,
            notes=f"Return reason: {sale_return.return_reason}. Method: {sale_return.refund_method}",
            created_by=sale_return.processed_by,
            requires_approval=sale_return.refund_amount > Decimal('100.00')  # Large refunds need approval
        )
    
    @staticmethod
    def _update_sale_status(sale_return: SaleReturn):
        """Update sale status if all items are returned."""
        sale = sale_return.sale
        
        # Calculate total returned vs total sold
        total_returned = sum(
            item.quantity_returned for item in sale_return.items.all()
        )
        total_sold = sum(
            item.quantity for item in sale.items.all()
        )
        
        if total_returned >= total_sold:
            sale.status = 'returned'
            sale.save()
    
    @staticmethod
    @transaction.atomic
    def process_purchase_return(
        purchase_return: PurchaseReturn,
        can_return_to_supplier: bool = True
    ) -> Dict:
        """
        Process a purchase return:
        - Remove from inventory
        - Track supplier acknowledgment
        - Handle cases where goods cannot be returned to supplier (write-off)
        """
        if purchase_return.status not in ['approved', 'pending']:
            raise ValueError(f"Cannot process return with status {purchase_return.status}")
        
        results = {
            'inventory_removed': 0,
            'total_return_value': Decimal('0.00'),
            'write_off_amount': Decimal('0.00'),
            'can_return_to_supplier': can_return_to_supplier,
            'items_processed': []
        }
        
        # Process each returned item
        for return_item in purchase_return.items.all():
            item_result = ReturnProcessingService._process_purchase_return_item(
                purchase_return, return_item, can_return_to_supplier
            )
            results['items_processed'].append(item_result)
            results['inventory_removed'] += item_result['quantity_removed']
            results['total_return_value'] += item_result['return_value']
            results['write_off_amount'] += item_result['write_off_amount']
        
        # Update return status
        if can_return_to_supplier:
            purchase_return.status = 'processed'
        else:
            # Cannot return to supplier - mark as written off
            purchase_return.status = 'processed'
            purchase_return.notes += f"\n[WRITE-OFF] Goods cannot be returned to supplier. Total write-off: ${results['write_off_amount']}"
        
        purchase_return.save()
        
        return results
    
    @staticmethod
    def _process_purchase_return_item(
        purchase_return: PurchaseReturn,
        return_item: PurchaseReturnItem,
        can_return_to_supplier: bool
    ) -> Dict:
        """Process a single purchase return item."""
        result = {
            'product_id': return_item.product.id,
            'product_name': return_item.product.name,
            'quantity_returned': return_item.quantity_returned,
            'condition': return_item.condition,
            'quantity_removed': 0,
            'return_value': return_item.total,
            'write_off_amount': Decimal('0.00'),
        }
        
        # Remove from inventory
        stock_level = StockLevel.objects.filter(
            tenant=purchase_return.tenant,
            branch=purchase_return.branch,
            product=return_item.product
        ).first()
        
        if stock_level:
            quantity_to_remove = min(
                return_item.quantity_returned,
                stock_level.quantity
            )
            stock_level.quantity -= quantity_to_remove
            if stock_level.quantity < 0:
                stock_level.quantity = 0
            stock_level.save()
            result['quantity_removed'] = quantity_to_remove
        
        # Create stock movement record
        if can_return_to_supplier:
            movement_type = 'return_to_supplier'
            movement_notes = f"Return to supplier - {purchase_return.return_reason}"
        else:
            movement_type = 'purchase_return_disposed'
            movement_notes = f"Return to supplier - CANNOT RETURN (WRITE-OFF) - {purchase_return.return_reason}"
            # Calculate write-off (cost of goods we paid for but cannot recover)
            cost_per_unit = return_item.unit_price
            result['write_off_amount'] = cost_per_unit * Decimal(str(return_item.quantity_returned))
        
        stock_level_after = stock_level.quantity if stock_level else 0
        stock_level_before = stock_level_after + return_item.quantity_returned
        StockMovement.objects.create(
            tenant=purchase_return.tenant,
            branch=purchase_return.branch,
            product=return_item.product,
            movement_type=movement_type,
            quantity=-return_item.quantity_returned,
            quantity_before=stock_level_before,
            quantity_after=stock_level_after,
            reference_type='PurchaseReturn',
            reference_id=str(purchase_return.id),
            notes=f"{movement_notes} - {purchase_return.return_number}",
            user=purchase_return.created_by
        )
        
        return result
    
    @staticmethod
    def get_return_financial_summary(sale_return: SaleReturn) -> Dict:
        """Get financial summary of a sale return."""
        summary = {
            'total_refund': sale_return.refund_amount,
            'total_cost_impact': Decimal('0.00'),
            'total_write_off': Decimal('0.00'),
            'net_loss': Decimal('0.00'),
            'items': []
        }
        
        for return_item in sale_return.items.all():
            cost_per_unit = return_item.product.cost_price or Decimal('0.00')
            selling_price = return_item.unit_price
            
            item_summary = {
                'product': return_item.product.name,
                'quantity': return_item.quantity_returned,
                'condition': return_item.condition,
                'refund_amount': return_item.total,
                'cost_impact': Decimal('0.00'),
                'write_off': Decimal('0.00'),
                'can_restore': ReturnProcessingService.can_restore_to_inventory(return_item.condition)
            }
            
            if ReturnProcessingService.can_restore_to_inventory(return_item.condition):
                # Cost can be recovered (inventory restored)
                item_summary['cost_impact'] = cost_per_unit * Decimal(str(return_item.quantity_returned))
            else:
                # Cost cannot be recovered (write-off)
                item_summary['write_off'] = cost_per_unit * Decimal(str(return_item.quantity_returned))
                summary['total_write_off'] += item_summary['write_off']
            
            summary['items'].append(item_summary)
            summary['total_cost_impact'] += item_summary['cost_impact']
        
        # Net loss = refund given + write-off (if any)
        summary['net_loss'] = summary['total_refund'] + summary['total_write_off']
        
        return summary


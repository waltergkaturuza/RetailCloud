"""
Views for handling returns.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal

from core.utils import get_tenant_from_request
from .return_models import SaleReturn, SaleReturnItem, PurchaseReturn, PurchaseReturnItem
from .return_serializers import (
    SaleReturnSerializer, SaleReturnItemSerializer,
    PurchaseReturnSerializer, PurchaseReturnItemSerializer
)
from .models import Sale, SaleItem
from inventory.models import StockLevel, StockMovement
from purchases.models import PurchaseOrderItem
from .return_service import ReturnProcessingService


class SaleReturnViewSet(viewsets.ModelViewSet):
    """ViewSet for managing sale returns."""
    serializer_class = SaleReturnSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = SaleReturn.objects.select_related(
            'tenant', 'branch', 'sale', 'customer', 'processed_by', 'approved_by'
        ).all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset.order_by('-date')
    
    def get_serializer_context(self):
        """Add request and tenant to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        tenant = get_tenant_from_request(self.request)
        if tenant:
            context['tenant'] = tenant
            self.request.tenant = tenant
        return context
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a sale return."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions - cashiers and supervisors can create returns
        user_role = request.user.role
        if user_role not in ['cashier', 'supervisor', 'tenant_admin', 'super_admin', 'manager']:
            return Response(
                {'error': 'You do not have permission to create returns.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data.copy()
        sale_id = data.get('sale')
        items_data = data.get('items', [])
        
        # Validate sale exists
        try:
            sale = Sale.objects.select_related('tenant', 'branch', 'customer').get(id=sale_id, tenant=tenant)
        except Sale.DoesNotExist:
            return Response(
                {'error': 'Sale not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if supervisor approval is needed
        # Returns over a certain amount or certain conditions need supervisor approval
        needs_approval = user_role == 'cashier'
        return_reason = data.get('return_reason', 'other')
        
        # Large returns or certain reasons always need approval
        if return_reason in ['defective', 'expired']:
            needs_approval = True
        
        # Calculate totals
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        discount_amount = Decimal('0.00')
        
        for item_data in items_data:
            sale_item_id = item_data.get('sale_item')
            quantity_returned = int(item_data.get('quantity_returned', 0))
            
            try:
                sale_item = SaleItem.objects.get(id=sale_item_id, sale=sale)
            except SaleItem.DoesNotExist:
                return Response(
                    {'error': f'Sale item {sale_item_id} not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if quantity is valid
            already_returned = SaleReturnItem.objects.filter(
                sale_item=sale_item,
                sale_return__status__in=['approved', 'processed']
            ).aggregate(total=Sum('quantity_returned'))['total'] or 0
            
            if quantity_returned > (sale_item.quantity - already_returned):
                return Response(
                    {'error': f'Cannot return {quantity_returned} items. Only {sale_item.quantity - already_returned} available for return.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            unit_price = Decimal(str(item_data.get('unit_price', sale_item.unit_price)))
            item_discount = Decimal(str(item_data.get('discount_amount', 0)))
            item_subtotal = (quantity_returned * unit_price) - item_discount
            item_tax = Decimal(str(item_data.get('tax_amount', 0)))
            
            subtotal += item_subtotal
            discount_amount += item_discount
            tax_amount += item_tax
        
        total_amount = subtotal + tax_amount
        
        # Check if amount needs supervisor approval (e.g., over $100)
        if total_amount > Decimal('100.00'):
            needs_approval = True
        
        # Create return
        return_status = 'pending' if needs_approval else 'approved'
        sale_return = SaleReturn.objects.create(
            tenant=tenant,
            branch=sale.branch,
            sale=sale,
            customer=sale.customer,
            return_reason=data.get('return_reason', 'other'),
            reason_details=data.get('reason_details', ''),
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            refund_method=data.get('refund_method', 'cash'),
            refund_amount=total_amount,
            status=return_status,
            processed_by=request.user,
            notes=data.get('notes', '')
        )
        
        # Create return items
        for item_data in items_data:
            sale_item_id = item_data.get('sale_item')
            sale_item = SaleItem.objects.get(id=sale_item_id)
            
            quantity_returned = int(item_data.get('quantity_returned', 0))
            unit_price = Decimal(str(item_data.get('unit_price', sale_item.unit_price)))
            item_discount = Decimal(str(item_data.get('discount_amount', 0)))
            item_tax = Decimal(str(item_data.get('tax_amount', 0)))
            item_subtotal = (quantity_returned * unit_price) - item_discount
            item_total = item_subtotal + item_tax
            
            SaleReturnItem.objects.create(
                sale_return=sale_return,
                sale_item=sale_item,
                product=sale_item.product,
                variant=sale_item.variant,
                quantity_returned=quantity_returned,
                unit_price=unit_price,
                discount_amount=item_discount,
                tax_amount=item_tax,
                total=item_total,
                condition=item_data.get('condition', 'new'),
                condition_notes=item_data.get('condition_notes', '')
            )
        
        serializer = self.get_serializer(sale_return)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a sale return (supervisor only)."""
        sale_return = self.get_object()
        
        # Check if user is supervisor or higher
        user_role = request.user.role
        if user_role not in ['supervisor', 'tenant_admin', 'super_admin', 'manager']:
            return Response(
                {'error': 'Only supervisors can approve returns.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if sale_return.status != 'pending':
            return Response(
                {'error': f'Return is already {sale_return.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sale_return.status = 'approved'
        sale_return.approved_by = request.user
        sale_return.approved_at = timezone.now()
        sale_return.save()
        
        serializer = self.get_serializer(sale_return)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a sale return (supervisor only)."""
        sale_return = self.get_object()
        
        user_role = request.user.role
        if user_role not in ['supervisor', 'tenant_admin', 'super_admin', 'manager']:
            return Response(
                {'error': 'Only supervisors can reject returns.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if sale_return.status != 'pending':
            return Response(
                {'error': f'Return is already {sale_return.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('rejection_reason', '')
        sale_return.status = 'rejected'
        sale_return.approved_by = request.user
        sale_return.approved_at = timezone.now()
        sale_return.rejection_reason = rejection_reason
        sale_return.save()
        
        serializer = self.get_serializer(sale_return)
        return Response(serializer.data)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process an approved return intelligently (condition-based inventory handling)."""
        sale_return = self.get_object()
        
        user_role = request.user.role
        if user_role not in ['supervisor', 'tenant_admin', 'super_admin', 'manager', 'cashier']:
            return Response(
                {'error': 'You do not have permission to process returns.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Cashiers can only process approved returns
        if user_role == 'cashier' and sale_return.status != 'approved':
            return Response(
                {'error': 'Returns must be approved before processing.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get till float ID if provided (for refund tracking)
        till_float_id = request.data.get('till_float_id')
        
        try:
            # Use intelligent return processing service
            results = ReturnProcessingService.process_sale_return(sale_return, till_float_id)
            
            # Get financial summary
            financial_summary = ReturnProcessingService.get_return_financial_summary(sale_return)
            
            serializer = self.get_serializer(sale_return)
            response_data = serializer.data
            response_data['processing_results'] = results
            response_data['financial_summary'] = financial_summary
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error processing return: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def financial_summary(self, request, pk=None):
        """Get financial summary of a sale return."""
        sale_return = self.get_object()
        
        try:
            summary = ReturnProcessingService.get_return_financial_summary(sale_return)
            return Response(summary, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error generating financial summary: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PurchaseReturnViewSet(viewsets.ModelViewSet):
    """ViewSet for managing purchase returns."""
    serializer_class = PurchaseReturnSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        tenant = get_tenant_from_request(self.request)
        queryset = PurchaseReturn.objects.select_related(
            'tenant', 'branch', 'purchase_order', 'supplier', 'created_by', 'approved_by'
        ).all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset.order_by('-date')
    
    def get_serializer_context(self):
        """Add request and tenant to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        tenant = get_tenant_from_request(self.request)
        if tenant:
            context['tenant'] = tenant
            self.request.tenant = tenant
        return context
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a purchase return."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions - stock controllers and supervisors can create returns
        user_role = request.user.role
        if user_role not in ['stock_controller', 'supervisor', 'tenant_admin', 'super_admin', 'manager']:
            return Response(
                {'error': 'You do not have permission to create purchase returns.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data.copy()
        po_id = data.get('purchase_order')
        items_data = data.get('items', [])
        
        # Validate purchase order exists
        try:
            from purchases.models import PurchaseOrder
            po = PurchaseOrder.objects.select_related('tenant', 'branch', 'supplier').get(id=po_id, tenant=tenant)
        except Exception:
            return Response(
                {'error': 'Purchase order not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Purchase returns typically need supervisor approval
        needs_approval = user_role != 'supervisor' and user_role not in ['tenant_admin', 'super_admin', 'manager']
        
        # Calculate totals
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        
        for item_data in items_data:
            po_item_id = item_data.get('purchase_order_item')
            quantity_returned = int(item_data.get('quantity_returned', 0))
            
            try:
                po_item = PurchaseOrderItem.objects.get(id=po_item_id, purchase_order=po)
            except PurchaseOrderItem.DoesNotExist:
                return Response(
                    {'error': f'Purchase order item {po_item_id} not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if quantity is valid
            already_returned = PurchaseReturnItem.objects.filter(
                purchase_order_item=po_item,
                purchase_return__status__in=['approved', 'processed', 'received_by_supplier']
            ).aggregate(total=Sum('quantity_returned'))['total'] or 0
            
            if quantity_returned > (po_item.received_quantity - already_returned):
                return Response(
                    {'error': f'Cannot return {quantity_returned} items. Only {po_item.received_quantity - already_returned} available for return.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            unit_price = Decimal(str(item_data.get('unit_price', po_item.unit_price)))
            item_tax = Decimal(str(item_data.get('tax_amount', 0)))
            item_subtotal = quantity_returned * unit_price
            
            subtotal += item_subtotal
            tax_amount += item_tax
        
        total_amount = subtotal + tax_amount
        
        # Create return
        return_status = 'pending' if needs_approval else 'approved'
        purchase_return = PurchaseReturn.objects.create(
            tenant=tenant,
            branch=po.branch,
            purchase_order=po,
            supplier=po.supplier,
            return_reason=data.get('return_reason', 'other'),
            reason_details=data.get('reason_details', ''),
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status=return_status,
            created_by=request.user,
            notes=data.get('notes', '')
        )
        
        # Create return items
        for item_data in items_data:
            po_item_id = item_data.get('purchase_order_item')
            po_item = PurchaseOrderItem.objects.get(id=po_item_id)
            
            quantity_returned = int(item_data.get('quantity_returned', 0))
            unit_price = Decimal(str(item_data.get('unit_price', po_item.unit_price)))
            item_tax = Decimal(str(item_data.get('tax_amount', 0)))
            item_subtotal = quantity_returned * unit_price
            item_total = item_subtotal + item_tax
            
            PurchaseReturnItem.objects.create(
                purchase_return=purchase_return,
                purchase_order_item=po_item,
                product=po_item.product,
                variant=po_item.variant,
                quantity_returned=quantity_returned,
                unit_price=unit_price,
                tax_amount=item_tax,
                total=item_total,
                condition=item_data.get('condition', 'new'),
                condition_notes=item_data.get('condition_notes', '')
            )
        
        serializer = self.get_serializer(purchase_return)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a purchase return (supervisor only)."""
        purchase_return = self.get_object()
        
        user_role = request.user.role
        if user_role not in ['supervisor', 'tenant_admin', 'super_admin', 'manager']:
            return Response(
                {'error': 'Only supervisors can approve purchase returns.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if purchase_return.status != 'pending':
            return Response(
                {'error': f'Return is already {purchase_return.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase_return.status = 'approved'
        purchase_return.approved_by = request.user
        purchase_return.approved_at = timezone.now()
        purchase_return.save()
        
        serializer = self.get_serializer(purchase_return)
        return Response(serializer.data)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process an approved purchase return (with option to handle write-offs)."""
        purchase_return = self.get_object()
        
        user_role = request.user.role
        if user_role not in ['supervisor', 'tenant_admin', 'super_admin', 'manager', 'stock_controller']:
            return Response(
                {'error': 'You do not have permission to process purchase returns.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if goods can be returned to supplier
        can_return_to_supplier = request.data.get('can_return_to_supplier', True)
        if isinstance(can_return_to_supplier, str):
            can_return_to_supplier = can_return_to_supplier.lower() == 'true'
        
        try:
            # Use intelligent return processing service
            results = ReturnProcessingService.process_purchase_return(
                purchase_return,
                can_return_to_supplier=can_return_to_supplier
            )
            
            serializer = self.get_serializer(purchase_return)
            response_data = serializer.data
            response_data['processing_results'] = results
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error processing return: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


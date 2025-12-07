"""
POS views.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Sale, SaleItem, PaymentSplit
from .serializers import SaleSerializer, SaleCreateSerializer
from inventory.models import Product, ProductVariant, StockLevel, StockMovement
from customers.models import Customer


class SaleViewSet(viewsets.ModelViewSet):
    """Sale management."""
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['branch', 'customer', 'status', 'payment_method', 'is_paid']
    search_fields = ['invoice_number']
    ordering_fields = ['date', 'total_amount']
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = Sale.objects.all()
        if hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SaleCreateSerializer
        return SaleSerializer
    
    @transaction.atomic
    def create(self, request):
        """Create a new sale."""
        serializer = SaleCreateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Get branch
            from core.models import Branch
            try:
                branch = Branch.objects.get(id=data['branch_id'], tenant=request.tenant)
            except Branch.DoesNotExist:
                return Response(
                    {'error': 'Branch not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get customer if provided
            customer = None
            if data.get('customer_id'):
                try:
                    customer = Customer.objects.get(id=data['customer_id'], tenant=request.tenant)
                except Customer.DoesNotExist:
                    return Response(
                        {'error': 'Customer not found.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Calculate totals
            subtotal = 0
            tax_amount = 0
            discount_amount = data.get('discount_amount', 0)
            
            # Create sale
            sale = Sale.objects.create(
                tenant=request.tenant,
                branch=branch,
                customer=customer,
                cashier=request.user,
                payment_method=data['payment_method'],
                amount_paid=data['amount_paid'],
                discount_amount=discount_amount,
                notes=data.get('notes', ''),
                is_paid=True,
                paid_at=timezone.now()
            )
            
            # Process items
            items_data = []
            for item_data in data['items']:
                product_id = item_data['product_id']
                variant_id = item_data.get('variant_id')
                quantity = item_data['quantity']
                unit_price = item_data['unit_price']
                item_discount = item_data.get('discount_amount', 0)
                
                try:
                    product = Product.objects.get(id=product_id, tenant=request.tenant)
                except Product.DoesNotExist:
                    transaction.set_rollback(True)
                    return Response(
                        {'error': f'Product {product_id} not found.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Get variant if provided
                variant = None
                if variant_id:
                    try:
                        variant = product.variants.get(id=variant_id)
                    except ProductVariant.DoesNotExist:
                        pass
                
                # Calculate item total
                item_subtotal = quantity * unit_price - item_discount
                item_tax = item_subtotal * (request.tenant.tax_rate / 100) if product.is_taxable else 0
                item_total = item_subtotal + item_tax
                
                subtotal += item_subtotal
                tax_amount += item_tax
                
                # Create sale item
                sale_item = SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    variant=variant,
                    quantity=quantity,
                    unit_price=unit_price,
                    discount_amount=item_discount,
                    tax_amount=item_tax,
                    total=item_total,
                    cost_price=variant.cost_price if variant else product.cost_price
                )
                items_data.append(sale_item)
                
                # Update stock
                if product.track_inventory:
                    stock_level, created = StockLevel.objects.get_or_create(
                        tenant=request.tenant,
                        branch=branch,
                        product=product
                    )
                    
                    quantity_before = stock_level.quantity
                    if stock_level.quantity < quantity and not product.allow_negative_stock:
                        transaction.set_rollback(True)
                        return Response(
                            {'error': f'Insufficient stock for {product.name}. Available: {stock_level.quantity}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    stock_level.quantity -= quantity
                    stock_level.save()
                    
                    # Record stock movement
                    StockMovement.objects.create(
                        tenant=request.tenant,
                        branch=branch,
                        product=product,
                        variant=variant,
                        movement_type='sale',
                        quantity=-quantity,
                        quantity_before=quantity_before,
                        quantity_after=stock_level.quantity,
                        reference_type='Sale',
                        reference_id=str(sale.id),
                        user=request.user
                    )
            
            # Update sale totals
            sale.subtotal = subtotal
            sale.tax_amount = tax_amount
            sale.total_amount = subtotal + tax_amount - discount_amount
            sale.change_amount = max(0, sale.amount_paid - sale.total_amount)
            sale.save()
            
            # Handle payment splits if provided
            if data.get('payment_splits'):
                for split_data in data['payment_splits']:
                    PaymentSplit.objects.create(
                        sale=sale,
                        payment_method=split_data['payment_method'],
                        amount=split_data['amount'],
                        reference=split_data.get('reference', '')
                    )
            
            # Update customer stats if customer exists
            if customer:
                customer.total_visits += 1
                customer.total_purchases += sale.total_amount
                customer.last_purchase_date = timezone.now()
                customer.save()
            
            return Response(
                SaleSerializer(sale).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def void(self, request, pk=None):
        """Void a sale (requires supervisor PIN)."""
        sale = self.get_object()
        pin = request.data.get('pin')
        reason = request.data.get('reason', '')
        
        if sale.status == 'voided':
            return Response(
                {'error': 'Sale already voided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check supervisor PIN
        if not pin:
            return Response(
                {'error': 'Supervisor PIN required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify supervisor
        from accounts.models import User
        supervisor = User.objects.filter(
            tenant=request.tenant,
            role__in=['super_admin', 'tenant_admin', 'supervisor'],
            pin=pin
        ).first()
        
        if not supervisor:
            return Response(
                {'error': 'Invalid supervisor PIN.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Void sale
        with transaction.atomic():
            sale.status = 'voided'
            sale.supervisor = supervisor
            sale.void_reason = reason
            sale.save()
            
            # Reverse stock movements
            for item in sale.items.all():
                if item.product.track_inventory:
                    stock_level, _ = StockLevel.objects.get_or_create(
                        tenant=request.tenant,
                        branch=sale.branch,
                        product=item.product
                    )
                    stock_level.quantity += item.quantity
                    stock_level.save()
                    
                    StockMovement.objects.create(
                        tenant=request.tenant,
                        branch=sale.branch,
                        product=item.product,
                        variant=item.variant,
                        movement_type='return',
                        quantity=item.quantity,
                        quantity_before=stock_level.quantity - item.quantity,
                        quantity_after=stock_level.quantity,
                        reference_type='Sale Void',
                        reference_id=str(sale.id),
                        notes=f"Voided sale {sale.invoice_number}",
                        user=request.user
                    )
        
        return Response(SaleSerializer(sale).data)


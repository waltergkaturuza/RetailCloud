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
from decimal import Decimal
from .models import Sale, SaleItem, PaymentSplit
from .serializers import SaleSerializer, SaleCreateSerializer
from inventory.models import Product, ProductVariant, StockLevel, StockMovement
from customers.models import Customer
from core.utils import get_tenant_from_request


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
        tenant = get_tenant_from_request(self.request)
        queryset = Sale.objects.select_related('tenant', 'branch', 'customer', 'cashier').all()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        else:
            queryset = queryset.none()
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SaleCreateSerializer
        return SaleSerializer
    
    @transaction.atomic
    def create(self, request):
        """Create a new sale."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant context not found. Please ensure you are authenticated and associated with a tenant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SaleCreateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Get branch
            from core.models import Branch
            try:
                branch = Branch.objects.get(id=data['branch_id'], tenant=tenant)
            except Branch.DoesNotExist:
                return Response(
                    {'error': 'Branch not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get customer if provided
            customer = None
            if data.get('customer_id'):
                try:
                    customer = Customer.objects.get(id=data['customer_id'], tenant=tenant)
                except Customer.DoesNotExist:
                    return Response(
                        {'error': 'Customer not found.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Calculate totals FIRST before creating the sale
            subtotal = Decimal('0.00')
            tax_amount = Decimal('0.00')
            discount_amount = Decimal(str(data.get('discount_amount', 0)))
            
            # Validate items and calculate totals
            items_data = []
            for item_data in data['items']:
                product_id = item_data['product_id']
                variant_id = item_data.get('variant_id')
                quantity = Decimal(str(item_data['quantity']))
                unit_price = Decimal(str(item_data['unit_price']))
                item_discount = Decimal(str(item_data.get('discount_amount', 0)))
                
                try:
                    product = Product.objects.get(id=product_id, tenant=tenant)
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
                
                # Calculate item total with tax
                item_subtotal = (quantity * unit_price) - item_discount
                
                # Use TaxCalculationService for VAT calculation if product is taxable
                item_tax = Decimal('0.00')
                if product.is_taxable:
                    try:
                        from accounting.tax_calculation_service import TaxCalculationService
                        tax_service = TaxCalculationService(tenant)
                        # Check if tax config exists and auto-calculate is enabled
                        if tax_service.config.auto_calculate_tax and tax_service.config.vat_registered:
                            vat_result = tax_service.calculate_vat(item_subtotal, tax_service.config.tax_inclusive_pricing)
                            item_tax = Decimal(str(vat_result['tax_amount']))
                            item_subtotal = Decimal(str(vat_result['base_amount']))
                        else:
                            # Fallback to tenant tax_rate if tax config not set up
                            item_tax = item_subtotal * (Decimal(str(tenant.tax_rate)) / Decimal('100.00'))
                    except Exception:
                        # Fallback to tenant tax_rate on any error
                        item_tax = item_subtotal * (Decimal(str(tenant.tax_rate)) / Decimal('100.00'))
                
                item_total = item_subtotal + item_tax
                
                subtotal += item_subtotal
                tax_amount += item_tax
                
                # Store item data for later creation
                items_data.append({
                    'product': product,
                    'variant': variant,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'item_discount': item_discount,
                    'item_tax': item_tax,
                    'item_total': item_total,
                    'cost_price': variant.cost_price if variant else product.cost_price,
                    'track_inventory': product.track_inventory,
                    'allow_negative_stock': product.allow_negative_stock
                })
            
            # Calculate final totals
            total_amount = subtotal + tax_amount - discount_amount
            
            # Ensure total_amount meets minimum requirement (must be >= 0.01)
            if total_amount < Decimal('0.01'):
                transaction.set_rollback(True)
                return Response(
                    {'error': 'Total amount must be at least 0.01. Please add items to the sale.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            amount_paid = Decimal(str(data.get('amount_paid', 0)))
            change_amount = max(Decimal('0.00'), amount_paid - total_amount)
            currency = data.get('currency', 'USD')
            exchange_rate = data.get('exchange_rate')
            
            # Create sale with all totals
            sale = Sale.objects.create(
                tenant=tenant,
                branch=branch,
                customer=customer,
                cashier=request.user,
                payment_method=data.get('payment_method', 'cash'),
                amount_paid=amount_paid,
                discount_amount=discount_amount,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                change_amount=change_amount,
                currency=currency,
                exchange_rate=Decimal(str(exchange_rate)) if exchange_rate else None,
                notes=data.get('notes', ''),
                is_paid=True,
                paid_at=timezone.now()
            )
            
            # Auto-create tax liability if VAT is applicable and tax config is enabled
            if tax_amount > 0:
                try:
                    from accounting.tax_calculation_service import TaxCalculationService
                    tax_service = TaxCalculationService(tenant)
                    if tax_service.config.auto_calculate_tax and tax_service.config.vat_registered:
                        # Create VAT output liability for this sale
                        tax_service.create_tax_liability(
                            tax_type='vat_output',
                            source_type='sale',
                            source_id=sale.id,
                            taxable_amount=subtotal,
                            tax_rate=tax_service.config.standard_vat_rate,
                            transaction_date=timezone.now().date(),
                            branch=branch,
                            reference_number=sale.invoice_number
                        )
                except Exception:
                    # Silently fail if tax service is not available - don't break sale creation
                    pass
            
            # Now create sale items and update stock
            for item_info in items_data:
                # Create sale item
                sale_item = SaleItem.objects.create(
                    sale=sale,
                    product=item_info['product'],
                    variant=item_info['variant'],
                    quantity=int(item_info['quantity']),
                    unit_price=item_info['unit_price'],
                    discount_amount=item_info['item_discount'],
                    tax_amount=item_info['item_tax'],
                    total=item_info['item_total'],
                    cost_price=item_info['cost_price']
                )
                
                # Update stock
                if item_info['track_inventory']:
                    stock_level, created = StockLevel.objects.get_or_create(
                        tenant=tenant,
                        branch=branch,
                        product=item_info['product']
                    )
                    
                    quantity_int = int(item_info['quantity'])
                    quantity_before = stock_level.quantity
                    if stock_level.quantity < quantity_int and not item_info['allow_negative_stock']:
                        transaction.set_rollback(True)
                        return Response(
                            {'error': f'Insufficient stock for {item_info["product"].name}. Available: {stock_level.quantity}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    stock_level.quantity -= quantity_int
                    stock_level.save()
                    
                    # Record stock movement
                    StockMovement.objects.create(
                        tenant=tenant,
                        branch=branch,
                        product=item_info['product'],
                        variant=item_info['variant'],
                        movement_type='sale',
                        quantity=-quantity_int,
                        quantity_before=quantity_before,
                        quantity_after=stock_level.quantity,
                        reference_type='Sale',
                        reference_id=str(sale.id),
                        user=request.user
                    )
            
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
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'Tenant context not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from accounts.models import User
        supervisor = User.objects.filter(
            tenant=tenant,
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
                        tenant=tenant,
                        branch=sale.branch,
                        product=item.product
                    )
                    stock_level.quantity += item.quantity
                    stock_level.save()
                    
                    StockMovement.objects.create(
                        tenant=tenant,
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


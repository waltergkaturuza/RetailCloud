"""
Bulk Operations for Inventory
Import/Export Excel/CSV, Bulk Updates
"""
import csv
import io
from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone

from .models import Product, ProductVariant, StockLevel, Category
from .advanced_models import Warehouse, WarehouseLocation


class BulkImportService:
    """Service for bulk importing inventory data."""
    
    @staticmethod
    def parse_csv_file(file, tenant):
        """Parse CSV file and return rows."""
        decoded_file = file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        return list(reader)
    
    @staticmethod
    @transaction.atomic
    def import_products_from_csv(file, tenant, branch=None):
        """Import products from CSV file."""
        rows = BulkImportService.parse_csv_file(file, tenant)
        results = {
            'success': [],
            'errors': [],
            'total': len(rows)
        }
        
        for index, row in enumerate(rows, start=2):  # Start at 2 (row 1 is header)
            try:
                # Required fields
                name = row.get('name', '').strip()
                sku = row.get('sku', '').strip()
                
                if not name or not sku:
                    results['errors'].append({
                        'row': index,
                        'error': 'Name and SKU are required'
                    })
                    continue
                
                # Check if product exists
                product, created = Product.objects.get_or_create(
                    tenant=tenant,
                    sku=sku,
                    defaults={
                        'name': name,
                        'description': row.get('description', ''),
                        'barcode': row.get('barcode', ''),
                        'selling_price': Decimal(row.get('selling_price', 0) or 0),
                        'cost_price': Decimal(row.get('cost_price', 0) or 0),
                        'reorder_level': int(row.get('reorder_level', 10) or 10),
                        'reorder_quantity': int(row.get('reorder_quantity', 50) or 50),
                        'unit': row.get('unit', 'piece'),
                        'track_inventory': row.get('track_inventory', 'true').lower() == 'true',
                        'is_active': row.get('is_active', 'true').lower() == 'true',
                    }
                )
                
                if not created:
                    # Update existing product
                    product.name = name
                    if row.get('description'):
                        product.description = row.get('description')
                    if row.get('selling_price'):
                        product.selling_price = Decimal(row.get('selling_price', 0) or 0)
                    if row.get('cost_price'):
                        product.cost_price = Decimal(row.get('cost_price', 0) or 0)
                    product.save()
                
                # Handle category
                category_name = row.get('category', '').strip()
                if category_name:
                    category, _ = Category.objects.get_or_create(
                        tenant=tenant,
                        name=category_name,
                        defaults={'code': category_name.lower().replace(' ', '_')}
                    )
                    product.category = category
                    product.save()
                
                # Handle stock level if branch specified
                if branch and row.get('quantity'):
                    quantity = int(row.get('quantity', 0) or 0)
                    if quantity > 0:
                        stock_level, _ = StockLevel.objects.get_or_create(
                            tenant=tenant,
                            branch=branch,
                            product=product,
                            defaults={'quantity': quantity}
                        )
                        if not stock_level:
                            stock_level.quantity = quantity
                            stock_level.save()
                
                results['success'].append({
                    'row': index,
                    'product': product.name,
                    'sku': product.sku,
                    'action': 'created' if created else 'updated'
                })
                
            except Exception as e:
                results['errors'].append({
                    'row': index,
                    'error': str(e)
                })
        
        return results
    
    @staticmethod
    @transaction.atomic
    def bulk_update_prices(tenant, updates):
        """Bulk update product prices.
        updates: list of dicts with 'product_id' or 'sku', 'selling_price', 'cost_price'
        """
        results = {'success': [], 'errors': []}
        
        for update in updates:
            try:
                product_id = update.get('product_id')
                sku = update.get('sku')
                
                if product_id:
                    product = Product.objects.get(id=product_id, tenant=tenant)
                elif sku:
                    product = Product.objects.get(sku=sku, tenant=tenant)
                else:
                    results['errors'].append({'error': 'product_id or sku required', 'data': update})
                    continue
                
                if 'selling_price' in update:
                    product.selling_price = Decimal(str(update['selling_price']))
                if 'cost_price' in update:
                    product.cost_price = Decimal(str(update['cost_price']))
                
                product.save()
                
                results['success'].append({
                    'product_id': product.id,
                    'sku': product.sku,
                    'selling_price': str(product.selling_price),
                    'cost_price': str(product.cost_price)
                })
                
            except Product.DoesNotExist:
                results['errors'].append({'error': 'Product not found', 'data': update})
            except Exception as e:
                results['errors'].append({'error': str(e), 'data': update})
        
        return results
    
    @staticmethod
    @transaction.atomic
    def bulk_adjust_stock(tenant, branch, adjustments):
        """Bulk adjust stock levels.
        adjustments: list of dicts with 'product_id' or 'sku', 'quantity', 'variant_id' (optional)
        """
        from .models import StockMovement
        
        results = {'success': [], 'errors': []}
        
        for adj in adjustments:
            try:
                product_id = adj.get('product_id')
                sku = adj.get('sku')
                variant_id = adj.get('variant_id')
                quantity = int(adj.get('quantity', 0))
                notes = adj.get('notes', 'Bulk adjustment')
                
                if product_id:
                    product = Product.objects.get(id=product_id, tenant=tenant)
                elif sku:
                    product = Product.objects.get(sku=sku, tenant=tenant)
                else:
                    results['errors'].append({'error': 'product_id or sku required', 'data': adj})
                    continue
                
                variant = None
                if variant_id:
                    variant = ProductVariant.objects.get(id=variant_id, product=product)
                
                stock_level, created = StockLevel.objects.get_or_create(
                    tenant=tenant,
                    branch=branch,
                    product=product,
                    variant=variant,
                    defaults={'quantity': 0}
                )
                
                quantity_before = stock_level.quantity
                stock_level.quantity += quantity
                quantity_after = stock_level.quantity
                stock_level.save()
                
                # Create stock movement
                StockMovement.objects.create(
                    tenant=tenant,
                    branch=branch,
                    product=product,
                    variant=variant,
                    movement_type='adjustment',
                    quantity=abs(quantity),
                    quantity_before=quantity_before,
                    quantity_after=quantity_after,
                    notes=notes,
                    user=None  # Could pass user if available
                )
                
                results['success'].append({
                    'product_id': product.id,
                    'sku': product.sku,
                    'quantity_before': quantity_before,
                    'quantity_after': quantity_after,
                    'adjustment': quantity
                })
                
            except Product.DoesNotExist:
                results['errors'].append({'error': 'Product not found', 'data': adj})
            except Exception as e:
                results['errors'].append({'error': str(e), 'data': adj})
        
        return results


class BulkExportService:
    """Service for bulk exporting inventory data."""
    
    @staticmethod
    def export_products_to_csv(tenant, branch=None, response=None):
        """Export products to CSV."""
        if not response:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="products_export_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        
        # Header
        headers = ['sku', 'name', 'category', 'description', 'barcode', 'cost_price', 'selling_price', 
                  'reorder_level', 'reorder_quantity', 'unit', 'track_inventory', 'is_active']
        if branch:
            headers.append('quantity')
        
        writer.writerow(headers)
        
        # Data
        products = Product.objects.filter(tenant=tenant, is_active=True)
        for product in products:
            row = [
                product.sku,
                product.name,
                product.category.name if product.category else '',
                product.description,
                product.barcode,
                product.cost_price,
                product.selling_price,
                product.reorder_level,
                product.reorder_quantity,
                product.unit,
                'true' if product.track_inventory else 'false',
                'true' if product.is_active else 'false'
            ]
            
            if branch:
                stock_level = StockLevel.objects.filter(
                    tenant=tenant,
                    branch=branch,
                    product=product
                ).first()
                row.append(stock_level.quantity if stock_level else 0)
            
            writer.writerow(row)
        
        return response
    
    @staticmethod
    def export_stock_levels_to_csv(tenant, branch, response=None):
        """Export stock levels to CSV."""
        if not response:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="stock_levels_export_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        
        # Header
        writer.writerow(['sku', 'product_name', 'variant', 'quantity', 'reserved_quantity', 'available_quantity', 'last_counted_at'])
        
        # Data
        stock_levels = StockLevel.objects.filter(tenant=tenant, branch=branch).select_related('product', 'variant')
        for stock_level in stock_levels:
            writer.writerow([
                stock_level.product.sku,
                stock_level.product.name,
                stock_level.variant.name if stock_level.variant else '',
                stock_level.quantity,
                stock_level.reserved_quantity,
                stock_level.available_quantity,
                stock_level.last_counted_at.strftime('%Y-%m-%d %H:%M:%S') if stock_level.last_counted_at else ''
            ])
        
        return response



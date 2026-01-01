"""
API Views for Advanced Inventory & Warehouse Management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse

from .advanced_models import (
    Warehouse, WarehouseLocation, StockLocation, PickList, PickListItem,
    PutAway, PutAwayItem, CycleCount, CycleCountItem, WarehouseTransfer, WarehouseTransferItem,
    SafetyStock, ABCAnalysis, DeadStock, StockAging, SupplierPerformance,
    InventoryValuation, CostLayer, CostAdjustment, InventoryWriteOff
)
from .advanced_serializers import (
    WarehouseSerializer, WarehouseLocationSerializer, StockLocationSerializer,
    PickListSerializer, PickListItemSerializer,
    PutAwaySerializer, PutAwayItemSerializer,
    CycleCountSerializer, CycleCountItemSerializer,
    WarehouseTransferSerializer, WarehouseTransferItemSerializer,
    SafetyStockSerializer, ABCAnalysisSerializer, DeadStockSerializer,
    StockAgingSerializer, SupplierPerformanceSerializer,
    InventoryValuationSerializer, CostLayerSerializer, CostAdjustmentSerializer,
    InventoryWriteOffSerializer, CreatePickListSerializer, CreatePutAwaySerializer
)
from .wms_services import (
    WarehouseLocationService, PickListService, PutAwayService,
    CycleCountService, WarehouseTransferService
)
from .forecasting_service import DemandForecastingService
from .stock_analysis_service import ABCAnalysisService, DeadStockService, StockAgingService
# Note: Using get_queryset to filter by tenant instead of decorator
from .models import Product, ProductVariant, Batch, Branch, StockLevel


# ============================================================================
# WMS VIEWSETS
# ============================================================================

class WarehouseViewSet(viewsets.ModelViewSet):
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Warehouse.objects.filter(tenant=self.request.user.tenant)
    
    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class WarehouseLocationViewSet(viewsets.ModelViewSet):
    serializer_class = WarehouseLocationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = WarehouseLocation.objects.filter(tenant=self.request.user.tenant)
        warehouse_id = self.request.query_params.get('warehouse')
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        return queryset
    
    def perform_create(self, serializer):
        warehouse = get_object_or_404(Warehouse, id=serializer.validated_data['warehouse'].id, tenant=self.request.user.tenant)
        serializer.save(tenant=self.request.user.tenant, warehouse=warehouse)


class StockLocationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockLocationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = StockLocation.objects.filter(tenant=self.request.user.tenant)
        warehouse_id = self.request.query_params.get('warehouse')
        product_id = self.request.query_params.get('product')
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset


class PickListViewSet(viewsets.ModelViewSet):
    serializer_class = PickListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = PickList.objects.filter(tenant=self.request.user.tenant).prefetch_related('items')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def create_with_items(self, request):
        """Create pick list with items."""
        serializer = CreatePickListSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        warehouse = get_object_or_404(Warehouse, id=data['warehouse_id'], tenant=request.user.tenant)
        
        items = []
        for item_data in data['items']:
            product = get_object_or_404(Product, id=item_data['product_id'], tenant=request.user.tenant)
            variant = None
            if item_data.get('variant_id'):
                variant = get_object_or_404(ProductVariant, id=item_data['variant_id'], product=product)
            batch = None
            if item_data.get('batch_id'):
                batch = get_object_or_404(Batch, id=item_data['batch_id'], tenant=request.user.tenant)
            
            items.append({
                'product': product,
                'variant': variant,
                'batch': batch,
                'quantity': item_data['quantity']
            })
        
        assigned_to = None
        if data.get('assigned_to_id'):
            assigned_to = get_object_or_404(request.user.__class__, id=data['assigned_to_id'])
        
        try:
            pick_list = PickListService.create_pick_list(
                warehouse=warehouse,
                reference_type=data['reference_type'],
                reference_id=data['reference_id'],
                items=items,
                picking_strategy=data.get('picking_strategy', 'fifo'),
                priority=data.get('priority', 'normal'),
                assigned_to=assigned_to
            )
            return Response(PickListSerializer(pick_list).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def start_picking(self, request, pk=None):
        """Start picking process."""
        pick_list = self.get_object()
        if pick_list.status != 'pending':
            return Response({'error': 'Pick list must be pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        pick_list.status = 'in_progress'
        pick_list.started_at = timezone.now()
        pick_list.save()
        
        return Response(PickListSerializer(pick_list).data)
    
    @action(detail=True, methods=['post'])
    def complete_item(self, request, pk=None):
        """Complete picking an item."""
        pick_list = self.get_object()
        item_id = request.data.get('item_id')
        quantity_picked = request.data.get('quantity_picked')
        
        if not item_id or quantity_picked is None:
            return Response({'error': 'item_id and quantity_picked required'}, status=status.HTTP_400_BAD_REQUEST)
        
        item = get_object_or_404(PickListItem, id=item_id, pick_list=pick_list)
        
        try:
            PickListService.complete_pick_list_item(item, quantity_picked, request.user)
            return Response(PickListItemSerializer(item).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PutAwayViewSet(viewsets.ModelViewSet):
    serializer_class = PutAwaySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PutAway.objects.filter(tenant=self.request.user.tenant).prefetch_related('items').order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def create_with_items(self, request):
        """Create put-away with items."""
        serializer = CreatePutAwaySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        warehouse = get_object_or_404(Warehouse, id=data['warehouse_id'], tenant=request.user.tenant)
        
        items = []
        for item_data in data['items']:
            product = get_object_or_404(Product, id=item_data['product_id'], tenant=request.user.tenant)
            variant = None
            if item_data.get('variant_id'):
                variant = get_object_or_404(ProductVariant, id=item_data['variant_id'], product=product)
            batch = None
            if item_data.get('batch_id'):
                batch = get_object_or_404(Batch, id=item_data['batch_id'], tenant=request.user.tenant)
            
            items.append({
                'product': product,
                'variant': variant,
                'batch': batch,
                'quantity': item_data['quantity']
            })
        
        assigned_to = None
        if data.get('assigned_to_id'):
            assigned_to = get_object_or_404(request.user.__class__, id=data['assigned_to_id'])
        
        try:
            put_away = PutAwayService.create_put_away(
                warehouse=warehouse,
                reference_type=data['reference_type'],
                reference_id=data['reference_id'],
                items=items,
                strategy=data.get('strategy', 'random'),
                assigned_to=assigned_to
            )
            return Response(PutAwaySerializer(put_away).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def complete_item(self, request, pk=None):
        """Complete putting away an item."""
        put_away = self.get_object()
        item_id = request.data.get('item_id')
        location_id = request.data.get('location_id')
        
        if not item_id:
            return Response({'error': 'item_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        item = get_object_or_404(PutAwayItem, id=item_id, put_away=put_away)
        location = None
        if location_id:
            location = get_object_or_404(WarehouseLocation, id=location_id, warehouse=put_away.warehouse)
        
        try:
            PutAwayService.complete_put_away_item(item, location, request.user)
            return Response(PutAwayItemSerializer(item).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CycleCountViewSet(viewsets.ModelViewSet):
    serializer_class = CycleCountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CycleCount.objects.filter(tenant=self.request.user.tenant).prefetch_related('items').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def record_count(self, request, pk=None):
        """Record counted quantity for an item."""
        cycle_count = self.get_object()
        item_id = request.data.get('item_id')
        counted_quantity = request.data.get('counted_quantity')
        
        if not item_id or counted_quantity is None:
            return Response({'error': 'item_id and counted_quantity required'}, status=status.HTTP_400_BAD_REQUEST)
        
        item = get_object_or_404(CycleCountItem, id=item_id, cycle_count=cycle_count)
        
        try:
            CycleCountService.record_count(item, counted_quantity, request.user)
            return Response(CycleCountItemSerializer(item).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def adjust_variance(self, request, pk=None):
        """Adjust inventory based on variance."""
        cycle_count = self.get_object()
        item_id = request.data.get('item_id')
        
        if not item_id:
            return Response({'error': 'item_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        item = get_object_or_404(CycleCountItem, id=item_id, cycle_count=cycle_count)
        
        try:
            CycleCountService.adjust_variance(item, request.user)
            return Response(CycleCountItemSerializer(item).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WarehouseTransferViewSet(viewsets.ModelViewSet):
    serializer_class = WarehouseTransferSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return WarehouseTransfer.objects.filter(tenant=self.request.user.tenant).prefetch_related('items').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        """Ship transfer."""
        transfer = self.get_object()
        
        try:
            WarehouseTransferService.ship_transfer(
                transfer,
                request.user,
                tracking_number=request.data.get('tracking_number'),
                shipping_method=request.data.get('shipping_method')
            )
            return Response(WarehouseTransferSerializer(transfer).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """Receive transfer."""
        transfer = self.get_object()
        
        try:
            WarehouseTransferService.receive_transfer(
                transfer,
                request.user,
                received_items=request.data.get('received_items')
            )
            return Response(WarehouseTransferSerializer(transfer).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# FORECASTING VIEWSETS
# ============================================================================

class ForecastingViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def forecast(self, request):
        """Get demand forecast for a product."""
        product_id = request.query_params.get('product_id')
        branch_id = request.query_params.get('branch_id')
        days_ahead = int(request.query_params.get('days_ahead', 30))
        
        if not product_id:
            return Response({'error': 'product_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        product = get_object_or_404(Product, id=product_id, tenant=request.user.tenant)
        branch = None
        if branch_id:
            branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        else:
            # Use first branch as default
            branch = Branch.objects.filter(tenant=request.user.tenant).first()
        
        if not branch:
            return Response({'error': 'No branch available'}, status=status.HTTP_400_BAD_REQUEST)
        
        variant_id = request.query_params.get('variant_id')
        variant = None
        if variant_id:
            variant = get_object_or_404(ProductVariant, id=variant_id, product=product)
        
        try:
            forecast = DemandForecastingService.comprehensive_forecast(
                product, branch, days_ahead=days_ahead, variant=variant
            )
            return Response(forecast)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def reorder_point(self, request):
        """Get reorder point calculation."""
        product_id = request.query_params.get('product_id')
        branch_id = request.query_params.get('branch_id')
        
        if not product_id:
            return Response({'error': 'product_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        product = get_object_or_404(Product, id=product_id, tenant=request.user.tenant)
        branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant) if branch_id else Branch.objects.filter(tenant=request.user.tenant).first()
        
        if not branch:
            return Response({'error': 'No branch available'}, status=status.HTTP_400_BAD_REQUEST)
        
        variant_id = request.query_params.get('variant_id')
        variant = None
        if variant_id:
            variant = get_object_or_404(ProductVariant, id=variant_id, product=product)
        
        try:
            reorder_data = DemandForecastingService.calculate_reorder_point(product, branch, variant=variant)
            return Response(reorder_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# ANALYSIS VIEWSETS
# ============================================================================

class ABCAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ABCAnalysisSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ABCAnalysis.objects.filter(tenant=self.request.user.tenant)
        analysis_type = self.request.query_params.get('analysis_type')
        if analysis_type:
            queryset = queryset.filter(analysis_type=analysis_type)
        return queryset.order_by('-analysis_date')
    
    @action(detail=False, methods=['post'])
    def run_analysis(self, request):
        """Run ABC analysis."""
        branch_id = request.data.get('branch_id')
        branch = None
        if branch_id:
            branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        
        analysis_type = request.data.get('analysis_type', 'abc')
        
        try:
            if analysis_type == 'abc':
                results = ABCAnalysisService.perform_abc_analysis(request.user.tenant, branch=branch)
            elif analysis_type == 'xyz':
                results = ABCAnalysisService.perform_xyz_analysis(request.user.tenant, branch=branch)
            elif analysis_type == 'combined':
                results = ABCAnalysisService.perform_combined_analysis(request.user.tenant, branch=branch)
            else:
                return Response({'error': 'Invalid analysis_type'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(ABCAnalysisSerializer(results, many=True).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DeadStockViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeadStockSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = DeadStock.objects.filter(tenant=self.request.user.tenant)
        classification = self.request.query_params.get('classification')
        if classification:
            queryset = queryset.filter(classification=classification)
        return queryset.order_by('-analysis_date')
    
    @action(detail=False, methods=['post'])
    def identify(self, request):
        """Identify dead stock."""
        branch_id = request.data.get('branch_id')
        days_threshold = request.data.get('days_threshold', 90)
        
        branch = None
        if branch_id:
            branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        
        try:
            results = DeadStockService.identify_dead_stock(
                request.user.tenant,
                branch=branch,
                days_threshold=days_threshold
            )
            return Response(DeadStockSerializer(results, many=True).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StockAgingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockAgingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = StockAging.objects.filter(tenant=self.request.user.tenant)
        branch_id = self.request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        return queryset.order_by('-analysis_date')
    
    @action(detail=False, methods=['post'])
    def analyze(self, request):
        """Run stock aging analysis."""
        branch_id = request.data.get('branch_id')
        branch = None
        if branch_id:
            branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        
        try:
            results = StockAgingService.analyze_stock_aging(request.user.tenant, branch=branch)
            return Response(StockAgingSerializer(results, many=True).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# VALUATION VIEWSETS
# ============================================================================

class InventoryValuationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InventoryValuationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = InventoryValuation.objects.filter(tenant=self.request.user.tenant)
        valuation_method = self.request.query_params.get('valuation_method')
        if valuation_method:
            queryset = queryset.filter(valuation_method=valuation_method)
        return queryset


class CostAdjustmentViewSet(viewsets.ModelViewSet):
    serializer_class = CostAdjustmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CostAdjustment.objects.filter(tenant=self.request.user.tenant).order_by('-created_at')


class InventoryWriteOffViewSet(viewsets.ModelViewSet):
    serializer_class = InventoryWriteOffSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return InventoryWriteOff.objects.filter(tenant=self.request.user.tenant).order_by('-created_at')


# ============================================================================
# BULK OPERATIONS VIEWSETS
# ============================================================================

class BulkOperationsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def import_products(self, request):
        """Import products from CSV file."""
        from .bulk_operations import BulkImportService
        from .models import Branch
        
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        branch_id = request.data.get('branch_id')
        branch = None
        if branch_id:
            branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        
        try:
            results = BulkImportService.import_products_from_csv(
                request.FILES['file'],
                request.user.tenant,
                branch=branch
            )
            return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_update_prices(self, request):
        """Bulk update product prices."""
        from .bulk_operations import BulkImportService
        
        updates = request.data.get('updates', [])
        if not updates:
            return Response({'error': 'No updates provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = BulkImportService.bulk_update_prices(request.user.tenant, updates)
            return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_adjust_stock(self, request):
        """Bulk adjust stock levels."""
        from .bulk_operations import BulkImportService
        from .models import Branch
        
        branch_id = request.data.get('branch_id')
        if not branch_id:
            return Response({'error': 'branch_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        adjustments = request.data.get('adjustments', [])
        
        if not adjustments:
            return Response({'error': 'No adjustments provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            results = BulkImportService.bulk_adjust_stock(request.user.tenant, branch, adjustments)
            return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def export_products(self, request):
        """Export products to CSV."""
        from .bulk_operations import BulkExportService
        from .models import Branch
        
        branch_id = request.query_params.get('branch_id')
        branch = None
        if branch_id:
            branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="products_export_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        return BulkExportService.export_products_to_csv(request.user.tenant, branch, response)
    
    @action(detail=False, methods=['get'])
    def export_stock_levels(self, request):
        """Export stock levels to CSV."""
        from .bulk_operations import BulkExportService
        from .models import Branch
        
        branch_id = request.query_params.get('branch_id')
        if not branch_id:
            return Response({'error': 'branch_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        branch = get_object_or_404(Branch, id=branch_id, tenant=request.user.tenant)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="stock_levels_export_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        return BulkExportService.export_stock_levels_to_csv(request.user.tenant, branch, response)


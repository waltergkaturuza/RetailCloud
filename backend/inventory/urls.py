"""
URLs for inventory app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet, StockLevelViewSet,
    StockMovementViewSet, BatchViewSet
)
from .advanced_views import (
    WarehouseViewSet, WarehouseLocationViewSet, StockLocationViewSet,
    PickListViewSet, PutAwayViewSet, CycleCountViewSet, WarehouseTransferViewSet,
    ForecastingViewSet, ABCAnalysisViewSet, DeadStockViewSet, StockAgingViewSet,
    InventoryValuationViewSet, CostAdjustmentViewSet, InventoryWriteOffViewSet,
    BulkOperationsViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'stock-levels', StockLevelViewSet, basename='stock-level')
router.register(r'stock-movements', StockMovementViewSet, basename='stock-movement')
router.register(r'batches', BatchViewSet, basename='batch')

# Advanced Inventory routes
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'warehouse-locations', WarehouseLocationViewSet, basename='warehouse-location')
router.register(r'stock-locations', StockLocationViewSet, basename='stock-location')
router.register(r'pick-lists', PickListViewSet, basename='pick-list')
router.register(r'put-aways', PutAwayViewSet, basename='put-away')
router.register(r'cycle-counts', CycleCountViewSet, basename='cycle-count')
router.register(r'warehouse-transfers', WarehouseTransferViewSet, basename='warehouse-transfer')
router.register(r'forecasting', ForecastingViewSet, basename='forecasting')
router.register(r'abc-analysis', ABCAnalysisViewSet, basename='abc-analysis')
router.register(r'dead-stock', DeadStockViewSet, basename='dead-stock')
router.register(r'stock-aging', StockAgingViewSet, basename='stock-aging')
router.register(r'inventory-valuations', InventoryValuationViewSet, basename='inventory-valuation')
router.register(r'cost-adjustments', CostAdjustmentViewSet, basename='cost-adjustment')
router.register(r'inventory-write-offs', InventoryWriteOffViewSet, basename='inventory-write-off')
router.register(r'bulk-operations', BulkOperationsViewSet, basename='bulk-operations')

urlpatterns = [
    path('', include(router.urls)),
]




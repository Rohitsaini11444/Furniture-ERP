from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, LogoutView, CurrentUserView, ActiveDevicesView,
    UserViewSet,
    FinishViewSet, SampleViewSet, SampleImageViewSet,
    ProductionJobViewSet, ProductionQCLogViewSet,
    BuyerViewSet, BuyerMasterViewSet, BuyerMasterFinishingImageViewSet,
    SupplierViewSet, SupplierPOViewSet,
    PerformaInvoiceViewSet,
    BuyerPIViewSet,
    SupplierPOItemDefectViewSet,
    SupplierPOItemViewSet,
    NotificationViewSet,
    StockItemViewSet,
    GeneratePresentationView, ScanLookupView,
    GateInwardReceiptViewSet, SupplierDebitNoteViewSet, SupplierTaxInvoiceViewSet, StockOriginBreakdownView,
    DashboardStatsView,
    ProductionUnitViewSet, BuyerUnitAllocationViewSet, UnitWorkReallocationViewSet, WorkloadReallocationView,
    SampleExcelExportView, FinishExcelExportView, FinishExcelImportView,
    SampleBulkDeleteView, FinishBulkDeleteView,
    StoreItemCategoryViewSet, StoreItemViewSet, ContractorPersonViewSet, StorePurchaseOrderViewSet, StoreMaterialInViewSet, StoreDailyIssueViewSet,
    StoreStockSummaryView, MonthlyContractorBillingView,
    DatabaseRelationshipsPDFView, AuditLogViewSet,
)

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

# Store Management Routes
router.register(r'store/categories', StoreItemCategoryViewSet, basename='store-category')
router.register(r'store/items', StoreItemViewSet, basename='store-item')
router.register(r'store/contractor-persons', ContractorPersonViewSet, basename='contractor-person')
router.register(r'store/purchase-orders', StorePurchaseOrderViewSet, basename='store-po')
router.register(r'store/material-in', StoreMaterialInViewSet, basename='store-material-in')
router.register(r'store/daily-issues', StoreDailyIssueViewSet, basename='store-daily-issue')

# Production Units & Work Allocation
router.register(r'production-units', ProductionUnitViewSet, basename='production-unit')
router.register(r'buyer-unit-allocations', BuyerUnitAllocationViewSet, basename='buyer-unit-allocation')
router.register(r'unit-work-reallocations', UnitWorkReallocationViewSet, basename='unit-work-reallocation')

# ERP Core
router.register(r'finishes', FinishViewSet, basename='finish')
router.register(r'samples', SampleViewSet, basename='sample')
router.register(r'sample-images', SampleImageViewSet, basename='sample-image')
router.register(r'buyers', BuyerViewSet, basename='buyer')
router.register(r'buyer-masters', BuyerMasterViewSet, basename='buyer-master')
router.register(r'buyer-master-finishing-images', BuyerMasterFinishingImageViewSet, basename='buyer-master-finishing-image')
router.register(r'buyer-pis', BuyerPIViewSet, basename='buyer-pi')

# Supplier PO & Accounting routes
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'supplier-pos', SupplierPOViewSet, basename='supplier-po')
router.register(r'supplier-po-items', SupplierPOItemViewSet, basename='supplier-po-item')
router.register(r'supplier-po-defects', SupplierPOItemDefectViewSet, basename='supplier-po-defect')
router.register(r'supplier-tax-invoices', SupplierTaxInvoiceViewSet, basename='supplier-tax-invoice')
router.register(r'gate-inward-receipts', GateInwardReceiptViewSet, basename='gate-inward-receipt')
router.register(r'supplier-debit-notes', SupplierDebitNoteViewSet, basename='supplier-debit-note')

router.register(r'performa-invoices', PerformaInvoiceViewSet, basename='performa-invoice')
router.register(r'stock', StockItemViewSet, basename='stock')

# Production & Quality Control Pipeline
router.register(r'production-jobs', ProductionJobViewSet, basename='production-job')
router.register(r'production-qc-logs', ProductionQCLogViewSet, basename='production-qc-log')

# Users (Admin only) & Notifications
router.register(r'users', UserViewSet, basename='user')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Auth
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/devices/', ActiveDevicesView.as_view(), name='auth-devices'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),

    # Presentation Generator & QR Scanner Lookup & Stock Breakdown
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('generate-presentation/', GeneratePresentationView.as_view(), name='generate-presentation'),
    path('scan-lookup/', ScanLookupView.as_view(), name='scan-lookup'),
    path('stock/origin-breakdown/', StockOriginBreakdownView.as_view(), name='stock-origin-breakdown'),
    path('production-units/reallocate-work/', WorkloadReallocationView.as_view(), name='workload-reallocate'),
    path('samples/export-excel/', SampleExcelExportView.as_view(), name='samples-export-excel'),
    path('finishes/export-excel/', FinishExcelExportView.as_view(), name='finishes-export-excel'),
    path('finishes/import-excel/', FinishExcelImportView.as_view(), name='finishes-import-excel'),
    path('samples/bulk-delete/', SampleBulkDeleteView.as_view(), name='samples-bulk-delete'),
    path('finishes/bulk-delete/', FinishBulkDeleteView.as_view(), name='finishes-bulk-delete'),

    # Store Custom Analytics Endpoints
    path('store/stock-summary/', StoreStockSummaryView.as_view(), name='store-stock-summary'),
    path('store/monthly-contractor-bill/', MonthlyContractorBillingView.as_view(), name='store-contractor-bill'),
    path('tools/database-relationships-pdf/', DatabaseRelationshipsPDFView.as_view(), name='database-relationships-pdf'),

    # Router URLs
    path('', include(router.urls)),
]



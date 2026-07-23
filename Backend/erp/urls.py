from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, LogoutView, CurrentUserView, ActiveDevicesView,
    UserViewSet,
    SampleViewSet, SampleImageViewSet,
    ProductionJobViewSet, ProductionQCLogViewSet,
    BuyerViewSet, BuyerMasterViewSet, BuyerMasterFinishingImageViewSet,
    SupplierViewSet, SupplierPOViewSet,
    PerformaInvoiceViewSet,
    BuyerPIViewSet,
    SupplierPOItemDefectViewSet,
    SupplierPOItemViewSet,
    NotificationViewSet,
    StockItemViewSet,
    GeneratePresentationView,
)

router = DefaultRouter()

# ERP Core
router.register(r'samples', SampleViewSet, basename='sample')
router.register(r'sample-images', SampleImageViewSet, basename='sample-image')
router.register(r'buyers', BuyerViewSet, basename='buyer')
router.register(r'buyer-masters', BuyerMasterViewSet, basename='buyer-master')
router.register(r'buyer-master-finishing-images', BuyerMasterFinishingImageViewSet, basename='buyer-master-finishing-image')
router.register(r'buyer-pis', BuyerPIViewSet, basename='buyer-pi')

# Supplier PO routes
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'supplier-pos', SupplierPOViewSet, basename='supplier-po')
router.register(r'supplier-po-items', SupplierPOItemViewSet, basename='supplier-po-item')
router.register(r'supplier-po-defects', SupplierPOItemDefectViewSet, basename='supplier-po-defect')

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

    # Presentation Generator
    path('generate-presentation/', GeneratePresentationView.as_view(), name='generate-presentation'),

    # Router URLs
    path('', include(router.urls)),
]

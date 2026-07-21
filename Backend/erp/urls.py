from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, LogoutView, CurrentUserView,
    UserViewSet,
    SampleViewSet, SampleImageViewSet,
    SandingBatchViewSet, SandingAssignmentViewSet, SandingQCViewSet,
    BuyerViewSet, BuyerMasterViewSet,
    SupplierViewSet, SupplierPOViewSet,
    PerformaInvoiceViewSet,
    BuyerPIViewSet,
    SupplierPOItemDefectViewSet,
    SupplierPOItemViewSet,
    NotificationViewSet,
)

router = DefaultRouter()

# ERP Core
router.register(r'samples', SampleViewSet, basename='sample')
router.register(r'sample-images', SampleImageViewSet, basename='sample-image')
router.register(r'buyers', BuyerViewSet, basename='buyer')
router.register(r'buyer-masters', BuyerMasterViewSet, basename='buyer-master')
router.register(r'buyer-pis', BuyerPIViewSet, basename='buyer-pi')

# New Supplier PO routes (replaces old /pos/)
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'supplier-pos', SupplierPOViewSet, basename='supplier-po')
router.register(r'supplier-po-items', SupplierPOItemViewSet, basename='supplier-po-item')
router.register(r'supplier-po-defects', SupplierPOItemDefectViewSet, basename='supplier-po-defect')

router.register(r'performa-invoices', PerformaInvoiceViewSet, basename='performa-invoice')

# Users (Admin only) & Notifications
router.register(r'users', UserViewSet, basename='user')
router.register(r'notifications', NotificationViewSet, basename='notification')

# Sanding Workflow
router.register(r'sanding/batches', SandingBatchViewSet, basename='sanding-batch')
router.register(r'sanding/assignments', SandingAssignmentViewSet, basename='sanding-assignment')
router.register(r'sanding/qc', SandingQCViewSet, basename='sanding-qc')

urlpatterns = [
    # Auth
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),

    # Router URLs
    path('', include(router.urls)),
]

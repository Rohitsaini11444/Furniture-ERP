from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, LogoutView, CurrentUserView,
    UserViewSet,
    SampleViewSet, SampleImageViewSet, SalesOrderViewSet, PurchaseIMOViewSet,
    SandingBatchViewSet, SandingAssignmentViewSet, SandingQCViewSet,
    BuyerViewSet, BuyerMasterViewSet, POViewSet,
)

router = DefaultRouter()

# ERP Core
router.register(r'samples', SampleViewSet, basename='sample')
router.register(r'sample-images', SampleImageViewSet, basename='sample-image')
router.register(r'buyers', BuyerViewSet, basename='buyer')
router.register(r'buyer-masters', BuyerMasterViewSet, basename='buyer-master')
router.register(r'pos', POViewSet, basename='po')
router.register(r'sales-orders', SalesOrderViewSet)
router.register(r'purchase-imos', PurchaseIMOViewSet)

# Users (Admin only)
router.register(r'users', UserViewSet, basename='user')

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

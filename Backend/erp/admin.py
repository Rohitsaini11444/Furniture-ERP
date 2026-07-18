from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Sample, SalesOrder, PurchaseIMO,
    SandingBatch, SandingAssignment, SandingQC,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('ERP Role', {'fields': ('role', 'batch_category', 'supervisor', 'phone')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('ERP Role', {'fields': ('role', 'batch_category', 'supervisor', 'phone')}),
    )
    list_display = ['username', 'full_name', 'role', 'batch_category', 'supervisor', 'is_active']
    list_filter = ['role', 'batch_category', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering = ['role', 'username']

    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = 'Full Name'


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ['sample_id', 'product_name', 'buyer', 'material', 'finish_color']
    search_fields = ['sample_id', 'product_name', 'buyer__name', 'material']


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ['sales_order_no', 'sample', 'buyer_name', 'order_date', 'po_no']
    search_fields = ['sales_order_no', 'buyer_name', 'po_no']


@admin.register(PurchaseIMO)
class PurchaseIMOAdmin(admin.ModelAdmin):
    list_display = ['purchase_no', 'supplier_name', 'material_name', 'purchase_date', 'grn_status']
    search_fields = ['purchase_no', 'supplier_name', 'material_name']


@admin.register(SandingBatch)
class SandingBatchAdmin(admin.ModelAdmin):
    list_display = ['supervisor', 'sample', 'status', 'assigned_at']
    list_filter = ['status', 'supervisor']
    search_fields = ['sample__sample_id', 'supervisor__username']


@admin.register(SandingAssignment)
class SandingAssignmentAdmin(admin.ModelAdmin):
    list_display = ['batch', 'contractor', 'status', 'assigned_at', 'completed_at']
    list_filter = ['status', 'contractor']
    search_fields = ['contractor__username', 'batch__sample__sample_id']


@admin.register(SandingQC)
class SandingQCAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'checked_by', 'result', 'checked_at']
    list_filter = ['result', 'checked_by']
    search_fields = ['assignment__batch__sample__sample_id']

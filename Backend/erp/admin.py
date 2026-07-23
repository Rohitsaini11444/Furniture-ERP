from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Sample,
    ProductionJob, ProductionQCLog,
    PerformaInvoice, PerformaInvoiceItem, StockItem,
)


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ['stock_type', 'style_no', 'item_name', 'quantity', 'unit', 'location', 'status', 'created_at']
    list_filter = ['stock_type', 'status', 'location']
    search_fields = ['style_no', 'item_name', 'location']


@admin.register(ProductionJob)
class ProductionJobAdmin(admin.ModelAdmin):
    list_display = ['stage', 'status', 'style_no', 'item_name', 'contractor', 'assigned_by', 'assigned_qty', 'passed_qty', 'rejected_qty', 'created_at']
    list_filter = ['stage', 'status', 'contractor', 'assigned_by']
    search_fields = ['style_no', 'item_name', 'contractor__username']


@admin.register(ProductionQCLog)
class ProductionQCLogAdmin(admin.ModelAdmin):
    list_display = ['job', 'inspected_by', 'passed_qty', 'rejected_qty', 'created_at']
    list_filter = ['inspected_by']
    search_fields = ['job__style_no', 'inspected_by__username']
    search_fields = ['assignment__batch__sample__sample_id']


class PerformaInvoiceItemInline(admin.TabularInline):
    model = PerformaInvoiceItem
    extra = 1


@admin.register(PerformaInvoice)
class PerformaInvoiceAdmin(admin.ModelAdmin):
    list_display = ['pi_no', 'pi_date', 'buyer', 'buyer_order_no', 'created_at']
    search_fields = ['pi_no', 'buyer__name', 'buyer_order_no']
    inlines = [PerformaInvoiceItemInline]


from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe

ADMIN_CUSTOM_CSS = mark_safe("""
<style>
.inline-group td.delete { vertical-align: middle !important; text-align: center !important; }
.inline-group td.delete input[type="checkbox"] {
    appearance: none; -webkit-appearance: none;
    width: 28px; height: 28px;
    background-color: #fee2e2; border: 1.5px solid #f87171;
    border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: all 0.2s ease; margin: 0; outline: none;
}
.inline-group td.delete input[type="checkbox"]:before {
    content: "✖"; color: #dc2626; font-size: 14px; font-weight: bold; line-height: 1;
}
.inline-group td.delete input[type="checkbox"]:checked {
    background-color: #dc2626; border-color: #b91c1c; box-shadow: 0 2px 6px rgba(220,38,38,0.3);
}
.inline-group td.delete input[type="checkbox"]:checked:before {
    color: #ffffff;
}
.inline-group td.delete input[type="checkbox"]:hover {
    transform: scale(1.1);
}
p.file-upload { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: 0.82rem; }
p.file-upload a { color: #8b5a2b; font-weight: 600; text-decoration: underline; }
</style>
""")

from .models import (
    User, ProductionUnit, Finish, Sample, SampleImage,
    Buyer, BuyerUnitAllocation, UnitWorkReallocation,
    BuyerMaster, BuyerMasterFinishingImage,
    Supplier, SupplierPO, SupplierPOItem, POExtensionLog, POSupplierHistory,
    SupplierPOItemDefect, SupplierPOItemDefectImage,
    GateInwardReceipt, SupplierDebitNote, SupplierDebitNoteItem, SupplierTaxInvoice, SupplierTaxInvoiceItem,
    PerformaInvoice, PerformaInvoiceItem,
    BuyerPI, BuyerPIItem,
    StockItem, ProductionJob, ProductionQCLog,
    Notification, UserSession, AuditLog,
)


# ── User Admin ─────────────────────────────────────────────────────────────
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'batch_category', 'production_unit', 'supervisor', 'is_staff', 'is_active']
    list_filter = ['role', 'batch_category', 'production_unit', 'is_staff', 'is_active', 'is_superuser']
    search_fields = ['username', 'first_name', 'last_name', 'email', 'phone']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('ERP Role & Hierarchy', {'fields': ('role', 'batch_category', 'production_unit', 'supervisor', 'phone', 'profile_image')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('ERP Role & Hierarchy', {'fields': ('role', 'batch_category', 'production_unit', 'supervisor', 'phone')}),
    )


# ── Production Unit ─────────────────────────────────────────────────────────
@admin.register(ProductionUnit)
class ProductionUnitAdmin(admin.ModelAdmin):
    list_display = ['unit_code', 'name', 'location', 'capacity_pcs', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'unit_code', 'location']


# ── Finish Catalog ──────────────────────────────────────────────────────────
@admin.register(Finish)
class FinishAdmin(admin.ModelAdmin):
    list_display = ['finish_image_thumbnail', 'finish_code', 'name', 'color', 'wood_type', 'created_at']
    list_filter = ['wood_type', 'color']
    search_fields = ['name', 'finish_code', 'color', 'wood_type']

    def finish_image_thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; display: block;" />', obj.image.url)
        return format_html('<span style="color: #94a3b8; font-size: 0.78rem;">No Image</span>')

    finish_image_thumbnail.short_description = "Finish Image"


# ── Sample Catalog & Images ──────────────────────────────────────────────────
class SampleImageInline(admin.TabularInline):
    model = SampleImage
    extra = 1
    readonly_fields = ['image_preview']
    fields = ['image_preview', 'image']

    def image_preview(self, obj):
        if obj and obj.image:
            return ADMIN_CUSTOM_CSS + format_html(
                '''
                <div style="display: flex; align-items: center; gap: 10px; padding: 4px 0;">
                    <a href="{0}" target="_blank" title="Click to view full image in new tab">
                        <img src="{0}" style="width: 75px; height: 75px; object-fit: cover; border-radius: 8px; border: 2px solid #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.08); transition: transform 0.2s;" />
                    </a>
                </div>
                ''',
                obj.image.url
            )
        return ADMIN_CUSTOM_CSS + format_html('<span style="color: #94a3b8; font-size: 0.8rem; font-style: italic;">No image yet</span>')

    image_preview.short_description = "Image Preview"

@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ['sample_image_thumbnail', 'sample_id', 'style_no', 'product_name', 'buyer', 'material', 'finish_color', 'usd', 'cbm', 'vendor_name', 'created_at']
    list_filter = ['buyer', 'material']
    search_fields = ['sample_id', 'style_no', 'product_name', 'vendor_name', 'material', 'finish_color']
    readonly_fields = ['main_image_preview']
    fields = [
        'sample_id', 'style_no', 'product_name', 'buyer', 'material', 'finish', 'finish_color',
        'cbm', 'usd', 'vendor_name', 'main_image_preview', 'image',
        'size_length', 'size_breadth', 'size_height',
        'size_length_inch', 'size_breadth_inch', 'size_height_inch',
        'remark'
    ]
    inlines = [SampleImageInline]

    def sample_image_thumbnail(self, obj):
        img_url = None
        if obj.image:
            img_url = obj.image.url
        elif hasattr(obj, 'images') and obj.images.exists():
            first_img = obj.images.first()
            if first_img and first_img.image:
                img_url = first_img.image.url
        
        if img_url:
            return format_html('<img src="{}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; display: block;" />', img_url)
        return format_html('<span style="color: #94a3b8; font-size: 0.78rem;">No Image</span>')

    sample_image_thumbnail.short_description = "Sample Image"

    def main_image_preview(self, obj):
        if obj and obj.image:
            return format_html(
                '''
                <div style="margin-bottom: 8px;">
                    <a href="{0}" target="_blank" title="View main sample image">
                        <img src="{0}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px; border: 2px solid #cbd5e1; box-shadow: 0 4px 10px rgba(0,0,0,0.08);" />
                    </a>
                </div>
                ''',
                obj.image.url
            )
        return format_html('<span style="color: #94a3b8; font-size: 0.82rem; font-style: italic;">No main image uploaded</span>')

    main_image_preview.short_description = "Current Main Image"

@admin.register(SampleImage)
class SampleImageAdmin(admin.ModelAdmin):
    list_display = ['sample_image_thumbnail', 'sample', 'image', 'uploaded_at']
    search_fields = ['sample__sample_id', 'sample__style_no']
    readonly_fields = ['image_preview']
    fields = ['sample', 'image_preview', 'image']

    def sample_image_thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; display: block;" />', obj.image.url)
        return format_html('<span style="color: #94a3b8; font-size: 0.78rem;">No Image</span>')

    sample_image_thumbnail.short_description = "Image Preview"

    def image_preview(self, obj):
        if obj and obj.image:
            return format_html(
                '''
                <div style="margin-bottom: 8px;">
                    <a href="{0}" target="_blank" title="Click to view full image">
                        <img src="{0}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 10px; border: 2px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
                    </a>
                </div>
                ''',
                obj.image.url
            )
        return format_html('<span style="color: #94a3b8; font-size: 0.82rem; font-style: italic;">No image uploaded yet</span>')

    image_preview.short_description = "Current Image Preview"


# ── Buyer & Allocations ──────────────────────────────────────────────────────
class BuyerUnitAllocationInline(admin.TabularInline):
    model = BuyerUnitAllocation
    extra = 1

@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'email', 'phone', 'is_deleted', 'created_at']
    list_filter = ['is_deleted']
    search_fields = ['name', 'code', 'email', 'phone', 'address']
    inlines = [BuyerUnitAllocationInline]

@admin.register(BuyerUnitAllocation)
class BuyerUnitAllocationAdmin(admin.ModelAdmin):
    list_display = ['buyer', 'production_unit', 'is_primary', 'created_at']
    list_filter = ['is_primary', 'production_unit']
    search_fields = ['buyer__name', 'buyer__code', 'production_unit__name']

@admin.register(UnitWorkReallocation)
class UnitWorkReallocationAdmin(admin.ModelAdmin):
    list_display = ['from_unit', 'to_unit', 'buyer', 'po', 'reallocated_by', 'created_at']
    list_filter = ['from_unit', 'to_unit']
    search_fields = ['buyer__name', 'po__po_number', 'reason']


# ── Buyer Master & Finishing Images ──────────────────────────────────────────
class BuyerMasterFinishingImageInline(admin.TabularInline):
    model = BuyerMasterFinishingImage
    extra = 1

@admin.register(BuyerMaster)
class BuyerMasterAdmin(admin.ModelAdmin):
    list_display = ['style_no', 'product_name', 'buyer', 'buyer_code', 'units', 'price_usd', 'total_amount', 'created_at']
    list_filter = ['buyer', 'wood_type']
    search_fields = ['style_no', 'product_name', 'buyer_code', 'buyer__name', 'wood_type', 'finish_color']
    inlines = [BuyerMasterFinishingImageInline]

@admin.register(BuyerMasterFinishingImage)
class BuyerMasterFinishingImageAdmin(admin.ModelAdmin):
    list_display = ['buyer_master', 'uploaded_at']
    search_fields = ['buyer_master__style_no', 'buyer_master__product_name']


# ── Supplier & Supplier PO ───────────────────────────────────────────────────
class SupplierPOItemInline(admin.TabularInline):
    model = SupplierPOItem
    extra = 1

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'gstin', 'state_name', 'cartage_gst_rate', 'cartage_ledger_name', 'created_at']
    search_fields = ['name', 'phone', 'gstin', 'state_name', 'address', 'cartage_ledger_name']


@admin.register(POExtensionLog)
class POExtensionLogAdmin(admin.ModelAdmin):
    list_display = ['supplier_po', 'previous_due_date', 'new_due_date', 'days_added', 'extended_by', 'created_at']
    list_filter = ['created_at', 'extended_by']
    search_fields = ['supplier_po__po_number', 'reason', 'extended_by__username']


@admin.register(POSupplierHistory)
class POSupplierHistoryAdmin(admin.ModelAdmin):
    list_display = ['supplier_po', 'previous_supplier', 'new_supplier', 'changed_by', 'changed_at']
    list_filter = ['changed_at', 'previous_supplier', 'new_supplier']
    search_fields = ['supplier_po__po_number', 'previous_supplier__name', 'new_supplier__name', 'reason', 'changed_by__username']


@admin.register(SupplierPO)
class SupplierPOAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'po_date', 'supplier', 'production_unit', 'status', 'due_date', 'total_amount', 'created_at']
    list_filter = ['status', 'production_unit', 'supplier']
    search_fields = ['po_number', 'supplier__name', 'nku_refs', 'supervisor', 'remarks']
    inlines = [SupplierPOItemInline]

@admin.register(SupplierPOItem)
class SupplierPOItemAdmin(admin.ModelAdmin):
    list_display = ['supplier_po', 'description', 'quantity', 'passed_quantity', 'unit', 'rate', 'amount', 'buyer']
    list_filter = ['unit', 'supplier_po__status']
    search_fields = ['supplier_po__po_number', 'description', 'buyer__name']

@admin.register(SupplierPOItemDefect)
class SupplierPOItemDefectAdmin(admin.ModelAdmin):
    list_display = ['po_item', 'quantity', 'reported_by', 'created_at']
    search_fields = ['po_item__description', 'remark', 'admin_reply']

@admin.register(SupplierPOItemDefectImage)
class SupplierPOItemDefectImageAdmin(admin.ModelAdmin):
    list_display = ['defect', 'created_at']

@admin.register(GateInwardReceipt)
class GateInwardReceiptAdmin(admin.ModelAdmin):
    list_display = ['grn_number', 'round_number', 'supplier_invoice_no', 'supplier_po', 'po_item', 'receipt_date', 'passed_qty', 'rejected_qty', 'vehicle_no', 'driver_contact', 'inspected_by', 'created_at']
    list_filter = ['round_number', 'receipt_date', 'inspected_by', 'supplier_po__supplier']
    search_fields = ['grn_number', 'supplier_invoice_no', 'challan_no', 'vehicle_no', 'driver_contact', 'supplier_po__po_number', 'notes']


class SupplierTaxInvoiceItemInline(admin.TabularInline):
    model = SupplierTaxInvoiceItem
    extra = 1

@admin.register(SupplierTaxInvoice)
class SupplierTaxInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_no', 'invoice_date', 'supplier', 'delivery_note', 'despatched_through', 'total_amount', 'created_at']
    list_filter = ['invoice_date', 'supplier']
    search_fields = ['invoice_no', 'supplier__name', 'delivery_note', 'despatch_document_no', 'despatched_through', 'destination']
    inlines = [SupplierTaxInvoiceItemInline]

@admin.register(SupplierTaxInvoiceItem)
class SupplierTaxInvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['tax_invoice', 'supplier_po', 'description', 'quantity', 'passed_quantity', 'rejected_quantity', 'unit', 'rate', 'amount']
    list_filter = ['unit', 'tax_invoice__supplier']
    search_fields = ['tax_invoice__invoice_no', 'supplier_po__po_number', 'description', 'hsn_sac']


class SupplierDebitNoteItemInline(admin.TabularInline):
    model = SupplierDebitNoteItem
    extra = 1

@admin.register(SupplierDebitNote)
class SupplierDebitNoteAdmin(admin.ModelAdmin):
    list_display = ['vch_no', 'vch_date', 'supplier', 'status', 'holding_until', 'item_description', 'rejected_qty', 'total_amount', 'tally_synced', 'created_at']
    list_filter = ['status', 'tally_synced', 'vch_date']
    search_fields = ['vch_no', 'supplier__name', 'original_inv_no', 'item_description', 'remarks']
    inlines = [SupplierDebitNoteItemInline]

@admin.register(SupplierDebitNoteItem)
class SupplierDebitNoteItemAdmin(admin.ModelAdmin):
    list_display = ['debit_note', 'description', 'hsn_sac', 'rejected_qty', 'unit', 'rate', 'amount', 'reason']
    list_filter = ['unit', 'debit_note__status']
    search_fields = ['debit_note__vch_no', 'description', 'reason']


# ── Performa Invoices ───────────────────────────────────────────────────────
class PerformaInvoiceItemInline(admin.TabularInline):
    model = PerformaInvoiceItem
    extra = 1

@admin.register(PerformaInvoice)
class PerformaInvoiceAdmin(admin.ModelAdmin):
    list_display = ['pi_no', 'pi_date', 'buyer', 'buyer_order_no', 'created_at']
    list_filter = ['pi_date', 'buyer']
    search_fields = ['pi_no', 'buyer__name', 'buyer_order_no']
    inlines = [PerformaInvoiceItemInline]

@admin.register(PerformaInvoiceItem)
class PerformaInvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['pi', 'style_no', 'description', 'qty', 'rate_usd', 'amount_usd']
    search_fields = ['pi__pi_no', 'style_no', 'description']


# ── Buyer PI (Pre-PO PI) ────────────────────────────────────────────────────
class BuyerPIItemInline(admin.TabularInline):
    model = BuyerPIItem
    extra = 1

@admin.register(BuyerPI)
class BuyerPIAdmin(admin.ModelAdmin):
    list_display = ['pi_no', 'pi_date', 'buyer', 'ex_factory_date', 'payment_terms', 'created_at']
    list_filter = ['buyer', 'pi_date']
    search_fields = ['pi_no', 'buyer__name', 'delivered_to_name', 'delivered_to_company']
    inlines = [BuyerPIItemInline]

@admin.register(BuyerPIItem)
class BuyerPIItemAdmin(admin.ModelAdmin):
    list_display = ['buyer_pi', 'style_no', 'product_name', 'units', 'price_usd', 'total_amount']
    search_fields = ['buyer_pi__pi_no', 'style_no', 'product_name', 'barcode', 'buyer_no']


# ── Stock Items ─────────────────────────────────────────────────────────────
@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ['stock_type', 'style_no', 'item_name', 'quantity', 'unit', 'location', 'production_unit', 'status', 'created_at']
    list_filter = ['stock_type', 'status', 'location', 'production_unit']
    search_fields = ['style_no', 'item_name', 'location']


# ── Production Jobs & QC Logs ───────────────────────────────────────────────
@admin.register(ProductionJob)
class ProductionJobAdmin(admin.ModelAdmin):
    list_display = ['stage', 'status', 'style_no', 'item_name', 'contractor', 'assigned_by', 'production_unit', 'assigned_qty', 'passed_qty', 'rejected_qty', 'created_at']
    list_filter = ['stage', 'status', 'contractor', 'assigned_by', 'production_unit']
    search_fields = ['style_no', 'item_name', 'contractor__username', 'assigned_by__username']

@admin.register(ProductionQCLog)
class ProductionQCLogAdmin(admin.ModelAdmin):
    list_display = ['job', 'inspected_by', 'passed_qty', 'rejected_qty', 'created_at']
    list_filter = ['inspected_by']
    search_fields = ['job__style_no', 'inspected_by__username', 'notes']


# ── System Notifications & User Sessions ────────────────────────────────────
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'is_read', 'created_at']
    list_filter = ['is_read']
    search_fields = ['user__username', 'message']

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'ip_address', 'is_active', 'last_activity', 'created_at']
    list_filter = ['is_active']
    search_fields = ['user__username', 'ip_address', 'user_agent']


# ── Store Management Admin Registration ─────────────────────────────────────
from .models import (
    StoreItemCategory, StoreItem, StoreItemRateHistory, ContractorPerson,
    StorePurchaseOrder, StorePurchaseOrderItem, StoreMaterialIn, StoreDailyIssue
)

@admin.register(StoreItemCategory)
class StoreItemCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'created_at']
    search_fields = ['name', 'code']

@admin.register(StoreItem)
class StoreItemAdmin(admin.ModelAdmin):
    list_display = ['item_code', 'item_name', 'category', 'unit', 'base_rate', 'current_rate', 'default_status', 'reorder_level']
    list_filter = ['category', 'default_status', 'is_active']
    search_fields = ['item_code', 'item_name']

@admin.register(StoreItemRateHistory)
class StoreItemRateHistoryAdmin(admin.ModelAdmin):
    list_display = ['item', 'old_rate', 'new_rate', 'rate_difference', 'percentage_change', 'supplier_name', 'effective_date']
    search_fields = ['item__item_name', 'supplier_name', 'po_reference']

@admin.register(ContractorPerson)
class ContractorPersonAdmin(admin.ModelAdmin):
    list_display = ['person_name', 'contractor', 'phone', 'is_active', 'created_at']
    list_filter = ['contractor', 'is_active']
    search_fields = ['person_name', 'contractor__username']

@admin.register(StoreMaterialIn)
class StoreMaterialInAdmin(admin.ModelAdmin):
    list_display = ['voucher_no', 'inward_date', 'bill_no', 'supplier', 'item', 'qty', 'unit', 'bill_rate', 'total_amount']
    list_filter = ['supplier', 'inward_date']
    search_fields = ['voucher_no', 'bill_no', 'item__item_name']

@admin.register(StoreDailyIssue)
class StoreDailyIssueAdmin(admin.ModelAdmin):
    list_display = ['voucher_no', 'issue_date', 'contractor', 'contractor_person_name', 'item', 'qty', 'rate', 'status', 'total_amount']
    list_filter = ['contractor', 'status', 'production_unit']
    search_fields = ['voucher_no', 'contractor_person_name', 'item__item_name']


# ── Global Audit Log Admin Registration ─────────────────────────────────────

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'username', 'user_role', 'action', 'module_name', 'model_name', 'object_repr', 'ip_address']
    list_filter = ['action', 'module_name', 'user_role', 'timestamp']
    search_fields = ['username', 'object_repr', 'module_name', 'model_name', 'reason', 'ip_address']
    readonly_fields = [
        'id', 'user', 'username', 'user_role', 'ip_address', 'user_agent',
        'action', 'module_name', 'model_name', 'object_id', 'object_repr',
        'changes', 'file_info', 'reason', 'timestamp'
    ]
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True




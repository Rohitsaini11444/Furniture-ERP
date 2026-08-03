from decimal import Decimal
from erp.models import (
    SupplierPO, BuyerPI, GateInwardReceipt, SupplierDebitNote, 
    Supplier, Buyer, User, SupplierPOItemDefect
)

def admin_dashboard_stats(request):
    """
    Context processor to supply real-time database metrics, 
    status breakdowns, and chart data to the Django Admin Dashboard.
    """
    if not request.path.startswith('/admin/'):
        return {}

    try:
        # 1. Purchase Orders Metrics
        po_total = SupplierPO.objects.count()
        po_draft = SupplierPO.objects.filter(status='Draft').count()
        po_pending = SupplierPO.objects.filter(status='Pending').count()
        po_partial = SupplierPO.objects.filter(status='Partial Received').count()
        po_received = SupplierPO.objects.filter(status='Received').count()
        po_cancelled = SupplierPO.objects.filter(status='Cancelled').count()

        # 2. Buyer PIs & Sales Metrics
        pi_total = BuyerPI.objects.count()

        # 3. Gate Inward GRNs & Inspection
        grn_total = GateInwardReceipt.objects.count()

        # 4. Debit Notes & Rejections
        dn_total = SupplierDebitNote.objects.count()
        total_defects_logged = SupplierPOItemDefect.objects.count()

        # 5. Suppliers, Buyers & System Users
        supplier_total = Supplier.objects.count()
        buyer_total = Buyer.objects.count()
        user_total = User.objects.count()

        # Top 5 Suppliers by PO Volume
        suppliers = Supplier.objects.all()
        supplier_chart_labels = []
        supplier_chart_data = []
        for s in suppliers[:5]:
            supplier_chart_labels.append(s.name[:18])
            supplier_chart_data.append(s.purchase_orders.count())

        return {
            'dashboard_stats': {
                'po_total': po_total,
                'po_draft': po_draft,
                'po_pending': po_pending,
                'po_partial': po_partial,
                'po_received': po_received,
                'po_cancelled': po_cancelled,
                'pi_total': pi_total,
                'grn_total': grn_total,
                'dn_total': dn_total,
                'defects_total': total_defects_logged,
                'supplier_total': supplier_total,
                'buyer_total': buyer_total,
                'user_total': user_total,
                'supplier_chart_labels': supplier_chart_labels,
                'supplier_chart_data': supplier_chart_data,
            }
        }
    except Exception as e:
        print("Admin context processor error:", e)
        return {}

# -*- coding: utf-8 -*-
import os
import sys
from decimal import Decimal
from django.utils import timezone
import django

# Setup Django environment if run directly
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
try:
    django.setup()
except Exception:
    pass

from erp.models import (
    User, Buyer, Sample, BuyerMaster, Supplier, SupplierPO,
    SupplierPOItem, StockItem, BuyerPI, BuyerPIItem, PerformaInvoice, PerformaInvoiceItem,
    RoleChoices, BatchCategory
)

def run_seed():
    print("[SEED] Starting Database Seeding (Pinkcity Enterprises)...")

    # ── 1. Users ──
    u_admin, _ = User.objects.get_or_create(username="admin", defaults={
        "email": "admin@erp.com",
        "first_name": "System",
        "last_name": "Admin",
        "role": "admin",
        "batch_category": "None" if "" else None,
        "phone": "",
        "is_staff": True,
        "is_superuser": True,
    })
    u_admin.set_password("password123")
    u_admin.save()
    u_supervisor_sanding, _ = User.objects.get_or_create(username="supervisor_sanding", defaults={
        "email": "priya@erp.com",
        "first_name": "Priya",
        "last_name": "Sharma",
        "role": "supervisor",
        "batch_category": "sanding" if "sanding" else None,
        "phone": "",
        "is_staff": False,
        "is_superuser": False,
    })
    u_supervisor_sanding.set_password("password123")
    u_supervisor_sanding.save()
    u_contractor_ravi, _ = User.objects.get_or_create(username="contractor_ravi", defaults={
        "email": "contractor_ravi@erp.com",
        "first_name": "Ravi",
        "last_name": "Kumar",
        "role": "contractor",
        "batch_category": "None" if "" else None,
        "phone": "",
        "is_staff": False,
        "is_superuser": False,
    })
    u_contractor_ravi.set_password("password123")
    u_contractor_ravi.save()
    if User.objects.filter(username="supervisor_sanding").exists():
        u_contractor_ravi.supervisor = User.objects.get(username="supervisor_sanding")
        u_contractor_ravi.save()
    u_admin_test, _ = User.objects.get_or_create(username="admin_test", defaults={
        "email": "",
        "first_name": "",
        "last_name": "",
        "role": "admin",
        "batch_category": "None" if "" else None,
        "phone": "",
        "is_staff": True,
        "is_superuser": True,
    })
    u_admin_test.set_password("password123")
    u_admin_test.save()
    u_testadmin, _ = User.objects.get_or_create(username="testadmin", defaults={
        "email": "",
        "first_name": "",
        "last_name": "",
        "role": "admin",
        "batch_category": "None" if "" else None,
        "phone": "",
        "is_staff": False,
        "is_superuser": False,
    })
    u_testadmin.set_password("password123")
    u_testadmin.save()

    # ── 2. Buyers ──
    b_2342, _ = Buyer.objects.get_or_create(code="2342", defaults={
        "name": """ROHIT SAINI PCE19EC056""",
        "email": "2019pceecrohit56@poornima.org",
        "phone": "+918824223476",
        "address": """A, 28/C/3, Sawai Jai Singh Hwy, Kanti Nagar, Bani Park, Jaipur, Rajasthan 302016""",
    })
    b_nkuku, _ = Buyer.objects.get_or_create(code="NKUKU", defaults={
        "name": """Nkuku""",
        "email": "info@nkuku.com",
        "phone": "+44 1803 866844",
        "address": """Devon, United Kingdom""",
    })

    # ── 3. Samples (Excluding Picture Files) ──
    s_smp_001, _ = Sample.objects.get_or_create(sample_id="SMP-001", defaults={
        "style_no": "2009-031",
        "product_name": """Amhare Acacia & Jute Woven Bench""",
        "material": """werw""",
        "finish_color": """rwwre""",
        "cbm": Decimal("0.1200") if "0.1200" else None,
        "usd": Decimal("149.98") if "149.98" else None,
        "vendor_name": """Rajesh""",
        "size_length": Decimal("122.00") if "122.00" else None,
        "size_breadth": Decimal("122.00") if "122.00" else None,
        "size_height": Decimal("122.00") if "122.00" else None,
        "buyer": Buyer.objects.filter(code=None).first() if None else None,
    })
    s_ul0701, _ = Sample.objects.get_or_create(sample_id="UL0701", defaults={
        "style_no": "2203-056-SBWW",
        "product_name": """Umar Acacia Wood Side Table - Dark Brown - One Size""",
        "material": """Mango""",
        "finish_color": """SB PC Walnut Antique""",
        "cbm": Decimal("0.0500") if "0.0500" else None,
        "usd": Decimal("30.00") if "30.00" else None,
        "vendor_name": """""",
        "size_length": Decimal("48.00") if "48.00" else None,
        "size_breadth": Decimal("48.00") if "48.00" else None,
        "size_height": Decimal("55.00") if "55.00" else None,
        "buyer": Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
    })
    s_aa5801, _ = Sample.objects.get_or_create(sample_id="AA5801", defaults={
        "style_no": "2009-031",
        "product_name": """Amhara Acacia & Jute Woven Bench""",
        "material": """Acacia""",
        "finish_color": """Natural Finish""",
        "cbm": Decimal("0.2300") if "0.2300" else None,
        "usd": Decimal("43.00") if "43.00" else None,
        "vendor_name": """""",
        "size_length": Decimal("101.00") if "101.00" else None,
        "size_breadth": Decimal("36.00") if "36.00" else None,
        "size_height": Decimal("45.00") if "45.00" else None,
        "buyer": Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
    })
    s_ms1801, _ = Sample.objects.get_or_create(sample_id="MS1801", defaults={
        "style_no": "2111-002",
        "product_name": """Madrisana Acacia & Rattan Bar Stool - Natural""",
        "material": """Acacia/Rattan Weaving""",
        "finish_color": """Natural Finish""",
        "cbm": Decimal("0.3400") if "0.3400" else None,
        "usd": Decimal("80.00") if "80.00" else None,
        "vendor_name": """""",
        "size_length": Decimal("46.00") if "46.00" else None,
        "size_breadth": Decimal("56.00") if "56.00" else None,
        "size_height": Decimal("105.00") if "105.00" else None,
        "buyer": Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
    })
    s_ab7701, _ = Sample.objects.get_or_create(sample_id="AB7701", defaults={
        "style_no": "2401-021-UPMSBN",
        "product_name": """Anbu Mango Wood Upholstered Counter Chair - Natural - One""",
        "material": """Mango/Fabric""",
        "finish_color": """Sand Blast Natural / Fabric 1557 Linen""",
        "cbm": Decimal("0.3800") if "0.3800" else None,
        "usd": Decimal("70.00") if "70.00" else None,
        "vendor_name": """""",
        "size_length": Decimal("54.00") if "54.00" else None,
        "size_breadth": Decimal("52.00") if "52.00" else None,
        "size_height": Decimal("96.00") if "96.00" else None,
        "buyer": Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
    })
    s_ac1501, _ = Sample.objects.get_or_create(sample_id="AC1501", defaults={
        "style_no": "2204-027-SBWW",
        "product_name": """Anbu Acacia Dining Chair - Washed Walnut - One Size""",
        "material": """Acacia""",
        "finish_color": """Sand Blast Washed Walnut""",
        "cbm": Decimal("0.3200") if "0.3200" else None,
        "usd": Decimal("47.00") if "47.00" else None,
        "vendor_name": """""",
        "size_length": Decimal("57.00") if "57.00" else None,
        "size_breadth": Decimal("56.00") if "56.00" else None,
        "size_height": Decimal("76.00") if "76.00" else None,
        "buyer": Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
    })
    s_ac1801, _ = Sample.objects.get_or_create(sample_id="AC1801", defaults={
        "style_no": "2204-027-UP-SBWW",
        "product_name": """Anbu Acacia Upholstered Dining Chair - Washed Walnut - One Size""",
        "material": """Acacia/Fabric""",
        "finish_color": """Sand Blast Washed Walnut / Fabric 1557 Linen""",
        "cbm": Decimal("0.3000") if "0.3000" else None,
        "usd": Decimal("56.00") if "56.00" else None,
        "vendor_name": """""",
        "size_length": Decimal("57.00") if "57.00" else None,
        "size_breadth": Decimal("56.00") if "56.00" else None,
        "size_height": Decimal("76.00") if "76.00" else None,
        "buyer": Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
    })
    s_ul0601, _ = Sample.objects.get_or_create(sample_id="UL0601", defaults={
        "style_no": "2203-055-SBWW",
        "product_name": """Umar Mango Wood Coffee Table - Dark Brown - One Size""",
        "material": """Mango""",
        "finish_color": """SB PC Walnut Antique""",
        "cbm": Decimal("0.1800") if "0.1800" else None,
        "usd": Decimal("70.00") if "70.00" else None,
        "vendor_name": """""",
        "size_length": Decimal("94.00") if "94.00" else None,
        "size_breadth": Decimal("94.00") if "94.00" else None,
        "size_height": Decimal("46.00") if "46.00" else None,
        "buyer": Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
    })

    # ── 4. Buyer Masters ──
    if not BuyerMaster.objects.filter(style_no="2203-056-SBWW", buyer__code="NKUKU").exists():
        BuyerMaster.objects.create(
            style_no="2203-056-SBWW", buyer_code="UL0701",
            buyer=Buyer.objects.get(code="NKUKU"),
            sample=Sample.objects.filter(sample_id="UL0701").first() if "UL0701" else None,
            product_name="""Umar Acacia Wood Side Table - Dark Brown - One Size""",
            wood_type="""Mango""",
            finish_color="""SB PC Walnut Antique""",
            size_length=Decimal("48.00") if "48.00" else None,
            size_breadth=Decimal("48.00") if "48.00" else None,
            size_height=Decimal("55.00") if "55.00" else None,
            price_usd=Decimal("30.00") if "30.00" else None,
            units=30,
            cbm=Decimal("0.0500") if "0.0500" else None,
        )
    if not BuyerMaster.objects.filter(style_no="2009-031", buyer__code="NKUKU").exists():
        BuyerMaster.objects.create(
            style_no="2009-031", buyer_code="AA5801",
            buyer=Buyer.objects.get(code="NKUKU"),
            sample=Sample.objects.filter(sample_id="AA5801").first() if "AA5801" else None,
            product_name="""Amhara Acacia & Jute Woven Bench""",
            wood_type="""Acacia""",
            finish_color="""Natural Finish""",
            size_length=Decimal("101.00") if "101.00" else None,
            size_breadth=Decimal("36.00") if "36.00" else None,
            size_height=Decimal("45.00") if "45.00" else None,
            price_usd=Decimal("43.00") if "43.00" else None,
            units=20,
            cbm=Decimal("0.2300") if "0.2300" else None,
        )
    if not BuyerMaster.objects.filter(style_no="2111-002", buyer__code="NKUKU").exists():
        BuyerMaster.objects.create(
            style_no="2111-002", buyer_code="MS1801",
            buyer=Buyer.objects.get(code="NKUKU"),
            sample=Sample.objects.filter(sample_id="MS1801").first() if "MS1801" else None,
            product_name="""Madrisana Acacia & Rattan Bar Stool - Natural""",
            wood_type="""Acacia / Rattan Weaving""",
            finish_color="""Natural Finish""",
            size_length=Decimal("46.00") if "46.00" else None,
            size_breadth=Decimal("56.00") if "56.00" else None,
            size_height=Decimal("105.00") if "105.00" else None,
            price_usd=Decimal("80.00") if "80.00" else None,
            units=21,
            cbm=Decimal("0.3400") if "0.3400" else None,
        )
    if not BuyerMaster.objects.filter(style_no="2401-021-UPMSBN", buyer__code="NKUKU").exists():
        BuyerMaster.objects.create(
            style_no="2401-021-UPMSBN", buyer_code="AB7701",
            buyer=Buyer.objects.get(code="NKUKU"),
            sample=Sample.objects.filter(sample_id="AB7701").first() if "AB7701" else None,
            product_name="""Anbu Mango Wood Upholstered Counter Chair - Natural - One""",
            wood_type="""Mango / Fabric""",
            finish_color="""Sand Blast Natural / Fabric 1557 Linen""",
            size_length=Decimal("54.00") if "54.00" else None,
            size_breadth=Decimal("52.00") if "52.00" else None,
            size_height=Decimal("96.00") if "96.00" else None,
            price_usd=Decimal("70.00") if "70.00" else None,
            units=1,
            cbm=Decimal("0.3800") if "0.3800" else None,
        )
    if not BuyerMaster.objects.filter(style_no="2204-027-SBWW", buyer__code="NKUKU").exists():
        BuyerMaster.objects.create(
            style_no="2204-027-SBWW", buyer_code="AC1501",
            buyer=Buyer.objects.get(code="NKUKU"),
            sample=Sample.objects.filter(sample_id="AC1501").first() if "AC1501" else None,
            product_name="""Anbu Acacia Dining Chair - Washed Walnut - One Size""",
            wood_type="""Acacia""",
            finish_color="""Sand Blast Washed Walnut""",
            size_length=Decimal("57.00") if "57.00" else None,
            size_breadth=Decimal("56.00") if "56.00" else None,
            size_height=Decimal("76.00") if "76.00" else None,
            price_usd=Decimal("47.00") if "47.00" else None,
            units=119,
            cbm=Decimal("0.3200") if "0.3200" else None,
        )
    if not BuyerMaster.objects.filter(style_no="2204-027-UP-SBWW", buyer__code="NKUKU").exists():
        BuyerMaster.objects.create(
            style_no="2204-027-UP-SBWW", buyer_code="AC1801",
            buyer=Buyer.objects.get(code="NKUKU"),
            sample=Sample.objects.filter(sample_id="AC1801").first() if "AC1801" else None,
            product_name="""Anbu Acacia Upholstered Dining Chair - Washed Walnut - One Size""",
            wood_type="""Acacia / Fabric""",
            finish_color="""Sand Blast Washed Walnut / Fabric 1557 Linen""",
            size_length=Decimal("57.00") if "57.00" else None,
            size_breadth=Decimal("56.00") if "56.00" else None,
            size_height=Decimal("76.00") if "76.00" else None,
            price_usd=Decimal("56.00") if "56.00" else None,
            units=12,
            cbm=Decimal("0.3000") if "0.3000" else None,
        )
    if not BuyerMaster.objects.filter(style_no="2203-055-SBWW", buyer__code="NKUKU").exists():
        BuyerMaster.objects.create(
            style_no="2203-055-SBWW", buyer_code="UL0601",
            buyer=Buyer.objects.get(code="NKUKU"),
            sample=Sample.objects.filter(sample_id="UL0601").first() if "UL0601" else None,
            product_name="""Umar Mango Wood Coffee Table - Dark Brown - One Size""",
            wood_type="""Mango""",
            finish_color="""SB PC Walnut Antique""",
            size_length=Decimal("94.00") if "94.00" else None,
            size_breadth=Decimal("94.00") if "94.00" else None,
            size_height=Decimal("46.00") if "46.00" else None,
            price_usd=Decimal("70.00") if "70.00" else None,
            units=20,
            cbm=Decimal("0.1800") if "0.1800" else None,
        )

    # ── 5. Suppliers ──
    sup_0, _ = Supplier.objects.get_or_create(name="""INDIA ARTS LTD""", defaults={
        "address": """A, 28/C/3, Sawai Jai Singh Hwy, Kanti Nagar, Bani Park, Jaipur, Rajasthan 302016""",
        "phone": "08824223476",
        "gstin": "34567",
        "state_name": "Rajasthan",
    })
    sup_1, _ = Supplier.objects.get_or_create(name="""Rakesh Sharma ltd""", defaults={
        "address": """A, 28/C/3, Sawai Jai Singh Hwy, Kanti Nagar, Bani Park, Jaipur, Rajasthan 302016""",
        "phone": "08824223476",
        "gstin": "34567",
        "state_name": "Rajasthan",
    })

    # ── 6. Supplier Purchase Orders (POs) & Items ──
    po_0, _ = SupplierPO.objects.get_or_create(po_number="PO-322", defaults={
        "po_date": "2026-07-24",
        "due_date": "2026-07-31" if "2026-07-31" else None,
        "supplier": Supplier.objects.get(name="""INDIA ARTS LTD"""),
        "mode_of_payment": "Cheque",
        "terms_of_delivery": """FOB""",
        "status": "Pending",
    })
    if not SupplierPOItem.objects.filter(supplier_po=po_0, description="""Natural Jute""").exists():
        SupplierPOItem.objects.create(
            supplier_po=po_0, description="""Natural Jute""",
            buyer=Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
            quantity=Decimal("75.00"),
            passed_quantity=Decimal("0.00"),
            unit="pcs",
            rate=Decimal("110.00"),
        )
    po_1, _ = SupplierPO.objects.get_or_create(po_number="PO-01", defaults={
        "po_date": "2026-07-24",
        "due_date": "2026-07-31" if "2026-07-31" else None,
        "supplier": Supplier.objects.get(name="""Rakesh Sharma ltd"""),
        "mode_of_payment": "Cheque",
        "terms_of_delivery": """FOB""",
        "status": "Received",
    })
    if not SupplierPOItem.objects.filter(supplier_po=po_1, description="""Natural Jute""").exists():
        SupplierPOItem.objects.create(
            supplier_po=po_1, description="""Natural Jute""",
            buyer=Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
            quantity=Decimal("200.00"),
            passed_quantity=Decimal("200.00"),
            unit="pcs",
            rate=Decimal("150.00"),
        )

    # ── 7. Stock Items ──
    if not StockItem.objects.filter(style_no="Natural", item_name="""Natural Jute""", buyer__code="NKUKU").exists():
        StockItem.objects.create(
            style_no="Natural", item_name="""Natural Jute""",
            quantity=Decimal("25.00"),
            unit="pcs",
            unit_price=Decimal("None") if "" else None,
            location="Main Store",
            status="In Stock",
            buyer=Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
            sample=Sample.objects.filter(sample_id=None).first() if None else None,
        )
    if not StockItem.objects.filter(style_no="Natural", item_name="""Natural Jute""", buyer__code="NKUKU").exists():
        StockItem.objects.create(
            style_no="Natural", item_name="""Natural Jute""",
            quantity=Decimal("50.01"),
            unit="pcs",
            unit_price=Decimal("None") if "" else None,
            location="Main Store",
            status="In Stock",
            buyer=Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
            sample=Sample.objects.filter(sample_id=None).first() if None else None,
        )
    if not StockItem.objects.filter(style_no="Natural", item_name="""Natural Jute""", buyer__code="NKUKU").exists():
        StockItem.objects.create(
            style_no="Natural", item_name="""Natural Jute""",
            quantity=Decimal("100.00"),
            unit="pcs",
            unit_price=Decimal("None") if "" else None,
            location="Main Store",
            status="In Stock",
            buyer=Buyer.objects.filter(code="NKUKU").first() if "NKUKU" else None,
            sample=Sample.objects.filter(sample_id=None).first() if None else None,
        )

    # ── 8. Buyer PIs & Line Items ──
    bpi_0, _ = BuyerPI.objects.get_or_create(pi_no="P7457778", defaults={
        "buyer": Buyer.objects.get(code="NKUKU"),
        "pi_date": "2026-07-24" if "2026-07-24" else None,
        "ex_factory_date": "None" if "" else None,
        "payment_terms": """100% TT 30 Days from BL""",
        "delivered_to_name": """ROHIT SAINI PCE19EC056""",
        "delivered_to_company": """Nkuku""",
        "delivered_to_address": """A, 28/C/3, Sawai Jai Singh Hwy, Kanti Nagar, Bani Park, Jaipur, Rajasthan 302016""",
    })
    if not BuyerPIItem.objects.filter(buyer_pi=bpi_0, style_no="2111-002").exists():
        BuyerPIItem.objects.create(
            buyer_pi=bpi_0, style_no="2111-002",
            product_name="""Madrisana Acacia & Rattan Bar Stool - Natural""",
            material="""Acacia / Rattan Weaving""",
            finish_color="""Natural Finish""",
            units=21,
            price_usd=Decimal("80.00") if "80.00" else None,
            cbm=Decimal("0.3400") if "0.3400" else None,
        )
    if not BuyerPIItem.objects.filter(buyer_pi=bpi_0, style_no="2204-027-SBWW").exists():
        BuyerPIItem.objects.create(
            buyer_pi=bpi_0, style_no="2204-027-SBWW",
            product_name="""Anbu Acacia Dining Chair - Washed Walnut - One Size""",
            material="""Acacia""",
            finish_color="""Sand Blast Washed Walnut""",
            units=119,
            price_usd=Decimal("47.00") if "47.00" else None,
            cbm=Decimal("0.3200") if "0.3200" else None,
        )
    if not BuyerPIItem.objects.filter(buyer_pi=bpi_0, style_no="2203-055-SBWW").exists():
        BuyerPIItem.objects.create(
            buyer_pi=bpi_0, style_no="2203-055-SBWW",
            product_name="""Umar Mango Wood Coffee Table - Dark Brown - One Size""",
            material="""Mango""",
            finish_color="""SB PC Walnut Antique""",
            units=20,
            price_usd=Decimal("70.00") if "70.00" else None,
            cbm=Decimal("0.1800") if "0.1800" else None,
        )
    if not BuyerPIItem.objects.filter(buyer_pi=bpi_0, style_no="2204-027-UP-SBWW").exists():
        BuyerPIItem.objects.create(
            buyer_pi=bpi_0, style_no="2204-027-UP-SBWW",
            product_name="""Anbu Acacia Upholstered Dining Chair - Washed Walnut - One Size""",
            material="""Acacia / Fabric""",
            finish_color="""Sand Blast Washed Walnut / Fabric 1557 Linen""",
            units=12,
            price_usd=Decimal("56.00") if "56.00" else None,
            cbm=Decimal("0.3000") if "0.3000" else None,
        )

    # ── 9. Performa Invoices (Export PIs) ──

    print("[SEED] Seeding Completed Successfully! All Users, Buyers, Samples, POs, PIs, and Stock loaded.")

if __name__ == "__main__":
    run_seed()
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from decimal import Decimal
from erp.models import (
    User, Buyer, Sample, BuyerMaster, Supplier, SupplierPO,
    SupplierPOItem, StockItem, BuyerPI, BuyerPIItem, PerformaInvoice, PerformaInvoiceItem
)

def build_seed_file():
    lines = []
    lines.append('# -*- coding: utf-8 -*-')
    lines.append('import os')
    lines.append('import sys')
    lines.append('from decimal import Decimal')
    lines.append('from django.utils import timezone')
    lines.append('import django')
    lines.append('')
    lines.append('# Setup Django environment if run directly')
    lines.append('os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")')
    lines.append('try:')
    lines.append('    django.setup()')
    lines.append('except Exception:')
    lines.append('    pass')
    lines.append('')
    lines.append('from erp.models import (')
    lines.append('    User, Buyer, Sample, BuyerMaster, Supplier, SupplierPO,')
    lines.append('    SupplierPOItem, StockItem, BuyerPI, BuyerPIItem, PerformaInvoice, PerformaInvoiceItem,')
    lines.append('    RoleChoices, BatchCategory')
    lines.append(')')
    lines.append('')
    lines.append('def run_seed():')
    lines.append('    print("[SEED] Starting Database Seeding (Pinkcity Enterprises)...")')
    lines.append('')

    # 1. Users
    lines.append('    # ── 1. Users ──')
    for u in User.objects.all():
        sup_code = f'"{u.supervisor.username}"' if u.supervisor else 'None'
        lines.append(f'    u_{u.username.replace("-", "_")}, _ = User.objects.get_or_create(username="{u.username}", defaults={{')
        lines.append(f'        "email": "{u.email or ""}",')
        lines.append(f'        "first_name": "{u.first_name or ""}",')
        lines.append(f'        "last_name": "{u.last_name or ""}",')
        lines.append(f'        "role": "{u.role}",')
        lines.append(f'        "batch_category": "{u.batch_category}" if "{u.batch_category or ""}" else None,')
        lines.append(f'        "phone": "{u.phone or ""}",')
        lines.append(f'        "is_staff": {u.is_staff},')
        lines.append(f'        "is_superuser": {u.is_superuser},')
        lines.append('    })')
        lines.append(f'    u_{u.username.replace("-", "_")}.set_password("password123")')
        lines.append(f'    u_{u.username.replace("-", "_")}.save()')
        if u.supervisor:
            lines.append(f'    if User.objects.filter(username={sup_code}).exists():')
            lines.append(f'        u_{u.username.replace("-", "_")}.supervisor = User.objects.get(username={sup_code})')
            lines.append(f'        u_{u.username.replace("-", "_")}.save()')
    lines.append('')

    # 2. Buyers
    lines.append('    # ── 2. Buyers ──')
    for b in Buyer.objects.all():
        var_name = b.code.replace('-', '_').replace(' ', '_').lower()
        lines.append(f'    b_{var_name}, _ = Buyer.objects.get_or_create(code="{b.code}", defaults={{')
        lines.append(f'        "name": """{b.name}""",')
        lines.append(f'        "email": "{b.email or ""}",')
        lines.append(f'        "phone": "{b.phone or ""}",')
        lines.append(f'        "address": """{b.address or ""}""",')
        lines.append('    })')
    lines.append('')

    # 3. Samples (WITHOUT PICTURES)
    lines.append('    # ── 3. Samples (Excluding Picture Files) ──')
    for s in Sample.objects.all():
        b_code = f'"{s.buyer.code}"' if s.buyer else 'None'
        var_name = s.sample_id.replace('-', '_').replace(' ', '_').lower()
        lines.append(f'    s_{var_name}, _ = Sample.objects.get_or_create(sample_id="{s.sample_id}", defaults={{')
        lines.append(f'        "style_no": "{s.style_no or ""}",')
        lines.append(f'        "product_name": """{s.product_name}""",')
        lines.append(f'        "material": """{s.material or ""}""",')
        lines.append(f'        "finish_color": """{s.finish_color or ""}""",')
        lines.append(f'        "cbm": Decimal("{s.cbm}") if "{s.cbm or ""}" else None,')
        lines.append(f'        "usd": Decimal("{s.usd}") if "{s.usd or ""}" else None,')
        lines.append(f'        "vendor_name": """{s.vendor_name or ""}""",')
        lines.append(f'        "size_length": Decimal("{s.size_length}") if "{s.size_length or ""}" else None,')
        lines.append(f'        "size_breadth": Decimal("{s.size_breadth}") if "{s.size_breadth or ""}" else None,')
        lines.append(f'        "size_height": Decimal("{s.size_height}") if "{s.size_height or ""}" else None,')
        lines.append(f'        "buyer": Buyer.objects.filter(code={b_code}).first() if {b_code} else None,')
        lines.append('    })')
    lines.append('')

    # 4. Buyer Masters (WITHOUT PICTURES)
    lines.append('    # ── 4. Buyer Masters ──')
    for idx, bm in enumerate(BuyerMaster.objects.all()):
        b_code = f'"{bm.buyer.code}"' if bm.buyer else 'None'
        s_id = f'"{bm.sample.sample_id}"' if bm.sample else 'None'
        lines.append(f'    if not BuyerMaster.objects.filter(style_no="{bm.style_no}", buyer__code={b_code}).exists():')
        lines.append(f'        BuyerMaster.objects.create(')
        lines.append(f'            style_no="{bm.style_no}", buyer_code="{bm.buyer_code}",')
        lines.append(f'            buyer=Buyer.objects.get(code={b_code}),')
        lines.append(f'            sample=Sample.objects.filter(sample_id={s_id}).first() if {s_id} else None,')
        lines.append(f'            product_name="""{bm.product_name}""",')
        lines.append(f'            wood_type="""{bm.wood_type or ""}""",')
        lines.append(f'            finish_color="""{bm.finish_color or ""}""",')
        lines.append(f'            size_length=Decimal("{bm.size_length}") if "{bm.size_length or ""}" else None,')
        lines.append(f'            size_breadth=Decimal("{bm.size_breadth}") if "{bm.size_breadth or ""}" else None,')
        lines.append(f'            size_height=Decimal("{bm.size_height}") if "{bm.size_height or ""}" else None,')
        lines.append(f'            price_usd=Decimal("{bm.price_usd}") if "{bm.price_usd or ""}" else None,')
        lines.append(f'            units={bm.units or 1},')
        lines.append(f'            cbm=Decimal("{bm.cbm}") if "{bm.cbm or ""}" else None,')
        lines.append('        )')
    lines.append('')

    # 5. Suppliers
    lines.append('    # ── 5. Suppliers ──')
    for idx, sup in enumerate(Supplier.objects.all()):
        lines.append(f'    sup_{idx}, _ = Supplier.objects.get_or_create(name="""{sup.name}""", defaults={{')
        lines.append(f'        "address": """{sup.address or ""}""",')
        lines.append(f'        "phone": "{sup.phone or ""}",')
        lines.append(f'        "gstin": "{sup.gstin or ""}",')
        lines.append(f'        "state_name": "{sup.state_name or ""}",')
        lines.append('    })')
    lines.append('')

    # 6. Supplier POs & Items
    lines.append('    # ── 6. Supplier Purchase Orders (POs) & Items ──')
    for idx, po in enumerate(SupplierPO.objects.all()):
        lines.append(f'    po_{idx}, _ = SupplierPO.objects.get_or_create(po_number="{po.po_number}", defaults={{')
        lines.append(f'        "po_date": "{po.po_date}",')
        lines.append(f'        "due_date": "{po.due_date}" if "{po.due_date or ""}" else None,')
        lines.append(f'        "supplier": Supplier.objects.get(name="""{po.supplier.name}"""),')
        lines.append(f'        "mode_of_payment": "{po.mode_of_payment or ""}",')
        lines.append(f'        "terms_of_delivery": """{po.terms_of_delivery or ""}""",')
        lines.append(f'        "status": "{po.status}",')
        lines.append('    })')
        for item in po.items.all():
            b_code = f'"{item.buyer.code}"' if item.buyer else 'None'
            lines.append(f'    if not SupplierPOItem.objects.filter(supplier_po=po_{idx}, description="""{item.description}""").exists():')
            lines.append(f'        SupplierPOItem.objects.create(')
            lines.append(f'            supplier_po=po_{idx}, description="""{item.description}""",')
            lines.append(f'            buyer=Buyer.objects.filter(code={b_code}).first() if {b_code} else None,')
            lines.append(f'            quantity=Decimal("{item.quantity}"),')
            lines.append(f'            passed_quantity=Decimal("{item.passed_quantity}"),')
            lines.append(f'            unit="{item.unit}",')
            lines.append(f'            rate=Decimal("{item.rate}"),')
            lines.append('        )')
    lines.append('')

    # 7. Stock Items
    lines.append('    # ── 7. Stock Items ──')
    for idx, stk in enumerate(StockItem.objects.all()):
        b_code = f'"{stk.buyer.code}"' if stk.buyer else 'None'
        s_id = f'"{stk.sample.sample_id}"' if stk.sample else 'None'
        lines.append(f'    if not StockItem.objects.filter(style_no="{stk.style_no}", item_name="""{stk.item_name}""", buyer__code={b_code}).exists():')
        lines.append(f'        StockItem.objects.create(')
        lines.append(f'            style_no="{stk.style_no}", item_name="""{stk.item_name}""",')
        lines.append(f'            quantity=Decimal("{stk.quantity}"),')
        lines.append(f'            unit="{stk.unit}",')
        lines.append(f'            unit_price=Decimal("{stk.unit_price}") if "{stk.unit_price or ""}" else None,')
        lines.append(f'            location="{stk.location or "Main Store"}",')
        lines.append(f'            status="{stk.status}",')
        lines.append(f'            buyer=Buyer.objects.filter(code={b_code}).first() if {b_code} else None,')
        lines.append(f'            sample=Sample.objects.filter(sample_id={s_id}).first() if {s_id} else None,')
        lines.append('        )')
    lines.append('')

    # 8. Buyer PIs & Items
    lines.append('    # ── 8. Buyer PIs & Line Items ──')
    for idx, bpi in enumerate(BuyerPI.objects.all()):
        lines.append(f'    bpi_{idx}, _ = BuyerPI.objects.get_or_create(pi_no="{bpi.pi_no}", defaults={{')
        lines.append(f'        "buyer": Buyer.objects.get(code="{bpi.buyer.code}"),')
        lines.append(f'        "pi_date": "{bpi.pi_date}" if "{bpi.pi_date or ""}" else None,')
        lines.append(f'        "ex_factory_date": "{bpi.ex_factory_date}" if "{bpi.ex_factory_date or ""}" else None,')
        lines.append(f'        "payment_terms": """{bpi.payment_terms or ""}""",')
        lines.append(f'        "delivered_to_name": """{bpi.delivered_to_name or ""}""",')
        lines.append(f'        "delivered_to_company": """{bpi.delivered_to_company or ""}""",')
        lines.append(f'        "delivered_to_address": """{bpi.delivered_to_address or ""}""",')
        lines.append('    })')
        for bpi_item in bpi.items.all():
            lines.append(f'    if not BuyerPIItem.objects.filter(buyer_pi=bpi_{idx}, style_no="{bpi_item.style_no}").exists():')
            lines.append(f'        BuyerPIItem.objects.create(')
            lines.append(f'            buyer_pi=bpi_{idx}, style_no="{bpi_item.style_no}",')
            lines.append(f'            product_name="""{bpi_item.product_name or ""}""",')
            lines.append(f'            material="""{bpi_item.material or ""}""",')
            lines.append(f'            finish_color="""{bpi_item.finish_color or ""}""",')
            lines.append(f'            units={bpi_item.units or 1},')
            lines.append(f'            price_usd=Decimal("{bpi_item.price_usd}") if "{bpi_item.price_usd or ""}" else None,')
            lines.append(f'            cbm=Decimal("{bpi_item.cbm}") if "{bpi_item.cbm or ""}" else None,')
            lines.append('        )')
    lines.append('')

    # 9. PerformaInvoices (Export PIs)
    lines.append('    # ── 9. Performa Invoices (Export PIs) ──')
    for idx, pi in enumerate(PerformaInvoice.objects.all()):
        lines.append(f'    pi_{idx}, _ = PerformaInvoice.objects.get_or_create(pi_no="{pi.pi_no}", defaults={{')
        lines.append(f'        "buyer": Buyer.objects.get(code="{pi.buyer.code}"),')
        lines.append(f'        "pi_date": "{pi.pi_date}" if "{pi.pi_date or ""}" else None,')
        lines.append(f'        "buyer_order_no": "{pi.buyer_order_no or ""}",')
        lines.append(f'        "department_no": "{pi.department_no or ""}",')
        lines.append(f'        "vessel_flight_no": "{pi.vessel_flight_no or ""}",')
        lines.append(f'        "port_of_loading": "{pi.port_of_loading or ""}",')
        lines.append('    })')
        for pi_item in pi.items.all():
            lines.append(f'    if not PerformaInvoiceItem.objects.filter(pi=pi_{idx}, style_no="{pi_item.style_no}").exists():')
            lines.append(f'        PerformaInvoiceItem.objects.create(')
            lines.append(f'            pi=pi_{idx}, style_no="{pi_item.style_no}",')
            lines.append(f'            description="""{pi_item.description or ""}""",')
            lines.append(f'            qty={pi_item.qty or 1},')
            lines.append(f'            rate_usd=Decimal("{pi_item.rate_usd}") if "{pi_item.rate_usd or ""}" else None,')
            lines.append(f'            volume_per_pc=Decimal("{pi_item.volume_per_pc}") if "{pi_item.volume_per_pc or ""}" else None,')
            lines.append('        )')
    lines.append('')

    lines.append('    print("[SEED] Seeding Completed Successfully! All Users, Buyers, Samples, POs, PIs, and Stock loaded.")')
    lines.append('')
    lines.append('if __name__ == "__main__":')
    lines.append('    run_seed()')

    with open('seed.py', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('Successfully generated seed.py with', len(lines), 'lines!')

if __name__ == '__main__':
    build_seed_file()

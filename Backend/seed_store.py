import os
import django
from decimal import Decimal
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from erp.models import (
    User, RoleChoices, ProductionUnit, Supplier, StoreItemCategory,
    StoreItem, StoreItemStatus, StoreItemRateHistory, ContractorPerson,
    StorePurchaseOrder, StorePurchaseOrderItem, StoreMaterialIn, StoreDailyIssue
)

def seed_complete_store_data():
    print("Starting full Store Management data seeding...")

    # 1. Clear existing Store data to give fresh clean 5+ records in every table
    StoreDailyIssue.objects.all().delete()
    StoreMaterialIn.objects.all().delete()
    StorePurchaseOrderItem.objects.all().delete()
    StorePurchaseOrder.objects.all().delete()
    StoreItemRateHistory.objects.all().delete()
    ContractorPerson.objects.all().delete()
    StoreItem.objects.all().delete()
    StoreItemCategory.objects.all().delete()

    print("Cleaned existing store tables.")

    # 2. Create Store Categories (6 categories)
    categories_data = [
        ("Abrasives & Sand Paper", "ABR"),
        ("Adhesives & Glues", "ADH"),
        ("Paints, Lacquers & Sealers", "PNT"),
        ("Hardware & Tools", "HWD"),
        ("Polish & Chemicals", "CHM"),
        ("Packaging & Tapes", "PKG"),
    ]

    cat_map = {}
    for name, code in categories_data:
        cat = StoreItemCategory.objects.create(name=name, code=code)
        cat_map[code] = cat

    print("Created 6 Store Categories.")

    # 3. Create Store Items (12 Items from Excel Sheet 5)
    items_data = [
        ("IT001", "Rejmal 220 Sand Paper", "ABR", "pcs", Decimal("16.00"), Decimal("18.50"), StoreItemStatus.CHARGE, Decimal("50.00"), "Standard abrasive sheet for sanding wood"),
        ("IT002", "Rejmal 320 Fine Sand Paper", "ABR", "pcs", Decimal("16.00"), Decimal("16.00"), StoreItemStatus.CHARGE, Decimal("50.00"), "Fine grain sandpaper for final finishing"),
        ("IT004", "Grinder Disc 5'120", "HWD", "pkt", Decimal("15.75"), Decimal("18.00"), StoreItemStatus.NON_CHARGE, Decimal("10.00"), "Grinding disc 120 grit"),
        ("IT010", "3M Gex 5'80 Disc", "ABR", "pcs", Decimal("40.00"), Decimal("45.00"), StoreItemStatus.CHARGE, Decimal("20.00"), "Heavy duty 3M sanding disc 80 grit"),
        ("IT011", "3M Gex 6'80 Heavy Disc", "ABR", "pcs", Decimal("50.00"), Decimal("55.00"), StoreItemStatus.CHARGE, Decimal("25.00"), "6 inch 3M Gex disc"),
        ("IT019", "Saree / Cloth Wipe Roll", "PKG", "pcs", Decimal("28.00"), Decimal("28.00"), StoreItemStatus.CHARGE, Decimal("100.00"), "Cotton wipe cloth for polish wiping"),
        ("IT020", "Spray Gun Nozzle 1.4mm", "HWD", "pcs", Decimal("850.00"), Decimal("920.00"), StoreItemStatus.NON_CHARGE, Decimal("2.00"), "Precision lacquer spray gun"),
        ("IT021", "Fevicol Bond Synthetic Glue", "ADH", "box", Decimal("160.00"), Decimal("175.00"), StoreItemStatus.NON_CHARGE, Decimal("5.00"), "Strong woodworking adhesive bond"),
        ("IT022", "Sander Pad 5 Inch Rubber", "HWD", "pcs", Decimal("250.00"), Decimal("250.00"), StoreItemStatus.CHARGE, Decimal("5.00"), "Replacement sander pad for orbital machine"),
        ("IT026", "Easy Lacquer High Gloss 20L", "PNT", "ltr", Decimal("4100.00"), Decimal("4350.00"), StoreItemStatus.NON_CHARGE, Decimal("10.00"), "Clear PU gloss topcoat lacquer"),
        ("IT029", "NC Sealer Wood Primer 20L", "PNT", "ltr", Decimal("135.00"), Decimal("145.00"), StoreItemStatus.NON_CHARGE, Decimal("15.00"), "Nitrocellulose base wood sealer"),
        ("IT061", "JK Laxmi Smart Wall Putty 40kg", "PNT", "kg", Decimal("635.59"), Decimal("650.00"), StoreItemStatus.NON_CHARGE, Decimal("10.00"), "Smooth surface levelling putty"),
    ]

    item_objs = {}
    for code, name, cat_code, unit, base_rate, cur_rate, status, reorder, rem in items_data:
        item = StoreItem.objects.create(
            item_code=code,
            item_name=name,
            category=cat_map[cat_code],
            unit=unit,
            base_rate=base_rate,
            current_rate=cur_rate,
            default_status=status,
            reorder_level=reorder,
            remark=rem
        )
        item_objs[code] = item

    print("Created 12 Store Item Masters.")

    # 4. Create Rate History Logs (Price Comparison Matrix Data)
    suppliers_names = ["BASAWA ENT.", "ANUPAM PAINTS", "IDEAL COATING IND.", "ABHINANDAN PACK.", "Naman Enterprises"]
    sup_objs = []
    for s_name in suppliers_names:
        sup, _ = Supplier.objects.get_or_create(name=s_name)
        sup_objs.append(sup)

    for item in item_objs.values():
        if item.current_rate > item.base_rate:
            diff = item.current_rate - item.base_rate
            pct = round((diff / item.base_rate * 100), 2)
            StoreItemRateHistory.objects.create(
                item=item,
                old_rate=item.base_rate,
                new_rate=item.current_rate,
                rate_difference=diff,
                percentage_change=pct,
                supplier_name=random.choice(suppliers_names),
                po_reference=f"PO-2026-{random.randint(100, 999)}",
                revision_reason="Supplier price hike notice due to raw material cost increase",
                effective_date=date(2026, 7, 15)
            )

    print("Created Rate History & Comparison Matrix records.")

    # 5. Production Units (Unit #1, Unit #4, Unit #5, Unit #9, Unit #11)
    units_names = ["Unit #1", "Unit #4", "Unit #5", "Unit #9", "Unit #11"]
    unit_objs = []
    for u_name in units_names:
        u_code = u_name.replace(" ", "").replace("#", "")
        pu, _ = ProductionUnit.objects.get_or_create(name=u_name, defaults={'unit_code': u_code})
        unit_objs.append(pu)

    print("Created Production Units.")

    # 6. Contractors & Worker Persons (Directory from Excel Sheet 3)
    contractors_data = [
        ("pappu_4no", "Pappu 4.NO", "9829011111", "Raju Worker"),
        ("hansraj_4no", "Hansraj 4.NO", "9829022222", "Mohan Worker"),
        ("babulal_1no", "Babulal 1.NO", "9829033333", "Sitaram Worker"),
        ("bhuna_1no", "Bhuna 1.NO", "9829044444", "Ramesh Worker"),
        ("rishikesh_5no", "Rishikesh 5.NO", "9829055555", "Suresh Worker"),
        ("ramavtar_1no", "Ramavtar 1.NO", "9829066666", "Gopal Worker"),
    ]

    contractor_users = []
    contractor_persons = []
    for uname, fname, phone, worker_name in contractors_data:
        user, _ = User.objects.get_or_create(
            username=uname,
            defaults={
                'first_name': fname,
                'role': RoleChoices.CONTRACTOR,
                'phone': phone
            }
        )
        contractor_users.append(user)

        cp = ContractorPerson.objects.create(
            contractor=user,
            person_name=worker_name,
            phone=f"98280{random.randint(10000, 99999)}",
            remark=f"Authorized worker for {fname}"
        )
        contractor_persons.append(cp)

    print("Created Contractors & Worker Person Delegates.")

    # 7. Create Material In (Inward Receipts Crediting Stock - Excel Sheet 4)
    material_in_records = [
        ("ST-IN-2026-001", date(2026, 7, 20), "Jul-26", "2667", sup_objs[1], item_objs["IT061"], Decimal("50.000"), Decimal("635.59"), unit_objs[0]),
        ("ST-IN-2026-002", date(2026, 7, 22), "Jul-26", "2667", sup_objs[1], item_objs["IT019"], Decimal("500.000"), Decimal("28.00"), unit_objs[0]),
        ("ST-IN-2026-003", date(2026, 7, 25), "Jul-26", "2668", sup_objs[0], item_objs["IT001"], Decimal("2500.000"), Decimal("18.50"), unit_objs[0]),
        ("ST-IN-2026-004", date(2026, 7, 26), "Jul-26", "2668", sup_objs[0], item_objs["IT002"], Decimal("3000.000"), Decimal("16.00"), unit_objs[1]),
        ("ST-IN-2026-005", date(2026, 7, 28), "Jul-26", "2669", sup_objs[2], item_objs["IT010"], Decimal("1500.000"), Decimal("45.00"), unit_objs[1]),
        ("ST-IN-2026-006", date(2026, 7, 29), "Jul-26", "2669", sup_objs[2], item_objs["IT011"], Decimal("2000.000"), Decimal("55.00"), unit_objs[2]),
        ("ST-IN-2026-007", date(2026, 7, 30), "Jul-26", "2670", sup_objs[3], item_objs["IT026"], Decimal("200.000"), Decimal("4350.00"), unit_objs[2]),
        ("ST-IN-2026-008", date(2026, 8, 1),  "Aug-26", "2671", sup_objs[0], item_objs["IT020"], Decimal("20.000"), Decimal("920.00"), unit_objs[3]),
        ("ST-IN-2026-009", date(2026, 8, 2),  "Aug-26", "2672", sup_objs[4], item_objs["IT021"], Decimal("100.000"), Decimal("175.00"), unit_objs[4]),
        ("ST-IN-2026-010", date(2026, 8, 3),  "Aug-26", "2673", sup_objs[1], item_objs["IT029"], Decimal("300.000"), Decimal("145.00"), unit_objs[0]),
    ]

    for vno, dt, month, bill, sup, item, qty, rate, punit in material_in_records:
        StoreMaterialIn.objects.create(
            voucher_no=vno,
            inward_date=dt,
            month_year=month,
            bill_no=bill,
            supplier=sup,
            item=item,
            qty=qty,
            unit=item.unit,
            bill_rate=rate,
            total_amount=qty * rate,
            production_unit=punit,
            remark=f"Inward stock received against invoice {bill}"
        )

    print("Created 10 Material Inward Stock Receipts.")

    # 8. Create Store Daily Issues (Outward Ledger Debiting Stock - Excel Sheet 2)
    daily_issues_records = [
        ("VCH-101", date(2026, 7, 21), "Jul-26", contractor_users[0], contractor_persons[0], "Pappu 4.NO - Worker Raju", item_objs["IT020"], Decimal("1.000"), StoreItemStatus.NON_CHARGE, unit_objs[1]),
        ("VCH-102", date(2026, 7, 23), "Jul-26", contractor_users[1], contractor_persons[1], "Hansraj 4.NO", item_objs["IT020"], Decimal("1.000"), StoreItemStatus.CHARGE, unit_objs[1]),
        ("VCH-103", date(2026, 7, 24), "Jul-26", contractor_users[4], contractor_persons[4], "Rishikesh 5.NO - Worker Suresh", item_objs["IT026"], Decimal("2.000"), StoreItemStatus.NON_CHARGE, unit_objs[2]),
        ("VCH-104", date(2026, 7, 25), "Jul-26", contractor_users[4], contractor_persons[4], "Rishikesh 5.NO", item_objs["IT029"], Decimal("5.000"), StoreItemStatus.NON_CHARGE, unit_objs[2]),
        ("VCH-105", date(2026, 7, 26), "Jul-26", contractor_users[2], contractor_persons[2], "Babulal 1.NO - Worker Sitaram", item_objs["IT001"], Decimal("490.000"), StoreItemStatus.CHARGE, unit_objs[0]),
        ("VCH-106", date(2026, 7, 27), "Jul-26", contractor_users[3], contractor_persons[3], "Bhuna 1.NO", item_objs["IT002"], Decimal("1111.000"), StoreItemStatus.CHARGE, unit_objs[0]),
        ("VCH-107", date(2026, 7, 28), "Jul-26", contractor_users[5], contractor_persons[5], "Ramavtar 1.NO - Worker Gopal", item_objs["IT011"], Decimal("1454.000"), StoreItemStatus.CHARGE, unit_objs[0]),
        ("VCH-108", date(2026, 7, 29), "Jul-26", contractor_users[0], contractor_persons[0], "Pappu 4.NO", item_objs["IT010"], Decimal("315.000"), StoreItemStatus.CHARGE, unit_objs[1]),
        ("VCH-109", date(2026, 7, 30), "Jul-26", contractor_users[1], contractor_persons[1], "Hansraj 4.NO - Worker Mohan", item_objs["IT019"], Decimal("429.000"), StoreItemStatus.CHARGE, unit_objs[0]),
        ("VCH-110", date(2026, 8, 1),  "Aug-26", contractor_users[2], contractor_persons[2], "Babulal 1.NO", item_objs["IT022"], Decimal("4.000"), StoreItemStatus.CHARGE, unit_objs[0]),
        ("VCH-111", date(2026, 8, 2),  "Aug-26", contractor_users[3], contractor_persons[3], "Bhuna 1.NO - Worker Ramesh", item_objs["IT021"], Decimal("12.000"), StoreItemStatus.NON_CHARGE, unit_objs[1]),
        ("VCH-112", date(2026, 8, 3),  "Aug-26", contractor_users[4], contractor_persons[4], "Rishikesh 5.NO", item_objs["IT061"], Decimal("10.000"), StoreItemStatus.NON_CHARGE, unit_objs[2]),
    ]

    for vno, dt, month, contr, cperson, cpname, item, qty, status, punit in daily_issues_records:
        rate = item.current_rate or item.base_rate
        tot = qty * rate
        StoreDailyIssue.objects.create(
            voucher_no=vno,
            issue_date=dt,
            month_year=month,
            contractor=contr,
            contractor_person=cperson,
            contractor_person_name=cpname,
            item=item,
            qty=qty,
            unit=item.unit,
            rate=rate,
            status=status,
            total_amount=tot,
            chargeable_total=tot if status == StoreItemStatus.CHARGE else Decimal("0.00"),
            non_chargeable_total=Decimal("0.00") if status == StoreItemStatus.CHARGE else tot,
            production_unit=punit,
            remark=f"Issued to {cpname} for production"
        )

    print("Created 12 Store Daily Issue Entries.")

    print("SUCCESS: Store Management Data Seeding Finished Cleanly!")

if __name__ == "__main__":
    seed_complete_store_data()

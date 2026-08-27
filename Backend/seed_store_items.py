import os
import sys
import django
from decimal import Decimal

# Configure Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import transaction
from erp.models import StoreItemCategory, StoreItem, StoreItemStatus

STORE_CATEGORIES = [
    ("Abrasives & Sand Paper", "ABR"),
    ("Paints, Lacquers & Sealers", "PNT"),
    ("Polish, Stains & Chemicals", "CHM"),
    ("Hardware, Fasteners & Tools", "HWD"),
    ("Adhesives, Glues & Tapes", "ADH"),
    ("Packaging & Protection Materials", "PKG"),
    ("General Store & Consumables", "GEN"),
]

# Complete Item Master Dataset from Production Spreadsheet
# Schema: (Item Code, Item Name, Unit, Master Rate, Default Status, Category Code, Reorder Level, Remarks)
ITEM_MASTER_DATA = [
    # Initial Series (IT001 - IT003)
    ("IT001", "Rejmal 220", "pcs", "16.00", "charge", "ABR", "50", "Abrasive Sand Paper 220 grit"),
    ("IT002", "Rejmal 320", "pcs", "16.00", "charge", "ABR", "50", "Abrasive Sand Paper 320 grit fine"),
    ("IT003", "Rejmal 400", "pcs", "16.00", "charge", "ABR", "50", "Abrasive Sand Paper 400 grit ultra-fine"),

    # Image 1 Series (IT004 - IT050)
    ("IT004", "Grinder 5'120", "pkt", "15.75", "non-charge", "ABR", "20", "Grinder Disc 5 inch 120 grit"),
    ("IT005", "Grinder 5'80", "pkt", "15.75", "non-charge", "ABR", "20", "Grinder Disc 5 inch 80 grit"),
    ("IT006", "Grinder 5'60", "pkt", "15.75", "non-charge", "ABR", "20", "Grinder Disc 5 inch 60 grit"),
    ("IT007", "Grinder 7'120", "pkt", "0.00", "non-charge", "ABR", "10", "Grinder Disc 7 inch 120 grit"),
    ("IT008", "Grinder 7'80", "pkt", "0.00", "non-charge", "ABR", "10", "Grinder Disc 7 inch 80 grit"),
    ("IT009", "3M Gex 5'80", "pcs", "40.00", "charge", "ABR", "30", "3M Gex Sanding Disc 5 inch 80 grit"),
    ("IT010", "3M Gex 6'80", "pcs", "50.00", "charge", "ABR", "30", "3M Gex Sanding Disc 6 inch 80 grit"),
    ("IT011", "Gex 5'80", "pcs", "9.00", "charge", "ABR", "50", "Gex Sanding Disc 5 inch 80 grit"),
    ("IT011-120", "Gex 5'120", "pcs", "9.00", "charge", "ABR", "50", "Gex Sanding Disc 5 inch 120 grit"),
    ("IT012", "Gex 5'80 DPA/PSA", "pcs", "15.00", "charge", "ABR", "30", "Gex Sanding Disc 5 inch 80 DPA/PSA"),
    ("IT013", "Gex5'120 DPA/PSA", "pcs", "15.00", "charge", "ABR", "30", "Gex Sanding Disc 5 inch 120 DPA/PSA"),
    ("IT014", "Gex 6'80", "pcs", "22.00", "charge", "ABR", "30", "Gex Sanding Disc 6 inch 80 grit"),
    ("IT015", "Gex 6'120", "pcs", "22.00", "charge", "ABR", "30", "Gex Sanding Disc 6 inch 120 grit"),
    ("IT016", "Iron Sheet", "pcs", "22.00", "charge", "HWD", "15", "Iron Sheet for Sanding & Cleaning"),
    ("IT017", "Saree", "pcs", "28.00", "charge", "PKG", "100", "Cotton Saree Wipe Cloth for Polishing"),
    ("IT018", "Gun", "pcs", "840.00", "charge", "HWD", "5", "Paint / Polish Spray Gun"),
    ("IT019", "Bond", "box", "850.00", "non-charge", "ADH", "10", "Industrial Adhesive Bond"),
    ("IT020", "Sander Pad 5'", "pcs", "250.00", "non-charge", "HWD", "10", "Sander Pad 5 inch for orbital machine"),
    ("IT021", "Sander Pad 6'", "pcs", "2250.00", "charge", "HWD", "5", "Heavy Duty Sander Pad 6 inch"),
    ("IT022", "Brown Polish", "pcs", "96.00", "charge", "CHM", "25", "Brown Wood Polish"),
    ("IT023", "Black Polish", "pcs", "96.00", "non-charge", "CHM", "25", "Black Wood Polish"),
    ("IT024", "Easy Lacquer", "ltr", "205.00", "non-charge", "PNT", "30", "Easy Coat Clear Lacquer"),
    ("IT025", "Matt 2 Laquer", "ltr", "173.00", "non-charge", "PNT", "30", "Matt 2 Topcoat Lacquer"),
    ("IT026", "0% Laquer", "ltr", "199.00", "non-charge", "PNT", "30", "Zero Gloss / Dead Matt Lacquer"),
    ("IT027", "NC Sealer", "ltr", "135.00", "non-charge", "PNT", "40", "Nitrocellulose Base Sealer"),
    ("IT028", "RTU Sealer", "ltr", "135.00", "non-charge", "PNT", "40", "Ready To Use Sealer"),
    ("IT029", "T C", "ltr", "36.00", "non-charge", "CHM", "50", "Thinner Chemical TC"),
    ("IT030", "TC + 1", "ltr", "36.00", "non-charge", "CHM", "50", "Thinner Chemical TC Plus 1"),
    ("IT031", "W.B.Sealer", "ltr", "0.00", "non-charge", "PNT", "20", "Water Based Sealer"),
    ("IT032", "IDEAL W.B.Sealer", "ltr", "241.00", "non-charge", "PNT", "20", "IDEAL Brand Water Based Sealer"),
    ("IT033", "1009", "ltr", "270.00", "non-charge", "CHM", "15", "Special Thinner / Solvent 1009"),
    ("IT034", "MCM 441", "ltr", "183.00", "non-charge", "CHM", "15", "Chemical Compound MCM 441"),
    ("IT035", "MCPB-356 METALIC", "ltr", "0.00", "non-charge", "PNT", "10", "Metallic Paint Compound MCPB-356"),
    ("IT036", "pearl Gold Dust", "ltr", "380.00", "non-charge", "PNT", "10", "Pearl Gold Dust Powder / Tint"),
    ("IT037", "Oxy", "ltr", "36.00", "non-charge", "CHM", "30", "Oxidizing Chemical / Bleach Oxy"),
    ("IT038", "DAA", "ltr", "0.00", "non-charge", "CHM", "20", "Diacetone Alcohol Solvent DAA"),
    ("IT039", "Black Stain", "nos", "170.00", "non-charge", "CHM", "20", "Wood Color Stain - Black"),
    ("IT040", "Stripe Pine", "nos", "160.00", "non-charge", "CHM", "20", "Wood Color Stain - Stripe Pine"),
    ("IT041", "Tarpin", "ltr", "0.00", "non-charge", "CHM", "50", "Turpentine Oil Tarpin"),
    ("IT042", "PCG Thinner", "ltr", "0.00", "non-charge", "CHM", "50", "PCG Brand Thinner"),
    ("IT043", "PCG lacquer", "kg", "611.00", "non-charge", "PNT", "25", "PCG Polyurethane Lacquer"),
    ("IT044", "Chestnut", "ltr", "257.00", "non-charge", "CHM", "20", "Chestnut Wood Stain / Dye"),
    ("IT045", "Walnut", "ltr", "257.00", "non-charge", "CHM", "20", "Walnut Wood Stain / Dye"),
    ("IT046", "OAK", "ltr", "257.00", "non-charge", "CHM", "20", "Oak Wood Stain / Dye"),
    ("IT047", "DAP", "nos", "257.00", "non-charge", "CHM", "20", "DAP Chemical Solution"),
    ("IT048", "22mm Knob Brass", "pcs", "0.00", "non-charge", "HWD", "50", "22mm Brass Furniture Knob"),
    ("IT049", "22mm Knob Brass Antique", "pcs", "0.00", "non-charge", "HWD", "50", "22mm Antique Brass Knob"),
    ("IT050", "Rope", "pcs", "0.00", "non-charge", "PKG", "30", "Packing / Binding Jute Rope"),

    # Image 2 Series (IT051 - IT096)
    ("IT051", "NC Black", "ltr", "0.00", "non-charge", "PNT", "20", "Nitrocellulose Black Paint"),
    ("IT052", "NC White", "ltr", "0.00", "non-charge", "PNT", "20", "Nitrocellulose White Paint"),
    ("IT053", "Carpet Bindi 15m", "pcs", "0.55", "non-charge", "HWD", "200", "Carpet Protection Bindi 15mm"),
    ("IT054", "Carpet Bindi 20m", "pcs", "0.77", "non-charge", "HWD", "200", "Carpet Protection Bindi 20mm"),
    ("IT055", "Carpet Bindi 25m", "pcs", "1.10", "non-charge", "HWD", "200", "Carpet Protection Bindi 25mm"),
    ("IT056", "Carpet Bindi 40m", "pcs", "0.00", "non-charge", "HWD", "100", "Carpet Protection Bindi 40mm"),
    ("IT057", "Carpet Bindi Square", "pcs", "1.43", "non-charge", "HWD", "200", "Square Carpet Protection Bindi"),
    ("IT058", "Container Sillica 1Kg", "box", "4125.00", "non-charge", "PKG", "10", "Export Container Silica Gel Bag 1kg"),
    ("IT059", "Sillica 2gm", "pkt", "120.00", "non-charge", "PKG", "50", "Moisture Absorber Silica 2gm"),
    ("IT060", "Tarbrush", "box", "0.00", "non-charge", "HWD", "20", "Tarbrush Polish Application Brush"),
    ("IT061", "Distemper 20 Litre Balti", "nos", "820.00", "non-charge", "PNT", "5", "Distemper Wall Paint 20L Bucket"),
    ("IT062", "Allen key 4\"", "pcs", "0.00", "non-charge", "HWD", "30", "Allen Key Tool 4 inch"),
    ("IT063", "Allen key 5\"", "pcs", "3.80", "non-charge", "HWD", "30", "Allen Key Tool 5 inch"),
    ("IT064", "Allen key 6\"", "pcs", "0.00", "non-charge", "HWD", "30", "Allen Key Tool 6 inch"),
    ("IT065", "RAL 9001", "ltr", "466.10", "non-charge", "PNT", "20", "RAL 9001 Cream White Polyurethane Paint"),
    ("IT066", "RAL 9004", "ltr", "466.10", "non-charge", "PNT", "20", "RAL 9004 Signal Black Polyurethane Paint"),
    ("IT067", "JK Laxmi smart Wall Putty", "kg", "635.59", "non-charge", "PNT", "15", "JK Lakshmi Smart Surface Wall Putty"),
    ("IT068", "W D-40", "pcs", "380.00", "non-charge", "CHM", "15", "WD-40 Multi-Use Rust Release Spray"),
    ("IT069", "white tap", "box", "0.00", "non-charge", "PKG", "25", "White Packaging Tape"),
    ("IT070", "brown tap", "box", "0.00", "non-charge", "PKG", "25", "Brown Carton Sealing Tape"),
    ("IT071", "Abro tap", "roll", "0.00", "non-charge", "PKG", "30", "Abro Paper Masking Tape"),
    ("IT072", "Double side tap", "roll", "0.00", "non-charge", "PKG", "20", "Double Sided Adhesive Tape"),
    ("IT073", "Fast tack", "ltr", "198.00", "non-charge", "ADH", "20", "Fast Tack Synthetic Adhesive Glue"),
    ("IT074", "SR 505", "ltr", "280.00", "non-charge", "ADH", "20", "SR 505 Contact Adhesive Glue"),
    ("IT075", "binari", "pcs", "0.00", "non-charge", "HWD", "50", "Binari Wood Joint Fitting"),
    ("IT076", "Aerolite", "pcs", "0.00", "non-charge", "ADH", "20", "Aerolite Synthetic Adhesive Compound"),
    ("IT077", "Wood cutter 5'", "pcs", "0.00", "non-charge", "HWD", "15", "Wood Cutting Machine Blade 5 inch"),
    ("IT078", "Wood cutter 4'", "pcs", "0.00", "non-charge", "HWD", "15", "Wood Cutting Machine Blade 4 inch"),
    ("IT079", "SS Catcher", "pcs", "0.00", "non-charge", "HWD", "50", "Stainless Steel Door / Drawer Catcher"),
    ("IT080", "zipper 3*4", "pkt", "0.00", "non-charge", "PKG", "40", "Zip Lock Polybag 3x4 inch"),
    ("IT081", "zipper 6*8", "pkt", "0.00", "non-charge", "PKG", "40", "Zip Lock Polybag 6x8 inch"),
    ("IT082", "Inch tap", "pcs", "0.00", "non-charge", "HWD", "20", "Measuring Tape / Inch Tape"),
    ("IT083", "Brown mitti", "pkt", "0.00", "non-charge", "CHM", "30", "Brown Finishing Clay / Mitti Powder"),
    ("IT084", "yellow mitti", "pkt", "0.00", "non-charge", "CHM", "30", "Yellow Finishing Clay / Mitti Powder"),
    ("IT085", "black mitti", "pkt", "0.00", "non-charge", "CHM", "30", "Black Finishing Clay / Mitti Powder"),
    ("IT086", "black mitti", "pcs", "0.00", "non-charge", "CHM", "30", "Black Mitti Solid Clay Piece"),
    ("IT087", "black mitti (bulk)", "pcs", "0.00", "non-charge", "CHM", "30", "Black Mitti Solid Clay Piece (Bulk)"),
    ("IT088", "Brown buffer 4'", "pcs", "0.00", "non-charge", "HWD", "25", "Brown Buffing Pad 4 inch"),
    ("IT089", "Brown buffer 6'", "pcs", "0.00", "non-charge", "HWD", "25", "Brown Buffing Pad 6 inch"),
    ("IT090", "wrench 10-11", "pcs", "0.00", "non-charge", "HWD", "15", "Spanner Wrench size 10-11"),
    ("IT091", "wrench 12-13", "pcs", "0.00", "non-charge", "HWD", "15", "Spanner Wrench size 12-13"),
    ("IT092", "wrench 14-15", "pcs", "0.00", "non-charge", "HWD", "15", "Spanner Wrench size 14-15"),
    ("IT093", "wrench 16-17", "pcs", "0.00", "non-charge", "HWD", "15", "Spanner Wrench size 16-17"),
    ("IT094", "screw Driver", "pcs", "0.00", "non-charge", "HWD", "20", "Manual Screw Driver Tool"),
    ("IT095", "Plas", "pcs", "215.00", "non-charge", "HWD", "15", "Combination Pliers (Plas)"),
    ("IT096", "Retarter", "ltr", "0.00", "non-charge", "CHM", "20", "Paint Retarder Solvent Slow Drying Agent"),
]

def seed_store_items(dry_run=False, update_rates=True):
    print("=" * 70)
    print("   PINKCITY ENTERPRISES - PRODUCTION STORE ITEM MASTER SEEDER")
    print("=" * 70)

    if dry_run:
        print("[MODE: DRY-RUN] Simulation only - No database changes will occur.")
    else:
        print("[MODE: LIVE EXECUTION] Updating and synchronizing database.")

    created_cats = 0
    existing_cats = 0
    cat_map = {}

    with transaction.atomic():
        print("\n[Step 1/2] Synchronizing Store Item Categories...")
        for cat_name, cat_code in STORE_CATEGORIES:
            if dry_run:
                cat_map[cat_code] = None
                continue
            cat, created = StoreItemCategory.objects.get_or_create(
                code=cat_code,
                defaults={"name": cat_name}
            )
            if created:
                created_cats += 1
                print(f"  + Created Category: [{cat_code}] {cat_name}")
            else:
                existing_cats += 1
                if cat.name != cat_name:
                    cat.name = cat_name
                    cat.save(update_fields=["name"])
            cat_map[cat_code] = cat

        if not dry_run:
            print(f"[OK] Categories ready: {created_cats} created, {existing_cats} existing.")

        print("\n[Step 2/2] Synchronizing Store Master Items...")
        created_items = 0
        updated_items = 0
        skipped_items = 0

        for row in ITEM_MASTER_DATA:
            code, name, unit, rate_str, status_str, cat_code, reorder_str, remarks = row
            rate = Decimal(rate_str)
            reorder = Decimal(reorder_str)
            status = StoreItemStatus.CHARGE if status_str.lower() == "charge" else StoreItemStatus.NON_CHARGE
            category = cat_map.get(cat_code)

            if dry_run:
                print(f"  [DRY-RUN] {code:<10} | {name:<26} | Unit: {unit:<4} | Rate: Rs.{rate:>7.2f} | Status: {status}")
                continue

            existing_item = StoreItem.objects.filter(item_code=code).first()

            if not existing_item:
                StoreItem.objects.create(
                    item_code=code,
                    item_name=name,
                    category=category,
                    unit=unit,
                    base_rate=rate,
                    current_rate=rate,
                    default_status=status,
                    reorder_level=reorder,
                    remark=remarks,
                    is_active=True
                )
                created_items += 1
                print(f"  + Created: [{code:<10}] {name:<26} | Unit: {unit:<4} | Rate: Rs.{rate:>7.2f} | Status: {status}")
            else:
                changed = False
                if existing_item.item_name != name:
                    existing_item.item_name = name
                    changed = True
                if category and existing_item.category != category:
                    existing_item.category = category
                    changed = True
                if existing_item.unit != unit:
                    existing_item.unit = unit
                    changed = True
                if update_rates and existing_item.base_rate == Decimal("0.00") and rate > Decimal("0.00"):
                    existing_item.base_rate = rate
                    existing_item.current_rate = rate
                    changed = True
                if existing_item.default_status != status:
                    existing_item.default_status = status
                    changed = True
                if remarks and not existing_item.remark:
                    existing_item.remark = remarks
                    changed = True

                if changed:
                    existing_item.save()
                    updated_items += 1
                    print(f"  ~ Updated: [{code:<10}] {name:<26} | Unit: {unit:<4} | Rate: Rs.{existing_item.base_rate:>7.2f}")
                else:
                    skipped_items += 1

    print("\n" + "=" * 70)
    print("[SUCCESS] STORE ITEM MASTER SEEDING COMPLETE!")
    print(f"  - Total Master Items In Dataset: {len(ITEM_MASTER_DATA)}")
    if not dry_run:
        print(f"  - New Store Items Created:       {created_items}")
        print(f"  - Existing Store Items Updated:   {updated_items}")
        print(f"  - Items Unchanged / Preserved:    {skipped_items}")
        print(f"  - Total Active Items in DB:       {StoreItem.objects.count()}")
    print("=" * 70)

if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    seed_store_items(dry_run=dry)

from django.core.management.base import BaseCommand
from erp.models import Sample, SalesOrder, PurchaseIMO
import random
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Seeds the database with 20 dummy records for Sample, SalesOrder, and PurchaseIMO.'

    def handle(self, *args, **kwargs):
        Sample.objects.all().delete()
        SalesOrder.objects.all().delete()
        PurchaseIMO.objects.all().delete()

        products = ["Dining Table", "Lounge Chair", "Bookshelf", "Coffee Table", "Wardrobe", "Bed Frame", "Nightstand", "Office Desk", "Sofa", "Armchair"]
        woods = ["Oak", "Walnut", "Teak", "Pine", "Mahogany", "Ash"]
        finishes = ["Matte", "High Gloss", "Satin", "Natural", "Dark Stain", "White Wash"]
        buyers = ["IKEA", "Wayfair", "Ashley Furniture", "Herman Miller", "Steelcase", "West Elm", "Pottery Barn"]
        suppliers = ["Global Timbers", "Acme Hardware", "Paints & Co.", "Forest Corp.", "Fabric World"]
        materials = ["Wood Planks", "Varnish", "Screws", "Hinges", "Fabric", "Foam", "Glue"]
        warehouses = ["Main Hub", "North Wing", "South Depot", "East Storage"]
        statuses = ["Pending", "Received", "Partial"]

        samples = []
        self.stdout.write('Creating Samples...')
        for i in range(1, 21):
            s = Sample.objects.create(
                sample_id=f"SMP-{1000+i}",
                buyer_code=f"BYR-{random.randint(100, 999)}",
                product_name=f"{random.choice(products)} {random.choice(['Classic', 'Modern', 'Rustic'])}",
                wood_type=random.choice(woods),
                finish_color=random.choice(finishes),
                remark="Initial prototype." if random.random() > 0.5 else ""
            )
            samples.append(s)

        self.stdout.write('Creating Sales Orders...')
        for i in range(1, 21):
            SalesOrder.objects.create(
                sample=random.choice(samples),
                sales_order_no=f"SO-{2000+i}",
                order_date=(datetime.now() - timedelta(days=random.randint(1, 30))).date(),
                buyer_name=random.choice(buyers),
                po_no=f"PO-{random.randint(10000, 99999)}"
            )

        self.stdout.write('Creating Purchase IMOs...')
        for i in range(1, 21):
            rate = round(random.uniform(10.0, 500.0), 2)
            qty = random.randint(10, 100)
            PurchaseIMO.objects.create(
                purchase_no=f"PUR-{3000+i}",
                purchase_date=(datetime.now() - timedelta(days=random.randint(1, 15))).date(),
                supplier_name=random.choice(suppliers),
                material_name=random.choice(materials),
                rate=rate,
                total=round(rate * qty, 2),
                expected_delivery_date=(datetime.now() + timedelta(days=random.randint(5, 30))).date(),
                warehouse=random.choice(warehouses),
                grn_status=random.choice(statuses),
                invoice_number=f"INV-{random.randint(4000, 9000)}" if random.random() > 0.5 else "",
                remark=""
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded the database!'))

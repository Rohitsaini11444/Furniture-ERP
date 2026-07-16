"""
Comprehensive seed command — 20 records each for:
  Samples, SalesOrders, PurchaseIMOs, SandingBatch, SandingAssignment, SandingQC
"""
import random
from datetime import date, timedelta, datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from erp.models import (
    User, Sample, SalesOrder, PurchaseIMO,
    SandingBatch, SandingAssignment, SandingQC,
)

WOOD_TYPES   = ['Teak', 'Sheesham', 'Mango', 'Pine', 'Walnut', 'Oak', 'Rosewood', 'Mahogany']
FINISHES     = ['Natural', 'Walnut Brown', 'Dark Espresso', 'Honey Oak', 'White Washed', 'Ebony', 'Cherry Red', 'Grey Wash']
PRODUCTS     = [
    'Dining Chair', 'Coffee Table', 'Bookshelf', 'Wardrobe', 'Bed Frame',
    'TV Unit', 'Study Desk', 'Side Table', 'Sofa Set', 'Dressing Table',
    'Chest of Drawers', 'Shoe Rack', 'Display Cabinet', 'Rocking Chair',
    'Bar Stool', 'Console Table', 'Bedside Table', 'Ladder Shelf',
    'Filing Cabinet', 'Garden Bench',
]
BUYERS       = ['B001', 'B002', 'B003', 'B004', 'B005', 'B006', 'B007', 'B008']
BUYERS_NAME  = [
    'Rajesh Exports', 'Green Home Ltd', 'Furniture World', 'Nordic Design Co',
    'Artisan Crafts', 'Home Luxe', 'Style Living', 'Decor Hub'
]
SUPPLIERS    = [
    'Timber Corp India', 'Wood Masters', 'Natural Woods Ltd', 'Forest Craft',
    'Prime Timber', 'Royal Wood', 'Urban Timber', 'GreenWood Supplies'
]
MATERIALS    = [
    'Teak Wood', 'MDF Board', 'Plywood', 'Sheesham Wood', 'Pine Timber',
    'Walnut Veneer', 'Hardware Kit', 'Foam & Fabric', 'Glass Panel', 'Metal Frame'
]
WAREHOUSES   = ['WH-Main', 'WH-North', 'WH-South', 'WH-East']
GRN_STATUSES = ['Pending', 'Partial', 'Received', 'Rejected']


def rand_date(days_back=180, days_forward=30):
    today = date.today()
    delta = random.randint(-days_back, days_forward)
    return today + timedelta(days=delta)


class Command(BaseCommand):
    help = 'Seed 20 demo records each for Samples, SalesOrders, PurchaseIMOs, and Sanding workflow'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # ── Get supervisor & contractors ──────────────────────────────────────
        supervisor = User.objects.filter(role='supervisor', batch_category='sanding').first()
        contractors = list(User.objects.filter(role='contractor'))

        if not supervisor:
            self.stdout.write(self.style.ERROR(
                'No sanding supervisor found. Run: python manage.py seed_users first.'
            ))
            return

        if not contractors:
            self.stdout.write(self.style.WARNING('No contractors found; skipping sanding assignments.'))

        # ── Samples ───────────────────────────────────────────────────────────
        samples = []
        existing_sample_ids = set(Sample.objects.values_list('sample_id', flat=True))
        created_samples = 0
        idx = 1
        while created_samples < 20:
            sid = f'SMP-{idx:03d}'
            idx += 1
            if sid in existing_sample_ids:
                existing = Sample.objects.get(sample_id=sid)
                samples.append(existing)
                continue
            s = Sample.objects.create(
                sample_id=sid,
                buyer_code=random.choice(BUYERS),
                product_name=PRODUCTS[created_samples % len(PRODUCTS)],
                wood_type=random.choice(WOOD_TYPES),
                finish_color=random.choice(FINISHES),
                remark=f'Sample {sid} for quality inspection. Priority: {"High" if created_samples < 7 else "Medium" if created_samples < 14 else "Low"}.',
            )
            samples.append(s)
            created_samples += 1

        self.stdout.write(self.style.SUCCESS(f'  Samples:        {created_samples} created  ({Sample.objects.count()} total)'))

        # ── Sales Orders ──────────────────────────────────────────────────────
        existing_so = set(SalesOrder.objects.values_list('sales_order_no', flat=True))
        so_created = 0
        for i, sample in enumerate(samples):
            so_no = f'SO-2024-{i+1:04d}'
            if so_no in existing_so:
                continue
            buyer_idx = i % len(BUYERS_NAME)
            SalesOrder.objects.create(
                sample=sample,
                sales_order_no=so_no,
                order_date=rand_date(days_back=120, days_forward=0),
                buyer_name=BUYERS_NAME[buyer_idx],
                po_no=f'PO-{random.randint(10000, 99999)}',
            )
            so_created += 1

        self.stdout.write(self.style.SUCCESS(f'  Sales Orders:   {so_created} created  ({SalesOrder.objects.count()} total)'))

        # ── Purchase IMOs ─────────────────────────────────────────────────────
        existing_po = set(PurchaseIMO.objects.values_list('purchase_no', flat=True))
        po_created = 0
        for i in range(20):
            po_no = f'PO-IMO-{i+1:04d}'
            if po_no in existing_po:
                continue
            rate = round(random.uniform(500, 15000), 2)
            qty  = random.randint(10, 200)
            PurchaseIMO.objects.create(
                purchase_no=po_no,
                purchase_date=rand_date(days_back=150, days_forward=0),
                supplier_name=random.choice(SUPPLIERS),
                material_name=MATERIALS[i % len(MATERIALS)],
                rate=rate,
                total=round(rate * qty, 2),
                expected_delivery_date=rand_date(days_back=0, days_forward=60),
                warehouse=random.choice(WAREHOUSES),
                grn_status=random.choice(GRN_STATUSES),
                invoice_number=f'INV-{random.randint(1000, 9999)}',
                remark=f'Bulk purchase of {MATERIALS[i % len(MATERIALS)]}. Qty: {qty} units.',
            )
            po_created += 1

        self.stdout.write(self.style.SUCCESS(f'  Purchase IMOs:  {po_created} created  ({PurchaseIMO.objects.count()} total)'))

        # ── Sanding Workflow ──────────────────────────────────────────────────
        batches_created = 0
        assignments_created = 0
        qc_created = 0

        # Pick 20 samples for sanding batches
        sanding_samples = samples[:20]
        batch_statuses = ['pending'] * 5 + ['in_progress'] * 10 + ['completed'] * 5

        sanding_batches = []
        for i, sample in enumerate(sanding_samples):
            # Avoid duplicates
            if SandingBatch.objects.filter(supervisor=supervisor, sample=sample).exists():
                sanding_batches.append(SandingBatch.objects.get(supervisor=supervisor, sample=sample))
                continue
            batch = SandingBatch.objects.create(
                supervisor=supervisor,
                sample=sample,
                notes=f'Batch {i+1}: {sample.product_name} — {sample.wood_type} finish required.',
                status=batch_statuses[i % len(batch_statuses)],
            )
            sanding_batches.append(batch)
            batches_created += 1

        self.stdout.write(self.style.SUCCESS(f'  Sanding Batches:{batches_created} created  ({SandingBatch.objects.count()} total)'))

        # Create assignments (one per batch, spread across contractors)
        if contractors:
            assign_statuses = ['assigned'] * 5 + ['in_progress'] * 7 + ['completed'] * 8
            for i, batch in enumerate(sanding_batches):
                if SandingAssignment.objects.filter(batch=batch).exists():
                    continue
                if batch.status == 'pending':
                    continue  # pending batches not yet assigned
                contractor = contractors[i % len(contractors)]
                status = assign_statuses[i % len(assign_statuses)]
                completed_at = None
                if status == 'completed':
                    completed_at = timezone.now() - timedelta(days=random.randint(1, 14))

                assignment = SandingAssignment.objects.create(
                    batch=batch,
                    contractor=contractor,
                    status=status,
                    completed_at=completed_at,
                    contractor_notes=f'Sanding complete. Surface finish verified.' if status == 'completed' else '',
                )
                assignments_created += 1

                # QC for completed assignments (some pass, some reject)
                if status == 'completed' and not SandingQC.objects.filter(assignment=assignment).exists():
                    qc_result = 'pass' if i % 5 != 0 else 'reject'
                    SandingQC.objects.create(
                        assignment=assignment,
                        checked_by=supervisor,
                        result=qc_result,
                        notes=(
                            'Surface finish quality approved. Ready for next stage.'
                            if qc_result == 'pass'
                            else 'Rough patches detected on edges. Requires rework.'
                        ),
                    )
                    qc_created += 1

        self.stdout.write(self.style.SUCCESS(f'  Assignments:    {assignments_created} created  ({SandingAssignment.objects.count()} total)'))
        self.stdout.write(self.style.SUCCESS(f'  QC Records:     {qc_created} created  ({SandingQC.objects.count()} total)'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully!'))
        self.stdout.write('')
        self.stdout.write('Summary:')
        self.stdout.write(f'  Samples:        {Sample.objects.count()}')
        self.stdout.write(f'  Sales Orders:   {SalesOrder.objects.count()}')
        self.stdout.write(f'  Purchase IMOs:  {PurchaseIMO.objects.count()}')
        self.stdout.write(f'  Sanding Batches:{SandingBatch.objects.count()}')
        self.stdout.write(f'  Assignments:    {SandingAssignment.objects.count()}')
        self.stdout.write(f'  QC Records:     {SandingQC.objects.count()}')

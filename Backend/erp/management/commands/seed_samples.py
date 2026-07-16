"""
Seed command — inserts the 21 real sample records from the Excel screenshot data.
Run: python manage.py seed_samples
"""
from django.core.management.base import BaseCommand
from erp.models import Sample


SAMPLES_DATA = [
    # 1
    dict(
        sample_id='SMP-001',
        buyer_code='AA5801',
        po='P0009059',
        style_no='2009-031',
        product_name='Amhare Acacia & Jute Woven Bench',
        size_length=101.0, size_breadth=36.0, size_height=45.0,
        wood_type='Acacia',
        finish_color='Natural Finish',
        cbm=0.23, price_usd=43.00, total_cbm=4.60, total_amount=860.00,
        box_length=42.0, box_breadth=16.5, box_height=20.0,
        net_weight=None, gross_weight=13.7,
        remark='',
    ),
    # 2
    dict(
        sample_id='SMP-002',
        buyer_code='AB11101',
        po='P0009732',
        style_no='2407-023-DB',
        product_name='Anbu Acacia Bed - Washed Walnut - Double (Mattress 135x190x30 cm)',
        size_length=145.0, size_breadth=201.0, size_height=110.0,
        wood_type='Acacia',
        finish_color='SB Washed Walnut',
        cbm=0.89, price_usd=147.50, total_cbm=12.46, total_amount=2065.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Knock Down Pack. 1 Piece in 1 Box. Height to be 110 cm.',
    ),
    # 3
    dict(
        sample_id='SMP-003',
        buyer_code='AB11102',
        po='P0009732',
        style_no='2407-023-KB',
        product_name='Anbu Acacia Bed - Washed Walnut - King (Mattress 150x200x30 cm)',
        size_length=160.0, size_breadth=210.0, size_height=110.0,
        wood_type='Acacia',
        finish_color='SB Washed Walnut',
        cbm=0.98, price_usd=187.50, total_cbm=3.92, total_amount=750.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Knock Down Pack. 1 Piece in 1 Box. Height to be 110 cm.',
    ),
    # 4
    dict(
        sample_id='SMP-004',
        buyer_code='AB7701',
        po='P0008936',
        style_no='2401-021-UPMSBN',
        product_name='Anbu Mango Wood Upholstered Counter Chair - Natural - One Size',
        size_length=54.0, size_breadth=52.0, size_height=96.0,
        wood_type='Mango / Fabric',
        finish_color='Sand Blast Natural / Fabric 1557 Linen',
        cbm=0.38, price_usd=70.00, total_cbm=0.38, total_amount=70.00,
        box_length=22.0, box_breadth=22.0, box_height=40.5,
        net_weight=None, gross_weight=17.9,
        remark='Seat height will be 70cm with upholstery.',
    ),
    # 5
    dict(
        sample_id='SMP-005',
        buyer_code='AB7801',
        po='P0009805',
        style_no='2401-021-UPACSB WW',
        product_name='Anbu Acacia Upholstered Counter Chair - Washed Walnut - One Size',
        size_length=54.0, size_breadth=52.0, size_height=96.0,
        wood_type='Acacia / Fabric',
        finish_color='Sand Blast Washed Walnut / Fabric 1557 Linen',
        cbm=0.38, price_usd=70.00, total_cbm=16.72, total_amount=3080.00,
        box_length=22.0, box_breadth=22.0, box_height=40.5,
        net_weight=None, gross_weight=17.9,
        remark='Seat height will be 70cm with upholstery.',
    ),
    # 6
    dict(
        sample_id='SMP-006',
        buyer_code='AC10101',
        po='P0008125',
        style_no='1912-037-CL',
        product_name='Adra Leather & Brass Occasional Chair - Moss Green - One Size',
        size_length=69.0, size_breadth=82.0, size_height=72.0,
        wood_type='Iron / Leather',
        finish_color='Iron Antique Brass 2 / Charcoal Leather',
        cbm=0.47, price_usd=149.00, total_cbm=9.40, total_amount=2980.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 7
    dict(
        sample_id='SMP-007',
        buyer_code='AC1501',
        po='P0008981',
        style_no='2204-027-SBWW',
        product_name='Anbu Acacia Dining Chair - Washed Walnut - One Size',
        size_length=57.0, size_breadth=56.0, size_height=76.0,
        wood_type='Acacia',
        finish_color='Sand Blast Washed Walnut',
        cbm=0.32, price_usd=47.00, total_cbm=38.08, total_amount=5593.00,
        box_length=24.0, box_breadth=24.0, box_height=34.0,
        net_weight=None, gross_weight=17.9,
        remark='',
    ),
    # 8
    dict(
        sample_id='SMP-008',
        buyer_code='AC1801',
        po='P0008981',
        style_no='2204-027-UP-SBWW',
        product_name='Anbu Acacia Upholstered Dining Chair - Sand Blast Washed Walnut - One Size',
        size_length=57.0, size_breadth=56.0, size_height=76.0,
        wood_type='Acacia / Fabric',
        finish_color='Sand Blast Washed Walnut / Fabric 1557 Linen',
        cbm=0.30, price_usd=56.00, total_cbm=3.60, total_amount=672.00,
        box_length=24.0, box_breadth=24.0, box_height=34.0,
        net_weight=None, gross_weight=19.7,
        remark='',
    ),
    # 9
    dict(
        sample_id='SMP-009',
        buyer_code='AC1901',
        po='P0009805',
        style_no='2204-027-UPMSBN',
        product_name='Anbu Mango Wood Upholstered Dining Chair - Natural - One Size',
        size_length=57.0, size_breadth=56.0, size_height=76.0,
        wood_type='Mango / Fabric',
        finish_color='Sand Blast Natural / Fabric 1557 Linen',
        cbm=0.30, price_usd=57.00, total_cbm=9.00, total_amount=1710.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 10
    dict(
        sample_id='SMP-010',
        buyer_code='AC4701',
        po='P0008402',
        style_no='2401-041',
        product_name='Aamani Mango Wood & Cord Occasional Chair - Natural - One Size',
        size_length=59.0, size_breadth=66.0, size_height=71.0,
        wood_type='Mango / Danish Cord / Fabric',
        finish_color='Plain Natural / Danish Cord Natural / Linen 1557 Fabric',
        cbm=0.39, price_usd=86.00, total_cbm=3.90, total_amount=860.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 11
    dict(
        sample_id='SMP-011',
        buyer_code='AC4801',
        po='P0009805',
        style_no='2402-010',
        product_name='Aamani Mango Wood & Cord Counter Chair - Natural - One Size',
        size_length=46.0, size_breadth=57.0, size_height=105.0,
        wood_type='Mango / Danish Cord / Fabric',
        finish_color='Plain Natural / Danish Cord Natural / Linen 1557 Fabric',
        cbm=0.39, price_usd=76.00, total_cbm=7.80, total_amount=1520.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 12
    dict(
        sample_id='SMP-012',
        buyer_code='AC4901',
        po='P0009805',
        style_no='2402-010-DINC',
        product_name='Aamani Mango Wood & Cord Dining Chair - Natural - One Size',
        size_length=46.0, size_breadth=57.0, size_height=91.0,
        wood_type='Mango / Danish Cord / Fabric',
        finish_color='Plain Natural / Danish Cord Natural / Linen 1557 Fabric',
        cbm=0.25, price_usd=71.00, total_cbm=2.50, total_amount=710.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Single Pack. L Shape Packing.',
    ),
    # 13
    dict(
        sample_id='SMP-013',
        buyer_code='NPS8576',
        po='P0009143N1',
        style_no='2502-038',
        product_name='Aamani Mango Wood & Cord Counter Stool - Natural - One Size',
        size_length=40.0, size_breadth=49.0, size_height=70.0,
        wood_type='Mango / Danish Pepper Cord',
        finish_color='Plain Natural / Danish Pepper Cord',
        cbm=0.19, price_usd=50.00, total_cbm=15.20, total_amount=4000.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 14
    dict(
        sample_id='SMP-014',
        buyer_code='AD2501',
        po='P0009732',
        style_no='2409-018',
        product_name='Anbu Acacia Chest of Drawers - Washed Walnut',
        size_length=82.0, size_breadth=49.0, size_height=97.0,
        wood_type='Acacia',
        finish_color='SB Washed Walnut',
        cbm=0.50, price_usd=139.00, total_cbm=5.00, total_amount=1390.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 15
    dict(
        sample_id='SMP-015',
        buyer_code='AT1601',
        po='P0009805',
        style_no='1810-150-SM-SBWW',
        product_name='Anbu Acacia Dining Table - Washed Walnut - Small',
        size_length=180.0, size_breadth=90.0, size_height=76.0,
        wood_type='Acacia',
        finish_color='Sand Blast Washed Walnut',
        cbm=0.35, price_usd=149.00, total_cbm=3.50, total_amount=1490.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Knock Down Pack.',
    ),
    # 16
    dict(
        sample_id='SMP-016',
        buyer_code='AT1701',
        po='P0009805',
        style_no='1810-150-LG-SBWW',
        product_name='Anbu Acacia Dining Table - Washed Walnut - Large',
        size_length=220.0, size_breadth=90.0, size_height=76.0,
        wood_type='Acacia',
        finish_color='Sand Blast Washed Walnut',
        cbm=0.53, price_usd=180.00, total_cbm=3.18, total_amount=1080.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Knock Down Pack.',
    ),
    # 17
    dict(
        sample_id='SMP-017',
        buyer_code='AT5502',
        po='P0009597',
        style_no='1810-150-LG-SBNAT',
        product_name='Anbu Mango Dining Table - Natural - Large',
        size_length=220.0, size_breadth=90.0, size_height=76.0,
        wood_type='Mango',
        finish_color='Sand Blast Natural',
        cbm=0.53, price_usd=185.00, total_cbm=5.30, total_amount=1850.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Knock Down Pack. Skirting to be 9 cm Height.',
    ),
    # 18
    dict(
        sample_id='SMP-018',
        buyer_code='AT6001',
        po='P0009491',
        style_no='2409-017',
        product_name='Anbu Acacia Bedside Table - Washed Walnut',
        size_length=42.0, size_breadth=42.0, size_height=57.0,
        wood_type='Acacia',
        finish_color='SB Washed Walnut',
        cbm=0.16, price_usd=56.00, total_cbm=0.16, total_amount=56.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Height to be 57 cm.',
    ),
    # 19
    dict(
        sample_id='SMP-019',
        buyer_code='DA0301',
        po='P0009597',
        style_no='2201-005-SBN',
        product_name='Dalibar Leather Lounger - Tan - One Size',
        size_length=67.0, size_breadth=73.0, size_height=76.0,
        wood_type='Acacia / Leather',
        finish_color='SB Natural / Fountain Leather',
        cbm=0.45, price_usd=115.00, total_cbm=8.10, total_amount=2070.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Full Leather.',
    ),
    # 20
    dict(
        sample_id='SMP-020',
        buyer_code='DA0401',
        po='P0008067',
        style_no='2201-005-SBWW-CHL',
        product_name='Dalibar Leather Lounger - Charcoal - One Size',
        size_length=67.0, size_breadth=73.0, size_height=76.0,
        wood_type='Acacia / Leather',
        finish_color='SB Washed Walnut / Charcoal Leather',
        cbm=0.45, price_usd=115.00, total_cbm=5.40, total_amount=1380.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Full Leather.',
    ),
    # 21
    dict(
        sample_id='SMP-021',
        buyer_code='ET0601',
        po='P0008067',
        style_no='2009-011',
        product_name='Erebar Acacia & Cane Side Table - Natural - One Size',
        size_length=40.0, size_breadth=35.0, size_height=60.0,
        wood_type='Acacia / Cane',
        finish_color='SB Natural / Cane',
        cbm=0.12, price_usd=36.00, total_cbm=0.24, total_amount=72.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Single Pack.',
    ),
]


class Command(BaseCommand):
    help = 'Seed the 21 real sample records from the Excel data (no images).'

    def handle(self, *args, **options):
        self.stdout.write('Seeding 21 sample records from Excel data...')

        created = 0
        updated = 0
        existing_ids = set(Sample.objects.values_list('sample_id', flat=True))

        for data in SAMPLES_DATA:
            sid = data['sample_id']
            if sid in existing_ids:
                # Update existing record with new fields
                Sample.objects.filter(sample_id=sid).update(**{k: v for k, v in data.items() if k != 'sample_id'})
                updated += 1
                self.stdout.write(f'  Updated: {sid}')
            else:
                Sample.objects.create(**data)
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {sid}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done! {created} created, {updated} updated. '
            f'Total samples in DB: {Sample.objects.count()}'
        ))

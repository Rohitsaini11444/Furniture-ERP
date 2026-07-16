"""
Seed command — inserts real sample records 22–41 from the Excel screenshot data.
Run: python manage.py seed_samples_2
"""
from django.core.management.base import BaseCommand
from erp.models import Sample


SAMPLES_DATA = [
    # 22
    dict(
        sample_id='SMP-022',
        buyer_code='ET0701',
        po='P0008125',
        style_no='2009-009',
        product_name='Erebar Acacia & Cane Coffee Table - Natural - One Size',
        size_length=120.0, size_breadth=60.0, size_height=45.0,
        wood_type='Acacia / Cane',
        finish_color='SB Natural / Cane',
        cbm=0.41, price_usd=91.00, total_cbm=4.92, total_amount=1092.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 23
    dict(
        sample_id='SMP-023',
        buyer_code='KC7801',
        po='P0009221',
        style_no='2201-022',
        product_name='Keya Chunky Weave & Mango Wood Chair - Natural - One Size',
        size_length=72.0, size_breadth=92.0, size_height=85.0,
        wood_type='Mango / Fabric',
        finish_color='Natural / Fabric DC-CU-730',
        cbm=0.60, price_usd=170.00, total_cbm=18.00, total_amount=5100.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Fix Pack.',
    ),
    # 24
    dict(
        sample_id='SMP-024',
        buyer_code='KC8401',
        po='P0009343',
        style_no='2407-048',
        product_name='Knada Leather Armchair - Chocolate Brown',
        size_length=74.0, size_breadth=80.0, size_height=77.0,
        wood_type='Mango / Leather',
        finish_color='New Fountain Leather / Chestnut',
        cbm=0.60, price_usd=198.00, total_cbm=4.80, total_amount=1584.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Removed Studs from front. And keep Back side studs with antique as shown nails. NO Velcro on Seat.',
    ),
    # 25
    dict(
        sample_id='SMP-025',
        buyer_code='KL3001',
        po='P0008402',
        style_no='1912-036-L',
        product_name='Kashvi Oversized Linen Lounger - Natural - One Size',
        size_length=81.0, size_breadth=92.0, size_height=85.0,
        wood_type='Iron / Fabric',
        finish_color='Black Iron / Linen 1557 Fabric',
        cbm=0.75, price_usd=145.00, total_cbm=3.75, total_amount=725.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 26
    dict(
        sample_id='SMP-026',
        buyer_code='KM1201',
        po='P0007764',
        style_no='2102-049-SBWW',
        product_name='Kayla Acacia Wood Mirror - Walnut - One Size',
        size_length=76.0, size_breadth=76.0, size_height=9.0,
        wood_type='Acacia / Mirror / MDF',
        finish_color='Sand Blast Washed Walnut / Mirror',
        cbm=0.10, price_usd=47.00, total_cbm=3.00, total_amount=1410.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 27
    dict(
        sample_id='SMP-027',
        buyer_code='LC1301',
        po='P0008581',
        style_no='2112-001',
        product_name='Lohanda Acacia & Jute Dining Chair',
        size_length=49.0, size_breadth=57.0, size_height=91.0,
        wood_type='Acacia / Seagrass Weaving',
        finish_color='Duco SB Distressed Black',
        cbm=0.20, price_usd=51.00, total_cbm=4.00, total_amount=1020.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='2 Pieces in a Box.',
    ),
    # 28
    dict(
        sample_id='SMP-028',
        buyer_code='LS2101',
        po='P0009732',
        style_no='2205-012-SBN',
        product_name='Lohanda Acacia & Jute Counter Stool - Natural - One Size',
        size_length=47.0, size_breadth=52.0, size_height=105.0,
        wood_type='Acacia / Seagrass Weaving',
        finish_color='SB Natural Wood / Seagrass Weaving',
        cbm=0.33, price_usd=60.00, total_cbm=19.80, total_amount=3600.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Single Pack.',
    ),
    # 29
    dict(
        sample_id='SMP-029',
        buyer_code='MC9801',
        po='P0009805',
        style_no='2003-011',
        product_name='Madrisana Acacia & Rattan Woven Chair (Single Weaving)',
        size_length=63.0, size_breadth=82.0, size_height=73.0,
        wood_type='Acacia / Cane',
        finish_color='Natural Finish',
        cbm=0.25, price_usd=99.00, total_cbm=3.00, total_amount=1188.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='L Packaging but Strong.',
    ),
    # 30
    dict(
        sample_id='SMP-030',
        buyer_code='MF0201',
        po='P0007663',
        style_no='2111-001',
        product_name='Madrisana Acacia & Rattan Footstool',
        size_length=63.5, size_breadth=40.0, size_height=40.0,
        wood_type='Acacia / Rattan Weaving',
        finish_color='Natural',
        cbm=0.14, price_usd=44.00, total_cbm=0.56, total_amount=176.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Rattan Single Weave!',
    ),
    # 31
    dict(
        sample_id='SMP-031',
        buyer_code='MS1801',
        po='P0008981',
        style_no='2111-002',
        product_name='Madrisana Acacia & Rattan Bar Stool - Natural',
        size_length=46.0, size_breadth=56.0, size_height=105.0,
        wood_type='Acacia / Rattan Weaving',
        finish_color='Natural Finish',
        cbm=0.34, price_usd=80.00, total_cbm=7.14, total_amount=1680.00,
        box_length=21.0, box_breadth=24.0, box_height=44.0,
        net_weight=None, gross_weight=16.8,
        remark='Double Weaving of Rattan.',
    ),
    # 32
    dict(
        sample_id='SMP-032',
        buyer_code='NPS9112',
        po='P0009652N1',
        style_no='2306-015-SBLW',
        product_name='Kusa Mango Wood & Leather Dining Chair - Aged Tan - One Size',
        size_length=49.0, size_breadth=56.0, size_height=80.0,
        wood_type='Mango / Leather',
        finish_color='SB Light Walnut / TAN Leather',
        cbm=0.29, price_usd=67.00, total_cbm=49.30, total_amount=11390.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Single L shape Packaging.',
    ),
    # 33
    dict(
        sample_id='SMP-033',
        buyer_code='NPS9113',
        po='P0009652N1',
        style_no='2503-042-SBWW',
        product_name='Baloo Acacia Wood & Leather Occasional Chair - Olive Green',
        size_length=77.0, size_breadth=96.0, size_height=77.0,
        wood_type='Acacia / Leather / Canvas',
        finish_color='SB Washed Walnut / Buff Olive Green Leather / Green Canvas',
        cbm=0.68, price_usd=250.00, total_cbm=13.60, total_amount=5000.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 34
    dict(
        sample_id='SMP-034',
        buyer_code='NPS59130',
        po='P0009652N1',
        style_no='2502-043-SBWW',
        product_name='Anbu Acacia Wardrobe - Washed Walnut - One Size',
        size_length=90.0, size_breadth=60.0, size_height=190.0,
        wood_type='Acacia',
        finish_color='SB Washed Walnut',
        cbm=1.32, price_usd=320.00, total_cbm=10.56, total_amount=2560.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 35
    dict(
        sample_id='SMP-035',
        buyer_code='RB2401',
        po='P0008839',
        style_no='2205-017-SM-SBWW',
        product_name='Raunak Acacia Woven Bench - Washed Walnut - Small',
        size_length=180.0, size_breadth=40.0, size_height=45.0,
        wood_type='Acacia / Moonj Weaving',
        finish_color='Sand Blast Washed Walnut / Brown Moonj Weaving',
        cbm=0.42, price_usd=88.00, total_cbm=5.04, total_amount=1056.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 36
    dict(
        sample_id='SMP-036',
        buyer_code='RB2501',
        po='P0008839',
        style_no='2205-017-LG-SBWW',
        product_name='Raunak Acacia Woven Bench - Washed Walnut - Large',
        size_length=220.0, size_breadth=40.0, size_height=45.0,
        wood_type='Acacia / Moonj Weaving',
        finish_color='Sand Blast Washed Walnut / Brown Moonj Weaving',
        cbm=0.51, price_usd=109.00, total_cbm=4.59, total_amount=981.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 37
    dict(
        sample_id='SMP-037',
        buyer_code='RC0601',
        po='P0007995',
        style_no='2204-038-SBWW',
        product_name='Raunak Acacia Woven Dining Chair - Washed Walnut - One Size',
        size_length=45.0, size_breadth=45.0, size_height=81.0,
        wood_type='Acacia / Moonj Weaving',
        finish_color='Sand Blast Washed Walnut / Brown Moonj Weaving',
        cbm=0.15, price_usd=41.00, total_cbm=3.90, total_amount=1066.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Single Pack.',
    ),
    # 38
    dict(
        sample_id='SMP-038',
        buyer_code='SU0401',
        po='P0009412',
        style_no='2204-022-SBWW',
        product_name='Surat Woven Lounger - Natural - One Size',
        size_length=69.0, size_breadth=76.0, size_height=73.0,
        wood_type='Acacia / Rope Weaving',
        finish_color='SB Washed Walnut / Natural White Rope',
        cbm=0.45, price_usd=85.00, total_cbm=0.45, total_amount=85.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='',
    ),
    # 39
    dict(
        sample_id='SMP-039',
        buyer_code='TB0501',
        po='P0008067',
        style_no='2005-008-SBN',
        product_name='Tipu Acacia Wood Bench - Natural - One Size',
        size_length=129.0, size_breadth=55.0, size_height=75.0,
        wood_type='Acacia',
        finish_color='Sand Blast Natural',
        cbm=0.37, price_usd=104.00, total_cbm=2.59, total_amount=728.00,
        box_length=None, box_breadth=None, box_height=None,
        net_weight=None, gross_weight=None,
        remark='Seat Edge from front corners to be slightly Round. 4 Legs with Knock Down Pack.',
    ),
    # 40
    dict(
        sample_id='SMP-040',
        buyer_code='UL0601',
        po='P0008988',
        style_no='2203-055-SBWW',
        product_name='Umar Mango Wood Coffee Table - Dark Brown - One Size',
        size_length=94.0, size_breadth=94.0, size_height=46.0,
        wood_type='Mango',
        finish_color='SB PC Walnut Antique',
        cbm=0.18, price_usd=70.00, total_cbm=3.60, total_amount=1400.00,
        box_length=39.0, box_breadth=7.5, box_height=39.0,
        net_weight=None, gross_weight=20.8,
        remark='Knock Down Pack.',
    ),
    # 41
    dict(
        sample_id='SMP-041',
        buyer_code='UL0701',
        po='P0008988',
        style_no='2203-056-SBWW',
        product_name='Umar Acacia Wood Side Table - Dark Brown - One Size',
        size_length=48.0, size_breadth=48.0, size_height=55.0,
        wood_type='Mango',
        finish_color='SB PC Walnut Antique',
        cbm=0.05, price_usd=30.00, total_cbm=1.50, total_amount=900.00,
        box_length=24.5, box_breadth=7.5, box_height=22.5,
        net_weight=None, gross_weight=7.1,
        remark='Knock Down Pack.',
    ),
]


class Command(BaseCommand):
    help = 'Seed sample records 22–41 from the Excel data (no images).'

    def handle(self, *args, **options):
        self.stdout.write('Seeding sample records 22–41 from Excel data...')

        created = 0
        updated = 0
        existing_ids = set(Sample.objects.values_list('sample_id', flat=True))

        for data in SAMPLES_DATA:
            sid = data['sample_id']
            if sid in existing_ids:
                Sample.objects.filter(sample_id=sid).update(
                    **{k: v for k, v in data.items() if k != 'sample_id'}
                )
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

from django.core.management.base import BaseCommand
from seed_store_items import seed_store_items

class Command(BaseCommand):
    help = 'Seeds production Store Master Items and Categories from authoritative master spreadsheet.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate seeding without modifying the database.'
        )
        parser.add_argument(
            '--no-update-rates',
            action='store_true',
            help='Do not update rates on existing items.'
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        update_rates = not options.get('no_update_rates', False)
        seed_store_items(dry_run=dry_run, update_rates=update_rates)
        self.stdout.write(self.style.SUCCESS('Successfully processed store item seeding.'))

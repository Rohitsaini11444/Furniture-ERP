from django.core.management.base import BaseCommand
import os
import sys
import seed

class Command(BaseCommand):
    help = 'Seeds database with initial Users, Buyers, Samples, BuyerMasters, Suppliers, POs, PIs, and Stock items for Pinkcity Enterprises (excluding images).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('[SEED] Triggering Database Seeding...'))
        try:
            seed.run_seed()
            self.stdout.write(self.style.SUCCESS('[SEED] Database Seeding Completed Successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Seeding Failed: {e}'))

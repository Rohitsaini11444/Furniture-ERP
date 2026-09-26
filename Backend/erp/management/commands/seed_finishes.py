from django.core.management.base import BaseCommand
import sys
import os

# Ensure Backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from seed_finishes import seed_finishes
except ImportError:
    from ...seed_finishes import seed_finishes


class Command(BaseCommand):
    help = 'Seeds finishing catalog data (name, code, color, wood type) without modifying images.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('[SEED] Initiating Finishing Catalog seeding...'))
        try:
            result = seed_finishes(stdout_write=self.stdout.write)
            self.stdout.write(
                self.style.SUCCESS(
                    f"[SUCCESS] Successfully completed! (Created: {result['created']}, Updated: {result['updated']})"
                )
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERROR] Finishing seeding failed: {e}'))
            raise e

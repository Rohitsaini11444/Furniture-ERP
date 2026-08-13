import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.core.management import call_command

with open('datadump.json', 'w', encoding='utf-8') as f:
    call_command(
        'dumpdata',
        stdout=f,
        natural_foreign=True,
        natural_primary=True,
        exclude=['contenttypes', 'auth.permission'],
        indent=2
    )

print("Successfully dumped SQLite database to datadump.json (UTF-8)")

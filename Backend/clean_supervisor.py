import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("UPDATE erp_supplierpo SET supervisor = NULL WHERE supervisor = '' OR supervisor IS NOT NULL;")
    print("Cleaned erp_supplierpo.supervisor values to NULL.")

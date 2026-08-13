import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

from io import StringIO

out = StringIO()
call_command('sqlsequencereset', 'erp', 'auth', 'admin', stdout=out)
sql = out.getvalue()

if sql:
    with connection.cursor() as cursor:
        cursor.execute(sql)
    print("PostgreSQL primary key auto-increment sequences reset successfully!")
else:
    print("No sequences to reset.")

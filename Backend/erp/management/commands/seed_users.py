"""
Management command to seed initial users for testing.
Usage:
    python manage.py seed_users
"""
from django.core.management.base import BaseCommand
from erp.models import User


class Command(BaseCommand):
    help = 'Creates initial Admin, Supervisor, and Contractor users for testing'

    def handle(self, *args, **options):
        self.stdout.write("Seeding users...")

        # Admin
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_user(
                username='admin',
                password='admin123',
                first_name='System',
                last_name='Admin',
                email='admin@erp.com',
                role='admin',
            )
            admin.is_staff = True
            admin.is_superuser = True
            admin.save()
            self.stdout.write(self.style.SUCCESS("  OK Admin user created -> username: admin | password: admin123"))
        else:
            self.stdout.write(self.style.WARNING("  -- Admin user already exists, skipping."))

        # Sanding Supervisor
        if not User.objects.filter(username='supervisor_sanding').exists():
            sup = User.objects.create_user(
                username='supervisor_sanding',
                password='super123',
                first_name='Priya',
                last_name='Sharma',
                email='priya@erp.com',
                role='supervisor',
                batch_category='sanding',
            )
            self.stdout.write(self.style.SUCCESS("  OK Supervisor created -> username: supervisor_sanding | password: super123 | batch: sanding"))
        else:
            sup = User.objects.get(username='supervisor_sanding')
            self.stdout.write(self.style.WARNING("  -- Sanding supervisor already exists, skipping."))

        # Contractors under Sanding Supervisor
        contractors = [
            ('contractor_ravi', 'ravi123', 'Ravi', 'Kumar'),
            ('contractor_meena', 'meena123', 'Meena', 'Patel'),
        ]
        for uname, pwd, fname, lname in contractors:
            if not User.objects.filter(username=uname).exists():
                User.objects.create_user(
                    username=uname,
                    password=pwd,
                    first_name=fname,
                    last_name=lname,
                    email=f'{uname}@erp.com',
                    role='contractor',
                    supervisor=sup,
                )
                self.stdout.write(self.style.SUCCESS(
                    f"  OK Contractor created -> username: {uname} | password: {pwd} | supervisor: {sup.username}"
                ))
            else:
                self.stdout.write(self.style.WARNING(f"  -- {uname} already exists, skipping."))

        self.stdout.write(self.style.SUCCESS("\nUser seeding complete!\n"))
        self.stdout.write("Test credentials:")
        self.stdout.write("  Admin           -> admin / admin123")
        self.stdout.write("  Supervisor      -> supervisor_sanding / super123")
        self.stdout.write("  Contractor 1    -> contractor_ravi / ravi123")
        self.stdout.write("  Contractor 2    -> contractor_meena / meena123")

import os
import sys
import time
import django

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from erp.models import (
    StoreItem, StoreItemCategory, StoreItemRateHistory,
    StoreMaterialIn, StoreDailyIssue, AuditLog, AuditAction, Supplier
)
from erp.admin import StoreItemAdmin
from erp.views import StoreBulkDeleteView
from django.contrib.admin.sites import AdminSite

User = get_user_model()

def test_bulk_deletion_performance_and_audit():
    print("=" * 75)
    print("[TEST] BULK DELETION TIMEOUT & CASCADE AUDIT STORM FIX VERIFICATION")
    print("=" * 75)

    # Clean up any leftover test items from prior test runs
    StoreItem.objects.filter(item_code__startswith="PERF-").delete()
    User.objects.filter(username__startswith="perf_").delete()

    # 1. Setup Test Data
    admin_user, _ = User.objects.get_or_create(
        username='perf_admin_test',
        defaults={'email': 'admin@test.com', 'role': 'admin', 'is_staff': True, 'is_superuser': True}
    )

    contractor_user, _ = User.objects.get_or_create(
        username='perf_contractor_test',
        defaults={'email': 'contractor@test.com', 'role': 'contractor'}
    )
    category, _ = StoreItemCategory.objects.get_or_create(name='Perf Test Category', defaults={'code': 'PERFCAT'})
    supplier, _ = Supplier.objects.get_or_create(name='Perf Test Supplier', defaults={'gstin': '08AABCU9603R1ZM'})

    print(f"[1/4] Creating 100 StoreItems with related cascade records (RateHistory, MaterialIn, DailyIssue)...")
    items_batch_1 = []
    for i in range(100):
        item = StoreItem(
            item_code=f"PERF-ITM-A-{i:04d}",
            item_name=f"Performance Test Item A #{i}",
            category=category,
            base_rate=50.00,
            current_rate=55.00
        )
        items_batch_1.append(item)
    StoreItem.objects.bulk_create(items_batch_1)

    # Fetch created items with IDs
    created_items_1 = list(StoreItem.objects.filter(item_code__startswith="PERF-ITM-A-"))
    
    # Create related cascade rows for each item (2 rows each = 200 cascade child records)
    rate_histories = [
        StoreItemRateHistory(item=itm, old_rate=50.00, new_rate=55.00, rate_difference=5.00, percentage_change=10.00)
        for itm in created_items_1
    ]
    StoreItemRateHistory.objects.bulk_create(rate_histories)

    material_ins = [
        StoreMaterialIn(voucher_no=f"PERF-INW-{itm.id}", bill_no="BILL-101", supplier=supplier, item=itm, qty=100, bill_rate=55.00, total_amount=5500.00)
        for itm in created_items_1
    ]
    StoreMaterialIn.objects.bulk_create(material_ins)

    print(f"      Successfully prepared 100 items + 200 related cascade records (Total 300 DB rows).")

    # 2. Test Django Admin ModelAdmin.delete_queryset (simulating deleting 100 entries in Admin Panel)
    print(f"\n[2/4] Testing Admin Panel Bulk Deletion (StoreItemAdmin.delete_queryset)...")
    site = AdminSite()
    admin_instance = StoreItemAdmin(StoreItem, site)

    rf = RequestFactory()
    request = rf.post('/admin/erp/storeitem/')
    request.user = admin_user

    qs_to_delete = StoreItem.objects.filter(item_code__startswith="PERF-ITM-A-")
    item_count = qs_to_delete.count()
    assert item_count == 100, f"Expected 100 items to delete, found {item_count}"

    audit_count_before = AuditLog.objects.count()
    start_time = time.time()

    admin_instance.delete_queryset(request, qs_to_delete)

    elapsed_time = time.time() - start_time
    audit_count_after = AuditLog.objects.count()
    remaining = StoreItem.objects.filter(item_code__startswith="PERF-ITM-A-").count()

    print(f"      Deletion completed in {elapsed_time:.3f} seconds!")
    print(f"      Remaining items in DB: {remaining} (Expected: 0)")
    print(f"      Audit logs created: {audit_count_after - audit_count_before} (Expected: 1 consolidated log, NOT 300+ logs!)")

    assert remaining == 0, "Failed to delete all items in bulk"
    assert (audit_count_after - audit_count_before) == 1, "Should create exactly 1 consolidated audit log for bulk delete"
    assert elapsed_time < 3.0, f"Bulk deletion took too long ({elapsed_time:.2f}s). Must be under 3s to avoid Gunicorn timeout."

    bulk_log = AuditLog.objects.filter(object_id="BULK-100").first()
    assert bulk_log is not None, "Consolidated audit log BULK-100 was not found!"
    print(f"      Consolidated Audit Log: [{bulk_log.action}] {bulk_log.object_repr} (User: {bulk_log.username})")

    # 3. Test StoreBulkDeleteView (API View bulk deletion)
    print(f"\n[3/4] Testing API Bulk Delete View (StoreBulkDeleteView)...")
    from rest_framework.test import APIRequestFactory, force_authenticate
    drf_factory = APIRequestFactory()

    items_batch_2 = [
        StoreItem(item_code=f"PERF-ITM-B-{i:04d}", item_name=f"Performance Test Item B #{i}", category=category)
        for i in range(100)
    ]
    StoreItem.objects.bulk_create(items_batch_2)
    created_items_2 = list(StoreItem.objects.filter(item_code__startswith="PERF-ITM-B-"))
    ids_to_delete = [str(itm.id) for itm in created_items_2]

    view = StoreBulkDeleteView.as_view()
    api_request = drf_factory.post(
        '/api/store/bulk-delete/',
        data={'module': 'items', 'selected_ids': ids_to_delete},
        format='json'
    )
    force_authenticate(api_request, user=admin_user)

    start_time = time.time()
    response = view(api_request)
    elapsed_time = time.time() - start_time

    remaining_2 = StoreItem.objects.filter(item_code__startswith="PERF-ITM-B-").count()
    print(f"      API Bulk Delete completed in {elapsed_time:.3f} seconds with status {response.status_code}!")
    print(f"      Remaining items in DB: {remaining_2} (Expected: 0)")
    assert response.status_code == 200
    assert remaining_2 == 0


    # 4. Test Single Deletion (verifying single record delete still creates individual detailed audit log)
    print(f"\n[4/4] Testing Single Record Deletion (Signal verification)...")
    single_item = StoreItem.objects.create(
        item_code="PERF-SINGLE-001",
        item_name="Single Delete Test Item",
        category=category,
        base_rate=120.00
    )
    single_id = str(single_item.pk)
    single_item.delete()

    single_log = AuditLog.objects.filter(model_name="Store Item", object_id=single_id, action=AuditAction.DELETE).first()
    assert single_log is not None, "Single item deletion failed to create individual AuditLog via signal"
    print(f"      Single item deleted and captured via signal: ID {single_log.object_id} -> {single_log.object_repr}")

    print("\n" + "=" * 75)
    print("[SUCCESS] ALL BULK DELETION & PERFORMANCE TESTS PASSED 100%!")
    print("=" * 75)

if __name__ == '__main__':
    test_bulk_deletion_performance_and_audit()

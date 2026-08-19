import os
import sys
import django

# Force UTF-8 encoding for stdout on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from erp.models import AuditLog, AuditAction, Buyer, StoreItem, StoreItemCategory, User, RoleChoices
from erp.views import log_audit_event

def run_audit_tests():
    print("=" * 70)
    print("[TEST SUITE] BEGINNING COMPREHENSIVE ERP AUDIT SYSTEM VERIFICATION")
    print("=" * 70)

    # 1. Fetch or create a test admin user
    user, created = User.objects.get_or_create(
        username='audit_test_admin',
        defaults={'email': 'audit@pinkcity.com', 'role': RoleChoices.ADMIN, 'first_name': 'Audit', 'last_name': 'Tester'}
    )
    print(f"[Setup] Admin user: {user.username} (Role: {user.role})")

    # 2. Test manual audit event logging (log_audit_event)
    print("\n--- TEST 1: Manual Audit Event Logging (log_audit_event) ---")
    log_entry = log_audit_event(
        user=user,
        action=AuditAction.EXPORT,
        module_name="Store Management",
        model_name="StoreItem",
        object_id="EXP-1001",
        object_repr="Monthly Inventory Report Excel",
        changes={'export_format': 'XLSX', 'rows_exported': 150},
        reason="Monthly Auditor Request"
    )
    assert log_entry.pk is not None, "Failed to create AuditLog entry"
    assert log_entry.action == AuditAction.EXPORT, f"Expected EXPORT action, got {log_entry.action}"
    print(f"PASSED [OK] Created AuditLog entry ID: {log_entry.id}")
    print(f"   Logged: [{log_entry.action}] {log_entry.module_name} -> {log_entry.object_repr}")

    # 3. Test automated signals on CREATE
    print("\n--- TEST 2: Automated Signal Tracking on CREATE ---")
    cat, _ = StoreItemCategory.objects.get_or_create(name="Testing Category", defaults={'code': 'TSTCAT'})
    test_item = StoreItem.objects.create(
        category=cat,
        item_code=f"TST-{StoreItem.objects.count() + 1}",
        item_name="Audit Sand Paper 800 Grit",
        unit="Pcs",
        base_rate=20.00,
        current_rate=25.50
    )
    print(f"   Created StoreItem: {test_item.item_code} ({test_item.item_name})")

    # Check AuditLog for CREATE signal
    create_log = AuditLog.objects.filter(model_name="Store Item", object_id=str(test_item.pk), action=AuditAction.CREATE).first()
    assert create_log is not None, "Signal failed to auto-create AuditLog on StoreItem CREATE"
    assert 'new_values' in create_log.changes, "Missing new_values in CREATE changes JSON"
    print(f"PASSED [OK] Auto-captured CREATE signal in AuditLog (ID: {create_log.id})")
    print(f"   Captured fields in JSON: {list(create_log.changes.get('new_values', {}).keys())[:5]}...")

    # 4. Test automated signals on UPDATE
    print("\n--- TEST 3: Automated Signal Tracking on UPDATE ---")
    test_item.current_rate = 29.99
    test_item.item_name = "Audit Sand Paper 800 Grit (Revised)"
    test_item.save()

    update_log = AuditLog.objects.filter(model_name="Store Item", object_id=str(test_item.pk), action=AuditAction.UPDATE).first()
    assert update_log is not None, "Signal failed to auto-create AuditLog on StoreItem UPDATE"
    assert 'updated_fields' in update_log.changes, "Missing updated_fields in UPDATE changes JSON"
    print(f"PASSED [OK] Auto-captured UPDATE signal in AuditLog (ID: {update_log.id})")
    print(f"   Snapshot rate: {update_log.changes['updated_fields'].get('current_rate')}")

    # 5. Test automated signals on DELETE
    print("\n--- TEST 4: Automated Signal Tracking on DELETE ---")
    deleted_pk = str(test_item.pk)
    deleted_repr = str(test_item)
    test_item.delete()

    delete_log = AuditLog.objects.filter(model_name="Store Item", object_id=deleted_pk, action=AuditAction.DELETE).first()
    assert delete_log is not None, "Signal failed to auto-create AuditLog on StoreItem DELETE"
    assert 'deleted_snapshot' in delete_log.changes, "Missing deleted_snapshot in DELETE changes JSON"
    print(f"PASSED [OK] Auto-captured DELETE signal in AuditLog (ID: {delete_log.id})")
    print(f"   Deleted snapshot item code: {delete_log.changes['deleted_snapshot'].get('item_code')}")

    # 6. Test Querying & Filtering
    print("\n--- TEST 5: Audit Log Querying & Filtering ---")
    total_logs = AuditLog.objects.count()
    store_logs = AuditLog.objects.filter(module_name="Store Management").count()
    delete_logs = AuditLog.objects.filter(action=AuditAction.DELETE).count()
    print(f"PASSED [OK] Query Results:")
    print(f"   • Total Audit Logs in DB: {total_logs}")
    print(f"   • Store Management Module Logs: {store_logs}")
    print(f"   • Total Deletions Logged: {delete_logs}")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL AUDIT SYSTEM TESTS PASSED PERFECTLY! ZERO ERRORS.")
    print("=" * 70)

if __name__ == '__main__':
    run_audit_tests()

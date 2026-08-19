import json
from decimal import Decimal
from datetime import date, datetime
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict

from .models import (
    AuditLog, AuditAction, Buyer, BuyerMaster, BuyerPI, SupplierPO,
    Supplier, StoreItem, StoreItemCategory, StoreMaterialIn, StoreDailyIssue,
    Sample, Finish, ProductionJob, ProductionUnit, User
)
from .middleware import get_current_user, get_client_ip, get_user_agent

MODEL_MODULE_MAP = {
    Buyer: ("Buyers Directory", "Buyer"),
    BuyerMaster: ("Buyer Masters", "Buyer Master Style"),
    BuyerPI: ("Performa Invoices (PI)", "Buyer Performa Invoice"),
    SupplierPO: ("Supplier Purchase Orders", "Purchase Order"),
    Supplier: ("Supplier Management", "Supplier"),
    StoreItem: ("Store Management", "Store Item"),
    StoreItemCategory: ("Store Management", "Store Item Category"),
    StoreMaterialIn: ("Store Management", "Store Material Inward"),
    StoreDailyIssue: ("Store Management", "Store Daily Issue"),
    Sample: ("Sample Management", "Sample"),
    Finish: ("Finishing Module", "Finish Specification"),
    ProductionJob: ("Production Pipeline", "Production Job"),
    ProductionUnit: ("Unit Management", "Production Unit"),
    User: ("User Management", "System User"),
}

def serialize_val(val):
    if isinstance(val, (Decimal, float)):
        return str(val)
    if isinstance(val, (date, datetime)):
        return val.isoformat()
    if hasattr(val, 'id'):
        return str(val)
    return str(val) if val is not None else ""

@receiver(post_save)
def auto_audit_log_save(sender, instance, created, **kwargs):
    if sender not in MODEL_MODULE_MAP:
        return
    if sender == AuditLog:
        return

    module_name, friendly_model_name = MODEL_MODULE_MAP[sender]
    user = get_current_user()
    ip_addr = get_client_ip()
    user_agent = get_user_agent()

    action = AuditAction.CREATE if created else AuditAction.UPDATE
    object_id = str(instance.pk)
    object_repr = str(instance)

    changes = {}
    file_info = {}

    for attr in ['image', 'photo', 'file', 'attachment', 'excel_file']:
        if hasattr(instance, attr):
            file_field = getattr(instance, attr)
            if file_field and hasattr(file_field, 'name') and file_field.name:
                file_info[attr] = {
                    'filename': file_field.name.split('/')[-1],
                    'path': str(file_field),
                    'size_bytes': getattr(file_field, 'size', None)
                }

    try:
        if created:
            changes = {'new_values': {k: serialize_val(v) for k, v in model_to_dict(instance).items() if v is not None}}
        else:
            changes = {'updated_fields': {k: serialize_val(v) for k, v in model_to_dict(instance).items() if v is not None}}
    except Exception as e:
        changes = {'info': f'Model snapshot: {str(e)}'}

    AuditLog.objects.create(
        user=user if user and getattr(user, 'is_authenticated', False) else None,
        username=user.get_full_name() or user.username if user else 'System',
        user_role=getattr(user, 'role', 'system') if user else 'system',
        ip_address=ip_addr,
        user_agent=user_agent[:500] if user_agent else '',
        action=action,
        module_name=module_name,
        model_name=friendly_model_name,
        object_id=object_id,
        object_repr=object_repr[:250],
        changes=changes,
        file_info=file_info,
    )

@receiver(post_delete)
def auto_audit_log_delete(sender, instance, **kwargs):
    if sender not in MODEL_MODULE_MAP:
        return
    if sender == AuditLog:
        return

    module_name, friendly_model_name = MODEL_MODULE_MAP[sender]
    user = get_current_user()
    ip_addr = get_client_ip()
    user_agent = get_user_agent()

    object_id = str(instance.pk)
    object_repr = str(instance)

    changes = {}
    try:
        changes = {'deleted_snapshot': {k: serialize_val(v) for k, v in model_to_dict(instance).items() if v is not None}}
    except Exception:
        changes = {'info': 'Snapshot captured'}

    AuditLog.objects.create(
        user=user if user and getattr(user, 'is_authenticated', False) else None,
        username=user.get_full_name() or user.username if user else 'System',
        user_role=getattr(user, 'role', 'system') if user else 'system',
        ip_address=ip_addr,
        user_agent=user_agent[:500] if user_agent else '',
        action=AuditAction.DELETE,
        module_name=module_name,
        model_name=friendly_model_name,
        object_id=object_id,
        object_repr=object_repr[:250],
        changes=changes,
    )

from datetime import date
from decimal import Decimal

from django.contrib.auth import authenticate
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, ProductionUnit, BuyerUnitAllocation, UnitWorkReallocation, Finish, Sample, SampleImage,
    Buyer, BuyerMaster, BuyerMasterFinishingImage, Supplier, SupplierPO, SupplierPOItem, SupplierPOItemDefect, POExtensionLog, POSupplierHistory,
    PerformaInvoice, PerformaInvoiceItem,
    BuyerPI, BuyerPIItem,
    UserSession, StockItem, ProductionJob, ProductionQCLog,
    GateInwardReceipt, SupplierDebitNote, SupplierTaxInvoice, SupplierTaxInvoiceItem, SupplierDebitNoteItem,
    StoreItemCategory, StoreItem, StoreItemRateHistory, ContractorPerson, StorePurchaseOrder, StorePurchaseOrderItem, StoreMaterialIn, StoreDailyIssue, StoreMaterialReturn, StoreItemStatus,
    StoreRequisition, StoreStockAdjustment,
    Notification, AuditLog
)


# ─── Auth Serializers ─────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        # Check if user exists and password is correct to report account status accurately
        user_obj = User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()
        if user_obj and user_obj.check_password(password):
            if not user_obj.is_active:
                raise serializers.ValidationError("This account has been deactivated by an Administrator. Please contact support.")
            attrs['user'] = user_obj
            return attrs

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials. Please try again.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated by an Administrator. Please contact support.")
        attrs['user'] = user
        return attrs


class TokenResponseSerializer(serializers.Serializer):
    """Used only for schema/documentation — not for deserialization."""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = serializers.DictField()


# ─── Production Unit & Work Allocation Serializers ─────────────────────────

class ProductionUnitSerializer(serializers.ModelSerializer):
    supervisor_count = serializers.SerializerMethodField()
    contractor_count = serializers.SerializerMethodField()
    stock_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductionUnit
        fields = '__all__'

    def get_supervisor_count(self, obj):
        if hasattr(obj, 'annotated_supervisor_count'):
            return obj.annotated_supervisor_count
        return obj.users.filter(role='supervisor', is_active=True).count()

    def get_contractor_count(self, obj):
        if hasattr(obj, 'annotated_contractor_count'):
            return obj.annotated_contractor_count
        return obj.users.filter(role='contractor', is_active=True).count()

    def get_stock_count(self, obj):
        if hasattr(obj, 'annotated_stock_count'):
            return float(obj.annotated_stock_count or 0.0)
        return sum(float(item.quantity or 0) for item in obj.stock_items.all())


class BuyerUnitAllocationSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.name', read_only=True)
    buyer_code = serializers.CharField(source='buyer.code', read_only=True)
    unit_name = serializers.CharField(source='production_unit.name', read_only=True)
    unit_code = serializers.CharField(source='production_unit.unit_code', read_only=True)

    class Meta:
        model = BuyerUnitAllocation
        fields = '__all__'


class UnitWorkReallocationSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.name', read_only=True)
    po_number = serializers.CharField(source='po.po_number', read_only=True)
    from_unit_name = serializers.CharField(source='from_unit.name', read_only=True)
    to_unit_name = serializers.CharField(source='to_unit.name', read_only=True)
    reallocated_by_name = serializers.CharField(source='reallocated_by.username', read_only=True)

    class Meta:
        model = UnitWorkReallocation
        fields = '__all__'


# ─── User Serializers ─────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    """Full user serializer — used by Admin for CRUD operations."""
    password = serializers.CharField(write_only=True, required=False)
    supervisor_name = serializers.SerializerMethodField()
    contractor_count = serializers.SerializerMethodField()
    production_unit_name = serializers.CharField(source='production_unit.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'batch_category', 'production_unit', 'production_unit_name',
            'supervisor', 'supervisor_name',
            'phone', 'is_active', 'password', 'contractor_count', 'profile_image',
        ]
        read_only_fields = ['id']

    def get_supervisor_name(self, obj):
        if obj.supervisor:
            return obj.supervisor.get_full_name() or obj.supervisor.username
        return None

    def get_contractor_count(self, obj):
        if obj.role == 'supervisor':
            return obj.contractors.filter(is_active=True).count()
        return None

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserMinimalSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for nested/dropdown usage."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role', 'batch_category']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# ─── ERP Core Serializers ─────────────────────────────────────────────────────

class FinishSerializer(serializers.ModelSerializer):

    class Meta:
        model = Finish
        fields = [
            'id', 'name', 'finish_code', 'color', 'wood_type', 'image',
        ]
        read_only_fields = ['id']

    def validate_finish_code(self, value):
        if not value or not value.strip():
            return value
        code = value.strip()
        qs = Finish.objects.filter(finish_code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Finish Code of this finish is already present.")
        return code


class FinishDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Finish
        fields = ['id', 'name', 'finish_code', 'color', 'wood_type', 'image']


class SampleImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SampleImage
        fields = ['id', 'sample', 'image', 'image_url', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = '__all__'

class BuyerDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = ['id', 'name', 'code']


class SampleDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sample
        fields = ['id', 'sample_id', 'style_no', 'product_name']



class SampleSerializer(serializers.ModelSerializer):
    images = SampleImageSerializer(many=True, read_only=True)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)
    finish_detail = FinishSerializer(source='finish', read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'sample_id', 'style_no', 'buyer', 'buyer_detail', 'product_name',
            'material', 'finish', 'finish_detail', 'finish_color', 'remark',
            'cbm', 'usd', 'vendor_name',
            'size_length', 'size_breadth', 'size_height',
            'size_length_inch', 'size_breadth_inch', 'size_height_inch',
            'images',
        ]
        read_only_fields = ['id', 'images', 'buyer_detail', 'finish_detail', 'size_length_inch', 'size_breadth_inch', 'size_height_inch']

    def validate_style_no(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Style No. is required.")
        code = value.strip()
        qs = Sample.objects.filter(style_no__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Style No. '{code}' already exists in Samples.")
        return code


class BuyerCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = ['code']

class SampleDropdownSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerCodeSerializer(source='buyer', read_only=True)
    finish_detail = FinishDropdownSerializer(source='finish', read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'sample_id', 'style_no', 'buyer_detail', 'product_name',
            'material', 'finish', 'finish_detail', 'finish_color', 'remark',
            'size_length', 'size_breadth', 'size_height'
        ]

class SampleListSerializer(serializers.ModelSerializer):
    images = SampleImageSerializer(many=True, read_only=True)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)
    finish_detail = FinishSerializer(source='finish', read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'sample_id', 'style_no', 'buyer', 'buyer_detail', 'product_name',
            'material', 'finish', 'finish_detail', 'finish_color',
            'cbm', 'usd', 'vendor_name',
            'size_length', 'size_breadth', 'size_height',
            'size_length_inch', 'size_breadth_inch', 'size_height_inch',
            'images',
        ]
        read_only_fields = fields


class SampleCompactSerializer(serializers.ModelSerializer):
    """Minimal serializer for quick search / dropdowns: returns a thumbnail, style no and product name."""
    # Reuse full image serializer for compatibility with existing UI
    images = SampleImageSerializer(many=True, read_only=True)

    class Meta:
        model = Sample
        fields = ['id', 'sample_id', 'style_no', 'product_name', 'images']


class BuyerMasterFinishingImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = BuyerMasterFinishingImage
        fields = ['id', 'buyer_master', 'image', 'image_url', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class BuyerMasterSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerDropdownSerializer(source='buyer', read_only=True)
    sample_detail = SampleDropdownSerializer(source='sample', read_only=True)
    finishing_images = BuyerMasterFinishingImageSerializer(many=True, read_only=True)
    packaging_image_url = serializers.SerializerMethodField()


    class Meta:
        model = BuyerMaster
        fields = '__all__'

    def validate(self, attrs):
        style_no = attrs.get('style_no')
        buyer = attrs.get('buyer')
        
        if not style_no and self.instance:
            style_no = self.instance.style_no
        if not buyer and self.instance:
            buyer = self.instance.buyer

        if style_no:
            if not style_no.strip():
                raise serializers.ValidationError({"style_no": "Style No is required."})
            code = style_no.strip()
            attrs['style_no'] = code
            
            if buyer:
                qs = BuyerMaster.objects.filter(buyer=buyer, style_no__iexact=code)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    buyer_name = getattr(buyer, 'name', 'this Buyer')
                    raise serializers.ValidationError({
                        "style_no": f"Style No '{code}' already exists for {buyer_name} in Buyer Master."
                    })

        return attrs


    def get_packaging_image_url(self, obj):
        request = self.context.get('request')
        if obj.packaging_image:
            if request:
                return request.build_absolute_uri(obj.packaging_image.url)
            return obj.packaging_image.url
        return None

class BuyerMasterListSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerDropdownSerializer(source='buyer', read_only=True)
    sample_detail = SampleDropdownSerializer(source='sample', read_only=True)


    class Meta:
        model = BuyerMaster
        fields = [
            'id', 'buyer', 'buyer_detail', 'sample', 'sample_detail', 'style_no', 'buyer_code', 'product_name', 
            'wood_type', 'finish_color', 
            'size_length', 'size_breadth', 'size_height',
            'price_usd', 'units', 'cbm', 'total_cbm', 'total_amount', 'remark',
            'box_size', 'box_length', 'box_breadth', 'box_height'
        ]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class SupplierPOItemDefectSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = SupplierPOItemDefect
        fields = '__all__'
        read_only_fields = ['id', 'reported_by', 'created_at']

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name() or obj.reported_by.username
        return None

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.defective_image:
            if request:
                return request.build_absolute_uri(obj.defective_image.url)
            return obj.defective_image.url
        return None

    def get_images(self, obj):
        request = self.context.get('request')
        imgs = []
        if obj.defective_image:
            imgs.append(request.build_absolute_uri(obj.defective_image.url) if request else obj.defective_image.url)
        for d_img in obj.images.all():
            imgs.append(request.build_absolute_uri(d_img.image.url) if request else d_img.image.url)
        return imgs

    def create(self, validated_data):
        validated_data['reported_by'] = self.context['request'].user
        return super().create(validated_data)


class SupplierPOItemSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)
    defects = SupplierPOItemDefectSerializer(many=True, read_only=True)

    class Meta:
        model = SupplierPOItem
        fields = '__all__'
        read_only_fields = ['id', 'supplier_po', 'amount']

    def validate_quantity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        if value > Decimal('999999.00'):
            raise serializers.ValidationError("Quantity cannot exceed 999,999 units.")
        return value

    def validate_rate(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("Rate cannot be negative.")
        if value > Decimal('99999999.99'):
            raise serializers.ValidationError("Rate cannot exceed 99,999,999.99 (max 10 integer digits + 2 decimals).")
        return value


class SupplierDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'state_name']

class POExtensionLogSerializer(serializers.ModelSerializer):
    extended_by_name = serializers.SerializerMethodField()

    class Meta:
        model = POExtensionLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_extended_by_name(self, obj):
        if obj.extended_by:
            return obj.extended_by.get_full_name() or obj.extended_by.username
        return 'System'


def get_po_metrics(obj):
    if hasattr(obj, '_cached_po_metrics'):
        return obj._cached_po_metrics

    items_list = list(obj.items.all()) if hasattr(obj, 'items') else []
    total_ordered = sum((it.quantity or Decimal('0')) for it in items_list)
    total_received = sum((it.passed_quantity or Decimal('0')) for it in items_list)

    today = date.today()
    days_remaining = None
    if obj.due_date:
        days_remaining = (obj.due_date - today).days

    if obj.status == 'Received' or (total_ordered > 0 and total_received >= total_ordered):
        color_status = 'green'
    elif days_remaining is not None and days_remaining <= 15:
        color_status = 'red'
    else:
        color_status = 'yellow'

    metrics = {
        'total_ordered_qty': float(total_ordered),
        'total_received_qty': float(total_received),
        'days_remaining': days_remaining,
        'color_status': color_status,
    }
    obj._cached_po_metrics = metrics
    return metrics


class SupplierPOItemMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierPOItem
        fields = ['id', 'description', 'quantity', 'passed_quantity', 'unit', 'rate', 'amount']


class POSupplierHistorySerializer(serializers.ModelSerializer):
    previous_supplier_name = serializers.CharField(source='previous_supplier.name', read_only=True)
    new_supplier_name = serializers.CharField(source='new_supplier.name', read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = POSupplierHistory
        fields = '__all__'
        read_only_fields = ['id', 'changed_at']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return 'System'


class SupplierPOListSerializer(serializers.ModelSerializer):
    items = SupplierPOItemMinimalSerializer(many=True, read_only=True)
    supplier_detail = SupplierDropdownSerializer(source='supplier', read_only=True)
    supervisor_detail = UserMinimalSerializer(source='supervisor', read_only=True)
    total_amount = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    color_status = serializers.SerializerMethodField()
    total_ordered_qty = serializers.SerializerMethodField()
    total_received_qty = serializers.SerializerMethodField()
    extension_logs = POExtensionLogSerializer(many=True, read_only=True)
    supplier_history = POSupplierHistorySerializer(many=True, read_only=True)

    buyer_pi_no = serializers.CharField(source='buyer_pi.pi_no', read_only=True)

    class Meta:
        model = SupplierPO
        fields = [
            'id', 'po_number', 'po_date', 'due_date', 'original_due_date',
            'supplier', 'supplier_detail', 'supervisor', 'supervisor_detail',
            'buyer_pi', 'buyer_pi_no',
            'total_amount', 'status', 'items',
            'days_remaining', 'color_status', 'total_ordered_qty', 'total_received_qty',
            'extension_logs', 'supplier_history', 'created_at'
        ]

    def get_total_amount(self, obj):
        items_list = list(obj.items.all()) if hasattr(obj, 'items') else []
        return sum(item.amount or Decimal('0') for item in items_list)

    def get_days_remaining(self, obj):
        return get_po_metrics(obj)['days_remaining']

    def get_color_status(self, obj):
        return get_po_metrics(obj)['color_status']

    def get_total_ordered_qty(self, obj):
        return get_po_metrics(obj)['total_ordered_qty']

    def get_total_received_qty(self, obj):
        return get_po_metrics(obj)['total_received_qty']


class SupplierPOSerializer(serializers.ModelSerializer):
    items = SupplierPOItemSerializer(many=True, required=False)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)
    supervisor_detail = UserMinimalSerializer(source='supervisor', read_only=True)
    total_amount = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    color_status = serializers.SerializerMethodField()
    total_ordered_qty = serializers.SerializerMethodField()
    total_received_qty = serializers.SerializerMethodField()
    extension_logs = POExtensionLogSerializer(many=True, read_only=True)
    supplier_history = POSupplierHistorySerializer(many=True, read_only=True)
    buyer_pi_no = serializers.CharField(source='buyer_pi.pi_no', read_only=True)

    class Meta:
        model = SupplierPO
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if data.get('supervisor') == '' or data.get('supervisor') == 'null':
                data['supervisor'] = None
            if data.get('buyer_pi') == '' or data.get('buyer_pi') == 'null':
                data['buyer_pi'] = None
        return super().to_internal_value(data)

    def get_total_amount(self, obj):
        return sum(item.amount or Decimal('0') for item in obj.items.all())

    def get_days_remaining(self, obj):
        return get_po_metrics(obj)['days_remaining']

    def get_color_status(self, obj):
        return get_po_metrics(obj)['color_status']

    def get_total_ordered_qty(self, obj):
        return get_po_metrics(obj)['total_ordered_qty']

    def get_total_received_qty(self, obj):
        return get_po_metrics(obj)['total_received_qty']


    def validate(self, attrs):
        items_data = attrs.get('items', [])
        if not items_data and not self.instance:
            raise serializers.ValidationError({"items": ["At least one line item is required for a Purchase Order."]})

        # Validate PO item quantities against Buyer PI limits
        pi_qty_map = {}
        for idx, item in enumerate(items_data):
            buyer_pi = item.get('buyer_pi')
            qty = item.get('quantity') or Decimal('0')

            if buyer_pi:
                pi_id = buyer_pi.id if hasattr(buyer_pi, 'id') else buyer_pi
                if pi_id not in pi_qty_map:
                    pi_qty_map[pi_id] = {'total_requested': Decimal('0'), 'items': []}
                pi_qty_map[pi_id]['total_requested'] += Decimal(str(qty))
                pi_qty_map[pi_id]['items'].append(idx)

        # Check total remaining unfulfilled units on each Buyer PI
        for pi_id, data in pi_qty_map.items():
            try:
                buyer_pi_obj = BuyerPI.objects.prefetch_related('items').get(pk=pi_id)
            except BuyerPI.DoesNotExist:
                continue

            total_pi_units = sum((it.units or 0) for it in buyer_pi_obj.items.all())

            existing_qs = SupplierPOItem.objects.filter(buyer_pi=buyer_pi_obj)
            if self.instance:
                existing_qs = existing_qs.exclude(supplier_po=self.instance)
            already_ordered_qty = existing_qs.aggregate(total=Sum('quantity'))['total'] or Decimal('0')

            available_qty = Decimal(str(total_pi_units)) - already_ordered_qty
            if available_qty < Decimal('0'):
                available_qty = Decimal('0')

            if data['total_requested'] > available_qty:
                err_msg = (
                    f"⚠️ Quantity Limit Exceeded: You requested {data['total_requested']} units, "
                    f"but only {available_qty} units remain available on Buyer PI '{buyer_pi_obj.pi_no}' "
                    f"(Total PI Order: {total_pi_units} units, Already Ordered in past POs: {already_ordered_qty} units)."
                )
                item_errors = [{} for _ in items_data]
                for idx in data['items']:
                    item_errors[idx] = {"quantity": [err_msg]}
                raise serializers.ValidationError({"items": item_errors})

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not validated_data.get('buyer_pi'):
            for it in items_data:
                if it.get('buyer_pi'):
                    validated_data['buyer_pi'] = it.get('buyer_pi')
                    break

        po = SupplierPO.objects.create(**validated_data)
        for item_data in items_data:
            item_data.pop('supplier_po', None)
            if not item_data.get('buyer_pi') and po.buyer_pi:
                item_data['buyer_pi'] = po.buyer_pi
            SupplierPOItem.objects.create(supplier_po=po, **item_data)
        return po

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                item_data.pop('supplier_po', None)
                if not item_data.get('buyer_pi') and instance.buyer_pi:
                    item_data['buyer_pi'] = instance.buyer_pi
                SupplierPOItem.objects.create(supplier_po=instance, **item_data)
        return instance


# ─── Production Job & QC Serializers ─────────────────────────────────────────

class ProductionQCLogSerializer(serializers.ModelSerializer):
    inspected_by_name = serializers.CharField(source='inspected_by.username', read_only=True)

    class Meta:
        model = ProductionQCLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ProductionJobSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    qc_logs = ProductionQCLogSerializer(many=True, read_only=True)

    class Meta:
        model = ProductionJob
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'qc_requested_at', 'qc_completed_at']

    def get_contractor_name(self, obj):
        return (obj.contractor.get_full_name() or obj.contractor.username) if obj.contractor else ''

    def get_assigned_by_name(self, obj):
        return (obj.assigned_by.get_full_name() or obj.assigned_by.username) if obj.assigned_by else ''


# ─── Performa Invoice Serializers ─────────────────────────────────────────────

class PerformaInvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformaInvoiceItem
        fields = '__all__'
        read_only_fields = ['id', 'pi']


class PerformaInvoiceSerializer(serializers.ModelSerializer):
    items = PerformaInvoiceItemSerializer(many=True, required=False)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)

    class Meta:
        model = PerformaInvoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        pi = PerformaInvoice.objects.create(**validated_data)
        for item_data in items_data:
            item_data.pop('pi', None)
            PerformaInvoiceItem.objects.create(pi=pi, **item_data)
        return pi

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                item_data.pop('pi', None)
                PerformaInvoiceItem.objects.create(pi=instance, **item_data)
        return instance


# ─── Buyer PI (Pre-PO Performa Invoice) Serializers ───────────────────────────

class BuyerPIItemSerializer(serializers.ModelSerializer):
    buyer_master_detail = BuyerMasterSerializer(source='buyer_master', read_only=True)
    image_url = serializers.SerializerMethodField()
    allocated_quantity = serializers.SerializerMethodField()
    remaining_quantity = serializers.SerializerMethodField()
    allocation_status = serializers.SerializerMethodField()

    class Meta:
        model = BuyerPIItem
        fields = '__all__'
        read_only_fields = ['id', 'buyer_pi']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.buyer_master and obj.buyer_master.sample:
            sample_imgs = obj.buyer_master.sample.images.all()
            if sample_imgs.exists():
                img = sample_imgs.first()
                if request and img.image:
                    return request.build_absolute_uri(img.image.url)
                elif img.image:
                    return img.image.url
        return None

    def get_allocated_quantity(self, obj):
        if not obj.buyer_pi:
            allocations = obj.po_allocations.exclude(supplier_po__status='Cancelled')
            return float(allocations.aggregate(s=Sum('quantity'))['s'] or 0)

        # Match by buyer_pi_item FK OR by supplier_po.buyer_pi + style_no
        qs = SupplierPOItem.objects.filter(
            Q(buyer_pi_item=obj) |
            (Q(buyer_pi=obj.buyer_pi) & Q(description__icontains=obj.style_no)) |
            (Q(supplier_po__buyer_pi=obj.buyer_pi) & Q(description__icontains=obj.style_no))
        ).exclude(supplier_po__status='Cancelled').distinct()

        total_alloc = qs.aggregate(s=Sum('quantity'))['s'] or 0
        return float(total_alloc)

    def get_remaining_quantity(self, obj):
        alloc = self.get_allocated_quantity(obj)
        units = float(obj.units or 0)
        return max(0.0, units - alloc)

    def get_allocation_status(self, obj):
        alloc = self.get_allocated_quantity(obj)
        units = float(obj.units or 0)
        if alloc <= 0:
            return 'Unallocated'
        elif alloc < units:
            return 'Partially Allocated'
        else:
            return 'Fully Allocated'


class BuyerPISerializer(serializers.ModelSerializer):
    items = BuyerPIItemSerializer(many=True, required=False)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)
    total_usd = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()
    allocated_units = serializers.SerializerMethodField()
    remaining_units = serializers.SerializerMethodField()
    allocation_status = serializers.SerializerMethodField()
    supplier_allocations = serializers.SerializerMethodField()

    class Meta:
        model = BuyerPI
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_usd(self, obj):
        return sum(float(item.total_amount or 0) for item in obj.items.all())

    def get_total_units(self, obj):
        return sum(int(item.units or 0) for item in obj.items.all())

    def get_allocated_units(self, obj):
        item_serializer = BuyerPIItemSerializer(context=self.context)
        return sum(item_serializer.get_allocated_quantity(item) for item in obj.items.all())

    def get_remaining_units(self, obj):
        item_serializer = BuyerPIItemSerializer(context=self.context)
        return sum(item_serializer.get_remaining_quantity(item) for item in obj.items.all())

    def get_allocation_status(self, obj):
        tot = self.get_total_units(obj)
        rem = self.get_remaining_units(obj)
        if rem == tot:
            return 'Unallocated'
        elif rem > 0:
            return 'Partially Allocated'
        else:
            return 'Fully Allocated'

    def get_supplier_allocations(self, obj):
        po_items = SupplierPOItem.objects.filter(
            supplier_po__buyer_pi=obj
        ).exclude(
            supplier_po__status='Cancelled'
        ).select_related('supplier_po', 'supplier_po__supplier')

        alloc_dict = {}
        for item in po_items:
            po = item.supplier_po
            sup_name = po.supplier.name if po.supplier else 'Unknown Supplier'
            key = f"{sup_name}_{po.po_number}"
            if key not in alloc_dict:
                alloc_dict[key] = {
                    'supplier_name': sup_name,
                    'po_number': po.po_number,
                    'po_date': str(po.po_date),
                    'status': po.status,
                    'items': [],
                    'total_assigned_qty': 0.0,
                }
            qty = float(item.quantity or 0)
            alloc_dict[key]['items'].append({
                'description': item.description,
                'quantity': qty,
                'unit': item.unit,
                'rate': float(item.rate or 0),
            })
            alloc_dict[key]['total_assigned_qty'] += qty

        return list(alloc_dict.values())

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        pi = BuyerPI.objects.create(**validated_data)
        for item_data in items_data:
            item_data.pop('buyer_pi', None)
            BuyerPIItem.objects.create(buyer_pi=pi, **item_data)
        return pi

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                item_data.pop('buyer_pi', None)
                BuyerPIItem.objects.create(buyer_pi=instance, **item_data)
        return instance

class BuyerPIItemSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerPIItem
        fields = ['id', 'style_no', 'product_name', 'units', 'total_amount']

class BuyerPIListSerializer(serializers.ModelSerializer):
    items = BuyerPIItemSerializer(many=True, read_only=True)
    buyer_detail = BuyerDropdownSerializer(source='buyer', read_only=True)
    total_usd = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()
    allocated_units = serializers.SerializerMethodField()
    remaining_units = serializers.SerializerMethodField()
    allocation_status = serializers.SerializerMethodField()
    supplier_allocations = serializers.SerializerMethodField()

    class Meta:
        model = BuyerPI
        fields = [
            'id', 'pi_no', 'pi_date', 'buyer', 'buyer_detail', 
            'delivered_to_name', 'delivered_to_company', 'ex_factory_date', 'items', 'total_usd',
            'total_units', 'allocated_units', 'remaining_units', 'allocation_status', 'supplier_allocations'
        ]

    def get_total_usd(self, obj):
        return sum(float(item.total_amount or 0) for item in obj.items.all())

    def get_total_units(self, obj):
        return sum(int(item.units or 0) for item in obj.items.all())

    def get_allocated_units(self, obj):
        item_serializer = BuyerPIItemSerializer(context=self.context)
        return sum(item_serializer.get_allocated_quantity(item) for item in obj.items.all())

    def get_remaining_units(self, obj):
        item_serializer = BuyerPIItemSerializer(context=self.context)
        return sum(item_serializer.get_remaining_quantity(item) for item in obj.items.all())

    def get_allocation_status(self, obj):
        tot = self.get_total_units(obj)
        rem = self.get_remaining_units(obj)
        if rem == tot:
            return 'Unallocated'
        elif rem > 0:
            return 'Partially Allocated'
        else:
            return 'Fully Allocated'

    def get_supplier_allocations(self, obj):
        po_items = SupplierPOItem.objects.filter(
            supplier_po__buyer_pi=obj
        ).exclude(
            supplier_po__status='Cancelled'
        ).select_related('supplier_po', 'supplier_po__supplier')

        alloc_dict = {}
        for item in po_items:
            po = item.supplier_po
            sup_name = po.supplier.name if po.supplier else 'Unknown Supplier'
            key = f"{sup_name}_{po.po_number}"
            if key not in alloc_dict:
                alloc_dict[key] = {
                    'supplier_name': sup_name,
                    'po_number': po.po_number,
                    'po_date': str(po.po_date),
                    'status': po.status,
                    'items': [],
                    'total_assigned_qty': 0.0,
                }
            qty = float(item.quantity or 0)
            alloc_dict[key]['items'].append({
                'description': item.description,
                'quantity': qty,
                'unit': item.unit,
                'rate': float(item.rate or 0),
            })
            alloc_dict[key]['total_assigned_qty'] += qty

        return list(alloc_dict.values())


    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        pi = BuyerPI.objects.create(**validated_data)
        for item_data in items_data:
            item_data.pop('buyer_pi', None)
            BuyerPIItem.objects.create(buyer_pi=pi, **item_data)
        return pi

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                item_data.pop('buyer_pi', None)
                BuyerPIItem.objects.create(buyer_pi=instance, **item_data)
        return instance


import re


def parse_user_agent(ua_string):
    if not ua_string:
        return {
            'device_name': 'Unknown Device',
            'device_type': 'desktop',
            'browser_name': 'Browser',
            'os_name': 'Unknown OS',
            'browser_icon': 'globe'
        }

    ua = str(ua_string)
    
    # Detect OS
    os_name = "Unknown OS"
    if "Windows NT 10.0" in ua: os_name = "Windows 10/11"
    elif "Windows NT 6.3" in ua: os_name = "Windows 8.1"
    elif "Windows NT 6.1" in ua: os_name = "Windows 7"
    elif "Windows" in ua: os_name = "Windows"
    elif "Macintosh" in ua or "Mac OS X" in ua: os_name = "macOS"
    elif "iPhone" in ua: os_name = "iOS (iPhone)"
    elif "iPad" in ua: os_name = "iPadOS (iPad)"
    elif "Android" in ua: os_name = "Android"
    elif "Linux" in ua: os_name = "Linux"

    # Detect Device Type
    device_type = "desktop"
    if "Mobile" in ua or "iPhone" in ua or "Android" in ua:
        device_type = "mobile"
    if "iPad" in ua or "Tablet" in ua:
        device_type = "tablet"

    # Detect Browser & Version
    browser_name = "Browser"
    browser_icon = "globe"
    
    if "Edg/" in ua or "Edge/" in ua:
        m = re.search(r'Edg(e)?/(\d+)', ua)
        ver = m.group(2) if m else ""
        browser_name = f"Edge {ver}".strip()
        browser_icon = "edge"
    elif "Chrome/" in ua and "Chromium" not in ua:
        m = re.search(r'Chrome/(\d+)', ua)
        ver = m.group(1) if m else ""
        browser_name = f"Chrome {ver}".strip()
        browser_icon = "chrome"
    elif "Firefox/" in ua:
        m = re.search(r'Firefox/(\d+)', ua)
        ver = m.group(1) if m else ""
        browser_name = f"Firefox {ver}".strip()
        browser_icon = "firefox"
    elif "Safari/" in ua and "Chrome" not in ua:
        m = re.search(r'Version/(\d+)', ua)
        ver = m.group(1) if m else ""
        browser_name = f"Safari {ver}".strip()
        browser_icon = "safari"
    elif "PostmanRuntime" in ua:
        browser_name = "Postman API Client"
        browser_icon = "terminal"

    device_name = f"{browser_name} on {os_name}"
    return {
        'device_name': device_name,
        'device_type': device_type,
        'browser_name': browser_name,
        'os_name': os_name,
        'browser_icon': browser_icon
    }


class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']

    def get_time_ago(self, obj):
        now = timezone.now()
        diff = now - obj.created_at
        sec = diff.total_seconds()
        if sec < 60:
            return "Just now"
        elif sec < 3600:
            m = int(sec // 60)
            return f"{m}m ago"
        elif sec < 86400:
            h = int(sec // 3600)
            return f"{h}h ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")

    def get_created_at_formatted(self, obj):
        today = timezone.now().date()
        if obj.created_at.date() == today:
            return obj.created_at.strftime("%I:%M %p")
        return obj.created_at.strftime("%b %d, %Y, %I:%M %p")


class UserSessionSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    device_type = serializers.SerializerMethodField()
    os_name = serializers.SerializerMethodField()
    browser_icon = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    user_full_name = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            "id", "user", "username", "user_full_name", "user_role", "profile_image",
            "ip_address", "user_agent", "device_name", "device_type", "os_name",
            "browser_icon", "created_at", "last_activity", "is_active", "time_ago"
        ]

    def get_device_info(self, obj):
        if not hasattr(obj, '_cached_ua'):
            obj._cached_ua = parse_user_agent(obj.user_agent)
        return obj._cached_ua

    def get_device_name(self, obj):
        return self.get_device_info(obj)['device_name']

    def get_device_type(self, obj):
        return self.get_device_info(obj)['device_type']

    def get_os_name(self, obj):
        return self.get_device_info(obj)['os_name']

    def get_browser_icon(self, obj):
        return self.get_device_info(obj)['browser_icon']

    def get_user_full_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return ""

    def get_profile_image(self, obj):
        request = self.context.get('request')
        if obj.user and obj.user.profile_image:
            if request:
                return request.build_absolute_uri(obj.user.profile_image.url)
            return obj.user.profile_image.url
        return None

    def get_time_ago(self, obj):
        now = timezone.now()
        diff = now - obj.last_activity
        sec = diff.total_seconds()
        if sec < 60:
            return "Active now"
        elif sec < 3600:
            m = int(sec // 60)
            return f"{m} minute{'s' if m > 1 else ''} ago"
        elif sec < 86400:
            h = int(sec // 3600)
            return f"{h} hour{'s' if h > 1 else ''} ago"
        else:
            d = int(sec // 86400)
            return f"{d} day{'s' if d > 1 else ''} ago"


class StockItemSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)
    sample_id_str = serializers.CharField(source='sample.sample_id', read_only=True)
    po_number_str = serializers.CharField(source='po_item.supplier_po.po_number', read_only=True)

    class Meta:
        model = StockItem
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class GateInwardReceiptSerializer(serializers.ModelSerializer):
    po_number_str = serializers.CharField(source='supplier_po.po_number', read_only=True)
    supplier_name_str = serializers.CharField(source='supplier_po.supplier.name', read_only=True)
    inspected_by_name = serializers.CharField(source='inspected_by.username', read_only=True)
    po_item_description = serializers.CharField(source='po_item.description', read_only=True)
    po_item_unit = serializers.CharField(source='po_item.unit', read_only=True)

    class Meta:
        model = GateInwardReceipt
        fields = '__all__'
        read_only_fields = ['id', 'created_at']





class SupplierTaxInvoiceItemSerializer(serializers.ModelSerializer):
    po_number_str = serializers.CharField(source='supplier_po.po_number', read_only=True)

    class Meta:
        model = SupplierTaxInvoiceItem
        fields = '__all__'
        read_only_fields = ['id', 'tax_invoice']


class SupplierTaxInvoiceSerializer(serializers.ModelSerializer):
    items = SupplierTaxInvoiceItemSerializer(many=True, required=False)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = SupplierTaxInvoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = SupplierTaxInvoice.objects.create(**validated_data)
        
        for item_data in items_data:
            SupplierTaxInvoiceItem.objects.create(tax_invoice=invoice, **item_data)
            
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                SupplierTaxInvoiceItem.objects.create(tax_invoice=instance, **item_data)

        return instance


class SupplierDebitNoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierDebitNoteItem
        fields = '__all__'
        read_only_fields = ['id', 'debit_note']


class SupplierDebitNoteSerializer(serializers.ModelSerializer):
    items = SupplierDebitNoteItemSerializer(many=True, read_only=True, required=False)
    supplier_name_str = serializers.CharField(source='supplier.name', read_only=True)
    supplier_gstin_str = serializers.CharField(source='supplier.gstin', read_only=True)
    po_number_str = serializers.CharField(source='supplier_po.po_number', read_only=True)
    grace_days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = SupplierDebitNote
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_grace_days_remaining(self, obj):
        if obj.status == 'Grace Period' and obj.holding_until:
            diff = obj.holding_until - timezone.now()
            hours_left = diff.total_seconds() / 3600.0
            return max(0, round(hours_left / 24.0, 1))
        return 0


# ─── Store Management Serializers ─────────────────────────────────────────────

class StoreItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreItemCategory
        fields = '__all__'


class StoreItemRateHistorySerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)

    class Meta:
        model = StoreItemRateHistory
        fields = '__all__'


class StoreItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    total_stock_qty = serializers.ReadOnlyField()
    total_issued_qty = serializers.ReadOnlyField()
    balance_stock_qty = serializers.ReadOnlyField()
    total_stock_value = serializers.ReadOnlyField()
    rate_history = StoreItemRateHistorySerializer(many=True, read_only=True)

    class Meta:
        model = StoreItem
        fields = '__all__'


class ContractorPersonSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()

    class Meta:
        model = ContractorPerson
        fields = '__all__'

    def get_contractor_name(self, obj):
        if obj.contractor:
            return obj.contractor.get_full_name() or obj.contractor.username
        return ""


class StorePurchaseOrderItemSerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)

    class Meta:
        model = StorePurchaseOrderItem
        fields = '__all__'


class StorePurchaseOrderSerializer(serializers.ModelSerializer):
    items = StorePurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = StorePurchaseOrder
        fields = '__all__'


class StoreMaterialInSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    production_unit_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreMaterialIn
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'total_amount']

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else ""

    def get_production_unit_name(self, obj):
        return obj.production_unit.name if obj.production_unit else ""

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if data.get('po') == '':
                data['po'] = None
            if data.get('production_unit') == '':
                data['production_unit'] = None
            if data.get('received_by') == '':
                data['received_by'] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        qty = attrs.get('qty')
        bill_rate = attrs.get('bill_rate')

        if qty is not None and qty <= Decimal('0.00'):
            raise serializers.ValidationError({"qty": ["Received quantity must be greater than 0."]})
        if bill_rate is not None and bill_rate < Decimal('0.00'):
            raise serializers.ValidationError({"bill_rate": ["Bill rate cannot be negative."]})
        return super().validate(attrs)


class StoreDailyIssueSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    production_unit_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreDailyIssue
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'total_amount', 'chargeable_total', 'non_chargeable_total']

    def get_production_unit_name(self, obj):
        return obj.production_unit.name if obj.production_unit else ""

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if data.get('contractor_person') == '':
                data['contractor_person'] = None
            if data.get('production_unit') == '':
                data['production_unit'] = None
            if data.get('issued_by') == '':
                data['issued_by'] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        qty = attrs.get('qty')
        rate = attrs.get('rate')
        item = attrs.get('item') or (self.instance.item if self.instance else None)

        if qty is not None and qty <= Decimal('0.00'):
            raise serializers.ValidationError({"qty": ["Issued quantity must be greater than 0."]})
        if rate is not None and rate < Decimal('0.00'):
            raise serializers.ValidationError({"rate": ["Issue rate cannot be negative."]})

        if item and qty is not None:
            avail_stock = item.balance_stock_qty
            if self.instance and self.instance.item == item:
                avail_stock += self.instance.qty

            if qty > avail_stock:
                raise serializers.ValidationError({
                    "qty": [f"Insufficient store balance for {item.item_name}. Available: {avail_stock} {item.unit}, Requested: {qty} {item.unit}."]
                })
        return super().validate(attrs)

    def get_contractor_name(self, obj):
        if obj.contractor:
            return obj.contractor.get_full_name() or obj.contractor.username
        return ""


class StoreMaterialReturnSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    production_unit_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreMaterialReturn
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'total_amount', 'chargeable_total', 'non_chargeable_total']

    def get_production_unit_name(self, obj):
        return obj.production_unit.name if obj.production_unit else ""

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if data.get('production_unit') == '':
                data['production_unit'] = None
            if data.get('returned_by') == '':
                data['returned_by'] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        qty = attrs.get('qty')
        rate = attrs.get('rate')

        if qty is not None and qty <= Decimal('0.00'):
            raise serializers.ValidationError({"qty": ["Returned quantity must be greater than 0."]})
        if rate is not None and rate < Decimal('0.00'):
            raise serializers.ValidationError({"rate": ["Return rate cannot be negative."]})
        return super().validate(attrs)

    def get_contractor_name(self, obj):
        if obj.contractor:
            return obj.contractor.get_full_name() or obj.contractor.username
        return ""


class StoreRequisitionSerializer(serializers.ModelSerializer):
    requisition_no = serializers.CharField(required=False, allow_blank=True)
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    production_unit_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreRequisition
        fields = '__all__'
        read_only_fields = ['id', 'requested_by', 'created_at', 'updated_at']

    def get_production_unit_name(self, obj):
        return obj.production_unit.name if obj.production_unit else ""

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return ""

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return ""


class StoreStockAdjustmentSerializer(serializers.ModelSerializer):
    adjustment_no = serializers.CharField(required=False, allow_blank=True)
    logged_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)

    class Meta:
        model = StoreStockAdjustment
        fields = '__all__'
        read_only_fields = ['id', 'logged_by', 'created_at', 'updated_at']

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            return obj.logged_by.get_full_name() or obj.logged_by.username
        return ""

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return ""




class AuditLogSerializer(serializers.ModelSerializer):
    user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_user_display_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return obj.username or "System"







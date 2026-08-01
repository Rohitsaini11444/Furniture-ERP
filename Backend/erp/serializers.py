from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, ProductionUnit, BuyerUnitAllocation, UnitWorkReallocation, Finish, Sample, SampleImage,
    Buyer, BuyerMaster, BuyerMasterFinishingImage, Supplier, SupplierPO, SupplierPOItem, SupplierPOItemDefect, POExtensionLog,
    PerformaInvoice, PerformaInvoiceItem,
    BuyerPI, BuyerPIItem,
    UserSession, StockItem, ProductionJob, ProductionQCLog,
    GateInwardReceipt, SupplierDebitNote,
)


# ─── Auth Serializers ─────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials. Please try again.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been disabled.")
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
        return obj.users.filter(role='supervisor', is_active=True).count()

    def get_contractor_count(self, obj):
        return obj.users.filter(role='contractor', is_active=True).count()

    def get_stock_count(self, obj):
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
        from decimal import Decimal
        if value is None or value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        if value > Decimal('999999.00'):
            raise serializers.ValidationError("Quantity cannot exceed 999,999 units.")
        return value

    def validate_rate(self, value):
        from decimal import Decimal
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
    from datetime import date
    from decimal import Decimal

    total_ordered = sum((it.quantity or Decimal('0')) for it in obj.items.all())
    total_received = sum((it.passed_quantity or Decimal('0')) for it in obj.items.all())

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

    return {
        'total_ordered_qty': float(total_ordered),
        'total_received_qty': float(total_received),
        'days_remaining': days_remaining,
        'color_status': color_status,
    }


class SupplierPOItemMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierPOItem
        fields = ['id', 'description', 'quantity', 'passed_quantity', 'unit', 'rate', 'amount']


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

    class Meta:
        model = SupplierPO
        fields = [
            'id', 'po_number', 'po_date', 'due_date', 'original_due_date',
            'supplier', 'supplier_detail', 'supervisor', 'supervisor_detail',
            'total_amount', 'status', 'items',
            'days_remaining', 'color_status', 'total_ordered_qty', 'total_received_qty',
            'extension_logs', 'created_at'
        ]

    def get_total_amount(self, obj):
        from decimal import Decimal
        return sum(item.amount or Decimal('0') for item in obj.items.all())

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

    class Meta:
        model = SupplierPO
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if data.get('supervisor') == '' or data.get('supervisor') == 'null':
                data['supervisor'] = None
        return super().to_internal_value(data)

    def get_total_amount(self, obj):
        from decimal import Decimal
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
        from decimal import Decimal
        from django.db.models import Sum
        from .models import BuyerPI, SupplierPOItem

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
        po = SupplierPO.objects.create(**validated_data)
        for item_data in items_data:
            item_data.pop('supplier_po', None)
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


class BuyerPISerializer(serializers.ModelSerializer):
    items = BuyerPIItemSerializer(many=True, required=False)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)
    total_usd = serializers.SerializerMethodField()

    class Meta:
        model = BuyerPI
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_usd(self, obj):
        return sum(float(item.total_amount or 0) for item in obj.items.all())

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
        fields = ['units', 'total_amount']

class BuyerPIListSerializer(serializers.ModelSerializer):
    items = BuyerPIItemSummarySerializer(many=True, read_only=True)
    buyer_detail = BuyerDropdownSerializer(source='buyer', read_only=True)
    total_usd = serializers.SerializerMethodField()

    class Meta:
        model = BuyerPI
        fields = [
            'id', 'pi_no', 'pi_date', 'buyer', 'buyer_detail', 
            'delivered_to_name', 'delivered_to_company', 'ex_factory_date', 'items', 'total_usd'
        ]

    def get_total_usd(self, obj):
        return sum(float(item.total_amount or 0) for item in obj.items.all())


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


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import Notification
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']

class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ["id", "ip_address", "user_agent", "created_at", "last_activity", "is_active"]


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

    class Meta:
        model = GateInwardReceipt
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class SupplierDebitNoteSerializer(serializers.ModelSerializer):
    supplier_name_str = serializers.CharField(source='supplier.name', read_only=True)
    supplier_gstin_str = serializers.CharField(source='supplier.gstin', read_only=True)
    po_number_str = serializers.CharField(source='supplier_po.po_number', read_only=True)

    class Meta:
        model = SupplierDebitNote
        fields = '__all__'
        read_only_fields = ['id', 'created_at']




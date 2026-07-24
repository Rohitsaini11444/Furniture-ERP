from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, Sample, SampleImage,
    Buyer, BuyerMaster, BuyerMasterFinishingImage, Supplier, SupplierPO, SupplierPOItem, SupplierPOItemDefect,
    PerformaInvoice, PerformaInvoiceItem,
    BuyerPI, BuyerPIItem,
    UserSession, StockItem, ProductionJob, ProductionQCLog,
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


# ─── User Serializers ─────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    """Full user serializer — used by Admin for CRUD operations."""
    password = serializers.CharField(write_only=True, required=False)
    supervisor_name = serializers.SerializerMethodField()
    contractor_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'batch_category', 'supervisor', 'supervisor_name',
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
        fields = ['id', 'name']


class SampleSerializer(serializers.ModelSerializer):
    images = SampleImageSerializer(many=True, read_only=True)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'sample_id', 'style_no', 'buyer', 'buyer_detail', 'product_name',
            'material', 'finish_color', 'remark',
            'cbm', 'usd', 'vendor_name',
            'size_length', 'size_breadth', 'size_height',
            'size_length_inch', 'size_breadth_inch', 'size_height_inch',
            'images',
        ]
        read_only_fields = ['id', 'images', 'buyer_detail', 'size_length_inch', 'size_breadth_inch', 'size_height_inch']


class BuyerCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = ['code']

class SampleDropdownSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerCodeSerializer(source='buyer', read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'sample_id', 'style_no', 'buyer_detail', 'product_name',
            'material', 'finish_color', 'remark',
            'size_length', 'size_breadth', 'size_height'
        ]

class SampleListSerializer(serializers.ModelSerializer):
    images = SampleImageSerializer(many=True, read_only=True)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)

    class Meta:
        model = Sample
        fields = [
            'id', 'sample_id', 'style_no', 'buyer', 'buyer_detail', 'product_name',
            'material', 'finish_color',
            'cbm', 'usd', 'vendor_name',
            'size_length', 'size_breadth', 'size_height',
            'size_length_inch', 'size_breadth_inch', 'size_height_inch',
            'images',
        ]
        read_only_fields = fields


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
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)
    sample_detail = SampleSerializer(source='sample', read_only=True)
    finishing_images = BuyerMasterFinishingImageSerializer(many=True, read_only=True)
    packaging_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BuyerMaster
        fields = '__all__'

    def get_packaging_image_url(self, obj):
        request = self.context.get('request')
        if obj.packaging_image:
            if request:
                return request.build_absolute_uri(obj.packaging_image.url)
            return obj.packaging_image.url
        return None

class BuyerMasterListSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerDropdownSerializer(source='buyer', read_only=True)
    sample_detail = SampleSerializer(source='sample', read_only=True)

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


class SupplierDropdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'state_name']

class SupplierPOItemMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierPOItem
        fields = ['id']

class SupplierPOListSerializer(serializers.ModelSerializer):
    items = SupplierPOItemMinimalSerializer(many=True, read_only=True)
    supplier_detail = SupplierDropdownSerializer(source='supplier', read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = SupplierPO
        fields = [
            'id', 'po_number', 'po_date', 'due_date', 
            'supplier', 'supplier_detail', 'total_amount', 'status', 'items'
        ]

    def get_total_amount(self, obj):
        from decimal import Decimal
        return sum(item.amount or Decimal('0') for item in obj.items.all())

class SupplierPOSerializer(serializers.ModelSerializer):
    items = SupplierPOItemSerializer(many=True, required=False)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = SupplierPO
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        from decimal import Decimal
        return sum(item.amount or Decimal('0') for item in obj.items.all())

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



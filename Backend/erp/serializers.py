from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, Sample, SampleImage,
    SandingBatch, SandingAssignment, SandingQC,
    Buyer, BuyerMaster, BuyerMasterFinishingImage, Supplier, SupplierPO, SupplierPOItem, SupplierPOItemDefect,
    PerformaInvoice, PerformaInvoiceItem,
    BuyerPI, BuyerPIItem,
    UserSession,
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


# ─── Sanding Serializers ──────────────────────────────────────────────────────

class SandingBatchSerializer(serializers.ModelSerializer):
    sample_detail = SampleSerializer(source='sample', read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model = SandingBatch
        fields = [
            'id', 'supervisor', 'supervisor_name', 'sample', 'sample_detail',
            'assigned_at', 'notes', 'status', 'assignment_count',
        ]
        read_only_fields = ['id', 'assigned_at', 'supervisor']

    def get_supervisor_name(self, obj):
        return obj.supervisor.get_full_name() or obj.supervisor.username

    def get_assignment_count(self, obj):
        return obj.assignments.count()

    def create(self, validated_data):
        # Supervisor is always the requesting user
        validated_data['supervisor'] = self.context['request'].user
        return super().create(validated_data)


class SandingAssignmentSerializer(serializers.ModelSerializer):
    batch_detail = SandingBatchSerializer(source='batch', read_only=True)
    contractor_detail = UserMinimalSerializer(source='contractor', read_only=True)
    qc_result = serializers.SerializerMethodField()

    class Meta:
        model = SandingAssignment
        fields = [
            'id', 'batch', 'batch_detail', 'contractor', 'contractor_detail',
            'assigned_at', 'status', 'completed_at', 'contractor_notes', 'qc_result',
        ]
        read_only_fields = ['id', 'assigned_at', 'completed_at']

    def get_qc_result(self, obj):
        if hasattr(obj, 'qc'):
            return {'result': obj.qc.result, 'notes': obj.qc.notes, 'checked_at': obj.qc.checked_at}
        return None

    def validate(self, attrs):
        request = self.context['request']
        user = request.user
        batch = attrs.get('batch', getattr(self.instance, 'batch', None))
        contractor = attrs.get('contractor', getattr(self.instance, 'contractor', None))

        # Ensure supervisor can only assign from their own batches
        if user.role == 'supervisor' and batch and batch.supervisor != user:
            raise serializers.ValidationError("You can only assign from your own sanding batches.")

        # Ensure contractor belongs to this supervisor
        if user.role == 'supervisor' and contractor and contractor.supervisor != user:
            raise serializers.ValidationError("This contractor is not under your supervision.")

        return attrs


class SandingQCSerializer(serializers.ModelSerializer):
    assignment_detail = SandingAssignmentSerializer(source='assignment', read_only=True)
    checked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SandingQC
        fields = [
            'id', 'assignment', 'assignment_detail',
            'checked_by', 'checked_by_name',
            'result', 'notes', 'checked_at',
        ]
        read_only_fields = ['id', 'checked_at', 'checked_by']

    def get_checked_by_name(self, obj):
        return obj.checked_by.get_full_name() or obj.checked_by.username

    def validate(self, attrs):
        request = self.context['request']
        assignment = attrs.get('assignment', getattr(self.instance, 'assignment', None))

        # Only the supervisor who owns the batch can QC it
        if assignment and assignment.batch.supervisor != request.user:
            raise serializers.ValidationError("You can only QC assignments from your own batches.")

        # Must be completed before QC
        if assignment and assignment.status != 'completed':
            raise serializers.ValidationError(
                "QC can only be performed on completed assignments. "
                f"Current status: {assignment.status}"
            )
        return attrs

    def create(self, validated_data):
        validated_data['checked_by'] = self.context['request'].user
        return super().create(validated_data)


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

    class Meta:
        model = BuyerPI
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

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


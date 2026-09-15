import re
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
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 'email',
            'role', 'batch_category', 'production_unit', 'production_unit_name',
            'supervisor', 'supervisor_name',
            'phone', 'is_active', 'password', 'contractor_count', 'profile_image',
        ]
        read_only_fields = ['id']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

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

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Finish name is required.")
        name = value.strip()

        if len(name) < 2:
            raise serializers.ValidationError("Finish name must be at least 2 characters long.")
        if len(name) > 100:
            raise serializers.ValidationError("Finish name cannot exceed 100 characters.")

        alpha_count = sum(1 for c in name if c.isalpha())
        if alpha_count < 2:
            raise serializers.ValidationError("Finish name must contain at least 2 alphabetic letters.")

        if not re.match(r"^[A-Za-z0-9\s&.,'\-/( )]+$", name):
            raise serializers.ValidationError("Finish name contains invalid characters. Only letters, numbers, spaces, and standard symbols (&, ., ,, -, ', /, (, )) are allowed.")

        # 1. Reject 4 or more consecutive identical characters (e.g. 'wwww', 'aaaa')
        if re.search(r'(.)\1{3,}', name):
            raise serializers.ValidationError("Finish name cannot contain repetitive characters (e.g. 4 or more identical letters in a row).")

        # 2. Reject unbroken tokens longer than 30 characters without spaces
        words = name.split()
        for word in words:
            if len(word) > 30:
                raise serializers.ValidationError("Finish name contains an excessively long continuous word. Please enter a valid name.")

        # 3. Reject repetitive alternating pattern loops (e.g. 'e2e2e2e2')
        if re.search(r'([A-Za-z0-9]{2,3})\1{3,}', name):
            raise serializers.ValidationError("Finish name appears to be repetitive gibberish. Please enter a valid finish name.")

        qs = Finish.objects.filter(name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"A finish with name '{name}' already exists.")

        return name

    def validate_finish_code(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Finish code is required.")
        code = value.strip().upper()

        if len(code) < 2:
            raise serializers.ValidationError("Finish code must be at least 2 characters long.")
        if len(code) > 30:
            raise serializers.ValidationError("Finish code cannot exceed 30 characters.")

        if not re.match(r"^[A-Z0-9\-_/]+$", code):
            raise serializers.ValidationError("Finish code can only contain letters, numbers, hyphens (-), underscores (_), and slashes (/).")

        if re.search(r'(.)\1{3,}', code):
            raise serializers.ValidationError("Finish code cannot contain repetitive characters (e.g. 4 or more identical characters in a row).")

        qs = Finish.objects.filter(finish_code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Finish Code '{code}' is already present.")

        return code

    def validate_color(self, value):
        if not value:
            return None
        color = str(value).strip()
        if not color:
            return None

        if len(color) < 2:
            raise serializers.ValidationError("Color must be at least 2 characters long.")
        if len(color) > 50:
            raise serializers.ValidationError("Color cannot exceed 50 characters.")

        alpha_count = sum(1 for c in color if c.isalpha())
        if alpha_count < 2:
            raise serializers.ValidationError("Color must contain at least 2 letters.")

        # Colors must be descriptive names without random numbers
        if not re.match(r"^[A-Za-z\s\-/,'()]+$", color):
            raise serializers.ValidationError("Color can only contain letters, spaces, and hyphens (e.g. 'Walnut', 'Smokey Grey', 'Antique White'). Digits are not allowed.")

        if re.search(r'(.)\1{3,}', color):
            raise serializers.ValidationError("Color cannot contain repetitive characters.")

        return color

    def validate_wood_type(self, value):
        if not value:
            return None
        wood = str(value).strip()
        if not wood:
            return None

        if len(wood) < 2 or len(wood) > 60:
            raise serializers.ValidationError("Please enter a valid wood type.")

        if not re.match(r"^[A-Za-z0-9\s\-/,'()]+$", wood):
            raise serializers.ValidationError("Wood type contains invalid characters.")

        return wood


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

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Buyer name is required.")
        name = value.strip()

        if len(name) < 2:
            raise serializers.ValidationError("Buyer name must be at least 2 characters long.")
        if len(name) > 100:
            raise serializers.ValidationError("Buyer name cannot exceed 100 characters.")

        alpha_count = sum(1 for c in name if c.isalpha())
        if alpha_count < 2:
            raise serializers.ValidationError("Buyer name must contain at least 2 alphabetic letters.")

        if not re.match(r"^[A-Za-z0-9\s&.,'\-/( )]+$", name):
            raise serializers.ValidationError("Buyer name contains invalid characters. Only letters, numbers, spaces, and standard business symbols (&, ., ,, -, ', /, (, )) are allowed.")

        # 1. Reject 4 or more consecutive identical characters (e.g. 'wwww', 'aaaa')
        if re.search(r'(.)\1{3,}', name):
            raise serializers.ValidationError("Buyer name cannot contain repetitive characters (e.g. 4 or more identical letters in a row).")

        # 2. Reject unbroken tokens longer than 30 characters without spaces
        words = name.split()
        for word in words:
            if len(word) > 30:
                raise serializers.ValidationError("Buyer name contains an excessively long continuous word. Please enter a valid company name.")

        # 3. Reject repetitive alternating pattern loops (e.g. 'w2w2w2w2' or '2e2e2e2e')
        if re.search(r'([A-Za-z0-9]{2,3})\1{3,}', name):
            raise serializers.ValidationError("Buyer name appears to be repetitive gibberish. Please enter a valid company name.")

        qs = Buyer.objects.filter(is_deleted=False, name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"A buyer with name '{name}' already exists.")

        return name

    def validate_code(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Buyer code is required.")
        code = value.strip().upper()

        if len(code) < 2:
            raise serializers.ValidationError("Buyer code must be at least 2 characters long.")
        if len(code) > 30:
            raise serializers.ValidationError("Buyer code cannot exceed 30 characters.")

        if not re.match(r"^[A-Z0-9\-_/]+$", code):
            raise serializers.ValidationError("Buyer code can only contain letters, numbers, hyphens (-), slashes (/), and underscores (_).")

        qs = Buyer.objects.filter(is_deleted=False, code__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Buyer code '{code}' is already in use.")

        return code

    def validate_phone(self, value):
        if not value:
            return None
        phone = str(value).strip()
        if not phone:
            return None

        if not re.match(r"^\+?[0-9\s\-()]+$", phone):
            raise serializers.ValidationError("Phone number can only contain digits, spaces, hyphens, parentheses, and an optional leading '+'.")

        digits = re.sub(r'\D', '', phone)
        if len(digits) < 7 or len(digits) > 15:
            raise serializers.ValidationError("Please enter a valid phone number (7 to 15 digits, optionally prefixed with '+').")

        if len(set(digits)) == 1:
            raise serializers.ValidationError("Phone number cannot consist of identical repeating digits.")

        return phone

    def validate_email(self, value):
        if not value:
            return None
        email = str(value).strip().lower()
        if not email:
            return None

        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
            raise serializers.ValidationError("Enter a valid email address.")

        return email

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

        if len(code) < 2:
            raise serializers.ValidationError("Style No. must be at least 2 characters long.")
        if len(code) > 50:
            raise serializers.ValidationError("Style No. cannot exceed 50 characters.")

        if not re.match(r"^[A-Za-z0-9\-_/ ]+$", code):
            raise serializers.ValidationError("Style No. can only contain letters, numbers, hyphens (-), underscores (_), and slashes (/).")

        if re.search(r'(.)\1{3,}', code):
            raise serializers.ValidationError("Style No. cannot contain repetitive characters (e.g. 4 or more identical characters in a row).")

        qs = Sample.objects.filter(style_no__iexact=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Style No. '{code}' already exists in Samples Catalog.")
        return code

    def validate_product_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Product name is required.")
        name = value.strip()

        if len(name) < 2:
            raise serializers.ValidationError("Product name must be at least 2 characters long.")
        if len(name) > 100:
            raise serializers.ValidationError("Product name cannot exceed 100 characters.")

        alpha_count = sum(1 for c in name if c.isalpha())
        if alpha_count < 2:
            raise serializers.ValidationError("Product name must contain at least 2 alphabetic letters.")

        if not re.match(r"^[A-Za-z0-9\s&.,'\-/( )]+$", name):
            raise serializers.ValidationError("Product name contains invalid characters. Use letters, numbers, spaces, and standard symbols (&, ., ,, -, ', /, (, )).")

        if re.search(r'(.)\1{3,}', name):
            raise serializers.ValidationError("Product name cannot contain repetitive characters (e.g. 4 or more identical letters in a row).")

        words = name.split()
        for word in words:
            if len(word) > 30:
                raise serializers.ValidationError("Product name contains an excessively long continuous word. Please enter a readable name.")

        if re.search(r'([A-Za-z0-9]{2,3})\1{3,}', name):
            raise serializers.ValidationError("Product name appears to be repetitive gibberish. Please enter a valid product name.")

        return name

    def validate_material(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Material is required.")
        material = value.strip()

        if len(material) < 2:
            raise serializers.ValidationError("Material must be at least 2 characters long.")
        if len(material) > 255:
            raise serializers.ValidationError("Material cannot exceed 255 characters.")

        alpha_count = sum(1 for c in material if c.isalpha())
        if alpha_count < 2:
            raise serializers.ValidationError("Material must contain at least 2 alphabetic letters.")

        if re.search(r'(.)\1{3,}', material):
            raise serializers.ValidationError("Material cannot contain repetitive characters.")

        words = material.split()
        for word in words:
            if len(word) > 30:
                raise serializers.ValidationError("Material contains an excessively long continuous word.")

        return material

    def validate_finish_color(self, value):
        if not value:
            return None
        fc = str(value).strip()
        if not fc:
            return None

        if len(fc) < 2:
            raise serializers.ValidationError("Finish/Color must be at least 2 characters long.")
        if len(fc) > 255:
            raise serializers.ValidationError("Finish/Color cannot exceed 255 characters.")

        alpha_count = sum(1 for c in fc if c.isalpha())
        if alpha_count < 2:
            raise serializers.ValidationError("Finish/Color must contain at least 2 alphabetic letters.")

        if re.search(r'(.)\1{3,}', fc):
            raise serializers.ValidationError("Finish/Color cannot contain repetitive characters.")

        return fc

    def validate_vendor_name(self, value):
        if not value:
            return None
        vendor = str(value).strip()
        if not vendor:
            return None

        if len(vendor) < 2:
            raise serializers.ValidationError("Vendor name must be at least 2 characters long.")
        if len(vendor) > 100:
            raise serializers.ValidationError("Vendor name cannot exceed 100 characters.")

        if re.search(r'(.)\1{3,}', vendor):
            raise serializers.ValidationError("Vendor name cannot contain repetitive characters.")

        words = vendor.split()
        for word in words:
            if len(word) > 30:
                raise serializers.ValidationError("Vendor name contains an excessively long continuous word.")

        return vendor

    def validate_cbm(self, value):
        if value is None or value == '':
            return None
        try:
            val = Decimal(str(value))
            if val <= 0 or val > Decimal('100'):
                raise serializers.ValidationError("CBM must be a realistic positive number between 0.0001 and 100.0000.")
            return val
        except (ValueError, TypeError):
            raise serializers.ValidationError("Enter a valid decimal number for CBM.")

    def validate_usd(self, value):
        if value is None or value == '':
            return None
        try:
            val = Decimal(str(value))
            if val < 0 or val > Decimal('999999.99'):
                raise serializers.ValidationError("Price (USD) must be a positive number up to 999,999.99.")
            return val
        except (ValueError, TypeError):
            raise serializers.ValidationError("Enter a valid price in USD.")

    def validate_size_length(self, value):
        if value is None or value == '':
            return None
        try:
            val = Decimal(str(value))
            if val <= 0 or val > Decimal('9999.99'):
                raise serializers.ValidationError("Length must be a realistic dimension between 0.1 and 9999.99 cm.")
            return val
        except (ValueError, TypeError):
            raise serializers.ValidationError("Enter a valid dimension for Length.")

    def validate_size_breadth(self, value):
        if value is None or value == '':
            return None
        try:
            val = Decimal(str(value))
            if val <= 0 or val > Decimal('9999.99'):
                raise serializers.ValidationError("Breadth must be a realistic dimension between 0.1 and 9999.99 cm.")
            return val
        except (ValueError, TypeError):
            raise serializers.ValidationError("Enter a valid dimension for Breadth.")

    def validate_size_height(self, value):
        if value is None or value == '':
            return None
        try:
            val = Decimal(str(value))
            if val <= 0 or val > Decimal('9999.99'):
                raise serializers.ValidationError("Height must be a realistic dimension between 0.1 and 9999.99 cm.")
            return val
        except (ValueError, TypeError):
            raise serializers.ValidationError("Enter a valid dimension for Height.")


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

    units = serializers.IntegerField(
        min_value=0,
        default=1,
        error_messages={
            'min_value': 'Units cannot be negative.',
            'invalid': 'Units must be a valid whole number.'
        }
    )
    price_usd = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Price (USD) cannot exceed 12 digits in total (up to 10 integer digits and 2 decimals).',
            'max_whole_digits': 'Price (USD) cannot exceed 10 digits before decimal.',
            'max_decimal_places': 'Price (USD) cannot have more than 2 decimal places.',
            'min_value': 'Price (USD) cannot be negative.',
            'invalid': 'Enter a valid price.'
        }
    )
    cbm = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        min_value=Decimal('0.0000'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'CBM cannot exceed 10 digits in total (up to 6 integer digits and 4 decimals).',
            'max_whole_digits': 'CBM cannot exceed 6 digits before decimal.',
            'max_decimal_places': 'CBM cannot have more than 4 decimal places.',
            'min_value': 'CBM cannot be negative.',
            'invalid': 'Enter a valid CBM value.'
        }
    )
    total_cbm = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        min_value=Decimal('0.0000'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Total CBM cannot exceed 12 digits in total.',
            'min_value': 'Total CBM cannot be negative.'
        }
    )
    total_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Total Amount cannot exceed 14 digits in total.',
            'min_value': 'Total Amount cannot be negative.'
        }
    )
    size_length = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Length cannot exceed 10 digits in total.',
            'max_whole_digits': 'Length cannot exceed 8 digits before decimal.',
            'min_value': 'Length cannot be negative.'
        }
    )
    size_breadth = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Breadth cannot exceed 10 digits in total.',
            'max_whole_digits': 'Breadth cannot exceed 8 digits before decimal.',
            'min_value': 'Breadth cannot be negative.'
        }
    )
    size_height = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Height cannot exceed 10 digits in total.',
            'max_whole_digits': 'Height cannot exceed 8 digits before decimal.',
            'min_value': 'Height cannot be negative.'
        }
    )
    box_length = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Box Length cannot exceed 10 digits in total.',
            'max_whole_digits': 'Box Length cannot exceed 8 digits before decimal.',
            'min_value': 'Box Length cannot be negative.'
        }
    )
    box_breadth = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Box Breadth cannot exceed 10 digits in total.',
            'max_whole_digits': 'Box Breadth cannot exceed 8 digits before decimal.',
            'min_value': 'Box Breadth cannot be negative.'
        }
    )
    box_height = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Box Height cannot exceed 10 digits in total.',
            'max_whole_digits': 'Box Height cannot exceed 8 digits before decimal.',
            'min_value': 'Box Height cannot be negative.'
        }
    )
    vendor_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Vendor Price cannot exceed 12 digits in total.',
            'min_value': 'Vendor Price cannot be negative.'
        }
    )
    costing = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Costing cannot exceed 12 digits in total.',
            'min_value': 'Costing cannot be negative.'
        }
    )
    purchase_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Purchase Price cannot exceed 12 digits in total.',
            'min_value': 'Purchase Price cannot be negative.'
        }
    )
    net_weight = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Net Weight cannot exceed 10 digits in total.',
            'max_whole_digits': 'Net Weight cannot exceed 8 digits before decimal.',
            'min_value': 'Net Weight cannot be negative.'
        }
    )
    gross_weight = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Gross Weight cannot exceed 10 digits in total.',
            'max_whole_digits': 'Gross Weight cannot exceed 8 digits before decimal.',
            'min_value': 'Gross Weight cannot be negative.'
        }
    )

    class Meta:
        model = BuyerMaster
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        numeric_fields = [
            'price_usd', 'units', 'cbm', 'total_cbm', 'total_amount',
            'size_length', 'size_breadth', 'size_height',
            'box_length', 'box_breadth', 'box_height',
            'vendor_price', 'costing', 'purchase_price',
            'net_weight', 'gross_weight', 'sample'
        ]
        for field in numeric_fields:
            if field in data and (data[field] == '' or data[field] is None):
                data[field] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        style_no = attrs.get('style_no')
        buyer = attrs.get('buyer')
        
        if not style_no and self.instance:
            style_no = self.instance.style_no
        if not buyer and self.instance:
            buyer = self.instance.buyer

        if not style_no or not str(style_no).strip():
            raise serializers.ValidationError({"style_no": "Style No is required."})
        code = str(style_no).strip()
        if len(code) > 100:
            raise serializers.ValidationError({"style_no": "Style No cannot exceed 100 characters."})
        attrs['style_no'] = code

        buyer_code = attrs.get('buyer_code')
        if buyer_code is not None:
            if not str(buyer_code).strip():
                raise serializers.ValidationError({"buyer_code": "Buyer Code is required."})
            if len(str(buyer_code).strip()) > 50:
                raise serializers.ValidationError({"buyer_code": "Buyer Code cannot exceed 50 characters."})

        product_name = attrs.get('product_name')
        if product_name is not None:
            if not str(product_name).strip():
                raise serializers.ValidationError({"product_name": "Product Name is required."})
            if len(str(product_name).strip()) > 100:
                raise serializers.ValidationError({"product_name": "Product Name cannot exceed 100 characters."})
            
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

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Supplier Name is required.")
        val = value.strip()
        if len(val) < 2:
            raise serializers.ValidationError("Supplier Name must be at least 2 characters.")
        if len(val) > 200:
            raise serializers.ValidationError("Supplier Name cannot exceed 200 characters.")
        if re.search(r'(.)\1{3,}', val):
            raise serializers.ValidationError("Supplier Name contains excessive repetitive characters.")
        if any(len(w) > 30 for w in val.split()):
            raise serializers.ValidationError("Supplier Name contains an excessively long continuous word.")
        letters = re.findall(r'[A-Za-z]', val)
        if len(letters) < 2:
            raise serializers.ValidationError("Supplier Name must contain at least 2 alphabetic characters.")
        if not re.match(r"^[A-Za-z0-9\s.,&'\-()/@#]+$", val):
            raise serializers.ValidationError("Supplier Name contains invalid characters.")
        
        instance = self.instance
        qs = Supplier.objects.filter(name__iexact=val)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Supplier '{val}' already exists.")
        return val

    def validate_phone(self, value):
        if not value or not str(value).strip():
            return ""
        val = str(value).strip()
        if len(val) > 50:
            raise serializers.ValidationError("Phone number cannot exceed 50 characters.")
        if not re.match(r'^\+?[0-9\s\-()]{7,20}$', val):
            raise serializers.ValidationError("Please enter a valid phone number (digits, optional '+', hyphens).")
        digits = re.sub(r'\D', '', val)
        if len(digits) < 7:
            raise serializers.ValidationError("Phone number must contain at least 7 digits.")
        if re.match(r'^(\d)\1+$', digits):
            raise serializers.ValidationError("Phone number cannot consist of identical repeating digits.")
        return val

    def validate_gstin(self, value):
        if not value or not str(value).strip():
            return ""
        val = str(value).strip().upper()
        if len(val) > 50:
            raise serializers.ValidationError("GSTIN cannot exceed 50 characters.")
        gstin_regex = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gstin_regex, val):
            if not re.match(r'^[A-Z0-9]{15}$', val):
                raise serializers.ValidationError("GSTIN must be a valid 15-character format (e.g. 08ABCDE1234F1Z5).")
        return val

    def validate_state_name(self, value):
        if not value or not str(value).strip():
            return ""
        val = str(value).strip()
        if len(val) < 2:
            raise serializers.ValidationError("State Name must be at least 2 characters.")
        if len(val) > 100:
            raise serializers.ValidationError("State Name cannot exceed 100 characters.")
        if not re.match(r'^[A-Za-z\s.\-]+$', val):
            raise serializers.ValidationError("State Name can only contain letters, spaces, and hyphens.")
        if re.search(r'(.)\1{3,}', val):
            raise serializers.ValidationError("State Name contains excessive repetitive characters.")
        return val

    def validate_cartage_gst_rate(self, value):
        if value is None or value == '':
            return Decimal('18.00')
        try:
            val = Decimal(str(value))
        except Exception:
            raise serializers.ValidationError("Cartage GST Rate must be a valid number.")
        if val < 0:
            raise serializers.ValidationError("Cartage GST Rate cannot be negative.")
        if val > Decimal('100.00'):
            raise serializers.ValidationError("Cartage GST Rate cannot exceed 100.00%.")
        digits_str = str(val).replace('-', '').replace('.', '')
        if len(digits_str) > 5:
            raise serializers.ValidationError("Ensure that there are no more than 5 digits in total.")
        return val

    def validate_cartage_ledger_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Cartage Ledger Name is required.")
        val = str(value).strip()
        if len(val) < 2:
            raise serializers.ValidationError("Cartage Ledger Name must be at least 2 characters.")
        if len(val) > 200:
            raise serializers.ValidationError("Cartage Ledger Name cannot exceed 200 characters.")
        if re.search(r'(.)\1{3,}', val):
            raise serializers.ValidationError("Cartage Ledger Name contains excessive repetitive characters.")
        if any(len(w) > 40 for w in val.split()):
            raise serializers.ValidationError("Cartage Ledger Name contains an excessively long continuous word.")
        return val

    def validate_address(self, value):
        if not value or not str(value).strip():
            return ""
        val = str(value).strip()
        if len(val) > 500:
            raise serializers.ValidationError("Address cannot exceed 500 characters.")
        if any(len(w) > 40 for w in val.split()):
            raise serializers.ValidationError("Address contains an excessively long continuous word.")
        return val


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
    qty = serializers.IntegerField(
        min_value=1,
        default=1,
        error_messages={
            'min_value': 'Quantity must be at least 1.',
            'invalid': 'Enter a valid whole number for quantity.'
        }
    )
    dimension_w = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Width cannot exceed 10 digits in total.',
            'min_value': 'Width cannot be negative.'
        }
    )
    dimension_d = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Depth cannot exceed 10 digits in total.',
            'min_value': 'Depth cannot be negative.'
        }
    )
    dimension_h = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Height cannot exceed 10 digits in total.',
            'min_value': 'Height cannot be negative.'
        }
    )
    volume_per_pc = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        min_value=Decimal('0.0000'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Volume per pc cannot exceed 10 digits in total.',
            'min_value': 'Volume per pc cannot be negative.'
        }
    )
    total_volume = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        min_value=Decimal('0.0000'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Total volume cannot exceed 12 digits in total.',
            'min_value': 'Total volume cannot be negative.'
        }
    )
    rate_usd = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Rate cannot exceed 12 digits in total.',
            'min_value': 'Rate cannot be negative.'
        }
    )
    amount_usd = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Amount cannot exceed 14 digits in total.',
            'min_value': 'Amount cannot be negative.'
        }
    )

    class Meta:
        model = PerformaInvoiceItem
        fields = '__all__'
        read_only_fields = ['id', 'pi']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        numeric_fields = ['qty', 'dimension_w', 'dimension_d', 'dimension_h', 'volume_per_pc', 'total_volume', 'rate_usd', 'amount_usd']
        for field in numeric_fields:
            if field in data and (data[field] == '' or data[field] is None):
                data[field] = None
        if 'style_no' in data and isinstance(data['style_no'], str):
            data['style_no'] = data['style_no'].strip()
        return super().to_internal_value(data)

    def validate_style_no(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Style No. is required.")
        val = str(value).strip()
        if len(val) < 2:
            raise serializers.ValidationError("Style No. must be at least 2 characters.")
        if len(val) > 100:
            raise serializers.ValidationError("Style No. cannot exceed 100 characters.")
        return val


class PerformaInvoiceSerializer(serializers.ModelSerializer):
    items = PerformaInvoiceItemSerializer(many=True, required=False)
    buyer_detail = BuyerSerializer(source='buyer', read_only=True)

    class Meta:
        model = PerformaInvoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        date_fields = ['pi_date', 'buyer_order_date']
        for f in date_fields:
            if f in data and (data[f] == '' or data[f] is None):
                data[f] = None
        if 'pi_no' in data and isinstance(data['pi_no'], str):
            data['pi_no'] = data['pi_no'].strip()
        return super().to_internal_value(data)

    def validate_pi_no(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("PI No. is required.")
        val = str(value).strip()
        if len(val) < 2:
            raise serializers.ValidationError("PI No. must be at least 2 characters.")
        if len(val) > 100:
            raise serializers.ValidationError("PI No. cannot exceed 100 characters.")
        qs = PerformaInvoice.objects.filter(pi_no__iexact=val)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Performa Invoice '{val}' already exists.")
        return val

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one line item is required in a Performa Invoice.")
        return value

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
    id = serializers.UUIDField(required=False)
    buyer_master_detail = BuyerMasterSerializer(source='buyer_master', read_only=True)
    image_url = serializers.SerializerMethodField()
    allocated_quantity = serializers.SerializerMethodField()
    remaining_quantity = serializers.SerializerMethodField()
    allocation_status = serializers.SerializerMethodField()

    units = serializers.IntegerField(
        min_value=1,
        max_value=999999,
        error_messages={
            'min_value': 'Units must be at least 1.',
            'max_value': 'Units cannot exceed 999,999.',
            'invalid': 'Enter a valid whole number for units.'
        }
    )
    price_usd = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        max_value=Decimal('999999.99'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Price (USD) cannot exceed 12 digits in total (up to 10 integer digits and 2 decimals).',
            'max_whole_digits': 'Price (USD) cannot exceed 10 digits before decimal.',
            'max_decimal_places': 'Price (USD) cannot have more than 2 decimal places.',
            'min_value': 'Price (USD) cannot be negative.',
            'max_value': 'Price (USD) cannot exceed $999,999.99.',
            'invalid': 'Enter a valid price.'
        }
    )
    cbm = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        min_value=Decimal('0.0001'),
        max_value=Decimal('100.0000'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'CBM cannot exceed 10 digits in total (up to 6 integer digits and 4 decimals).',
            'max_whole_digits': 'CBM cannot exceed 6 digits before decimal.',
            'max_decimal_places': 'CBM cannot have more than 4 decimal places.',
            'min_value': 'CBM must be greater than 0.',
            'max_value': 'CBM cannot exceed 100 m³.',
            'invalid': 'Enter a valid CBM value.'
        }
    )
    size_length = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
        max_value=Decimal('9999.99'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Length cannot exceed 10 digits in total.',
            'max_whole_digits': 'Length cannot exceed 8 digits before decimal.',
            'min_value': 'Length must be greater than 0.',
            'max_value': 'Length cannot exceed 9999.99 cm.',
            'invalid': 'Enter a valid length.'
        }
    )
    size_breadth = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
        max_value=Decimal('9999.99'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Breadth cannot exceed 10 digits in total.',
            'max_whole_digits': 'Breadth cannot exceed 8 digits before decimal.',
            'min_value': 'Breadth must be greater than 0.',
            'max_value': 'Breadth cannot exceed 9999.99 cm.',
            'invalid': 'Enter a valid breadth.'
        }
    )
    size_height = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
        max_value=Decimal('9999.99'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Height cannot exceed 10 digits in total.',
            'max_whole_digits': 'Height cannot exceed 8 digits before decimal.',
            'min_value': 'Height must be greater than 0.',
            'max_value': 'Height cannot exceed 9999.99 cm.',
            'invalid': 'Enter a valid height.'
        }
    )
    total_cbm = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        min_value=Decimal('0.0000'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Total CBM cannot exceed 12 digits in total.',
            'min_value': 'Total CBM cannot be negative.',
            'invalid': 'Enter a valid Total CBM.'
        }
    )
    total_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Total Amount cannot exceed 14 digits in total.',
            'min_value': 'Total Amount cannot be negative.',
            'invalid': 'Enter a valid Total Amount.'
        }
    )

    class Meta:
        model = BuyerPIItem
        fields = '__all__'
        read_only_fields = ['buyer_pi']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        numeric_fields = [
            'units', 'price_usd', 'cbm', 'size_length', 'size_breadth', 'size_height',
            'total_cbm', 'total_amount', 'buyer_master'
        ]
        for field in numeric_fields:
            if field in data and (data[field] == '' or data[field] is None):
                data[field] = None

        str_fields = ['barcode', 'buyer_no', 'style_no', 'product_name', 'material', 'finish_color', 'remarks']
        for field in str_fields:
            if field in data and isinstance(data[field], str):
                data[field] = data[field].strip()

        return super().to_internal_value(data)

    def validate_style_no(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Style No. is required.")
        val = str(value).strip()
        if len(val) < 2:
            raise serializers.ValidationError("Style No. must be at least 2 characters.")
        if len(val) > 100:
            raise serializers.ValidationError("Style No. cannot exceed 100 characters.")
        if re.search(r'([^\d])\1{4,}', val):
            raise serializers.ValidationError("Style No. cannot contain excessive repetitive characters.")
        if not re.match(r"^[A-Za-z0-9\-_/ #.()]+$", val):
            raise serializers.ValidationError("Style No. contains invalid characters.")
        return val

    def validate_units(self, value):
        if value is None:
            raise serializers.ValidationError("Units quantity is required.")
        if value < 1:
            raise serializers.ValidationError("Units must be at least 1.")
        if value > 999999:
            raise serializers.ValidationError("Units cannot exceed 999,999.")
        return value

    def validate_price_usd(self, value):
        if value is not None and value != '':
            val = Decimal(str(value))
            if val < Decimal('0.00'):
                raise serializers.ValidationError("Price (USD) cannot be negative.")
            if val > Decimal('999999.99'):
                raise serializers.ValidationError("Price (USD) must be a realistic amount up to $999,999.99.")
            digits_str = str(val).replace('.', '')
            if len(digits_str) > 12:
                raise serializers.ValidationError("Price (USD) cannot exceed 12 digits in total.")
            return val
        return None

    def validate_cbm(self, value):
        if value is not None and value != '':
            val = Decimal(str(value))
            if val <= Decimal('0.0000'):
                raise serializers.ValidationError("CBM must be greater than 0.")
            if val > Decimal('100.0000'):
                raise serializers.ValidationError("CBM must be between 0.0001 and 100.0000 m³.")
            digits_str = str(val).replace('.', '')
            if len(digits_str) > 10:
                raise serializers.ValidationError("CBM cannot exceed 10 digits in total.")
            return val
        return None

    def validate_size_length(self, value):
        return self._validate_dim('Length', value)

    def validate_size_breadth(self, value):
        return self._validate_dim('Breadth', value)

    def validate_size_height(self, value):
        return self._validate_dim('Height', value)

    def _validate_dim(self, label, value):
        if value is not None and value != '':
            val = Decimal(str(value))
            if val <= Decimal('0.0'):
                raise serializers.ValidationError(f"Size {label} must be greater than 0.")
            if val < Decimal('0.01') or val > Decimal('9999.99'):
                raise serializers.ValidationError(f"Size {label} must be between 0.01 and 9999.99 cm.")
            digits_str = str(val).replace('.', '')
            if len(digits_str) > 10:
                raise serializers.ValidationError(f"{label} cannot exceed 10 digits in total.")
            return val
        return None

    def validate_product_name(self, value):
        if value:
            val = value.strip()
            if re.search(r'([^\d])\1{4,}', val):
                raise serializers.ValidationError("Product name contains excessive repetitive characters.")
            if any(len(w) > 35 for w in val.split()):
                raise serializers.ValidationError("Product name contains an excessively long continuous word.")
            return val
        return value

    def validate_material(self, value):
        if value:
            val = value.strip()
            if re.search(r'([^\d])\1{4,}', val):
                raise serializers.ValidationError("Material contains excessive repetitive characters.")
            if any(len(w) > 35 for w in val.split()):
                raise serializers.ValidationError("Material contains an excessively long continuous word.")
            return val
        return value

    def validate_finish_color(self, value):
        if value:
            val = value.strip()
            if re.search(r'([^\d])\1{4,}', val):
                raise serializers.ValidationError("Finish contains excessive repetitive characters.")
            if any(len(w) > 35 for w in val.split()):
                raise serializers.ValidationError("Finish contains an excessively long continuous word.")
            return val
        return value

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

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        date_fields = ['pi_date', 'ex_factory_date']
        for f in date_fields:
            if f in data and (data[f] == '' or data[f] is None):
                data[f] = None
        str_fields = ['pi_no', 'payment_terms', 'delivered_to_name', 'delivered_to_company', 'delivered_to_address', 'remarks']
        for field in str_fields:
            if field in data and isinstance(data[field], str):
                data[field] = data[field].strip()
        return super().to_internal_value(data)

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one line item is required in a Performa Invoice.")
        return value

    def validate_pi_no(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("PI Ref / PO # is required.")
        val = str(value).strip()
        if len(val) < 2:
            raise serializers.ValidationError("PI Ref / PO # must be at least 2 characters.")
        if len(val) > 100:
            raise serializers.ValidationError("PI Ref / PO # cannot exceed 100 characters.")
        if re.search(r'([^\d])\1{4,}', val):
            raise serializers.ValidationError("PI Ref / PO # cannot contain excessive repetitive characters.")
        if not re.match(r"^[A-Za-z0-9\-_/ #.()]+$", val):
            raise serializers.ValidationError("PI Ref / PO # contains invalid characters.")
        instance = self.instance
        qs = BuyerPI.objects.filter(pi_no__iexact=val)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Performa Invoice '{val}' already exists.")
        return val

    def validate(self, attrs):
        pi_date = attrs.get('pi_date')
        ex_factory_date = attrs.get('ex_factory_date')
        if not pi_date and self.instance:
            pi_date = self.instance.pi_date
        if not ex_factory_date and self.instance:
            ex_factory_date = self.instance.ex_factory_date

        if pi_date and ex_factory_date and ex_factory_date < pi_date:
            raise serializers.ValidationError({
                'ex_factory_date': "Ex-Factory Date cannot be earlier than PI Date."
            })
        return attrs

    def validate_payment_terms(self, value):
        if value:
            val = value.strip()
            if len(val) > 200:
                raise serializers.ValidationError("Payment terms cannot exceed 200 characters.")
            if re.search(r'([^\d])\1{4,}', val):
                raise serializers.ValidationError("Payment terms contains excessive repetitive characters.")
            return val
        return value

    def validate_delivered_to_name(self, value):
        if value:
            val = value.strip()
            if len(val) > 200:
                raise serializers.ValidationError("Contact person name cannot exceed 200 characters.")
            if re.search(r'([^\d])\1{4,}', val):
                raise serializers.ValidationError("Contact person name contains excessive repetitive characters.")
            return val
        return value

    def validate_delivered_to_company(self, value):
        if value:
            val = value.strip()
            if len(val) > 200:
                raise serializers.ValidationError("Company name cannot exceed 200 characters.")
            if re.search(r'([^\d])\1{4,}', val):
                raise serializers.ValidationError("Company name contains excessive repetitive characters.")
            return val
        return value

    def validate_delivered_to_address(self, value):
        if value:
            val = value.strip()
            if len(val) > 1000:
                raise serializers.ValidationError("Address cannot exceed 1000 characters.")
            if any(len(w) > 40 for w in val.split()):
                raise serializers.ValidationError("Address contains an excessively long continuous word.")
            return val
        return value

    def validate_remarks(self, value):
        if value:
            val = value.strip()
            if len(val) > 1000:
                raise serializers.ValidationError("Remarks cannot exceed 1000 characters.")
            if any(len(w) > 40 for w in val.split()):
                raise serializers.ValidationError("Remarks contains an excessively long continuous word.")
            return val
        return value

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
            item_data.pop('id', None)
            BuyerPIItem.objects.create(buyer_pi=pi, **item_data)
        return pi

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            existing_items = {str(item.id): item for item in instance.items.all()}
            keep_item_ids = set()
            for item_data in items_data:
                item_data.pop('buyer_pi', None)
                item_id = item_data.pop('id', None)
                if item_id and str(item_id) in existing_items:
                    item_obj = existing_items[str(item_id)]
                    for k, v in item_data.items():
                        setattr(item_obj, k, v)
                    item_obj.save()
                    keep_item_ids.add(str(item_id))
                else:
                    new_item = BuyerPIItem.objects.create(buyer_pi=instance, **item_data)
                    keep_item_ids.add(str(new_item.id))
            for old_id, old_item in existing_items.items():
                if old_id not in keep_item_ids:
                    old_item.delete()
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

    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        error_messages={
            'max_digits': 'Stock quantity cannot exceed 12 digits in total (up to 10 integer digits and 2 decimal places).',
            'max_whole_digits': 'Stock quantity cannot exceed 10 digits before the decimal point (max 9,999,999,999.99).',
            'max_decimal_places': 'Stock quantity cannot have more than 2 decimal places.',
            'min_value': 'Stock quantity cannot be negative.',
            'invalid': 'Please enter a valid numeric quantity.'
        }
    )
    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True,
        error_messages={
            'max_digits': 'Unit price cannot exceed 12 digits in total (up to 10 integer digits and 2 decimal places).',
            'max_whole_digits': 'Unit price cannot exceed 10 digits before the decimal point (max 9,999,999,999.99).',
            'max_decimal_places': 'Unit price cannot have more than 2 decimal places.',
            'min_value': 'Unit price cannot be negative.',
            'invalid': 'Please enter a valid numeric unit price.'
        }
    )

    class Meta:
        model = StockItem
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'unit_price' in data and (data['unit_price'] == '' or data['unit_price'] is None):
            data['unit_price'] = None
        return super().to_internal_value(data)

    def validate_style_no(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Style No. is required and cannot be empty.")
        val = str(value).strip()
        if len(val) > 100:
            raise serializers.ValidationError("Style No. cannot exceed 100 characters.")
        return val

    def validate_item_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Item / Product Name is required and cannot be empty.")
        val = str(value).strip()
        if len(val) > 255:
            raise serializers.ValidationError("Item / Product Name cannot exceed 255 characters.")
        return val

    def validate_unit(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Unit is required (e.g. pcs, set, kg).")
        val = str(value).strip()
        if len(val) > 30:
            raise serializers.ValidationError("Unit cannot exceed 30 characters.")
        return val


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

    def validate_name(self, value):
        val = (value or "").strip()
        if not val:
            raise serializers.ValidationError("Category name cannot be empty.")
        if len(val) > 100:
            raise serializers.ValidationError("Category name cannot exceed 100 characters.")
        qs = StoreItemCategory.objects.filter(name__iexact=val)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError(f"A category with name '{val}' already exists.")
        return val


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
    unit_balance_stock_qty = serializers.SerializerMethodField()
    total_stock_value = serializers.ReadOnlyField()
    rate_history = StoreItemRateHistorySerializer(many=True, read_only=True)

    base_rate = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, default=Decimal('0.00'),
        error_messages={'min_value': 'Base rate cannot be negative.', 'max_digits': 'Base rate cannot exceed 12 digits.'}
    )
    current_rate = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, default=Decimal('0.00'),
        error_messages={'min_value': 'Current rate cannot be negative.', 'max_digits': 'Current rate cannot exceed 12 digits.'}
    )
    reorder_level = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, default=Decimal('10.00'),
        error_messages={'min_value': 'Reorder level cannot be negative.', 'max_digits': 'Reorder level cannot exceed 12 digits.'}
    )
    weight = serializers.DecimalField(
        max_digits=10, decimal_places=3, min_value=Decimal('0.000'), required=False, allow_null=True,
        error_messages={'min_value': 'Weight cannot be negative.', 'max_digits': 'Weight cannot exceed 10 digits.'}
    )

    class Meta:
        model = StoreItem
        fields = '__all__'

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            for field in ['base_rate', 'current_rate', 'weight', 'reorder_level', 'category']:
                if data.get(field) == '':
                    data[field] = None
            if data.get('base_rate') is None:
                data['base_rate'] = '0.00'
            if data.get('current_rate') is None:
                data['current_rate'] = data.get('base_rate', '0.00')
            if data.get('reorder_level') is None:
                data['reorder_level'] = '10.00'
            if isinstance(data.get('item_code'), str):
                data['item_code'] = data['item_code'].strip()
            if isinstance(data.get('item_name'), str):
                data['item_name'] = data['item_name'].strip()
        return super().to_internal_value(data)

    def validate_item_code(self, value):
        val = (value or "").strip()
        if not val:
            raise serializers.ValidationError("Item code is required.")
        if len(val) > 50:
            raise serializers.ValidationError("Item code cannot exceed 50 characters.")
        if re.search(r'([^\d])\1{4,}', val, re.IGNORECASE):
            raise serializers.ValidationError("Item code contains repetitive spam characters.")
        qs = StoreItem.objects.filter(item_code__iexact=val)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError(f"Item code '{val}' is already in use by another store item.")
        return val

    def validate_item_name(self, value):
        val = (value or "").strip()
        if not val:
            raise serializers.ValidationError("Item name is required.")
        if len(val) > 200:
            raise serializers.ValidationError("Item name cannot exceed 200 characters.")
        return val

    def get_unit_balance_stock_qty(self, obj):
        req = self.context.get('request')
        unit_id = req.query_params.get('production_unit') if req else None
        if unit_id:
            return float(obj.get_stock_balance_for_unit(unit_id))
        return float(obj.balance_stock_qty)


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

    qty = serializers.DecimalField(
        max_digits=12, decimal_places=3, min_value=Decimal('0.001'),
        error_messages={'min_value': 'Received quantity must be greater than 0.', 'max_digits': 'Quantity exceeds maximum allowable digits (12).'}
    )
    bill_rate = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.00'),
        error_messages={'min_value': 'Bill rate cannot be negative.', 'max_digits': 'Bill rate exceeds maximum allowable digits (12).'}
    )

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
            for key in ['po', 'production_unit', 'received_by', 'qty', 'bill_rate']:
                if data.get(key) == '':
                    data[key] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs.get('supplier') and not (self.instance and self.instance.supplier):
            raise serializers.ValidationError({"supplier": ["Supplier is required."]})
        if not attrs.get('item') and not (self.instance and self.instance.item):
            raise serializers.ValidationError({"item": ["Store item is required."]})
        if not attrs.get('production_unit') and not (self.instance and self.instance.production_unit):
            raise serializers.ValidationError({"production_unit": ["Factory / Production Unit is required."]})
        bill_no = (attrs.get('bill_no') or "").strip()
        if not bill_no and not (self.instance and self.instance.bill_no):
            raise serializers.ValidationError({"bill_no": ["Supplier bill / invoice number is required."]})
        elif len(bill_no) > 100:
            raise serializers.ValidationError({"bill_no": ["Supplier bill number cannot exceed 100 characters."]})

        qty = attrs.get('qty')
        if qty is not None and qty > Decimal('10000000'):
            raise serializers.ValidationError({"qty": ["Quantity exceeds maximum threshold (10,000,000)."]})
        return super().validate(attrs)


class StoreDailyIssueSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    production_unit_name = serializers.SerializerMethodField()

    qty = serializers.DecimalField(
        max_digits=12, decimal_places=3, min_value=Decimal('0.001'),
        error_messages={'min_value': 'Issued quantity must be greater than 0.', 'max_digits': 'Quantity exceeds maximum allowable digits (12).'}
    )
    rate = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.00'),
        error_messages={'min_value': 'Issue rate cannot be negative.', 'max_digits': 'Rate exceeds maximum allowable digits (12).'}
    )

    class Meta:
        model = StoreDailyIssue
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'total_amount', 'chargeable_total', 'non_chargeable_total']

    def get_production_unit_name(self, obj):
        return obj.production_unit.name if obj.production_unit else ""

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            for key in ['contractor_person', 'production_unit', 'issued_by', 'qty', 'rate']:
                if data.get(key) == '':
                    data[key] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        contractor = attrs.get('contractor') or (self.instance.contractor if self.instance else None)
        if not contractor:
            raise serializers.ValidationError({"contractor": ["Contractor / Supervisor is required."]})

        production_unit = attrs.get('production_unit') or (self.instance.production_unit if self.instance else None)
        if not production_unit:
            raise serializers.ValidationError({"production_unit": ["Factory Unit / Production Unit is required to issue store items."]})

        item = attrs.get('item') or (self.instance.item if self.instance else None)
        if not item:
            raise serializers.ValidationError({"item": ["Store item is required."]})

        qty = attrs.get('qty')
        if item and production_unit and qty is not None:
            # Check 1: Was this item ever received (Material In) in this production unit?
            if not item.has_material_in_for_unit(production_unit.id):
                raise serializers.ValidationError({
                    "item": [f"Item '{item.item_name}' ({item.item_code}) was never received (Material In) in {production_unit.name}. Cannot issue outward stock from this unit."]
                })

            # Check 2: Check available stock balance in this unit
            avail_stock = item.get_stock_balance_for_unit(production_unit.id)
            if self.instance and self.instance.item == item and self.instance.production_unit == production_unit:
                avail_stock += self.instance.qty

            if qty > avail_stock:
                raise serializers.ValidationError({
                    "qty": [f"Insufficient store balance for '{item.item_name}' in {production_unit.name}. Available in {production_unit.name}: {avail_stock} {item.unit}, Requested: {qty} {item.unit}."]
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

    qty = serializers.DecimalField(
        max_digits=12, decimal_places=3, min_value=Decimal('0.001'),
        error_messages={'min_value': 'Returned quantity must be greater than 0.', 'max_digits': 'Quantity exceeds maximum allowable digits (12).'}
    )
    rate = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.00'),
        error_messages={'min_value': 'Return rate cannot be negative.', 'max_digits': 'Rate exceeds maximum allowable digits (12).'}
    )

    class Meta:
        model = StoreMaterialReturn
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'total_amount', 'chargeable_total', 'non_chargeable_total']

    def get_production_unit_name(self, obj):
        return obj.production_unit.name if obj.production_unit else ""

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            for key in ['production_unit', 'returned_by', 'qty', 'rate']:
                if data.get(key) == '':
                    data[key] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs.get('contractor') and not (self.instance and self.instance.contractor):
            raise serializers.ValidationError({"contractor": ["Contractor returning material is required."]})
        if not attrs.get('item') and not (self.instance and self.instance.item):
            raise serializers.ValidationError({"item": ["Store item is required."]})
        if not attrs.get('production_unit') and not (self.instance and self.instance.production_unit):
            raise serializers.ValidationError({"production_unit": ["Factory / Production Unit is required."]})
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

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            for key in ['production_unit', 'requested_qty']:
                if data.get(key) == '':
                    data[key] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs.get('item') and not (self.instance and self.instance.item):
            raise serializers.ValidationError({"item": ["Store item is required."]})
        qty = attrs.get('requested_qty')
        if qty is not None:
            if qty <= Decimal('0.00'):
                raise serializers.ValidationError({"requested_qty": ["Requested quantity must be greater than zero."]})
            if qty > Decimal('9999999.999'):
                raise serializers.ValidationError({"requested_qty": ["Requested quantity cannot exceed 9,999,999."]})
        return super().validate(attrs)

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

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            for key in ['quantity_delta']:
                if data.get(key) == '':
                    data[key] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs.get('item') and not (self.instance and self.instance.item):
            raise serializers.ValidationError({"item": ["Store item is required."]})
        delta = attrs.get('quantity_delta')
        if delta is not None and delta == Decimal('0.00'):
            raise serializers.ValidationError({"quantity_delta": ["Stock variance delta cannot be zero."]})
        reason = (attrs.get('reason') or "").strip()
        if not reason:
            raise serializers.ValidationError({"reason": ["Audit reason for adjustment is required."]})
        elif len(reason) < 5:
            raise serializers.ValidationError({"reason": ["Audit reason must be at least 5 characters."]})
        return super().validate(attrs)

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







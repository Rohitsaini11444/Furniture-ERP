from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from decimal import Decimal
import uuid


# ─── Role & Category Choices ─────────────────────────────────────────────────

class RoleChoices(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    SUPERVISOR = 'supervisor', 'Supervisor'
    CONTRACTOR = 'contractor', 'Contractor'


class BatchCategory(models.TextChoices):
    SANDING = 'sanding', 'Sanding'
    POLISH = 'polish', 'Polish'
    FITTING = 'fitting', 'Fitting'
    PACKAGING = 'packaging', 'Packaging'


# ─── Custom User Model ────────────────────────────────────────────────────────

class User(AbstractUser):
    """
    Extended user with role-based access.
    - Admin: full access, created via Django admin / management command
    - Supervisor: has a batch_category, can self-assign samples & assign to contractors
    - Contractor: linked to a supervisor, can only see their own assignments
    """
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.CONTRACTOR,
    )
    batch_category = models.CharField(
        max_length=20,
        choices=BatchCategory.choices,
        null=True,
        blank=True,
        help_text="Required for Supervisors — defines which manufacturing stage they manage",
    )
    # Contractor → their Supervisor link
    supervisor = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contractors',
        limit_choices_to={'role': RoleChoices.SUPERVISOR},
        help_text="Supervisor this contractor reports to",
    )
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)

    # Use email as username if desired; keep username for Django admin compat
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == RoleChoices.ADMIN

    @property
    def is_supervisor(self):
        return self.role == RoleChoices.SUPERVISOR

    @property
    def is_contractor(self):
        return self.role == RoleChoices.CONTRACTOR


# ─── Existing ERP Models ──────────────────────────────────────────────────────

class Sample(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample_id = models.CharField(max_length=50, unique=True)
    style_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Style No.')
    buyer = models.ForeignKey('Buyer', on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='Buyer')
    product_name = models.CharField(max_length=100)
    material = models.CharField(max_length=255, blank=True, null=True, verbose_name='Material')
    finish_color = models.CharField(max_length=255, blank=True, null=True)
    remark = models.TextField(blank=True, null=True)

    # New fields
    cbm = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True, verbose_name='CBM')
    usd = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Price (USD)')
    vendor_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Vendor Name')
    image = models.ImageField(upload_to='samples/', blank=True, null=True, verbose_name='Sample Image')

    # Product size in centimetres (L × B × H)
    size_length = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Length (cm)')
    size_breadth = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Breadth (cm)')
    size_height = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Height (cm)')

    # Product size in inches (auto-calculated from cm)
    size_length_inch = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Length (in)')
    size_breadth_inch = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Breadth (in)')
    size_height_inch = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Height (in)')
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        from decimal import Decimal
        if self.size_length:
            self.size_length_inch = round(Decimal(str(self.size_length)) / Decimal('2.54'), 2)
        else:
            self.size_length_inch = None

        if self.size_breadth:
            self.size_breadth_inch = round(Decimal(str(self.size_breadth)) / Decimal('2.54'), 2)
        else:
            self.size_breadth_inch = None

        if self.size_height:
            self.size_height_inch = round(Decimal(str(self.size_height)) / Decimal('2.54'), 2)
        else:
            self.size_height_inch = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sample_id} - {self.product_name}"


class Buyer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    # Soft delete audit fields
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deletion_note = models.TextField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_buyers')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.code})"


class BuyerMaster(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='buyer_masters')
    sample = models.ForeignKey(Sample, on_delete=models.SET_NULL, null=True, blank=True, related_name='buyer_masters')
    style_no = models.CharField(max_length=100)
    buyer_code = models.CharField(max_length=50)
    product_name = models.CharField(max_length=100)
    wood_type = models.CharField(max_length=255, blank=True, null=True, verbose_name='Material / Wood Type')
    finish_color = models.CharField(max_length=255, blank=True, null=True, verbose_name='Finish Color')
    size_length = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Length (cm)')
    size_breadth = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Breadth (cm)')
    size_height = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Height (cm)')
    remark = models.TextField(blank=True, null=True)

    # Price & Quantity details
    price_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Price (USD)')
    units = models.IntegerField(default=1, verbose_name='Units')
    total_cbm = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, verbose_name='Total CBM')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='Total Amount')

    # Extended details
    vendor_details = models.TextField(blank=True, null=True, verbose_name='Vendor Details')
    vendor_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Vendor Price')
    costing = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Costing')
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Purchase Price')
    cbm = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, verbose_name='CBM')
    net_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Net Weight')
    gross_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Gross Weight')
    box_size = models.CharField(max_length=150, blank=True, null=True, verbose_name='Box Size')
    box_length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Box Length (cm)')
    box_breadth = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Box Breadth (cm)')
    box_height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Box Height (cm)')
    packaging_image = models.ImageField(upload_to='buyer_masters/packaging/', blank=True, null=True, verbose_name='Packaging Image')
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if self.units is not None and self.cbm is not None:
            self.total_cbm = round(Decimal(str(self.units)) * Decimal(str(self.cbm)), 4)
        if self.units is not None and self.price_usd is not None:
            self.total_amount = round(Decimal(str(self.units)) * Decimal(str(self.price_usd)), 2)
        if self.box_length or self.box_breadth or self.box_height:
            l = float(self.box_length) if self.box_length else 0
            b = float(self.box_breadth) if self.box_breadth else 0
            h = float(self.box_height) if self.box_height else 0
            self.box_size = f"{l} x {b} x {h} cm"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.style_no} - {self.product_name} ({self.buyer.code})"


class BuyerMasterFinishingImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer_master = models.ForeignKey(BuyerMaster, on_delete=models.CASCADE, related_name='finishing_images')
    image = models.ImageField(upload_to='buyer_masters/finishing/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

# ─── Supplier & Supplier PO Models ──────────────────────────────────────────

class Supplier(models.Model):
    """Master list of raw-material suppliers."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name='Supplier Name')
    address = models.TextField(blank=True, null=True, verbose_name='Address')
    phone = models.CharField(max_length=50, blank=True, null=True, verbose_name='Phone')
    gstin = models.CharField(max_length=50, blank=True, null=True, verbose_name='GSTIN/UIN')
    state_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='State Name')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class SupplierPO(models.Model):
    """
    A Purchase Order issued BY our company TO a supplier.
    One PO → one supplier, but many line items that may fulfill
    quantities from different buyer orders.
    """
    PO_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Received', 'Received'),
        ('Cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=100, unique=True, verbose_name='PO Number')
    po_date = models.DateField(verbose_name='PO Date')
    due_date = models.DateField(null=True, blank=True, verbose_name='PO Due Date')
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='purchase_orders',
        verbose_name='Supplier',
    )
    mode_of_payment = models.CharField(max_length=150, blank=True, null=True, verbose_name='Mode of Payment')
    terms_of_delivery = models.TextField(blank=True, null=True, verbose_name='Terms of Delivery')
    supervisor = models.CharField(max_length=100, blank=True, null=True, verbose_name='Supervisor')
    nku_refs = models.CharField(max_length=300, blank=True, null=True, verbose_name='NKU Reference Numbers')
    remarks = models.TextField(blank=True, null=True, verbose_name='Remarks')
    status = models.CharField(
        max_length=20,
        choices=PO_STATUS_CHOICES,
        default='Pending',
        verbose_name='Status',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.po_number} → {self.supplier.name}"

    @property
    def total_amount(self):
        return sum(item.amount or Decimal('0') for item in self.items.all())


class SupplierPOItem(models.Model):
    """
    One line item in a Supplier PO.
    Each item can reference a specific buyer (and optionally a BuyerPI)
    to show which buyer order is being fulfilled.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier_po = models.ForeignKey(
        SupplierPO,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Supplier PO',
    )
    buyer = models.ForeignKey(
        Buyer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_po_items',
        verbose_name='Buyer (Order Reference)',
    )
    buyer_pi = models.ForeignKey(
        'BuyerPI',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_po_items',
        verbose_name='Buyer PI Reference',
    )
    description = models.TextField(verbose_name='Description of Goods')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Quantity')
    passed_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Passed Quantity')
    unit = models.CharField(max_length=30, default='pcs', verbose_name='Unit (pcs/mtr/Ft²)')
    rate = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Rate (INR)')
    amount = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True, verbose_name='Amount (INR)')
    remark = models.TextField(blank=True, null=True, verbose_name='Remark')

    def save(self, *args, **kwargs):
        if self.quantity is not None and self.rate is not None:
            self.amount = round(Decimal(str(self.quantity)) * Decimal(str(self.rate)), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description[:50]} — {self.quantity} {self.unit}"


class SampleImage(models.Model):
    """Multiple images per sample."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample = models.ForeignKey(Sample, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='samples/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return f"Image for {self.sample.sample_id}"



# ─── Performa Invoice Models ──────────────────────────────────────────────────

class PerformaInvoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pi_no = models.CharField(max_length=100, unique=True, verbose_name='PI No.')
    pi_date = models.DateField(null=True, blank=True, verbose_name='PI Date')
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='performa_invoices', verbose_name='Buyer')
    buyer_order_no = models.CharField(max_length=100, blank=True, null=True, verbose_name="Buyer's Order No.")
    buyer_order_date = models.DateField(null=True, blank=True, verbose_name="Buyer's Order Date")
    exporter_ref = models.CharField(max_length=100, blank=True, null=True, verbose_name="Exporter's Ref.")
    other_references = models.CharField(max_length=200, blank=True, null=True, verbose_name='Other Reference(s)')
    buyer_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Buyer Name')
    buyer_other_consignee = models.CharField(max_length=200, blank=True, null=True, verbose_name='Buyer (if other than consignee)')
    department_no = models.CharField(max_length=50, blank=True, null=True, verbose_name='Department #')
    
    pre_carriage_by = models.CharField(max_length=100, default='Trailer', blank=True, null=True, verbose_name='Pre-Carriage by')
    place_of_receipt = models.CharField(max_length=100, default='Jaipur', blank=True, null=True, verbose_name='Place of Receipt by Pre-carrier')
    vessel_flight_no = models.CharField(max_length=100, default='By Sea', blank=True, null=True, verbose_name='Vessel / Flight No.')
    port_of_loading = models.CharField(max_length=100, default='Mundra', blank=True, null=True, verbose_name='Port of Loading')
    port_of_discharge = models.CharField(max_length=100, blank=True, null=True, verbose_name='Port of Discharge')
    place_of_delivery = models.CharField(max_length=100, default='UNITED KINGDOM', blank=True, null=True, verbose_name='Place of Delivery')
    
    country_of_origin = models.CharField(max_length=100, default='INDIA', blank=True, null=True, verbose_name='Country of Origin')
    country_final_destination = models.CharField(max_length=100, default='UK', blank=True, null=True, verbose_name='Country of Final Destination')
    
    terms_payment = models.CharField(max_length=200, default='Payment: T/T', blank=True, null=True, verbose_name='Terms of Payment')
    terms_delivery = models.CharField(max_length=200, default='Delivery: 30-July-26 Ex-Factory', blank=True, null=True, verbose_name='Terms of Delivery')
    category_header = models.CharField(max_length=200, default='Wooden Furniture Items', blank=True, null=True, verbose_name='Category Header')
    declaration_text = models.TextField(
        blank=True,
        null=True,
        default=(
            "We declare that this invoice shows that the actual price of the goods and that all particulars are true and correct. "
            "We are not registered under Central Excise Act 1944 and Rules made there under and no cenvat credit or input stage benefits in any input has been availed by us or supporting manufacturer. "
            "No duty free input either imported or procured locally has been used in the export product. The value declared is fair and same is equivalent to PMV of the goods. "
            "The goods are non antique and not art treasure. We further declare that neither red sandors wood nor any oher prohibited wood has been used in the manufacturing of above items."
        ),
        verbose_name='Declaration Text'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PI: {self.pi_no} - {self.buyer.name}"


class PerformaInvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pi = models.ForeignKey(PerformaInvoice, on_delete=models.CASCADE, related_name='items')
    # Legacy FK to old PO model — kept as null for compatibility; use SupplierPO going forward
    po_ref = models.CharField(max_length=100, blank=True, null=True, verbose_name='Legacy PO Ref')
    style_no = models.CharField(max_length=100, verbose_name='Style No.')
    description = models.TextField(blank=True, null=True, verbose_name='Description of Goods')
    image_url = models.CharField(max_length=500, blank=True, null=True, verbose_name='Image URL / Path')
    
    dimension_w = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Width (cm)')
    dimension_d = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Depth (cm)')
    dimension_h = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Height (cm)')
    
    volume_per_pc = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, verbose_name='Volume Per Pc')
    qty = models.IntegerField(default=1, verbose_name='Quantity')
    total_volume = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, verbose_name='Total Volume')
    rate_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Rate US$')
    amount_usd = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='Amount US$')

    def save(self, *args, **kwargs):
        if self.qty and self.volume_per_pc:
            self.total_volume = round(Decimal(str(self.qty)) * Decimal(str(self.volume_per_pc)), 4)
        if self.qty and self.rate_usd:
            self.amount_usd = round(Decimal(str(self.qty)) * Decimal(str(self.rate_usd)), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.style_no} - Qty {self.qty}"


# ─── Buyer Performa Invoice (Pre-PO PI) Models ───────────────────────────────

class BuyerPI(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pi_no = models.CharField(max_length=100, unique=True, verbose_name='PI / PO Ref No.')
    pi_date = models.DateField(null=True, blank=True, verbose_name='PI Date')
    ex_factory_date = models.DateField(null=True, blank=True, verbose_name='Ex-Factory Date')
    payment_terms = models.CharField(max_length=200, default='100% TT 30 Days from BL', blank=True, null=True, verbose_name='Payment Terms')
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='buyer_pis', verbose_name='Buyer')
    delivered_to_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Delivered To Contact Name')
    delivered_to_company = models.CharField(max_length=200, blank=True, null=True, verbose_name='Delivered To Company Name')
    delivered_to_address = models.TextField(blank=True, null=True, verbose_name='Delivered To Address')
    remarks = models.TextField(blank=True, null=True, verbose_name='Remarks')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Buyer PI: {self.pi_no} - {self.buyer.name}"


class BuyerPIItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer_pi = models.ForeignKey(BuyerPI, on_delete=models.CASCADE, related_name='items')
    buyer_master = models.ForeignKey(BuyerMaster, on_delete=models.SET_NULL, null=True, blank=True, related_name='pi_items')
    barcode = models.CharField(max_length=100, blank=True, null=True, verbose_name='Barcode')
    buyer_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Buyer #')
    style_no = models.CharField(max_length=100, verbose_name='Style No.')
    product_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Product Name')
    size_length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Size Length (cm)')
    size_breadth = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Size Breadth (cm)')
    size_height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Size Height (cm)')
    material = models.CharField(max_length=255, blank=True, null=True, verbose_name='Material')
    finish_color = models.CharField(max_length=255, blank=True, null=True, verbose_name='Finish')
    cbm = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, verbose_name='CBM')
    price_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Price (USD)')
    units = models.IntegerField(default=1, verbose_name='Units')
    total_cbm = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, verbose_name='Total CBM')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='Total Amount')
    remarks = models.TextField(blank=True, null=True, verbose_name='Remarks')

    def save(self, *args, **kwargs):
        if self.units is not None and self.cbm is not None:
            self.total_cbm = round(Decimal(str(self.units)) * Decimal(str(self.cbm)), 4)
        if self.units is not None and self.price_usd is not None:
            self.total_amount = round(Decimal(str(self.units)) * Decimal(str(self.price_usd)), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.style_no} ({self.units} units)"


class SupplierPOItemDefect(models.Model):
    po_item = models.ForeignKey(SupplierPOItem, on_delete=models.CASCADE, related_name='defects')
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Number of defective pieces")
    defective_image = models.ImageField(upload_to='po_defects/', null=True, blank=True)
    remark = models.TextField(blank=True, null=True)
    admin_reply = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Defect for {self.po_item} - {self.quantity} pcs"


class SupplierPOItemDefectImage(models.Model):
    defect = models.ForeignKey(SupplierPOItemDefect, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='po_defects/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.defect}"


class StockTypeChoices(models.TextChoices):
    RAW = 'raw', 'Raw Stock'
    SANDED = 'sanded', 'Sanded Stock'
    POLISHED = 'polished', 'Polished Stock'
    PACKAGED = 'packaged', 'Packaged Stock (Finished)'


class StockItem(models.Model):
    STOCK_STATUS_CHOICES = [
        ('In Stock', 'In Stock'),
        ('Low Stock', 'Low Stock'),
        ('Reserved', 'Reserved'),
        ('Out of Stock', 'Out of Stock'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock_type = models.CharField(
        max_length=20,
        choices=StockTypeChoices.choices,
        default=StockTypeChoices.RAW,
        verbose_name='Stock Type'
    )
    po_item = models.ForeignKey(SupplierPOItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_items', verbose_name='Supplier PO Item')
    sample = models.ForeignKey(Sample, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_items', verbose_name='Sample')
    buyer = models.ForeignKey(Buyer, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_items', verbose_name='Buyer')
    buyer_master = models.ForeignKey(BuyerMaster, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_items', verbose_name='Buyer Master')
    
    style_no = models.CharField(max_length=100, verbose_name='Style No.')
    item_name = models.CharField(max_length=255, verbose_name='Item / Product Name')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Stock Quantity')
    unit = models.CharField(max_length=30, default='pcs', verbose_name='Unit')
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Unit Price (INR/USD)')
    location = models.CharField(max_length=150, default='Main Store', blank=True, null=True, verbose_name='Storage Location')
    status = models.CharField(max_length=30, choices=STOCK_STATUS_CHOICES, default='In Stock', verbose_name='Status')
    remarks = models.TextField(blank=True, null=True, verbose_name='Remarks')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_stock_type_display()}] {self.style_no} - {self.item_name} ({self.quantity} {self.unit})"


class ProductionStageChoices(models.TextChoices):
    SANDING = 'sanding', 'Sanding'
    POLISHING = 'polishing', 'Polishing'
    PACKAGING = 'packaging', 'Packaging'


class ProductionJobStatus(models.TextChoices):
    ASSIGNED = 'assigned', 'Assigned'
    IN_PROGRESS = 'in_progress', 'In Progress'
    QC_REQUESTED = 'qc_requested', 'QC Requested'
    QC_COMPLETED = 'qc_completed', 'QC Completed'


class ProductionJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage = models.CharField(max_length=20, choices=ProductionStageChoices.choices)
    status = models.CharField(max_length=20, choices=ProductionJobStatus.choices, default=ProductionJobStatus.ASSIGNED)
    stock_item = models.ForeignKey(StockItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='production_jobs')
    buyer_master = models.ForeignKey(BuyerMaster, on_delete=models.SET_NULL, null=True, blank=True, related_name='production_jobs')
    sample = models.ForeignKey(Sample, on_delete=models.SET_NULL, null=True, blank=True, related_name='production_jobs')
    buyer = models.ForeignKey(Buyer, on_delete=models.SET_NULL, null=True, blank=True, related_name='production_jobs')
    
    style_no = models.CharField(max_length=100, verbose_name='Style No.')
    item_name = models.CharField(max_length=255, verbose_name='Item / Product Name')
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='production_jobs', limit_choices_to={'role': RoleChoices.CONTRACTOR})
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_production_jobs')
    
    assigned_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Assigned Quantity')
    passed_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Passed Quantity')
    rejected_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Rejected (Rework) Quantity')
    unit = models.CharField(max_length=30, default='pcs', verbose_name='Unit')
    
    contractor_notes = models.TextField(blank=True, null=True, verbose_name='Contractor Notes')
    qc_notes = models.TextField(blank=True, null=True, verbose_name='QC Feedback Notes')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    qc_requested_at = models.DateTimeField(null=True, blank=True)
    qc_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_stage_display()} Job: {self.style_no} ({self.assigned_qty} {self.unit}) -> {self.contractor.username}"


class ProductionQCLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(ProductionJob, on_delete=models.CASCADE, related_name='qc_logs')
    inspected_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='production_qc_inspections')
    passed_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rejected_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"QC Log for {self.job.style_no} - Passed: {self.passed_qty}, Rejected: {self.rejected_qty}"



class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message}"

class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session for {self.user.username} from {self.ip_address}"


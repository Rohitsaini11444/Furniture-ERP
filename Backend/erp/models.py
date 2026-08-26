import uuid
from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Sum
from django.utils import timezone



# ─── Role & Category Choices ─────────────────────────────────────────────────

class RoleChoices(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    SUPERVISOR = 'supervisor', 'Supervisor'
    CONTRACTOR = 'contractor', 'Contractor'
    STORE_MANAGER = 'store_manager', 'Store Manager'
    MERCHANT = 'merchant', 'Merchant'


class BatchCategory(models.TextChoices):
    SANDING = 'sanding', 'Sanding'
    POLISH = 'polish', 'Polish'
    FITTING = 'fitting', 'Fitting'
    PACKAGING = 'packaging', 'Packaging'


# ─── Production Unit / Factory Model ───────────────────────────────────────

class ProductionUnit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, verbose_name="Unit / Factory Name")
    unit_code = models.CharField(max_length=50, unique=True, verbose_name="Unit Code")
    location = models.CharField(max_length=255, blank=True, null=True, verbose_name="Location / Address")
    capacity_pcs = models.IntegerField(default=1000, verbose_name="Monthly Capacity (pcs)")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['unit_code']
        verbose_name = "Production Unit"
        verbose_name_plural = "Production Units"

    def __str__(self):
        return f"{self.name} ({self.unit_code})"


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
    production_unit = models.ForeignKey(
        ProductionUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text="Assigned Factory / Production Unit",
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


# ─── Finish / Polish Catalog Model ───────────────────────────────────────────

class Finish(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, verbose_name="Finish Name")
    finish_code = models.CharField(max_length=50, blank=True, null=True, verbose_name="Finish Code")
    color = models.CharField(max_length=100, blank=True, null=True, verbose_name="Color")
    wood_type = models.CharField(max_length=100, blank=True, null=True, verbose_name="Wood Type")
    image = models.ImageField(upload_to='finishes/', blank=True, null=True, verbose_name="Finish Image")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Finish"
        verbose_name_plural = "Finishes"

    def __str__(self):
        code_str = f" ({self.finish_code})" if self.finish_code else ""
        return f"{self.name}{code_str}"


# ─── Existing ERP Models ──────────────────────────────────────────────────────

class Sample(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample_id = models.CharField(max_length=50, unique=True)
    style_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Style No.')
    buyer = models.ForeignKey('Buyer', on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='Buyer')
    product_name = models.CharField(max_length=100)
    material = models.CharField(max_length=255, blank=True, null=True, verbose_name='Material')
    finish = models.ForeignKey('Finish', on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='Finish / Color Catalog')
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


class BuyerUnitAllocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='unit_allocations')
    production_unit = models.ForeignKey(ProductionUnit, on_delete=models.CASCADE, related_name='buyer_allocations')
    is_primary = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('buyer', 'production_unit')
        verbose_name = "Buyer Unit Allocation"
        verbose_name_plural = "Buyer Unit Allocations"

    def __str__(self):
        return f"{self.buyer.name} -> {self.production_unit.name}"


class UnitWorkReallocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(Buyer, on_delete=models.SET_NULL, null=True, blank=True, related_name='work_reallocations')
    po = models.ForeignKey('SupplierPO', on_delete=models.SET_NULL, null=True, blank=True, related_name='unit_reallocations')
    from_unit = models.ForeignKey(ProductionUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name='reallocated_from')
    to_unit = models.ForeignKey(ProductionUnit, on_delete=models.CASCADE, related_name='reallocated_to')
    reallocated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='work_reallocations')
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Unit Work Re-allocation Audit"
        verbose_name_plural = "Unit Work Re-allocation Audits"

    def __str__(self):
        return f"Work Reallocated: {self.from_unit.name if self.from_unit else 'All'} -> {self.to_unit.name}"


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
    cartage_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00, verbose_name='Cartage GST Rate (%)')
    cartage_ledger_name = models.CharField(max_length=200, default='PUR. CARTAGE GST @ 18% -  3 %', verbose_name='Cartage Ledger Name')
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
        ('Partial Received', 'Partial Received'),
        ('Received', 'Received'),
        ('Cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=100, unique=True, verbose_name='PO Number')
    po_date = models.DateField(verbose_name='PO Date')
    due_date = models.DateField(null=True, blank=True, verbose_name='PO Due Date')
    original_due_date = models.DateField(null=True, blank=True, verbose_name='Original PO Due Date')
    production_unit = models.ForeignKey(
        ProductionUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_pos',
        verbose_name='Production Unit / Factory'
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='purchase_orders',
        verbose_name='Supplier',
    )
    mode_of_payment = models.CharField(max_length=150, blank=True, null=True, verbose_name='Mode of Payment')
    terms_of_delivery = models.TextField(blank=True, null=True, verbose_name='Terms of Delivery')
    supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_supplier_pos',
        limit_choices_to={'role': RoleChoices.SUPERVISOR},
        verbose_name='Assigned Supervisor'
    )
    nku_refs = models.CharField(max_length=300, blank=True, null=True, verbose_name='NKU Reference Numbers')
    buyer_pi = models.ForeignKey(
        'BuyerPI',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_pos',
        verbose_name='Linked Buyer PI Reference',
    )
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

    def save(self, *args, **kwargs):
        if not self.original_due_date and self.due_date:
            self.original_due_date = self.due_date
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.po_number} → {self.supplier.name}"

    @property
    def total_amount(self):
        return sum(item.amount or Decimal('0') for item in self.items.all())


class POExtensionLog(models.Model):
    """
    Audit log of date extension requests granted for a Supplier PO.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier_po = models.ForeignKey(
        SupplierPO,
        on_delete=models.CASCADE,
        related_name='extension_logs',
        verbose_name='Supplier PO'
    )
    extended_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Extended By'
    )
    days_added = models.IntegerField(default=5, verbose_name='Days Added')
    previous_due_date = models.DateField(null=True, blank=True, verbose_name='Previous Due Date')
    new_due_date = models.DateField(verbose_name='New Due Date')
    reason = models.TextField(blank=True, null=True, verbose_name='Call Notes / Extension Reason')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'PO Extension Log'
        verbose_name_plural = 'PO Extension Logs'

    def __str__(self):
        return f"{self.supplier_po.po_number} extended by +{self.days_added} days on {self.created_at.strftime('%Y-%m-%d')}"


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
    buyer_pi_item = models.ForeignKey(
        'BuyerPIItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='po_allocations',
        verbose_name='Buyer PI Item Reference',
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

class GateInwardReceipt(models.Model):
    """
    Tracks individual partial inward shipments for a Supplier PO Item.
    Generates Goods Received Note (GRN) for each round.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grn_number = models.CharField(max_length=100, blank=True, null=True, verbose_name='GRN Number')
    round_number = models.IntegerField(default=1, verbose_name='Delivery Round Number')
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE, related_name='gate_receipts')
    po_item = models.ForeignKey(SupplierPOItem, on_delete=models.CASCADE, related_name='inward_receipts')
    receipt_date = models.DateField(default=timezone.now, verbose_name='Receipt Date')
    challan_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Supplier Challan / Invoice No.')
    supplier_invoice_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Supplier Invoice No.')
    supplier_invoice_date = models.DateField(null=True, blank=True, verbose_name='Supplier Invoice Date')
    supplier_invoice_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='Supplier Invoice Amount')
    vehicle_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Vehicle / Truck No.')
    driver_contact = models.CharField(max_length=100, blank=True, null=True, verbose_name='Driver Contact')
    received_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Received Qty')
    passed_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Passed Qty')
    rejected_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Rejected Qty')
    notes = models.TextField(blank=True, null=True)
    inspected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"GRN #{self.grn_number or self.id.hex[:6]} (Round #{self.round_number}) — Passed: {self.passed_qty}, Rejected: {self.rejected_qty}"


class SupplierDebitNote(models.Model):
    """
    Tally-compatible Debit Note Voucher for rejected goods return.
    Strictly enforced to be <= INR 2,00,000 to comply with E-Way Bill threshold limits.
    """
    DEBIT_NOTE_STATUS = [
        ('Grace Period', 'Grace Period (Pending Supplier Repair)'),
        ('Issued', 'Issued'),
        ('Resolved (Repaired)', 'Resolved (Repaired & Accepted)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vch_type = models.CharField(max_length=50, default='Debit Note', verbose_name='Vch Type')
    vch_no = models.CharField(max_length=100, unique=True, verbose_name='Debit Note No.')
    vch_date = models.DateField(default=timezone.now, verbose_name='Vch Date / Dated')
    original_inv_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Original Invoice No.')
    original_inv_date = models.DateField(null=True, blank=True, verbose_name='Original Invoice Date')
    
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='debit_notes')
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.SET_NULL, null=True, blank=True, related_name='debit_notes')
    po_item = models.ForeignKey(SupplierPOItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='debit_notes')
    tax_invoice = models.ForeignKey('SupplierTaxInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='debit_notes')
    
    status = models.CharField(max_length=30, choices=DEBIT_NOTE_STATUS, default='Issued', verbose_name='Status')
    holding_until = models.DateTimeField(null=True, blank=True, verbose_name='Grace Period End Time (2 Days)')
    
    hsn_sac = models.CharField(max_length=50, default='70099200', verbose_name='HSN/SAC Code')
    item_description = models.TextField(verbose_name='Description of Goods and Services')
    rejected_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0, verbose_name='Rejected Quantity')
    unit = models.CharField(max_length=30, default='pcs', verbose_name='Unit (pcs/ft/kg)')
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Rate (INR)')
    subtotal_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='Subtotal Amount')
    
    cartage_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.0, verbose_name='Pur Cartage GST Rate %')
    cartage_gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=9.0, verbose_name='Input CGST Rate %')
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=9.0, verbose_name='Input SGST Rate %')
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=6, decimal_places=2, default=0.0, verbose_name='Round Off')
    
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='Total Debit Note Amount (Max Rs 2 Lakh)')
    amount_in_words = models.CharField(max_length=300, blank=True, null=True, verbose_name='Amount in Words')
    remarks = models.TextField(blank=True, null=True, verbose_name='Remarks')
    company_pan = models.CharField(max_length=50, default='ABXPS4077R', verbose_name="Company's PAN")
    tally_synced = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.vch_no} ({self.supplier.name}) — ₹{self.total_amount}"


class SupplierDebitNoteItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    debit_note = models.ForeignKey(SupplierDebitNote, on_delete=models.CASCADE, related_name='items')
    po_item = models.ForeignKey(SupplierPOItem, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=300)
    hsn_sac = models.CharField(max_length=50, default='9403')
    rejected_qty = models.DecimalField(max_digits=12, decimal_places=3)
    unit = models.CharField(max_length=30, default='pcs')
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.description} - Rejected: {self.rejected_qty} {self.unit}"


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
    production_unit = models.ForeignKey(ProductionUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_items', verbose_name='Production Unit / Factory')
    
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
    production_unit = models.ForeignKey(ProductionUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name='production_jobs', verbose_name='Production Unit / Factory')
    
    style_no = models.CharField(max_length=100, verbose_name='Style No.')
    item_name = models.CharField(max_length=255, verbose_name='Item / Product Name')
    contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='production_jobs', limit_choices_to={'role': RoleChoices.CONTRACTOR})
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



class NotificationCategory(models.TextChoices):
    SECURITY = 'security', 'Security & Logins'
    INVENTORY = 'inventory', 'Store & Inventory'
    ORDERS = 'orders', 'Purchase & Orders'
    PRODUCTION = 'production', 'Production & QC'
    SYSTEM = 'system', 'System Alerts'


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255, default="Notification")
    message = models.CharField(max_length=500)
    category = models.CharField(max_length=50, choices=NotificationCategory.choices, default=NotificationCategory.SYSTEM)
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.category}] {self.title} for {self.user.username}"

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


# ─── PO Supplier Transfer Audit History ───────────────────────────────────────

class POSupplierHistory(models.Model):
    """Logs when a Purchase Order is transferred from one supplier to another."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE, related_name='supplier_history')
    previous_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    new_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    reason = models.TextField(blank=True, null=True, verbose_name='Reason for Transfer')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"PO {self.supplier_po.po_number} transferred from {self.previous_supplier} to {self.new_supplier}"


# ─── Supplier Tax Invoice (Multi-PO Dispatch Inward) ──────────────────────────

class SupplierTaxInvoice(models.Model):
    """
    Tax Invoice issued by a Supplier accompanying a truck shipment.
    Fulfills line items across single or multiple Purchase Orders.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_no = models.CharField(max_length=100, verbose_name='Invoice No.')
    invoice_date = models.DateField(verbose_name='Invoice Date')
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='tax_invoices')
    
    delivery_note = models.CharField(max_length=100, blank=True, null=True, verbose_name='Delivery Note')
    despatch_document_no = models.CharField(max_length=100, blank=True, null=True, verbose_name='Despatch Document No.')
    despatched_through = models.CharField(max_length=100, blank=True, null=True, verbose_name='Despatched Through')
    destination = models.CharField(max_length=100, blank=True, null=True, verbose_name='Destination')
    
    cartage_ledger_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Cartage Ledger Name')
    cartage_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00, verbose_name='Cartage GST Rate (%)')
    cartage_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name='Cartage Amount')
    
    subtotal_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice #{self.invoice_no} - {self.supplier.name}"


class SupplierTaxInvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tax_invoice = models.ForeignKey(SupplierTaxInvoice, on_delete=models.CASCADE, related_name='items')
    supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE, related_name='invoice_items')
    po_item = models.ForeignKey(SupplierPOItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice_items')
    
    hsn_sac = models.CharField(max_length=50, default='9403', verbose_name='HSN/SAC Code')
    description = models.CharField(max_length=300, verbose_name='Description of Goods')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, verbose_name='Quantity')
    unit = models.CharField(max_length=30, default='pcs', verbose_name='Unit')
    rate = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Rate per Unit')
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, verbose_name='Disc %')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Amount')
    
    passed_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0.00)
    rejected_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0.00)

    def __str__(self):
        return f"{self.description} ({self.quantity} {self.unit})"


# ─── Store Management Module Models ───────────────────────────────────────────

class StoreItemCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Category Name")
    code = models.CharField(max_length=50, unique=True, verbose_name="Category Code")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['name']
        verbose_name = "Store Item Category"
        verbose_name_plural = "Store Item Categories"

    def __str__(self):
        return self.name


class StoreItemStatus(models.TextChoices):
    CHARGE = 'charge', 'Chargeable'
    NON_CHARGE = 'non-charge', 'Non-Chargeable'


class StoreItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_code = models.CharField(max_length=50, unique=True, verbose_name="Item Code")
    item_name = models.CharField(max_length=200, verbose_name="Item Name")
    category = models.ForeignKey(StoreItemCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="items")
    unit = models.CharField(max_length=30, default="pcs", verbose_name="Unit")
    base_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Master Base Rate (₹)")
    current_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Current Effective Rate (₹)")
    weight = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, verbose_name="Weight per unit")
    image = models.ImageField(upload_to="store_items/", null=True, blank=True, verbose_name="Item Image")
    default_status = models.CharField(
        max_length=20,
        choices=StoreItemStatus.choices,
        default=StoreItemStatus.CHARGE,
        verbose_name="Default Chargeability Status"
    )
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=10.00, verbose_name="Reorder / Min Level")
    remark = models.TextField(blank=True, null=True, verbose_name="Remark / Description")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['item_code']
        verbose_name = "Store Item"
        verbose_name_plural = "Store Items"

    def __str__(self):
        return f"{self.item_code} - {self.item_name}"

    @property
    def total_returned_qty(self):
        if hasattr(self, 'returned_qty_sum') and self.returned_qty_sum is not None:
            return Decimal(str(self.returned_qty_sum))
        returned = self.return_entries.aggregate(total=Sum('qty'))['total'] or Decimal('0.00')
        return returned

    @property
    def total_stock_qty(self):
        if hasattr(self, 'inward_qty_sum') and self.inward_qty_sum is not None:
            return Decimal(str(self.inward_qty_sum))
        inward = self.inward_entries.aggregate(total=Sum('qty'))['total'] or Decimal('0.00')
        return inward

    @property
    def total_issued_qty(self):
        if hasattr(self, 'issued_qty_sum') and self.issued_qty_sum is not None:
            return Decimal(str(self.issued_qty_sum))
        issued = self.daily_issues.aggregate(total=Sum('qty'))['total'] or Decimal('0.00')
        return issued

    @property
    def total_adjustment_qty(self):
        if hasattr(self, 'adjustment_qty_sum') and self.adjustment_qty_sum is not None:
            return Decimal(str(self.adjustment_qty_sum))
        adjustments = self.stock_adjustments.filter(status='approved').aggregate(total=Sum('quantity_delta'))['total'] or Decimal('0.00')
        return adjustments

    @property
    def balance_stock_qty(self):
        return (self.total_stock_qty + self.total_returned_qty + self.total_adjustment_qty) - self.total_issued_qty

    @property
    def total_stock_value(self):
        return self.balance_stock_qty * (self.current_rate or self.base_rate)


class StoreItemRateHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name="rate_history")
    old_rate = models.DecimalField(max_digits=12, decimal_places=2)
    new_rate = models.DecimalField(max_digits=12, decimal_places=2)
    rate_difference = models.DecimalField(max_digits=12, decimal_places=2)
    percentage_change = models.DecimalField(max_digits=8, decimal_places=2)
    supplier_name = models.CharField(max_length=200, blank=True, null=True)
    po_reference = models.CharField(max_length=100, blank=True, null=True)
    revision_reason = models.TextField(blank=True, null=True)
    effective_date = models.DateField(default=timezone.now)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-effective_date', '-created_at']

    def __str__(self):
        return f"{self.item.item_name}: {self.old_rate} → {self.new_rate}"


class ContractorPerson(models.Model):
    """
    Contractor worker / person delegate authorized to receive materials from store.
    E.g., Pappu - Person 'Raju'
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="persons", limit_choices_to={'role': RoleChoices.CONTRACTOR})
    person_name = models.CharField(max_length=150, verbose_name="Worker / Delegate Name")
    phone = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    remark = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['person_name']
        verbose_name = "Contractor Person / Worker"
        verbose_name_plural = "Contractor Persons / Workers"

    def __str__(self):
        return f"{self.contractor.get_full_name() or self.contractor.username}'s Person: {self.person_name}"


class StorePurchaseOrder(models.Model):
    class StatusChoices(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ISSUED = 'issued', 'Issued to Supplier'
        RECEIVED = 'received', 'Material Received'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=100, unique=True, verbose_name="Store PO Number")
    supplier = models.ForeignKey('Supplier', on_delete=models.CASCADE, related_name="store_pos")
    order_date = models.DateField(default=timezone.now)
    expected_delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.DRAFT)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    remarks = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order_date', '-created_at']

    def __str__(self):
        return f"PO #{self.po_number} - {self.supplier.name}"


class StorePurchaseOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po = models.ForeignKey(StorePurchaseOrder, on_delete=models.CASCADE, related_name="items")
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name="po_items")
    ordered_qty = models.DecimalField(max_digits=12, decimal_places=3)
    unit = models.CharField(max_length=30, default="pcs")
    unit_rate = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.item.item_name} ({self.ordered_qty} {self.unit})"


class StoreMaterialIn(models.Model):
    """
    Store Receipt / Goods Received Note (GRN) / Inward Stock Entry
    Matching Excel Sheet 4: Material In
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voucher_no = models.CharField(max_length=100, unique=True, verbose_name="Inward Voucher No.")
    inward_date = models.DateField(default=timezone.now)
    month_year = models.CharField(max_length=30, blank=True, null=True, help_text="e.g. Jul-26")
    bill_no = models.CharField(max_length=100, verbose_name="Supplier Bill / Invoice #")
    supplier = models.ForeignKey('Supplier', on_delete=models.CASCADE, related_name="store_inwards")
    po = models.ForeignKey(StorePurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name="inward_receipts")
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name="inward_entries")
    qty = models.DecimalField(max_digits=12, decimal_places=3, verbose_name="Received Qty")
    unit = models.CharField(max_length=30, default="pcs", verbose_name="Unit")
    bill_rate = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Bill Rate (₹)")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Total Amount (₹)")
    production_unit = models.ForeignKey(ProductionUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name="store_inwards")
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    remark = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-inward_date', '-created_at']

    def save(self, *args, **kwargs):
        if hasattr(self.inward_date, 'date'):
            self.inward_date = self.inward_date.date()
        if not self.month_year and self.inward_date:
            self.month_year = self.inward_date.strftime('%b-%y')
        if not self.total_amount:
            self.total_amount = self.qty * self.bill_rate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Inward #{self.voucher_no} - {self.item.item_name} ({self.qty})"


class StoreDailyIssue(models.Model):
    """
    Outward store issue entry to contractors / supervisors / contractor workers.
    Matching Excel Sheet 2: Daily Issue Entry
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voucher_no = models.CharField(max_length=100, verbose_name="Voucher No.")
    issue_date = models.DateField(default=timezone.now)
    month_year = models.CharField(max_length=30, blank=True, null=True, help_text="e.g. Jul-26")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="store_issues", help_text="Target Contractor / Supervisor")
    contractor_person = models.ForeignKey(ContractorPerson, on_delete=models.SET_NULL, null=True, blank=True, related_name="issues")
    contractor_person_name = models.CharField(max_length=150, blank=True, null=True, help_text="Contractor's worker name e.g. Pappu - worker Raju")
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name="daily_issues")
    qty = models.DecimalField(max_digits=12, decimal_places=3, verbose_name="Issued Qty")
    unit = models.CharField(max_length=30, default="pcs", verbose_name="Unit")
    rate = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Issue Rate (₹)")
    status = models.CharField(
        max_length=20,
        choices=StoreItemStatus.choices,
        default=StoreItemStatus.CHARGE,
        verbose_name="Charge Status"
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Total Value (₹)")
    chargeable_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Chargeable Total (₹)")
    non_chargeable_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Non-Chargeable Total (₹)")
    production_unit = models.ForeignKey(ProductionUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name="store_issues", verbose_name="Unit # / Factory")
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="issued_store_items")
    remark = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-issue_date', '-created_at']

    def save(self, *args, **kwargs):
        if hasattr(self.issue_date, 'date'):
            self.issue_date = self.issue_date.date()
        if not self.month_year and self.issue_date:
            self.month_year = self.issue_date.strftime('%b-%y')
        self.total_amount = self.qty * self.rate
        if self.status == StoreItemStatus.CHARGE:
            self.chargeable_total = self.total_amount
            self.non_chargeable_total = Decimal('0.00')
        else:
            self.chargeable_total = Decimal('0.00')
            self.non_chargeable_total = self.total_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Issue #{self.voucher_no} - {self.contractor.username} - {self.item.item_name} ({self.qty})"


class StoreMaterialReturn(models.Model):
    """
    Material return entry from contractor back into store inventory.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voucher_no = models.CharField(max_length=100, unique=True, verbose_name="Return Voucher No.")
    return_date = models.DateField(default=timezone.now)
    month_year = models.CharField(max_length=30, blank=True, null=True, help_text="e.g. Jul-26")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="store_returns", help_text="Contractor / Supervisor returning material")
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name="return_entries")
    qty = models.DecimalField(max_digits=12, decimal_places=3, verbose_name="Returned Qty")
    unit = models.CharField(max_length=30, default="pcs", verbose_name="Unit")
    rate = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Return Rate (₹)")
    status = models.CharField(
        max_length=20,
        choices=StoreItemStatus.choices,
        default=StoreItemStatus.CHARGE,
        verbose_name="Charge Status"
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Total Value (₹)")
    chargeable_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Chargeable Total (₹)")
    non_chargeable_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Non-Chargeable Total (₹)")
    production_unit = models.ForeignKey(ProductionUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name="store_returns", verbose_name="Unit # / Factory")
    returned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="processed_store_returns")
    remark = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-return_date', '-created_at']

    def save(self, *args, **kwargs):
        if hasattr(self.return_date, 'date'):
            self.return_date = self.return_date.date()
        if not self.month_year and self.return_date:
            self.month_year = self.return_date.strftime('%b-%y')
        self.total_amount = self.qty * self.rate
        if self.status == StoreItemStatus.CHARGE:
            self.chargeable_total = self.total_amount
            self.non_chargeable_total = Decimal('0.00')
        else:
            self.chargeable_total = Decimal('0.00')
            self.non_chargeable_total = self.total_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Return #{self.voucher_no} - {self.contractor.username} - {self.item.item_name} ({self.qty})"


class StoreRequisitionStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Approval'
    APPROVED = 'approved', 'Approved'
    ISSUED = 'issued', 'Stock Issued'
    REJECTED = 'rejected', 'Rejected'


class StoreRequisition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requisition_no = models.CharField(max_length=100, unique=True, verbose_name="Requisition No.")
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="store_requisitions", help_text="Supervisor or Contractor requesting material")
    production_unit = models.ForeignKey(ProductionUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name="store_requisitions", verbose_name="Factory Unit")
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name="requisitions")
    requested_qty = models.DecimalField(max_digits=12, decimal_places=3, verbose_name="Requested Qty")
    unit = models.CharField(max_length=30, default="pcs", verbose_name="Unit")
    purpose = models.TextField(blank=True, null=True, verbose_name="Purpose / Production Batch Note")
    status = models.CharField(max_length=20, choices=StoreRequisitionStatus.choices, default=StoreRequisitionStatus.PENDING)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_store_requisitions")
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Store Material Requisition"
        verbose_name_plural = "Store Material Requisitions"

    def __str__(self):
        return f"MRN #{self.requisition_no} - {self.item.item_name} ({self.requested_qty} {self.unit})"


class StockAdjustmentType(models.TextChoices):
    EVAPORATION = 'evaporation', 'Liquid Evaporation'
    DAMAGE = 'damage', 'Material Damage'
    WASTAGE = 'wastage', 'Production Wastage'
    PHYSICAL_AUDIT = 'physical_audit', 'Physical Audit Adjustment'


class StockAdjustmentStatus(models.TextChoices):
    PENDING_ADMIN = 'pending_admin', 'Pending Admin Approval'
    APPROVED = 'approved', 'Approved & Stock Synced'
    REJECTED = 'rejected', 'Rejected'


class StoreStockAdjustment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    adjustment_no = models.CharField(max_length=100, unique=True, verbose_name="Adjustment No.")
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE, related_name="stock_adjustments")
    adjustment_type = models.CharField(max_length=30, choices=StockAdjustmentType.choices, default=StockAdjustmentType.PHYSICAL_AUDIT)
    quantity_delta = models.DecimalField(max_digits=12, decimal_places=3, verbose_name="Quantity Delta (Negative for Loss, Positive for Gain)")
    reason = models.TextField(verbose_name="Audit Note / Reason")
    status = models.CharField(max_length=20, choices=StockAdjustmentStatus.choices, default=StockAdjustmentStatus.PENDING_ADMIN)
    logged_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="logged_stock_adjustments")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_stock_adjustments")
    admin_remark = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Store Stock Adjustment"
        verbose_name_plural = "Store Stock Adjustments"

    def __str__(self):
        return f"Adjustment #{self.adjustment_no} - {self.item.item_name} ({self.quantity_delta})"



# ─── Global Enterprise Audit Trail Model ──────────────────────────────────────

class AuditAction(models.TextChoices):
    CREATE = 'CREATE', 'Created Record'
    UPDATE = 'UPDATE', 'Updated Record'
    DELETE = 'DELETE', 'Deleted Record'
    LOGIN = 'LOGIN', 'Logged In'
    LOGOUT = 'LOGOUT', 'Logged Out'
    EXPORT = 'EXPORT', 'Exported Excel/PDF'
    IMPORT = 'IMPORT', 'Imported Excel'
    DOWNLOAD = 'DOWNLOAD', 'Downloaded File'


class AuditLog(models.Model):
    """
    Unified Global Audit Log table tracking all system activities, data mutations,
    file downloads, excel exports, and authentication events across the ERP.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User Context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    username = models.CharField(max_length=150, default='system', verbose_name="User Name")
    user_role = models.CharField(max_length=50, default='system', verbose_name="User Role")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP Address")
    user_agent = models.TextField(blank=True, null=True, verbose_name="User Agent / Device")
    
    # Action Details
    action = models.CharField(max_length=30, choices=AuditAction.choices, default=AuditAction.UPDATE)
    module_name = models.CharField(max_length=100, db_index=True, verbose_name="ERP Module")
    model_name = models.CharField(max_length=100, db_index=True, verbose_name="Model Name")
    object_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="Record ID")
    object_repr = models.CharField(max_length=255, blank=True, null=True, verbose_name="Record Name / Summary")
    
    # Field Diffs & Payloads
    changes = models.JSONField(default=dict, blank=True, verbose_name="Field Diffs")
    file_info = models.JSONField(default=dict, blank=True, verbose_name="File Attachment Info")
    reason = models.TextField(blank=True, null=True, verbose_name="Audit Note / Reason")
    
    # Timestamp
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Global Audit Log"
        verbose_name_plural = "Global Audit Logs"
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['module_name', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.username} ({self.action}) on {self.module_name} - {self.object_repr}"








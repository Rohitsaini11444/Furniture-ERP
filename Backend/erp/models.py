from django.contrib.auth.models import AbstractUser
from django.db import models
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
    buyer_code = models.CharField(max_length=50)
    product_name = models.CharField(max_length=100)
    wood_type = models.CharField(max_length=50)
    finish_color = models.CharField(max_length=150)
    remark = models.TextField(blank=True, null=True)

    # Product size in centimetres (L × B × H)
    size_length = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Length (cm)')
    size_breadth = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Breadth (cm)')
    size_height = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Height (cm)')

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

    def __str__(self):
        return f"{self.name} ({self.code})"


class BuyerMaster(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='buyer_masters')
    sample = models.ForeignKey(Sample, on_delete=models.SET_NULL, null=True, blank=True, related_name='buyer_masters')
    style_no = models.CharField(max_length=100)
    buyer_code = models.CharField(max_length=50)
    product_name = models.CharField(max_length=100)
    wood_type = models.CharField(max_length=50)
    finish_color = models.CharField(max_length=150)
    size_length = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Length (cm)')
    size_breadth = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Breadth (cm)')
    size_height = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Size Height (cm)')
    remark = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.style_no} - {self.product_name} ({self.buyer.code})"


class PO(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='pos')
    buyer_master = models.ForeignKey(BuyerMaster, on_delete=models.CASCADE, related_name='pos')
    po = models.CharField(max_length=100, blank=True, null=True, verbose_name='PO')
    cbm = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True, verbose_name='CBM')
    price_usd = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Price (USD)')
    total_cbm = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True, verbose_name='Total CBM')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True, verbose_name='Total Amount')

    units = models.IntegerField(blank=True, null=True, verbose_name='Units')
    remark = models.TextField(blank=True, null=True, verbose_name='Remarks')

    # Box size in centimetres (L × B × H)
    box_length = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Box Length (cm)')
    box_breadth = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Box Breadth (cm)')
    box_height = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Box Height (cm)')

    net_weight = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Net Weight (kg)')
    gross_weight = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name='Gross Weight (kg)')

    def __str__(self):
        return f"PO: {self.po or 'N/A'} - {self.buyer.code}"


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


class SalesOrder(models.Model):
    sample = models.ForeignKey(Sample, on_delete=models.CASCADE, related_name='sales_orders')
    sales_order_no = models.CharField(max_length=50, unique=True)
    order_date = models.DateField()
    buyer_name = models.CharField(max_length=100)
    po_no = models.CharField(max_length=50)

    def __str__(self):
        return self.sales_order_no


class PurchaseIMO(models.Model):
    purchase_no = models.CharField(max_length=50, unique=True)
    purchase_date = models.DateField()
    supplier_name = models.CharField(max_length=100)
    material_name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    expected_delivery_date = models.DateField()
    warehouse = models.CharField(max_length=100)
    grn_status = models.CharField(max_length=50)
    invoice_number = models.CharField(max_length=50)
    remark = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.purchase_no


# ─── Sanding Workflow Models ──────────────────────────────────────────────────

class SandingBatchStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'


class SandingBatch(models.Model):
    """
    Supervisor self-assigns a sample into their Sanding batch.
    One supervisor can have many batches (one per sample).
    """
    supervisor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sanding_batches',
        limit_choices_to={'role': RoleChoices.SUPERVISOR, 'batch_category': BatchCategory.SANDING},
    )
    sample = models.ForeignKey(Sample, on_delete=models.CASCADE, related_name='sanding_batches')
    assigned_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=SandingBatchStatus.choices,
        default=SandingBatchStatus.PENDING,
    )

    class Meta:
        unique_together = ('supervisor', 'sample')
        ordering = ['-assigned_at']

    def __str__(self):
        return f"Sanding Batch: {self.sample} → {self.supervisor}"


class AssignmentStatus(models.TextChoices):
    ASSIGNED = 'assigned', 'Assigned'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'


class SandingAssignment(models.Model):
    """
    Supervisor assigns a batch item to a specific contractor under them.
    """
    batch = models.ForeignKey(SandingBatch, on_delete=models.CASCADE, related_name='assignments')
    contractor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sanding_assignments',
        limit_choices_to={'role': RoleChoices.CONTRACTOR},
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.ASSIGNED,
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    contractor_notes = models.TextField(blank=True, help_text="Notes added by contractor on completion")

    class Meta:
        ordering = ['-assigned_at']

    def __str__(self):
        return f"Assignment: {self.batch.sample} → {self.contractor}"


class QCResult(models.TextChoices):
    PASS = 'pass', 'Pass'
    REJECT = 'reject', 'Reject'


class SandingQC(models.Model):
    """
    Supervisor performs quality check on a completed sanding assignment.
    """
    assignment = models.OneToOneField(
        SandingAssignment,
        on_delete=models.CASCADE,
        related_name='qc',
    )
    checked_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sanding_qc_checks',
        limit_choices_to={'role': RoleChoices.SUPERVISOR},
    )
    result = models.CharField(max_length=10, choices=QCResult.choices)
    notes = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-checked_at']

    def __str__(self):
        return f"QC [{self.result}] — {self.assignment}"

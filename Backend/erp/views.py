from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import HttpResponse
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image as OpenpyxlImage
from PIL import Image as PILImage
import tempfile
import os

from django.conf import settings
from .models import (
    User, Sample, SampleImage, SalesOrder, PurchaseIMO,
    SandingBatch, SandingAssignment, SandingQC,
    Buyer, BuyerMaster, PO, PerformaInvoice, PerformaInvoiceItem,
    BuyerPI, BuyerPIItem,
)
from .serializers import (
    LoginSerializer, UserSerializer, UserMinimalSerializer,
    SampleSerializer, SampleImageSerializer, SalesOrderSerializer, PurchaseIMOSerializer,
    SandingBatchSerializer, SandingAssignmentSerializer, SandingQCSerializer,
    BuyerSerializer, BuyerMasterSerializer, POSerializer,
    PerformaInvoiceSerializer, PerformaInvoiceItemSerializer,
    BuyerPISerializer, BuyerPIItemSerializer,
)
from .permissions import (
    IsAdmin, IsSupervisor, IsContractor,
    IsAdminOrSupervisor, IsSandingSupervisor, IsAdminOrSandingSupervisor,
)


# ─── Auth Views ───────────────────────────────────────────────────────────────

class LoginView(APIView):
    """
    POST /api/auth/login/
    Returns JWT access + refresh tokens along with user profile.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name() or user.username,
                'email': user.email,
                'role': user.role,
                'batch_category': user.batch_category,
                'supervisor_id': user.supervisor_id,
                'profile_image': request.build_absolute_uri(user.profile_image.url) if user.profile_image else None,
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token (client should also discard access token).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass  # Token may already be expired
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


# ─── User Management (Admin Only) ─────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for managing all users.
    GET /api/users/?role=supervisor  — filter by role
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = User.objects.all().order_by('role', 'username')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        supervisor_id = self.request.query_params.get('supervisor')
        if supervisor_id:
            qs = qs.filter(supervisor_id=supervisor_id)
        return qs

    @action(detail=False, methods=['get'], url_path='supervisors')
    def supervisors(self, request):
        """GET /api/users/supervisors/ — list all supervisors (for contractor assignment dropdown)"""
        qs = User.objects.filter(role='supervisor', is_active=True)
        return Response(UserMinimalSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='contractors')
    def contractors(self, request, pk=None):
        """GET /api/users/<id>/contractors/ — list contractors under a supervisor"""
        user = self.get_object()
        contractors = User.objects.filter(supervisor=user, role='contractor', is_active=True)
        return Response(UserMinimalSerializer(contractors, many=True).data)


class CurrentUserView(APIView):
    """GET /api/auth/me/ — returns logged-in user profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── ERP Core ViewSets ────────────────────────────────────────────────────────

class SampleViewSet(viewsets.ModelViewSet):
    """
    Samples — accessible to all authenticated users.
    Admins & Supervisors can create/edit; Contractors read-only.
    """
    serializer_class = SampleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Sample.objects.select_related('buyer').prefetch_related('images').all()
        buyer = self.request.query_params.get('buyer')
        material = self.request.query_params.get('material')
        if buyer:
            qs = qs.filter(buyer_id=buyer)
        if material:
            qs = qs.filter(material__icontains=material)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]


class SampleImageViewSet(viewsets.ModelViewSet):
    """
    Manage images for a sample.
    POST /api/sample-images/  — upload an image (pass `sample` id in body)
    DELETE /api/sample-images/<id>/  — delete a specific image
    """
    serializer_class = SampleImageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = SampleImage.objects.select_related('sample')
        sample_id = self.request.query_params.get('sample')
        if sample_id:
            qs = qs.filter(sample_id=sample_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class BuyerViewSet(viewsets.ModelViewSet):
    serializer_class = BuyerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Buyer.objects.filter(is_deleted=False).order_by('name')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        note = request.query_params.get('note', '')
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deletion_note = note
        instance.deleted_by = request.user
        instance.save()
        return Response({"detail": "Buyer soft-deleted and logged successfully."}, status=status.HTTP_200_OK)


class BuyerMasterViewSet(viewsets.ModelViewSet):
    queryset = BuyerMaster.objects.select_related('buyer', 'sample').all()
    serializer_class = BuyerMasterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        buyer_id = self.request.query_params.get('buyer')
        if buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        buyer_id = request.query_params.get('buyer')
        if not buyer_id:
            return HttpResponse("Buyer ID is required", status=400)
        
        try:
            buyer = Buyer.objects.get(id=buyer_id)
        except Buyer.DoesNotExist:
            return HttpResponse("Buyer not found", status=404)
        
        masters = self.get_queryset().filter(buyer=buyer)
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"{buyer.code}_Buyer_Master"
        
        ws.views.sheetView[0].showGridLines = True
        
        headers = [
            'S. No.', 'Buyer Name', 'Buyer Code', 'Style No', 'Sample ID', 'Picture', 'Product Name', 
            'Wood Type', 'Finish Color', 'Size Length (cm)', 
            'Size Breadth (cm)', 'Size Height (cm)', 'Remark'
        ]
        
        ws.append(headers)
        
        header_fill = PatternFill(start_color="00B050", end_color="00B050", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="000000")
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        
        border_medium = Side(style='medium', color='000000')
        header_border = Border(left=border_medium, right=border_medium, top=border_medium, bottom=border_medium)
        
        data_border = Border(
            left=Side(style='thin', color='000000'),
            right=Side(style='thin', color='000000'),
            top=Side(style='thin', color='000000'),
            bottom=Side(style='thin', color='000000')
        )
        
        data_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        
        ws.row_dimensions[1].height = 28
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_align
            cell.border = header_border
            
        temp_files = []
        
        for idx, bm in enumerate(masters, 1):
            row_idx = idx + 1
            ws.row_dimensions[row_idx].height = 80
            
            sample_id_val = ""
            sample_image_path = ""
            if bm.sample:
                sample_id_val = bm.sample.sample_id
                first_img = bm.sample.images.first()
                if first_img and first_img.image and os.path.exists(first_img.image.path):
                    sample_image_path = first_img.image.path
            
            row_data = [
                idx,
                buyer.name,
                buyer.code,
                bm.style_no or "",
                sample_id_val,
                "", # Picture cell
                bm.product_name or "",
                bm.wood_type or "",
                bm.finish_color or "",
                float(bm.size_length) if bm.size_length else "",
                float(bm.size_breadth) if bm.size_breadth else "",
                float(bm.size_height) if bm.size_height else "",
                bm.remark or ""
            ]
            
            for col_idx, val in enumerate(row_data, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.alignment = data_align
                cell.border = data_border
                
            if sample_image_path:
                try:
                    pil_img = PILImage.open(sample_image_path)
                    if pil_img.mode in ('RGBA', 'LA', 'P'):
                        pil_img = pil_img.convert('RGB')
                    pil_img.thumbnail((100, 100))
                    
                    tmp_f = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                    pil_img.save(tmp_f.name, format='JPEG', quality=85)
                    tmp_f.close()
                    temp_files.append(tmp_f.name)
                    
                    xl_img = OpenpyxlImage(tmp_f.name)
                    ws.add_image(xl_img, f"F{row_idx}")
                except Exception as e:
                    print(f"Error drawing image: {e}")
                    
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            if col_letter == 'F':
                ws.column_dimensions[col_letter].width = 16
                continue
            for cell in col:
                val_str = str(cell.value or '')
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 10)
            
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{buyer.code}_Buyer_Master.xlsx"'
        wb.save(response)
        
        for f in temp_files:
            try:
                os.remove(f)
            except:
                pass
                
        return response


class POViewSet(viewsets.ModelViewSet):
    queryset = PO.objects.select_related('buyer', 'buyer_master').all()
    serializer_class = POSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        buyer_id = self.request.query_params.get('buyer')
        if buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        buyer_id = request.query_params.get('buyer')
        if not buyer_id:
            return HttpResponse("Buyer ID is required", status=400)
        
        try:
            buyer = Buyer.objects.get(id=buyer_id)
        except Buyer.DoesNotExist:
            return HttpResponse("Buyer not found", status=404)
        
        pos_list = self.get_queryset().filter(buyer=buyer)
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"{buyer.code}_POs"
        
        ws.views.sheetView[0].showGridLines = True
        
        headers = [
            'S. No.', 'PO #', 'Buyer #', 'Style No.', 'Picture', 'Name', 
            'Size Length (cm)', 'Size Breadth (cm)', 'Size Height (cm)', 
            'Material', 'Finish', 'CBM', 'Price USD', 'Units', 'Total CBM', 'Total Amount', 
            'Remarks', 'Box CBM', 'Box Length (cm)', 'Box Breadth (cm)', 'Box Height (cm)', 
            'Net Weight (kg)', 'Gross Weight (kg)'
        ]
        
        ws.append(headers)
        
        header_fill = PatternFill(start_color="00B050", end_color="00B050", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="000000")
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        
        border_medium = Side(style='medium', color='000000')
        header_border = Border(left=border_medium, right=border_medium, top=border_medium, bottom=border_medium)
        
        data_border = Border(
            left=Side(style='thin', color='000000'),
            right=Side(style='thin', color='000000'),
            top=Side(style='thin', color='000000'),
            bottom=Side(style='thin', color='000000')
        )
        
        data_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        
        ws.row_dimensions[1].height = 28
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_align
            cell.border = header_border
            
        temp_files = []
        
        for idx, po_item in enumerate(pos_list, 1):
            row_idx = idx + 1
            ws.row_dimensions[row_idx].height = 80
            
            bm = po_item.buyer_master
            sample_image_path = ""
            if bm and bm.sample:
                first_img = bm.sample.images.first()
                if first_img and first_img.image and os.path.exists(first_img.image.path):
                    sample_image_path = first_img.image.path
            
            box_cbm_val = ""
            if po_item.box_length and po_item.box_breadth and po_item.box_height:
                try:
                    fl = float(po_item.box_length)
                    fb = float(po_item.box_breadth)
                    fh = float(po_item.box_height)
                    box_cbm_val = round((fl * fb * fh) / 1000000, 6)
                except:
                    pass
            
            row_data = [
                idx,
                po_item.po or "",
                buyer.code,
                bm.style_no if bm else "",
                "", # Picture column
                bm.product_name if bm else "",
                float(bm.size_length) if bm and bm.size_length else "",
                float(bm.size_breadth) if bm and bm.size_breadth else "",
                float(bm.size_height) if bm and bm.size_height else "",
                bm.wood_type if bm else "",
                bm.finish_color if bm else "",
                float(po_item.cbm) if po_item.cbm else "",
                float(po_item.price_usd) if po_item.price_usd else "",
                po_item.units if po_item.units else "",
                float(po_item.total_cbm) if po_item.total_cbm else "",
                float(po_item.total_amount) if po_item.total_amount else "",
                po_item.remark or "",
                box_cbm_val,
                float(po_item.box_length) if po_item.box_length else "",
                float(po_item.box_breadth) if po_item.box_breadth else "",
                float(po_item.box_height) if po_item.box_height else "",
                float(po_item.net_weight) if po_item.net_weight else "",
                float(po_item.gross_weight) if po_item.gross_weight else ""
            ]
            
            for col_idx, val in enumerate(row_data, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.alignment = data_align
                cell.border = data_border
                
            if sample_image_path:
                try:
                    pil_img = PILImage.open(sample_image_path)
                    if pil_img.mode in ('RGBA', 'LA', 'P'):
                        pil_img = pil_img.convert('RGB')
                    pil_img.thumbnail((100, 100))
                    
                    tmp_f = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                    pil_img.save(tmp_f.name, format='JPEG', quality=85)
                    tmp_f.close()
                    temp_files.append(tmp_f.name)
                    
                    xl_img = OpenpyxlImage(tmp_f.name)
                    ws.add_image(xl_img, f"E{row_idx}")
                except Exception as e:
                    print(f"Error drawing image in PO: {e}")
                    
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            if col_letter == 'E':
                ws.column_dimensions[col_letter].width = 16
                continue
            for cell in col:
                val_str = str(cell.value or '')
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 10)
            
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{buyer.code}_POs.xlsx"'
        wb.save(response)
        
        for f in temp_files:
            try:
                os.remove(f)
            except:
                pass
                
        return response
class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]


class PurchaseIMOViewSet(viewsets.ModelViewSet):
    queryset = PurchaseIMO.objects.all()
    serializer_class = PurchaseIMOSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]


# ─── Sanding Workflow ViewSets ────────────────────────────────────────────────

class SandingBatchViewSet(viewsets.ModelViewSet):
    """
    Supervisor self-assigns samples into their Sanding batch.
    - POST: Supervisor adds a sample to their batch (supervisor auto-set)
    - GET: Supervisor sees only their own batches; Admin sees all
    """
    serializer_class = SandingBatchSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSandingSupervisor]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return SandingBatch.objects.all().select_related('supervisor', 'sample')
        # Supervisor sees only their own batches
        return SandingBatch.objects.filter(supervisor=user).select_related('supervisor', 'sample')

    def perform_create(self, serializer):
        serializer.save(supervisor=self.request.user)


class SandingAssignmentViewSet(viewsets.ModelViewSet):
    """
    Supervisor assigns batch items to contractors.
    - Supervisor: create/manage assignments for their batches
    - Contractor: read-only, sees only their own assignments; can mark as completed
    - Admin: full access
    """
    serializer_class = SandingAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        user = self.request.user if self.request.user.is_authenticated else None
        if self.action == 'complete':
            return [IsAuthenticated(), IsContractor()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSandingSupervisor()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return SandingAssignment.objects.all().select_related(
                'batch__supervisor', 'batch__sample', 'contractor'
            )
        if user.role == 'supervisor':
            return SandingAssignment.objects.filter(
                batch__supervisor=user
            ).select_related('batch__supervisor', 'batch__sample', 'contractor')
        # Contractor sees only their own assignments
        return SandingAssignment.objects.filter(
            contractor=user
        ).select_related('batch__supervisor', 'batch__sample', 'contractor')

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsContractor])
    def complete(self, request, pk=None):
        """POST /api/sanding/assignments/<id>/complete/ — Contractor marks work done."""
        assignment = self.get_object()
        if assignment.contractor != request.user:
            return Response(
                {'detail': 'You can only complete your own assignments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if assignment.status == 'completed':
            return Response({'detail': 'Assignment is already completed.'}, status=status.HTTP_400_BAD_REQUEST)

        assignment.status = 'completed'
        assignment.completed_at = timezone.now()
        assignment.contractor_notes = request.data.get('contractor_notes', '')
        assignment.save()

        # Also update parent batch status if all assignments are completed
        batch = assignment.batch
        if not batch.assignments.exclude(status='completed').exists():
            batch.status = 'completed'
            batch.save()

        serializer = self.get_serializer(assignment)
        return Response(serializer.data)


class SandingQCViewSet(viewsets.ModelViewSet):
    """
    Supervisor performs quality check (Pass/Reject) on completed assignments.
    - POST: Supervisor creates a QC record for a completed assignment
    - GET: Supervisor sees QC records for their batches; Admin sees all
    """
    serializer_class = SandingQCSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSandingSupervisor]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return SandingQC.objects.all().select_related(
                'assignment__batch__supervisor',
                'assignment__batch__sample',
                'assignment__contractor',
                'checked_by',
            )
        return SandingQC.objects.filter(
            assignment__batch__supervisor=user
        ).select_related(
            'assignment__batch__supervisor',
            'assignment__batch__sample',
            'assignment__contractor',
            'checked_by',
        )

    def perform_create(self, serializer):
        serializer.save(checked_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='pending')
    def pending(self, request):
        """GET /api/sanding/qc/pending/ — Completed assignments not yet QC'd."""
        user = request.user
        if user.role == 'admin':
            assignments = SandingAssignment.objects.filter(
                status='completed'
            ).exclude(qc__isnull=False).select_related('batch__sample', 'contractor')
        else:
            assignments = SandingAssignment.objects.filter(
                batch__supervisor=user, status='completed'
            ).exclude(qc__isnull=False).select_related('batch__sample', 'contractor')

        serializer = SandingAssignmentSerializer(assignments, many=True, context={'request': request})
        return Response(serializer.data)


# ─── Number To Words Helper ───────────────────────────────────────────────────

def num2words(num):
    if num is None:
        return ""
    try:
        val = float(num)
    except (ValueError, TypeError):
        return str(num)

    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _convert_below_thousand(n):
        if n == 0:
            return ""
        elif n < 20:
            return units[n]
        elif n < 100:
            return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")
        else:
            return units[n // 100] + " Hundred" + (" " + _convert_below_thousand(n % 100) if n % 100 != 0 else "")

    int_part = int(val)
    cents = int(round((val - int_part) * 100))

    if int_part == 0:
        words = "Zero"
    else:
        parts = []
        if int_part >= 1000000:
            millions = int_part // 1000000
            parts.append(_convert_below_thousand(millions) + " Million")
            int_part %= 1000000
        if int_part >= 1000:
            thousands = int_part // 1000
            parts.append(_convert_below_thousand(thousands) + " Thousand")
            int_part %= 1000
        if int_part > 0:
            parts.append(_convert_below_thousand(int_part))
        words = " ".join(parts)

    res = f"In Words : {words}"
    if cents > 0:
        res += f" and Cents {_convert_below_thousand(cents)}"
    res += " Only."
    return res


# ─── Performa Invoice ViewSet ──────────────────────────────────────────────────

class PerformaInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PerformaInvoice.objects.select_related('buyer').prefetch_related('items', 'items__po', 'items__po__buyer_master', 'items__po__buyer_master__sample').all()
    serializer_class = PerformaInvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        buyer_id = self.request.query_params.get('buyer')
        if buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='export-excel')
    def export_excel(self, request, pk=None):
        pi = self.get_object()
        buyer = pi.buyer

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"PI_{pi.pi_no}"
        ws.views.sheetView[0].showGridLines = True

        # Typography
        font_main = Font(name='Times New Roman', size=9)
        font_bold = Font(name='Times New Roman', size=9, bold=True)
        font_title = Font(name='Times New Roman', size=10, bold=True)
        font_sub = Font(name='Times New Roman', size=8)

        border_thin = Side(style='thin', color='000000')
        box_border = Border(left=border_thin, right=border_thin, top=border_thin, bottom=border_thin)

        align_left_top = Alignment(horizontal='left', vertical='top', wrap_text=True)
        align_left_center = Alignment(horizontal='left', vertical='center', wrap_text=True)
        align_center_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
        align_right_center = Alignment(horizontal='right', vertical='center')

        # 1. Exact Column Widths
        col_widths = {
            'A': 13, # Style No.
            'B': 18, # Image
            'C': 22, # Description 1
            'D': 22, # Description 2
            'E': 6,  # W / Spacer
            'F': 6,  # D
            'G': 6,  # H
            'H': 10, # Volume Per Pc
            'I': 6,  # Qty.
            'J': 10, # Total Volume
            'K': 11, # Rate US$
            'L': 15, # Amount US$
        }
        for col, width in col_widths.items():
            ws.column_dimensions[col].width = width

        # Helper to style a range of cells with values, font, alignment
        def style_range(start_r, start_c, end_r, end_c, value=None, font=font_main, alignment=align_left_center):
            if start_r != end_r or start_c != end_c:
                ws.merge_cells(start_row=start_r, start_column=start_c, end_row=end_r, end_column=end_c)
            top_left = ws.cell(row=start_r, column=start_c)
            if value is not None:
                top_left.value = value
            for r in range(start_r, end_r + 1):
                for c in range(start_c, end_c + 1):
                    cell = ws.cell(row=r, column=c)
                    if font: cell.font = font
                    if alignment: cell.alignment = alignment

        # Helper to apply full cell border to every cell in range
        def style_full_box(start_r, start_c, end_r, end_c, value=None, font=font_main, alignment=align_left_center):
            style_range(start_r, start_c, end_r, end_c, value=value, font=font, alignment=alignment)
            for r in range(start_r, end_r + 1):
                for c in range(start_c, end_c + 1):
                    ws.cell(row=r, column=c).border = box_border

        # Helper to apply outer box border only
        def apply_outer_border(start_r, start_c, end_r, end_c):
            for r in range(start_r, end_r + 1):
                for c in range(start_c, end_c + 1):
                    cell = ws.cell(row=r, column=c)
                    current_b = cell.border
                    cell.border = Border(
                        left=border_thin if c == start_c else current_b.left,
                        right=border_thin if c == end_c else current_b.right,
                        top=border_thin if r == start_r else current_b.top,
                        bottom=border_thin if r == end_r else current_b.bottom
                    )

        # Helper for explicit internal horizontal divider
        def add_horizontal_divider(row_idx, start_c, end_c):
            for c in range(start_c, end_c + 1):
                cell = ws.cell(row=row_idx, column=c)
                current_b = cell.border
                cell.border = Border(
                    left=current_b.left,
                    right=current_b.right,
                    top=current_b.top,
                    bottom=border_thin
                )

        # ─── 1. EXPORTER BOX (A1:D6) ──────────────────────────────────────────
        for r in range(1, 7):
            ws.row_dimensions[r].height = 18

        style_range(1, 1, 1, 4, "Exporter:", font=font_bold)
        style_range(2, 1, 2, 4, "Pinkcity Enterprises Pvt. Ltd.", font=font_title)
        style_range(3, 1, 3, 4, "G 21, EPIP, Sitapura Industrial Area, Jaipur")
        style_range(4, 1, 4, 4, "TEL: -91-141-2770033, Tel:-91-141-2771144")
        style_range(5, 1, 5, 4, "Fax:-91-141-2771754")
        style_range(6, 1, 6, 4, "")
        apply_outer_border(1, 1, 6, 4)

        # ─── 2. INVOICE & BUYER REF BOX (Cols F to L, Rows 1 to 12) ───────────
        pi_date_str = pi.pi_date.strftime('%d %b, %Y') if pi.pi_date else ''
        order_date_str = pi.buyer_order_date.strftime('%d %b, %Y') if pi.buyer_order_date else ''

        style_range(1, 6, 1, 10, "Invoice No. & Date", font=font_bold)
        style_range(2, 6, 2, 10, f"{pi.pi_no} Dt. {pi_date_str}" if pi_date_str else (pi.pi_no or ''), font=font_bold)
        add_horizontal_divider(1, 6, 10)
        apply_outer_border(1, 6, 2, 10)

        style_range(1, 11, 1, 12, "Exporter's Ref.", font=font_bold)
        style_range(2, 11, 5, 12, pi.exporter_ref or '')
        add_horizontal_divider(1, 11, 12)
        apply_outer_border(1, 11, 5, 12)

        style_range(3, 6, 3, 10, "Buyer's Order No. & Date", font=font_bold)
        style_range(4, 6, 4, 10, f"{pi.buyer_order_no or ''} Dt. {order_date_str}" if order_date_str else (pi.buyer_order_no or ''), font=font_bold)
        add_horizontal_divider(3, 6, 10)
        apply_outer_border(3, 6, 4, 10)

        style_range(5, 6, 5, 10, "Other Reference(s)", font=font_bold)
        apply_outer_border(5, 6, 5, 10)

        style_range(6, 6, 6, 12, f"Buyer: {pi.buyer_name or buyer.name}", font=font_bold)
        apply_outer_border(6, 6, 6, 12)

        style_range(7, 6, 7, 12, "Buyer (if other than consignee)", font=font_bold)
        style_range(8, 6, 8, 12, f"Department # {pi.department_no or '69'}", font=font_bold)
        style_range(9, 6, 12, 12, "")
        add_horizontal_divider(7, 6, 12)
        add_horizontal_divider(8, 6, 12)
        apply_outer_border(7, 6, 12, 12)

        # ─── 3. CONSIGNEE BOX (A7:D12) ────────────────────────────────────────
        for r in range(7, 13):
            ws.row_dimensions[r].height = 18

        address_lines = (buyer.address or '').split('\n')
        line1 = address_lines[0] if len(address_lines) > 0 else ''
        line2 = address_lines[1] if len(address_lines) > 1 else ''

        style_range(7, 1, 7, 4, "Consignee:", font=font_bold)
        style_range(8, 1, 8, 4, buyer.name, font=font_title)
        style_range(9, 1, 9, 4, line1)
        style_range(10, 1, 10, 4, line2)
        style_range(11, 1, 11, 4, f"Tel: {buyer.phone}" if buyer.phone else "")
        style_range(12, 1, 12, 4, "VAT No. GB662563524, Reg No. 03094828")
        apply_outer_border(7, 1, 12, 4)

        # ─── 4. CARRIAGE & SHIPPING DETAILS (Rows 13 to 18) ───────────────────
        for r in range(13, 19):
            ws.row_dimensions[r].height = 18

        style_range(13, 1, 13, 1, "Pre Carriage by", font=font_bold)
        style_range(14, 1, 14, 1, pi.pre_carriage_by or 'Trailer')
        add_horizontal_divider(13, 1, 1)
        apply_outer_border(13, 1, 14, 1)

        style_range(13, 2, 13, 4, "Place of Receipt by Pre-carrier", font=font_bold)
        style_range(14, 2, 14, 4, pi.place_of_receipt or 'Jaipur')
        add_horizontal_divider(13, 2, 4)
        apply_outer_border(13, 2, 14, 4)

        style_range(13, 6, 13, 10, "Country of Origin of Goods", font=font_bold)
        style_range(14, 6, 14, 10, pi.country_of_origin or 'INDIA', font=font_bold)
        add_horizontal_divider(13, 6, 10)
        apply_outer_border(13, 6, 14, 10)

        style_range(13, 11, 13, 12, "Country of Final Destination", font=font_bold)
        style_range(14, 11, 14, 12, pi.country_final_destination or 'UK', font=font_bold)
        add_horizontal_divider(13, 11, 12)
        apply_outer_border(13, 11, 14, 12)

        style_range(15, 1, 15, 1, "Vessel/Flight No.", font=font_bold)
        style_range(16, 1, 16, 1, pi.vessel_flight_no or 'By Sea')
        add_horizontal_divider(15, 1, 1)
        apply_outer_border(15, 1, 16, 1)

        style_range(15, 2, 15, 4, "Port of Loading", font=font_bold)
        style_range(16, 2, 16, 4, pi.port_of_loading or 'Mundra')
        add_horizontal_divider(15, 2, 4)
        apply_outer_border(15, 2, 16, 4)

        style_range(15, 6, 15, 12, "Terms of Delivery and Payment", font=font_bold)
        style_range(16, 6, 16, 12, pi.terms_payment or 'Payment: T/T', font=font_bold)
        add_horizontal_divider(15, 6, 12)
        apply_outer_border(15, 6, 16, 12)

        style_range(17, 1, 17, 1, "Port of Discharge", font=font_bold)
        style_range(18, 1, 18, 1, pi.port_of_discharge or '')
        add_horizontal_divider(17, 1, 1)
        apply_outer_border(17, 1, 18, 1)

        style_range(17, 2, 17, 4, "Place of Delivery", font=font_bold)
        style_range(18, 2, 18, 4, pi.place_of_delivery or 'UNITED KINGDOM')
        add_horizontal_divider(17, 2, 4)
        apply_outer_border(17, 2, 18, 4)

        style_range(17, 6, 17, 12, pi.terms_delivery or '', font=font_bold)
        style_range(18, 6, 18, 12, "")
        add_horizontal_divider(17, 6, 12)
        apply_outer_border(17, 6, 18, 12)

        # ─── 5. TABLE HEADERS (Rows 19 & 20) ─────────────────────────────────
        ws.row_dimensions[19].height = 20
        ws.row_dimensions[20].height = 18

        style_full_box(19, 1, 20, 1, "Style No.", font=font_bold, alignment=align_center_center)
        style_full_box(19, 2, 20, 2, "Image", font=font_bold, alignment=align_center_center)
        style_full_box(19, 3, 20, 4, "Description of Goods", font=font_bold, alignment=align_center_center)

        style_full_box(19, 5, 19, 7, "Dimension (CM)", font=font_bold, alignment=align_center_center)
        style_full_box(20, 5, 20, 5, "W", font=font_bold, alignment=align_center_center)
        style_full_box(20, 6, 20, 6, "D", font=font_bold, alignment=align_center_center)
        style_full_box(20, 7, 20, 7, "H", font=font_bold, alignment=align_center_center)

        style_full_box(19, 8, 20, 8, "Volume\nPer Pc", font=font_bold, alignment=align_center_center)
        style_full_box(19, 9, 20, 9, "Qty.", font=font_bold, alignment=align_center_center)
        style_full_box(19, 10, 20, 10, "Total\nVolume", font=font_bold, alignment=align_center_center)
        style_full_box(19, 11, 20, 11, "Rate\nUS$", font=font_bold, alignment=align_center_center)
        style_full_box(19, 12, 20, 12, "Amount\nUS$", font=font_bold, alignment=align_center_center)

        # ─── 6. CATEGORY HEADER (Row 21) ──────────────────────────────────────
        ws.row_dimensions[21].height = 22
        cat_font = Font(name='Times New Roman', size=10, bold=True, underline='single')
        style_full_box(21, 1, 21, 12, pi.category_header or "Wooden Furniture Items", font=cat_font, alignment=align_center_center)

        # ─── 7. LINE ITEMS (Row 22 onwards) ──────────────────────────────────
        curr_row = 22
        tot_qty = 0
        tot_vol = 0.0
        tot_amt = 0.0
        temp_files = []

        items = list(pi.items.all())
        for item in items:
            ws.row_dimensions[curr_row].height = 75

            # Style No
            style_full_box(curr_row, 1, curr_row, 1, item.style_no, alignment=align_center_center)
            
            # Image Cell (Col B)
            style_full_box(curr_row, 2, curr_row, 2, "", alignment=align_center_center)

            # Description (C & D merged)
            style_full_box(curr_row, 3, curr_row, 4, item.description or '', alignment=align_center_center)

            # Dimensions
            style_full_box(curr_row, 5, curr_row, 5, float(item.dimension_w) if item.dimension_w else "", alignment=align_center_center)
            style_full_box(curr_row, 6, curr_row, 6, float(item.dimension_d) if item.dimension_d else "", alignment=align_center_center)
            style_full_box(curr_row, 7, curr_row, 7, float(item.dimension_h) if item.dimension_h else "", alignment=align_center_center)

            # Vol Per Pc
            vol_pc = float(item.volume_per_pc) if item.volume_per_pc else 0.0
            style_full_box(curr_row, 8, curr_row, 8, vol_pc, alignment=align_center_center)
            ws.cell(row=curr_row, column=8).number_format = '0.00'

            # Qty
            q = item.qty or 0
            tot_qty += q
            style_full_box(curr_row, 9, curr_row, 9, q, font=font_bold, alignment=align_center_center)

            # Total Volume
            v_tot = float(item.total_volume) if item.total_volume else (q * vol_pc)
            tot_vol += v_tot
            style_full_box(curr_row, 10, curr_row, 10, v_tot, alignment=align_right_center)
            ws.cell(row=curr_row, column=10).number_format = '0.00'

            # Rate US$
            r_usd = float(item.rate_usd) if item.rate_usd else 0.0
            style_full_box(curr_row, 11, curr_row, 11, r_usd, alignment=align_right_center)
            ws.cell(row=curr_row, column=11).number_format = '"$"#,##0.00'

            # Amount US$
            amt = float(item.amount_usd) if item.amount_usd else (q * r_usd)
            tot_amt += amt
            style_full_box(curr_row, 12, curr_row, 12, amt, alignment=align_right_center)
            ws.cell(row=curr_row, column=12).number_format = '"$"#,##0.00'

            # Embed Product Image in Cell B
            image_path = None
            if item.po and item.po.buyer_master and item.po.buyer_master.sample:
                sample_imgs = item.po.buyer_master.sample.images.all()
                if sample_imgs.exists():
                    image_path = sample_imgs.first().image.path

            if not image_path and item.image_url:
                rel_path = item.image_url.lstrip('/')
                abs_path = os.path.join(settings.MEDIA_ROOT, rel_path.replace('media/', ''))
                if os.path.exists(abs_path):
                    image_path = abs_path

            if image_path and os.path.exists(image_path):
                try:
                    pil_img = PILImage.open(image_path)
                    if pil_img.mode in ('RGBA', 'LA', 'P'):
                        pil_img = pil_img.convert('RGB')
                    pil_img.thumbnail((90, 60))

                    tmp_f = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                    pil_img.save(tmp_f.name, format='JPEG', quality=85)
                    tmp_f.close()
                    temp_files.append(tmp_f.name)

                    xl_img = OpenpyxlImage(tmp_f.name)
                    ws.add_image(xl_img, f"B{curr_row}")
                except Exception as e:
                    print(f"Error drawing image: {e}")

            curr_row += 1

        # ─── 8. AMOUNT CHARGEABLE SUMMARY ROW ────────────────────────────────
        ws.row_dimensions[curr_row].height = 22
        style_full_box(curr_row, 1, curr_row, 8, "Amount Chargeable", font=font_bold, alignment=align_left_center)
        style_full_box(curr_row, 9, curr_row, 9, tot_qty, font=font_bold, alignment=align_center_center)
        style_full_box(curr_row, 10, curr_row, 10, tot_vol, font=font_bold, alignment=align_right_center)
        ws.cell(row=curr_row, column=10).number_format = '0.00'

        style_full_box(curr_row, 11, curr_row, 11, "$", font=font_bold, alignment=align_right_center)

        style_full_box(curr_row, 12, curr_row, 12, tot_amt, font=font_bold, alignment=align_right_center)
        ws.cell(row=curr_row, column=12).number_format = '"$"#,##0.00'

        curr_row += 1

        # ─── 9. IN WORDS ROW ─────────────────────────────────────────────────
        ws.row_dimensions[curr_row].height = 20
        words_str = num2words(tot_amt)
        style_full_box(curr_row, 1, curr_row, 12, words_str, font=font_bold, alignment=align_left_center)

        curr_row += 1

        # ─── 10. DECLARATION SECTION ─────────────────────────────────────────
        ws.row_dimensions[curr_row].height = 18
        style_range(curr_row, 1, curr_row, 12, "Declaration:", font=font_bold, alignment=align_left_center)
        curr_row += 1

        ws.row_dimensions[curr_row].height = 55
        style_range(curr_row, 1, curr_row+2, 12, pi.declaration_text or '', font=font_sub, alignment=align_left_top)

        curr_row += 4

        # ─── 11. SIGNATURE & DATE ────────────────────────────────────────────
        ws.row_dimensions[curr_row].height = 30
        style_range(curr_row, 9, curr_row, 12, "Signature & Date", font=font_bold, alignment=align_right_center)

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="PI_{pi.pi_no}.xlsx"'
        wb.save(response)

        for f in temp_files:
            try: os.remove(f)
            except: pass

        return response


# ─── Buyer Performa Invoice ViewSet (Pre-PO PI) ──────────────────────────────

class BuyerPIViewSet(viewsets.ModelViewSet):
    queryset = BuyerPI.objects.prefetch_related('items', 'items__buyer_master', 'items__buyer_master__sample').select_related('buyer').all()
    serializer_class = BuyerPISerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        buyer_id = self.request.query_params.get('buyer')
        if buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='export-excel')
    def export_excel(self, request, pk=None):
        pi = self.get_object()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"PI_{pi.pi_no}"
        ws.views.sheetView[0].showGridLines = True

        thin_side = Side(style='thin', color='000000')
        border_all = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

        font_bold_lg = Font(name='Calibri', size=14, bold=True)
        font_bold_md = Font(name='Calibri', size=11, bold=True)
        font_bold_sm = Font(name='Calibri', size=9, bold=True)
        font_regular = Font(name='Calibri', size=9)
        fill_gray = PatternFill(start_color='D9D9D9', end_color='D9D9D9', fill_type='solid')

        align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
        align_left = Alignment(horizontal='left', vertical='center', wrap_text=True)
        align_right = Alignment(horizontal='right', vertical='center', wrap_text=True)

        def style_box(row_start, col_start, row_end, col_end, text="", font=font_regular, alignment=align_center, fill=None):
            if row_start != row_end or col_start != col_end:
                ws.merge_cells(start_row=row_start, start_column=col_start, end_row=row_end, end_column=col_end)
            
            top_left = ws.cell(row=row_start, column=col_start)
            top_left.value = text
            top_left.font = font
            top_left.alignment = alignment
            
            for r in range(row_start, row_end + 1):
                for c in range(col_start, col_end + 1):
                    cell = ws.cell(row=r, column=c)
                    cell.border = border_all
                    if fill:
                        cell.fill = fill

        ws.row_dimensions[1].height = 65

        # Block 1: Pinkcity Enterprises Header (A1:E1)
        company_text = (
            "Pinkcity Enterprises\n"
            "G 78 EPIP, Sitapura Industrial Area,\n"
            "Jaipur 302022 -\n"
            "Phone: +91 141 277 1144"
        )
        style_box(1, 1, 1, 5, company_text, font=font_bold_md, alignment=align_center)

        # Block 2: Buyer Address (F1:J1)
        buyer_name = pi.buyer.name if pi.buyer else "BUYER"
        buyer_addr = pi.buyer.address if (pi.buyer and pi.buyer.address) else ""
        buyer_text = f"{buyer_name.upper()}\n{buyer_addr}"
        style_box(1, 6, 1, 10, buyer_text, font=font_bold_md, alignment=align_left, fill=fill_gray)

        # Block 3: Delivered To (K1:O1)
        delivered_contact = pi.delivered_to_name or ""
        delivered_comp = pi.delivered_to_company or (pi.buyer.name if pi.buyer else "")
        delivered_addr = pi.delivered_to_address or ""
        delivered_text = f"DELIVERED TO: {delivered_contact}\n{delivered_comp}\n{delivered_addr}".strip()
        style_box(1, 11, 1, 15, delivered_text, font=font_bold_md, alignment=align_left, fill=fill_gray)

        # Block 4: PI Summary Info (P1:Q1)
        formatted_date = pi.pi_date.strftime('%d/%m/%Y') if pi.pi_date else ''
        formatted_ex_fac = pi.ex_factory_date.strftime('%d %B, %Y') if pi.ex_factory_date else ''
        pi_summary_text = (
            f"PI of PO # {pi.pi_no}\n"
            f"Date : {formatted_date}\n"
            f"Ex-Factory : {formatted_ex_fac}\n"
            f"Payment: {pi.payment_terms or '100% TT 30 Days from BL'}"
        )
        style_box(1, 16, 1, 17, pi_summary_text, font=font_bold_md, alignment=align_left, fill=fill_gray)

        # ─── Table Headers (Row 2) ───────────────────────────────────────────
        ws.row_dimensions[2].height = 25
        headers = [
            "S. No.", "Barcode", "Buyer #", "Style No.", "Picture",
            "Name", "Size CMs", "Material", "Finish", "CBM",
            "Price USD", "Units", "Total CBM", "Total Amount", "Remarks"
        ]

        for col_idx, h_text in enumerate(headers, 1):
            c = ws.cell(row=2, column=col_idx, value=h_text)
            c.font = font_bold_sm
            c.alignment = align_center
            c.border = border_all

        # ─── Line Items (Row 3 onwards) ──────────────────────────────────────
        curr_row = 3
        tot_units = 0
        tot_cbm = 0.0
        tot_amt = 0.0
        temp_files = []

        items = list(pi.items.all())
        for idx, item in enumerate(items, 1):
            ws.row_dimensions[curr_row].height = 60

            # S. No.
            c = ws.cell(row=curr_row, column=1, value=idx)
            c.font = font_regular
            c.alignment = align_center
            c.border = border_all

            # Barcode
            c = ws.cell(row=curr_row, column=2, value=item.barcode or "")
            c.font = font_regular
            c.alignment = align_center
            c.border = border_all

            # Buyer #
            c = ws.cell(row=curr_row, column=3, value=item.buyer_no or "")
            c.font = font_regular
            c.alignment = align_center
            c.border = border_all

            # Style No
            c = ws.cell(row=curr_row, column=4, value=item.style_no or "")
            c.font = font_bold_sm
            c.alignment = align_center
            c.border = border_all

            # Picture (Col E = Col 5)
            c = ws.cell(row=curr_row, column=5, value="")
            c.border = border_all

            # Name
            c = ws.cell(row=curr_row, column=6, value=item.product_name or "")
            c.font = font_regular
            c.alignment = align_left
            c.border = border_all

            # Size CMs
            l = float(item.size_length) if item.size_length else 0
            b_dim = float(item.size_breadth) if item.size_breadth else 0
            h = float(item.size_height) if item.size_height else 0
            size_str = f"{l} x {b_dim} x {h}" if (l or b_dim or h) else ""
            c = ws.cell(row=curr_row, column=7, value=size_str)
            c.font = font_regular
            c.alignment = align_center
            c.border = border_all

            # Material
            c = ws.cell(row=curr_row, column=8, value=item.material or "")
            c.font = font_regular
            c.alignment = align_center
            c.border = border_all

            # Finish
            c = ws.cell(row=curr_row, column=9, value=item.finish_color or "")
            c.font = font_regular
            c.alignment = align_center
            c.border = border_all

            # CBM
            cbm_val = float(item.cbm) if item.cbm else 0.0
            c = ws.cell(row=curr_row, column=10, value=cbm_val)
            c.font = font_regular
            c.alignment = align_right
            c.number_format = '0.0000'
            c.border = border_all

            # Price USD
            price_val = float(item.price_usd) if item.price_usd else 0.0
            c = ws.cell(row=curr_row, column=11, value=price_val)
            c.font = font_regular
            c.alignment = align_right
            c.number_format = '"$"#,##0.00'
            c.border = border_all

            # Units
            u_val = item.units or 0
            tot_units += u_val
            c = ws.cell(row=curr_row, column=12, value=u_val)
            c.font = font_bold_sm
            c.alignment = align_center
            c.border = border_all

            # Total CBM
            tcbm_val = float(item.total_cbm) if item.total_cbm else (u_val * cbm_val)
            tot_cbm += tcbm_val
            c = ws.cell(row=curr_row, column=13, value=tcbm_val)
            c.font = font_regular
            c.alignment = align_right
            c.number_format = '0.0000'
            c.border = border_all

            # Total Amount
            tamt_val = float(item.total_amount) if item.total_amount else (u_val * price_val)
            tot_amt += tamt_val
            c = ws.cell(row=curr_row, column=14, value=tamt_val)
            c.font = font_bold_sm
            c.alignment = align_right
            c.number_format = '"$"#,##0.00'
            c.border = border_all

            # Remarks
            c = ws.cell(row=curr_row, column=15, value=item.remarks or "")
            c.font = font_regular
            c.alignment = align_left
            c.border = border_all

            # Product Image embedding in Picture Column (Col 5)
            img_path = None
            if item.buyer_master and item.buyer_master.sample:
                imgs = item.buyer_master.sample.images.all()
                if imgs.exists() and imgs.first().image:
                    img_path = imgs.first().image.path

            if img_path and os.path.exists(img_path):
                try:
                    pil_img = PILImage.open(img_path)
                    if pil_img.mode in ('RGBA', 'LA', 'P'):
                        pil_img = pil_img.convert('RGB')
                    pil_img.thumbnail((75, 50))
                    tmp_f = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                    pil_img.save(tmp_f.name, format='JPEG', quality=85)
                    tmp_f.close()
                    temp_files.append(tmp_f.name)

                    xl_img = OpenpyxlImage(tmp_f.name)
                    ws.add_image(xl_img, f"E{curr_row}")
                except Exception as e:
                    print(f"Failed to embed image: {e}")

            curr_row += 1

        # Totals Row
        ws.row_dimensions[curr_row].height = 22
        style_box(curr_row, 1, curr_row, 11, "TOTAL", font=font_bold_md, alignment=align_right)
        
        c_u = ws.cell(row=curr_row, column=12, value=tot_units)
        c_u.font = font_bold_md
        c_u.alignment = align_center
        c_u.border = border_all

        c_cbm = ws.cell(row=curr_row, column=13, value=tot_cbm)
        c_cbm.font = font_bold_md
        c_cbm.alignment = align_right
        c_cbm.number_format = '0.0000'
        c_cbm.border = border_all

        c_amt = ws.cell(row=curr_row, column=14, value=tot_amt)
        c_amt.font = font_bold_md
        c_amt.alignment = align_right
        c_amt.number_format = '"$"#,##0.00'
        c_amt.border = border_all

        c_rem = ws.cell(row=curr_row, column=15, value="")
        c_rem.border = border_all

        # Adjust column widths
        col_widths = {
            1: 8, 2: 14, 3: 14, 4: 16, 5: 16,
            6: 22, 7: 16, 8: 14, 9: 14, 10: 12,
            11: 14, 12: 10, 13: 14, 14: 16, 15: 18, 16: 18, 17: 18
        }
        for col_idx, width in col_widths.items():
            col_letter = get_column_letter(col_idx)
            ws.column_dimensions[col_letter].width = width

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="PI_{pi.pi_no}.xlsx"'
        wb.save(response)

        for f in temp_files:
            try:
                os.remove(f)
            except Exception:
                pass

        return response



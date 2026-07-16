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

from .models import (
    User, Sample, SampleImage, SalesOrder, PurchaseIMO,
    SandingBatch, SandingAssignment, SandingQC,
    Buyer, BuyerMaster, PO,
)
from .serializers import (
    LoginSerializer, UserSerializer, UserMinimalSerializer,
    SampleSerializer, SampleImageSerializer, SalesOrderSerializer, PurchaseIMOSerializer,
    SandingBatchSerializer, SandingAssignmentSerializer, SandingQCSerializer,
    BuyerSerializer, BuyerMasterSerializer, POSerializer,
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
        qs = Sample.objects.prefetch_related('images').all()
        buyer_code = self.request.query_params.get('buyer_code')
        wood_type = self.request.query_params.get('wood_type')
        if buyer_code:
            qs = qs.filter(buyer_code__icontains=buyer_code)
        if wood_type:
            qs = qs.filter(wood_type__icontains=wood_type)
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

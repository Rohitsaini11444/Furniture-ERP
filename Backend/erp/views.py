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
from decimal import Decimal
from num2words import num2words

from django.conf import settings
from .models import (
    User, Sample, SampleImage,
    Buyer, BuyerMaster, Supplier, SupplierPO, SupplierPOItem,
    PerformaInvoice, PerformaInvoiceItem,
    BuyerPI, BuyerPIItem,
    UserSession, Notification, StockItem, ProductionJob, ProductionQCLog,
)
from .serializers import (
    LoginSerializer, UserSerializer, UserMinimalSerializer,
    UserSessionSerializer,
    SampleSerializer, SampleImageSerializer,
    ProductionJobSerializer, ProductionQCLogSerializer,
    BuyerSerializer, BuyerMasterSerializer,
    SupplierSerializer, SupplierPOSerializer, SupplierPOItemSerializer,
    PerformaInvoiceSerializer, PerformaInvoiceItemSerializer,
    BuyerPISerializer, BuyerPIItemSerializer, StockItemSerializer,
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

        # Track Session
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:512]
        
        session = UserSession.objects.create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Notify Admin on new login if they have other active devices
        if user.role == 'admin':
            active_count = UserSession.objects.filter(user=user, is_active=True).count()
            if active_count > 1:
                Notification.objects.create(
                    user=user,
                    message=f"New login detected from {ip_address} ({user_agent[:30]}...)",
                )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'session_id': session.id,
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
            session_id = request.data.get('session_id')
            token = RefreshToken(refresh_token)
            token.blacklist()
            if session_id:
                UserSession.objects.filter(id=session_id, user=request.user).update(is_active=False)
        except Exception:
            pass  # Token may already be expired
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class ActiveDevicesView(APIView):
    """
    GET /api/auth/devices/
    Returns active devices for the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_active=True)
        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─── User Management (Admin Only) ─────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for managing all users.
    GET /api/users/?role=supervisor  — filter by role
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'supervisors', 'contractors'):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        qs = User.objects.all().order_by('role', 'username')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        supervisor_id = self.request.query_params.get('supervisor')
        if supervisor_id:
            qs = qs.filter(supervisor_id=supervisor_id)
        if user.role == 'supervisor' and role == 'contractor':
            qs = qs.filter(Q(supervisor=user) | Q(supervisor__isnull=True))
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
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            if self.request.query_params.get('nopage') == 'true':
                from .serializers import SampleDropdownSerializer
                return SampleDropdownSerializer
            from .serializers import SampleListSerializer
            return SampleListSerializer
        from .serializers import SampleSerializer
        return SampleSerializer

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
            return [IsAuthenticated(), IsAdmin()]
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
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class BuyerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list' and self.request.query_params.get('nopage') == 'true':
            from .serializers import BuyerDropdownSerializer
            return BuyerDropdownSerializer
        from .serializers import BuyerSerializer
        return BuyerSerializer

    def get_queryset(self):
        return Buyer.objects.filter(is_deleted=False).order_by('name')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
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


class BuyerMasterFinishingImageViewSet(viewsets.ModelViewSet):
    """
    Manage finishing images for a buyer master.
    POST /api/buyer-master-finishing-images/  — upload an image
    DELETE /api/buyer-master-finishing-images/<id>/  — delete a specific image
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_serializer_class(self):
        from .serializers import BuyerMasterFinishingImageSerializer
        return BuyerMasterFinishingImageSerializer

    def get_queryset(self):
        from .models import BuyerMasterFinishingImage
        qs = BuyerMasterFinishingImage.objects.select_related('buyer_master')
        bm_id = self.request.query_params.get('buyer_master')
        if bm_id:
            qs = qs.filter(buyer_master_id=bm_id)
        return qs


class BuyerMasterViewSet(viewsets.ModelViewSet):
    queryset = BuyerMaster.objects.select_related('buyer', 'sample').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            from .serializers import BuyerMasterListSerializer
            return BuyerMasterListSerializer
        from .serializers import BuyerMasterSerializer
        return BuyerMasterSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        buyer_id = self.request.query_params.get('buyer')
        if buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        buyer_master = serializer.save()
        images = self.request.FILES.getlist('finishing_images')
        from .models import BuyerMasterFinishingImage
        for img in images:
            BuyerMasterFinishingImage.objects.create(buyer_master=buyer_master, image=img)

    def perform_update(self, serializer):
        if self.request.data.get('clear_packaging_image') in ('true', True, '1'):
            serializer.instance.packaging_image = None
        buyer_master = serializer.save()
        images = self.request.FILES.getlist('finishing_images')
        from .models import BuyerMasterFinishingImage
        for img in images:
            BuyerMasterFinishingImage.objects.create(buyer_master=buyer_master, image=img)

    @action(detail=True, methods=['get'], url_path='download-packaging-image')
    def download_packaging_image(self, request, pk=None):
        bm = self.get_object()
        if not bm.packaging_image or not os.path.exists(bm.packaging_image.path):
            return HttpResponse("Packaging image not found", status=404)
        
        sample_name = bm.style_no or (bm.sample.sample_id if bm.sample else "Style")
        safe_name = "".join(c for c in sample_name if c.isalnum() or c in ('-', '_')).strip()
        ext = os.path.splitext(bm.packaging_image.path)[1] or '.png'
        filename = f"{safe_name}_Packaging_Image{ext}"

        with open(bm.packaging_image.path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

    @action(detail=True, methods=['get'], url_path='download-finishing-images')
    def download_finishing_images(self, request, pk=None):
        import io
        import zipfile
        bm = self.get_object()
        images = bm.finishing_images.all()
        if not images.exists():
            return HttpResponse("No finishing images found", status=404)
        
        sample_name = bm.style_no or (bm.sample.sample_id if bm.sample else "Style")
        safe_name = "".join(c for c in sample_name if c.isalnum() or c in ('-', '_')).strip()
        zip_filename = f"{safe_name}_Finishing_images.zip"

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for idx, img_obj in enumerate(images, 1):
                if img_obj.image and os.path.exists(img_obj.image.path):
                    ext = os.path.splitext(img_obj.image.path)[1] or '.png'
                    arcname = f"{safe_name}_Finishing_Image_{idx}{ext}"
                    zf.write(img_obj.image.path, arcname=arcname)
        
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
        return response

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
        
        with_details = request.query_params.get('with_details') == 'true'
        
        headers = [
            'S. No.', 'Buyer Name', 'Buyer Code', 'Style No', 'Sample ID', 'Picture', 'Product Name', 
            'Material', 'Finish', 'Size Length (cm)', 
            'Size Breadth (cm)', 'Size Height (cm)', 
            'Price USD', 'Units', 'Total CBM', 'Total Amount', 'Remark'
        ]
        
        if with_details:
            headers.extend([
                'Vendor Details', 'Vendor Price', 'Costing', 'Purchase Price', 
                'CBM', 'Net Weight', 'Gross Weight', 'Box Length (cm)', 'Box Breadth (cm)', 'Box Height (cm)', 'Box Size'
            ])
        
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
                float(bm.price_usd) if bm.price_usd else "",
                bm.units or 1,
                float(bm.total_cbm) if bm.total_cbm else "",
                float(bm.total_amount) if bm.total_amount else "",
                bm.remark or ""
            ]
            
            if with_details:
                row_data.extend([
                    bm.vendor_details or "",
                    float(bm.vendor_price) if bm.vendor_price else "",
                    float(bm.costing) if bm.costing else "",
                    float(bm.purchase_price) if bm.purchase_price else "",
                    float(bm.cbm) if bm.cbm else "",
                    float(bm.net_weight) if bm.net_weight else "",
                    float(bm.gross_weight) if bm.gross_weight else "",
                    float(bm.box_length) if bm.box_length else "",
                    float(bm.box_breadth) if bm.box_breadth else "",
                    float(bm.box_height) if bm.box_height else "",
                    bm.box_size or ""
                ])
            
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



class SupplierViewSet(viewsets.ModelViewSet):
    """CRUD for Supplier master list."""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]


class SupplierPOViewSet(viewsets.ModelViewSet):
    """
    CRUD for Supplier Purchase Orders.
    Each PO goes to one supplier and has multiple line items
    referencing different buyer orders.
    """
    queryset = SupplierPO.objects.select_related('supplier').prefetch_related('items__buyer').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            from .serializers import SupplierPOListSerializer
            return SupplierPOListSerializer
        from .serializers import SupplierPOSerializer
        return SupplierPOSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        buyer_id = self.request.query_params.get('buyer')
        if buyer_id:
            qs = qs.filter(items__buyer_id=buyer_id).distinct()
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        exclude_status = self.request.query_params.get('exclude_status')
        if exclude_status:
            qs = qs.exclude(status=exclude_status)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='pdf')
    def download_pdf(self, request, pk=None):
        """
        Low-level canvas PDF that matches the reference Purchase Order layout.
        Uses absolute positioning exclusively — no Platypus Tables.
        Business logic / queries / serializers are untouched.
        """
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        from decimal import Decimal
        from num2words import num2words
        from io import BytesIO
        import math

        po  = self.get_object()
        buf = BytesIO()

        # ── Page setup ────────────────────────────────────────────────────────
        PW, PH = A4          # 595.28 × 841.89 pt
        ML = 13.0 * mm       # left margin
        MR = 13.0 * mm       # right margin
        MT = 10.0 * mm       # top margin
        MB = 10.0 * mm       # bottom margin
        CW = PW - ML - MR    # content width

        c = rl_canvas.Canvas(buf, pagesize=A4)
        c.setTitle(f'Purchase Order {po.po_number}')

        # ── Drawing primitives ─────────────────────────────────────────────────
        def ds(x, y, text, font='Helvetica', size=8):
            c.setFont(font, size)
            c.setFillColor(colors.black)
            c.drawString(x, y, str(text))

        def dr(x, y, text, font='Helvetica', size=8):
            c.setFont(font, size)
            c.setFillColor(colors.black)
            c.drawRightString(x, y, str(text))

        def dc(x, y, text, font='Helvetica', size=8):
            c.setFont(font, size)
            c.setFillColor(colors.black)
            c.drawCentredString(x, y, str(text))

        def hline(x1, y, x2, lw=0.5):
            c.setLineWidth(lw)
            c.setStrokeColor(colors.black)
            c.line(x1, y, x2, y)

        def vline(x, y1, y2, lw=0.5):
            c.setLineWidth(lw)
            c.setStrokeColor(colors.black)
            c.line(x, y1, x, y2)

        def box(x, y, w, h, lw=0.75):
            c.setLineWidth(lw)
            c.setStrokeColor(colors.black)
            c.rect(x, y, w, h, stroke=1, fill=0)

        def sw(text, font, size):
            c.setFont(font, size)
            return c.stringWidth(str(text), font, size)

        def wrap_line(text, font, size, max_w):
            """Split one paragraph of text into lines that fit within max_w."""
            words = str(text).split()
            lines, cur = [], ''
            for word in words:
                candidate = (cur + ' ' + word).strip()
                if sw(candidate, font, size) <= max_w:
                    cur = candidate
                else:
                    if cur:
                        lines.append(cur)
                    cur = word
            if cur:
                lines.append(cur)
            return lines if lines else ['']

        # ── Business data ──────────────────────────────────────────────────────
        CNAME  = 'PINKCITY ENTERPRISES'
        CADDR1 = 'G-78, EPIP, Sitapura Industrial Area, Tonk Road,'
        CADDR2 = 'Jaipur-302022 Rajasthan, India'
        CIEC   = 'IEC CODE :  1397002620'
        CGSTIN = 'GSTIN/UIN: 08ABXPS4077R1Z8'
        CSTATE = 'State Name : Rajasthan, Code : 08'
        CPAN   = 'ABXPS4077R'

        sup = po.supplier

        def fmt_s(d):   # "15-Jul-26"
            return d.strftime('%d-%b-%y').lstrip('0') if d else ''

        def fmt_l(d):   # "05 Sept 2026"
            return d.strftime('%d %b %Y') if d else ''

        po_date_str  = fmt_s(po.po_date)
        due_date_str = fmt_l(po.due_date)

        items_qs  = list(po.items.select_related('buyer').all())
        total_amt = sum(it.amount or Decimal('0') for it in items_qs)

        try:
            ip = int(total_amt)
            dp = int(round((total_amt - Decimal(str(ip))) * 100))
            ww = num2words(ip, lang='en').replace(',', '').title()
            if dp:
                ww += f' And {num2words(dp, lang="en").title()} Paise'
            words_text = f'INR {ww} Only'
        except Exception:
            words_text = f'Rs. {float(total_amt):,.2f}'

        # ── Layout constants (all in pt) ───────────────────────────────────────
        P   = 2.0 * mm    # general inner padding

        # ─ Bottom sections (built upward from MB) ─
        FOOTER_Y  = MB + 3.0 * mm
        DECL_H    = 44.0 * mm
        DECL_BOT  = MB + 8.0 * mm
        DECL_TOP  = DECL_BOT + DECL_H
        WORDS_H   = 17.0 * mm
        WORDS_BOT = DECL_TOP
        WORDS_TOP = WORDS_BOT + WORDS_H

        # ─ Header ─
        TITLE_Y  = PH - MT - 4.5 * mm      # baseline of PURCHASE ORDER text
        HDR_TOP  = TITLE_Y - 5.5 * mm
        HDR_H    = 68.0 * mm
        HDR_BOT  = HDR_TOP - HDR_H

        # ─ Items table ─
        ITEM_TOP = HDR_BOT
        ITEM_BOT = WORDS_TOP
        ITEM_H   = ITEM_TOP - ITEM_BOT

        # ─ Header left / right split ─
        LEFT_W  = CW * 0.48
        RIGHT_W = CW * 0.52
        SPX     = ML + LEFT_W              # x of the vertical divider in header

        # ─ Items column layout (proportions must add to 1) ─
        col_pct = [0.05, 0.56, 0.11, 0.10, 0.05, 0.13]
        col_w   = [CW * p for p in col_pct]
        col_x   = []
        _cx = ML
        for _w in col_w:
            col_x.append(_cx)
            _cx += _w

        ITEM_HDR_H = 8.5 * mm
        ITEM_ROW_H = 6.5 * mm

        # ═══════════════════════════════════════════════════════════════════════
        # 1. TITLE
        # ═══════════════════════════════════════════════════════════════════════
        dc(PW / 2, TITLE_Y, 'PURCHASE ORDER', 'Helvetica-Bold', 18)

        # ═══════════════════════════════════════════════════════════════════════
        # 2. HEADER BOX
        # ═══════════════════════════════════════════════════════════════════════
        box(ML, HDR_BOT, CW, HDR_H, lw=0.75)     # outer border
        vline(SPX, HDR_BOT, HDR_TOP)              # left | right divider

        # ── LEFT column ──────────────────────────────────────────────────────
        LX      = ML + P
        LOGO_W  = 16.0 * mm
        LOGO_H  = 14.0 * mm
        logo_x  = ML + P
        logo_y  = HDR_TOP - P - LOGO_H

        # Stylised 'pe' logo box
        c.setLineWidth(1.0)
        c.rect(logo_x, logo_y, LOGO_W, LOGO_H, stroke=1, fill=0)
        # Horizontal overline above 'e' (reference shows a bar above the letter)
        bar_y = logo_y + LOGO_H - 3.2*mm
        c.setLineWidth(1.2)
        c.line(logo_x + 6.5*mm, bar_y, logo_x + LOGO_W - 1.0*mm, bar_y)
        c.setLineWidth(0.5)
        ds(logo_x + 1.0*mm, logo_y + 3.5*mm,  'p', 'Helvetica-Bold', 11)
        ds(logo_x + 6.5*mm, logo_y + 3.5*mm,  'e', 'Helvetica-Bold', 11)

        # "Invoice To" label beside logo
        ds(logo_x + LOGO_W + 1.5*mm, logo_y + LOGO_H - 2.5*mm,
           'Invoice To', 'Helvetica', 7)

        # Company details below logo
        cy = logo_y - 1.5*mm
        ds(logo_x + LOGO_W + 1.5*mm, cy, CNAME,  'Helvetica-Bold', 13);  cy -= 4.5*mm
        
        # Now switch to full width for address
        cy -= 1.0*mm
        ds(LX, cy, CADDR1, 'Helvetica', 8);        cy -= 3.5*mm
        ds(LX, cy, CADDR2, 'Helvetica', 8);        cy -= 3.5*mm
        ds(LX, cy, CIEC,   'Helvetica', 8);        cy -= 3.5*mm
        ds(LX, cy, CGSTIN, 'Helvetica', 8);        cy -= 3.5*mm
        ds(LX, cy, CSTATE, 'Helvetica', 8);        cy -= 3.5*mm

        # Horizontal divider between company and supplier
        div_y = cy - 1.5*mm
        hline(ML, div_y, SPX, lw=0.5)

        # Supplier block
        cy = div_y - 3.5*mm
        ds(LX, cy, 'Supplier (Bill from)', 'Helvetica', 7);  cy -= 4.0*mm
        ds(LX, cy, sup.name, 'Helvetica-Bold', 10);          cy -= 4.5*mm

        sup_max_w = LEFT_W - 3.0*mm
        if sup.address:
            for addr_seg in sup.address.split('\n'):
                addr_seg = addr_seg.strip()
                if not addr_seg:
                    continue
                for wl in wrap_line(addr_seg, 'Helvetica', 8, sup_max_w):
                    ds(LX, cy, wl, 'Helvetica', 8);  cy -= 3.5*mm
        if sup.phone:
            ds(LX, cy, f'(M) {sup.phone}',           'Helvetica', 8);  cy -= 3.5*mm
        if sup.gstin:
            ds(LX, cy, f'GSTIN/UIN   :   {sup.gstin}', 'Helvetica', 8);  cy -= 3.5*mm
        if sup.state_name:
            ds(LX, cy, f'State Name  :   {sup.state_name}', 'Helvetica', 8)

        # ── RIGHT column grid ─────────────────────────────────────────────────
        R_MID  = SPX + RIGHT_W / 2      # inner vertical divider of right grid
        vline(R_MID, HDR_TOP - 20.0*mm, HDR_TOP)  # draw it partially height (only top 3 rows)

        R_LABEL_H = 3.8 * mm
        R_VALUE_H = 6.2 * mm
        R_ROW_H   = R_LABEL_H + R_VALUE_H

        def right_row(top_y, label_l, label_r, val_l, val_r):
            """Draw one label+value row in the right header grid."""
            bot_y = top_y - R_ROW_H
            hline(SPX, bot_y, SPX + RIGHT_W)
            ds(SPX + P, top_y - R_LABEL_H,  label_l, 'Helvetica', 7)
            ds(R_MID + P, top_y - R_LABEL_H, label_r, 'Helvetica', 7)
            if val_l:
                ds(SPX + P, bot_y + 1.5*mm, val_l, 'Helvetica-Bold', 10)
            if val_r:
                ds(R_MID + P, bot_y + 1.5*mm, val_r, 'Helvetica-Bold', 10)
            return bot_y

        r1_bot = right_row(HDR_TOP,
                           'Purchase Order No.', 'Dated',
                           po.po_number, po_date_str)

        r2_bot = right_row(r1_bot,
                           'PO Due Date', 'Mode/Terms of Payment',
                           due_date_str,
                           po.mode_of_payment or '')

        # 3rd row: Terms of delivery / Supervisor
        # Note: We do NOT draw bottom line here if it's the open NKU space
        r3_top_y = r2_bot
        r3_bot_y = r3_top_y - R_ROW_H
        # hline(SPX, r3_bot_y, SPX + RIGHT_W) # Do not draw line
        ds(SPX + P, r3_top_y - R_LABEL_H,  'Terms of Delivery', 'Helvetica', 7)
        ds(R_MID + P, r3_top_y - R_LABEL_H, 'Supervisor', 'Helvetica', 7)
        if po.terms_of_delivery:
             ds(SPX + P, r3_bot_y + 1.5*mm, po.terms_of_delivery, 'Helvetica-Bold', 10)
        if po.supervisor:
             ds(R_MID + P, r3_bot_y + 1.5*mm, po.supervisor, 'Helvetica', 10)
        
        # NKU refs — large open area, no middle divider
        if po.nku_refs:
            nku_y = r3_bot_y - 2.0*mm
            for ref_ln in po.nku_refs.split('\n'):
                ref_ln = ref_ln.strip()
                if ref_ln:
                    ds(SPX + P, nku_y, ref_ln, 'Helvetica-Bold', 10)
                    nku_y -= 4.5*mm

        # ═══════════════════════════════════════════════════════════════════════
        # 3. ITEMS TABLE
        # ═══════════════════════════════════════════════════════════════════════
        box(ML, ITEM_BOT, CW, ITEM_H, lw=0.75)   # outer box

        # Vertical column dividers run the full height of the table
        for ci in range(1, len(col_x)):
            vline(col_x[ci], ITEM_BOT, ITEM_TOP)

        # Header row (bottom border is the separator)
        HDR_ROW_BOT = ITEM_TOP - ITEM_HDR_H
        hline(ML, HDR_ROW_BOT, ML + CW, lw=0.75)

        # Header labels
        ds(col_x[0] + 1.0*mm, HDR_ROW_BOT + 4.5*mm, 'Sl',  'Helvetica', 8)
        ds(col_x[0] + 1.0*mm, HDR_ROW_BOT + 1.5*mm, 'No.', 'Helvetica', 8)
        dc(col_x[1] + col_w[1]/2, HDR_ROW_BOT + 2.5*mm,
           'Description of Goods', 'Helvetica', 8)
        dc(col_x[2] + col_w[2]/2, HDR_ROW_BOT + 2.5*mm, 'Quantity', 'Helvetica', 8)
        dc(col_x[3] + col_w[3]/2, HDR_ROW_BOT + 2.5*mm, 'Rate',     'Helvetica', 8)
        dc(col_x[4] + col_w[4]/2, HDR_ROW_BOT + 2.5*mm, 'per',      'Helvetica', 8)
        dc(col_x[5] + col_w[5]/2, HDR_ROW_BOT + 2.5*mm, 'Amount',   'Helvetica', 8)

        # Data rows (only where actual items exist)
        IY = HDR_ROW_BOT
        for idx, item in enumerate(items_qs, 1):
            buyer_ref = f' [{item.buyer.name}]' if item.buyer else ''
            raw_desc  = str(item.description) + buyer_ref
            desc_lines = []
            for para in raw_desc.split('\n'):
                desc_lines.extend(
                    wrap_line(para.strip(), 'Helvetica-Bold', 9, col_w[1] - 2.5*mm)
                )
            if item.remark:
                for para in str(item.remark).split('\n'):
                    desc_lines.extend(
                        wrap_line(para.strip(), 'Helvetica-Bold', 9, col_w[1] - 2.5*mm)
                    )

            row_h   = max(ITEM_ROW_H, len(desc_lines) * 3.5*mm + 2.0*mm)
            row_bot = IY - row_h

            # Row bottom separator (thin, only between real rows)
            # NO horizontal lines between items according to reference
            # hline(ML, row_bot, ML + CW, lw=0.5)

            # SI number – vertically centred in row
            mid_y = IY - 4.0*mm
            dc(col_x[0] + col_w[0]/2, mid_y, str(idx), 'Helvetica', 9)

            # Description – top-aligned, multi-line
            dly = IY - 1.0*mm
            for dl in desc_lines:
                dly -= 4.0*mm
                ds(col_x[1] + 1.0*mm, dly, dl, 'Helvetica-Bold', 9)

            # Quantity
            qty_str = f'{float(item.quantity):.2f} {item.unit}'
            dr(col_x[2] + col_w[2] - 1.0*mm, mid_y, qty_str, 'Helvetica-Bold', 9)

            # Rate (right-aligned inside column)
            dr(col_x[3] + col_w[3] - 1.0*mm, mid_y,
               f'{float(item.rate):.2f}', 'Helvetica', 9)

            # Per
            dc(col_x[4] + col_w[4]/2, mid_y, str(item.unit), 'Helvetica', 9)

            # Amount (right-aligned, bold)
            amt = float(item.amount or 0)
            dr(ML + CW - 1.0*mm, mid_y, f'{amt:,.2f}', 'Helvetica-Bold', 9)

            IY = row_bot

        # Total row — single line at the bottom of the items box
        TOTAL_LINE_Y = ITEM_BOT + 6.0*mm
        hline(ML, TOTAL_LINE_Y, ML + CW, lw=0.75)
        dr(col_x[2] - 2.0*mm, ITEM_BOT + 2.0*mm, 'Total', 'Helvetica', 8)
        dr(ML + CW - 1.0*mm, ITEM_BOT + 1.5*mm,
           f'Rs. {float(total_amt):,.2f}', 'Helvetica-Bold', 11)

        # ═══════════════════════════════════════════════════════════════════════
        # 4. AMOUNT IN WORDS
        # ═══════════════════════════════════════════════════════════════════════
        box(ML, WORDS_BOT, CW, WORDS_H, lw=0.75)
        ds(ML + P, WORDS_TOP - 3.5*mm,
           'Amount Chargeable (in words)', 'Helvetica', 8)
        dr(ML + CW - P, WORDS_TOP - 3.5*mm, 'E. & O.E', 'Helvetica-Oblique', 8)
        ds(ML + P, WORDS_BOT + 4.5*mm, words_text, 'Helvetica-Bold', 9)

        # ═══════════════════════════════════════════════════════════════════════
        # 5. DECLARATION
        # ═══════════════════════════════════════════════════════════════════════
        box(ML, DECL_BOT, CW, DECL_H, lw=0.75)
        DECL_SPX = ML + CW * 0.62
        # Right aligned inner rectangle
        c.rect(DECL_SPX, DECL_BOT, CW - CW * 0.62, DECL_H/2.5, stroke=1, fill=0)

        # Left side: PAN + declaration text
        dy = DECL_TOP - 4.5*mm
        ds(ML + P, dy, f"Company's PAN", 'Helvetica', 8)
        ds(ML + 25*mm, dy, f":   {CPAN}", 'Helvetica-Bold', 9)
        dy -= 4.0*mm
        ds(ML + P, dy, 'Declaration', 'Helvetica', 8)
        dy -= 3.5*mm

        decl_max_w = CW * 0.62 - 3.0*mm
        decl_body  = (
            'Please Write the PO and Item Number in Delivery Challan as '
            'well as Invoice. Penalty will be apply for late delivery if '
            'your material recieved after due date to :'
        )
        for wl in wrap_line(decl_body, 'Helvetica', 8, decl_max_w):
            ds(ML + P, dy, wl, 'Helvetica', 8)
            dy -= 3.5*mm

        for penalty in [
            '1. One Week @ 10%.',
            '2. Two Week @ 25%.',
            '3. Three Week@ 50% deduct.',
            'Note:- Order poora hone par hi bhugtaan kiya jaavega !',
        ]:
            ds(ML + P, dy, penalty, 'Helvetica', 8)
            dy -= 3.5*mm

        # Right side: company name + Authorised Signatory
        dr(ML + CW - P, DECL_TOP - 4.0*mm,
           f'for {CNAME}', 'Helvetica-Bold', 9)
        dr(ML + CW - P, DECL_BOT + 2.5*mm,
           'Authorised Signatory', 'Helvetica', 9)

        # ═══════════════════════════════════════════════════════════════════════
        # 6. FOOTER
        # ═══════════════════════════════════════════════════════════════════════
        dc(PW / 2, FOOTER_Y,
           'This is a Computer Generated Document', 'Helvetica', 8)

        # Render page
        c.save()
        pdf_bytes = buf.getvalue()
        buf.close()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{po.po_number}.pdf"'
        return response

# ─── Sanding Workflow ViewSets ────────────────────────────────────────────────

# ─── Production & Stock Pipeline ViewSets ───────────────────────────────────

class ProductionJobViewSet(viewsets.ModelViewSet):
    """
    Manage stage production jobs (Sanding, Polishing, Packaging).
    - Supervisor assigns quantity from source stock -> Job created with status='assigned'.
    - Contractor marks work in progress or requests QC -> status='qc_requested'.
    - Supervisor performs QC -> passed_qty moves to destination Stock, rejected_qty stays for Rework.
    """
    serializer_class = ProductionJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ProductionJob.objects.select_related('stock_item', 'buyer_master', 'sample', 'buyer', 'contractor', 'assigned_by').all()
        
        stage_param = self.request.query_params.get('stage')
        status_param = self.request.query_params.get('status')
        contractor_param = self.request.query_params.get('contractor')
        
        if stage_param:
            qs = qs.filter(stage=stage_param)
        if status_param:
            qs = qs.filter(status=status_param)
        if contractor_param:
            qs = qs.filter(contractor_id=contractor_param)
            
        if user.role == 'contractor':
            qs = qs.filter(contractor=user)
        elif user.role == 'supervisor':
            qs = qs.filter(assigned_by=user)
            
        return qs

    def perform_create(self, serializer):
        from decimal import Decimal
        from .models import StockItem
        user = self.request.user
        data = serializer.validated_data
        
        stock_item = data.get('stock_item')
        assigned_qty = Decimal(str(data.get('assigned_qty', 0)))
        
        if stock_item:
            if stock_item.quantity < assigned_qty:
                raise serializers.ValidationError({"assigned_qty": f"Insufficient stock. Available: {stock_item.quantity} {stock_item.unit}"})
            stock_item.quantity -= assigned_qty
            if stock_item.quantity <= 0:
                stock_item.status = 'Out of Stock'
            stock_item.save()
            
        serializer.save(assigned_by=user, status='assigned')

    @action(detail=True, methods=['post'], url_path='request-qc')
    def request_qc(self, request, pk=None):
        """Contractor submits job for Supervisor QC Inspection."""
        job = self.get_object()
        if request.user.role == 'contractor' and job.contractor != request.user:
            return Response({'detail': 'You can only request QC for your assigned jobs.'}, status=status.HTTP_403_FORBIDDEN)
            
        job.status = 'qc_requested'
        job.qc_requested_at = timezone.now()
        if 'contractor_notes' in request.data:
            job.contractor_notes = request.data['contractor_notes']
        job.save()
        return Response(ProductionJobSerializer(job).data)

    @action(detail=True, methods=['post'], url_path='perform-qc')
    def perform_qc(self, request, pk=None):
        """Supervisor inspects job: passes X pieces, rejects Y pieces."""
        from decimal import Decimal
        from .models import StockItem, ProductionQCLog
        job = self.get_object()
        user = request.user
        
        if user.role not in ('admin', 'supervisor'):
            return Response({'detail': 'Only supervisors or admins can perform QC inspection.'}, status=status.HTTP_403_FORBIDDEN)
            
        passed_qty = Decimal(str(request.data.get('passed_qty', 0)))
        rejected_qty = Decimal(str(request.data.get('rejected_qty', 0)))
        qc_notes = request.data.get('notes', '')

        if (passed_qty + rejected_qty) <= 0:
            return Response({'detail': 'Please enter valid passed or rejected quantities.'}, status=status.HTTP_400_BAD_REQUEST)

        new_passed_total = (job.passed_qty or Decimal(0)) + passed_qty
        if (new_passed_total + rejected_qty) > job.assigned_qty:
            return Response({
                'detail': f'Total passed ({new_passed_total}) + rejected ({rejected_qty}) cannot exceed assigned quantity ({job.assigned_qty}).'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Record QC log
        ProductionQCLog.objects.create(
            job=job,
            inspected_by=user,
            passed_qty=passed_qty,
            rejected_qty=rejected_qty,
            notes=qc_notes
        )

        job.passed_qty = new_passed_total
        job.qc_notes = qc_notes

        # If all assigned pieces have passed, complete job & clear rejected count
        if job.passed_qty >= job.assigned_qty:
            job.passed_qty = job.assigned_qty
            job.rejected_qty = Decimal('0')
            job.status = 'qc_completed'
            job.qc_completed_at = timezone.now()
        else:
            job.rejected_qty = rejected_qty
            if rejected_qty > 0:
                job.status = 'in_progress'
            else:
                job.status = 'qc_completed'
                job.qc_completed_at = timezone.now()

        job.save()

        # Add passed pieces to target stock stage
        if passed_qty > 0:
            target_stock_type = 'sanded'
            if job.stage == 'sanding':
                target_stock_type = 'sanded'
            elif job.stage == 'polishing':
                target_stock_type = 'polished'
            elif job.stage == 'packaging':
                target_stock_type = 'packaged'

            # Update or create target stock
            dest_stock, _ = StockItem.objects.get_or_create(
                stock_type=target_stock_type,
                style_no=job.style_no,
                defaults={
                    'item_name': job.item_name,
                    'quantity': Decimal('0'),
                    'unit': job.unit,
                    'buyer_master': job.buyer_master,
                    'sample': job.sample,
                    'buyer': job.buyer,
                    'status': 'In Stock'
                }
            )
            dest_stock.quantity += passed_qty
            dest_stock.status = 'In Stock'
            dest_stock.save()

        return Response(ProductionJobSerializer(job).data)


class ProductionQCLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductionQCLog.objects.select_related('job', 'inspected_by').all()
    serializer_class = ProductionQCLogSerializer
    permission_classes = [IsAuthenticated]


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
            return [IsAuthenticated(), IsAdmin()]
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
        style_range(2, 1, 2, 4, "Pinkcity Enterprises", font=font_title)
        style_range(3, 1, 3, 4, "G-78, EPIP, Sitapura Industrial Area, Tonk Road, Jaipur-302022 Rajasthan, India.")
        style_range(4, 1, 4, 4, "TEL: +91-141-2771144 / 2770033 | GSTIN: 08ABXPS4077R1Z8")
        style_range(5, 1, 5, 4, "IEC CODE: 1397002620 | State: Rajasthan, Code: 08")
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
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            from .serializers import BuyerPIListSerializer
            return BuyerPIListSerializer
        from .serializers import BuyerPISerializer
        return BuyerPISerializer

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
            return [IsAuthenticated(), IsAdmin()]
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
            "G-78, EPIP, Sitapura Industrial Area, Tonk Road,\n"
            "Jaipur-302022 Rajasthan, India\n"
            "Tele #: +91-141-2771144 / 2770033 | GSTIN: 08ABXPS4077R1Z8"
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


class SupplierPOItemDefectViewSet(viewsets.ModelViewSet):
    from .models import SupplierPOItemDefect
    from .serializers import SupplierPOItemDefectSerializer
    queryset = SupplierPOItemDefect.objects.all()
    serializer_class = SupplierPOItemDefectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        po_item_id = self.request.query_params.get('po_item')
        if po_item_id:
            qs = qs.filter(po_item_id=po_item_id)
        return qs

    def get_permissions(self):
        # We allow supervisors and admins to create/update
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        from .models import Notification, User, SupplierPOItemDefectImage
        defect = serializer.save()
        
        # Save multiple images if uploaded
        images = self.request.FILES.getlist('images')
        for img in images:
            SupplierPOItemDefectImage.objects.create(defect=defect, image=img)
            
        # Notify admins
        admins = User.objects.filter(role='admin')
        for admin in admins:
            if admin != self.request.user:
                Notification.objects.create(
                    user=admin,
                    message=f"New defect reported by {self.request.user.username} on PO Item.",
                    link=f'/gate-entry/{defect.po_item.supplier_po.id}'
                )

    def perform_update(self, serializer):
        from .models import Notification
        old_defect = self.get_object()
        new_defect = serializer.save()
        
        # If admin_reply changed (was empty and is now filled, or just changed by admin)
        if new_defect.admin_reply and new_defect.admin_reply != old_defect.admin_reply:
            if new_defect.reported_by and new_defect.reported_by != self.request.user:
                Notification.objects.create(
                    user=new_defect.reported_by,
                    message=f"Admin replied to your defect report on PO Item.",
                    link=f'/gate-entry/{new_defect.po_item.supplier_po.id}'
                )

class SupplierPOItemViewSet(viewsets.ModelViewSet):
    from .models import SupplierPOItem
    from .serializers import SupplierPOItemSerializer
    queryset = SupplierPOItem.objects.all()
    serializer_class = SupplierPOItemSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'receive_qc'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        item = serializer.save()
        po = item.supplier_po
        if po:
            from decimal import Decimal
            all_received = True
            for it in po.items.all():
                passed_tot = it.passed_quantity or Decimal(0)
                if passed_tot < it.quantity:
                    all_received = False
                    break
            if all_received:
                po.status = 'Received'
                po.save()

    @action(detail=True, methods=['post'], url_path='receive-qc')
    def receive_qc(self, request, pk=None):
        """Supervisor inspects gate entry items: passed pcs enter Raw Stock, rejected pcs log defect."""
        from decimal import Decimal
        from .models import StockItem, SupplierPOItemDefect
        po_item = self.get_object()
        passed_qty = Decimal(str(request.data.get('passed_qty', 0)))
        rejected_qty = Decimal(str(request.data.get('rejected_qty', 0)))
        
        if passed_qty < 0 or rejected_qty < 0:
            return Response({'detail': 'Quantities cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
            
        po_item.passed_quantity = (po_item.passed_quantity or Decimal(0)) + passed_qty
        po_item.save()
        
        # Automatically add passed_qty to Raw Stock
        if passed_qty > 0:
            words = po_item.description.split()
            style = words[0] if words else "RAW-ITEM"
            item_name = po_item.description[:100] if po_item.description else "Raw Furniture Item"
            
            raw_stock, _ = StockItem.objects.get_or_create(
                stock_type='raw',
                po_item=po_item,
                defaults={
                    'style_no': style,
                    'item_name': item_name,
                    'quantity': Decimal(0),
                    'unit': po_item.unit or 'pcs',
                    'buyer': po_item.buyer,
                    'status': 'In Stock'
                }
            )
            raw_stock.quantity += passed_qty
            raw_stock.status = 'In Stock'
            raw_stock.save()
            
        # Log defect if any pieces rejected
        if rejected_qty > 0:
            remark = request.data.get('remark', 'Gate inspection rejected pieces')
            SupplierPOItemDefect.objects.create(
                po_item=po_item,
                reported_by=request.user,
                quantity=rejected_qty,
                remark=remark
            )

        # Check if all items in parent PO are fully passed -> auto-update PO status to Received
        po = po_item.supplier_po
        if po:
            all_received = True
            for item in po.items.all():
                passed_tot = item.passed_quantity or Decimal(0)
                if passed_tot < item.quantity:
                    all_received = False
                    break
            if all_received:
                po.status = 'Received'
                po.save()
            
        return Response({
            'detail': f'Gate QC recorded successfully. {passed_qty} pcs added to Raw Stock.',
            'passed_quantity': float(po_item.passed_quantity),
            'po_status': po.status if po else 'Pending'
        })


class NotificationViewSet(viewsets.ModelViewSet):
    from .models import Notification
    from .serializers import NotificationSerializer
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from .models import Notification
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        from .models import Notification
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'ok'})


class StockItemViewSet(viewsets.ModelViewSet):
    queryset = StockItem.objects.select_related('po_item', 'sample', 'buyer', 'buyer_master').all()
    serializer_class = StockItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        stock_type_param = self.request.query_params.get('stock_type')
        status_param = self.request.query_params.get('status')
        buyer_param = self.request.query_params.get('buyer')
        search_param = self.request.query_params.get('search')

        if stock_type_param:
            qs = qs.filter(stock_type=stock_type_param)
        if status_param:
            qs = qs.filter(status=status_param)
        if buyer_param:
            qs = qs.filter(buyer_id=buyer_param)
        if search_param:
            from django.db.models import Q
            qs = qs.filter(
                Q(style_no__icontains=search_param) |
                Q(item_name__icontains=search_param) |
                Q(location__icontains=search_param) |
                Q(remarks__icontains=search_param)
            )

        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering:
            qs = qs.order_by(ordering)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSupervisor()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Inventory_Stock"
        ws.views.sheetView[0].showGridLines = True

        headers = ['Style No', 'Item Name', 'Quantity', 'Unit', 'Unit Price', 'Location', 'Status', 'Buyer', 'PO Ref', 'Created At']
        ws.append(headers)

        header_font = Font(bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='059669', end_color='059669', fill_type='solid')

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center')

        for item in queryset:
            ws.append([
                item.style_no,
                item.item_name,
                float(item.quantity) if item.quantity else 0,
                item.unit,
                float(item.unit_price) if item.unit_price else '',
                item.location or '',
                item.status,
                item.buyer.name if item.buyer else '',
                item.po_item.supplier_po.po_number if (item.po_item and item.po_item.supplier_po) else '',
                item.created_at.strftime('%Y-%m-%d %H:%M') if item.created_at else ''
            ])

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="Inventory_Stock.xlsx"'
        wb.save(response)
        return response


class GeneratePresentationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .presentation_generator import generate_pptx_presentation
        buyer_id = request.data.get('buyer_id')
        sample_ids = request.data.get('sample_ids', [])
        buyer_master_ids = request.data.get('buyer_master_ids', [])

        buyer = None
        if buyer_id:
            try:
                buyer = Buyer.objects.get(id=buyer_id)
            except Buyer.DoesNotExist:
                pass

        items = []
        if sample_ids:
            items = list(Sample.objects.filter(id__in=sample_ids))
        elif buyer_master_ids:
            items = list(BuyerMaster.objects.filter(id__in=buyer_master_ids))

        if not items:
            return Response({'error': 'Please select at least one sample or item for presentation.'}, status=status.HTTP_400_BAD_REQUEST)

        buyer_code_str = buyer.code if buyer else 'Catalog'

        pptx_bytes = generate_pptx_presentation(buyer, items)
        response = HttpResponse(pptx_bytes, content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation')
        response['Content-Disposition'] = f'attachment; filename="Presentation_{buyer_code_str}.pptx"'
        return response


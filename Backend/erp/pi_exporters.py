import os
import tempfile
from decimal import Decimal
from PIL import Image as PILImage

import openpyxl
from openpyxl.cell.rich_text import CellRichText, TextBlock
from openpyxl.cell.text import InlineFont
from openpyxl.drawing.image import Image as OpenpyxlImage
from openpyxl.drawing.spreadsheet_drawing import AnchorMarker, OneCellAnchor
from openpyxl.drawing.xdr import XDRPositiveSize2D
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import coordinate_to_tuple, get_column_letter

from django.http import HttpResponse
from .models import Finish


def add_centered_image(ws, cell_address, xl_img):
    """
    Embeds `xl_img` into `ws` at `cell_address` (e.g. 'B3'),
    centering the image both horizontally and vertically within the target cell.
    """
    row_idx, col_idx = coordinate_to_tuple(cell_address)
    col_letter = get_column_letter(col_idx)

    anchor_row = row_idx - 1
    anchor_col = col_idx - 1

    row_height_pt = ws.row_dimensions[row_idx].height or 15.0
    col_width_char = ws.column_dimensions[col_letter].width or 8.43

    cell_height_emu = int(row_height_pt * 12700)
    cell_width_emu = int((col_width_char * 7.5 + 5) * 9525)

    img_width_emu = int(xl_img.width * 9525)
    img_height_emu = int(xl_img.height * 9525)

    col_off = max(0, (cell_width_emu - img_width_emu) // 2)
    row_off = max(0, (cell_height_emu - img_height_emu) // 2)

    marker = AnchorMarker(col=anchor_col, colOff=col_off, row=anchor_row, rowOff=row_off)
    size = XDRPositiveSize2D(cx=img_width_emu, cy=img_height_emu)

    xl_img.anchor = OneCellAnchor(_from=marker, ext=size)
    ws.add_image(xl_img)


def generate_general_pi_excel(ws, pi, items, temp_files):
    """
    Generates the Standard (General) 17-column PI Excel format.
    Preserves exact historical layout, borders, rich text headers, and styling.
    """
    thin_side = Side(style='thin', color='000000')
    border_all = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    font_bold_lg = Font(name='Calibri', size=14, bold=True)
    font_bold_md = Font(name='Calibri', size=11, bold=True)
    font_bold_sm = Font(name='Calibri', size=10, bold=True)
    font_regular = Font(name='Calibri', size=9)
    fill_gray = PatternFill(start_color='EAEAEA', end_color='EAEAEA', fill_type='solid')

    align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    align_left = Alignment(horizontal='left', vertical='center', wrap_text=True)
    align_right = Alignment(horizontal='right', vertical='center', wrap_text=True)
    align_top_left = Alignment(horizontal='left', vertical='top', wrap_text=True, indent=1)

    def style_box(row_start, col_start, row_end, col_end, text="", font=font_regular, alignment=align_center, fill=None):
        if row_start != row_end or col_start != col_end:
            ws.merge_cells(start_row=row_start, start_column=col_start, end_row=row_end, end_column=col_end)
        
        top_left = ws.cell(row=row_start, column=col_start)
        top_left.value = text
        if not isinstance(text, CellRichText):
            top_left.font = font
        top_left.alignment = alignment
        
        for r in range(row_start, row_end + 1):
            for c in range(col_start, col_end + 1):
                cell = ws.cell(row=r, column=c)
                cell.border = border_all
                if fill:
                    cell.fill = fill

    ws.row_dimensions[1].height = 110

    # Block 1: Pinkcity Enterprises Header (A1:E1)
    font_company = InlineFont(rFont='Times New Roman', sz=20, b=True)
    font_block1_addr = InlineFont(rFont='Times New Roman', sz=10)
    company_text = CellRichText(
        TextBlock(font_company, "Pinkcity Enterprises\n"),
        TextBlock(font_block1_addr, "G 78 EPIP, Sitapura Industrial Area,\n"),
        TextBlock(font_block1_addr, "Jaipur 302022 -\n"),
        TextBlock(font_block1_addr, "Phone: +91 141 277 1144\n")
    )
    style_box(1, 1, 1, 5, company_text, alignment=align_center)

    # Block 2: Buyer Address (F1:J1)
    buyer_name = pi.buyer.name if pi.buyer else "BUYER"
    buyer_addr = pi.buyer.address if (pi.buyer and pi.buyer.address) else ""
    font_buyer_title = InlineFont(rFont='Calibri', sz=20, b=True)
    font_buyer_addr = InlineFont(rFont='Calibri', sz=10)
    font_spacer_calibri = InlineFont(rFont='Calibri', sz=5)
    
    buyer_blocks = [
        TextBlock(font_spacer_calibri, "\n"),
        TextBlock(font_buyer_title, f"{buyer_name.upper()}\n"),
        TextBlock(font_spacer_calibri, "\n")
    ]
    if buyer_addr:
        buyer_blocks.append(TextBlock(font_buyer_addr, buyer_addr))
    style_box(1, 6, 1, 10, CellRichText(*buyer_blocks), alignment=align_top_left, fill=fill_gray)

    # Block 3: Delivered To (K1:N1)
    delivered_contact = pi.delivered_to_name or ""
    delivered_comp = pi.delivered_to_company or (pi.buyer.name if pi.buyer else "")
    delivered_addr = pi.delivered_to_address or ""
    font_delim = InlineFont(rFont='Calibri', sz=9)
    font_comp = InlineFont(rFont='Calibri', sz=20, b=True)
    font_addr = InlineFont(rFont='Calibri', sz=10)
    
    deliv_blocks = [TextBlock(font_spacer_calibri, "\n")]
    if delivered_contact:
        deliv_blocks.append(TextBlock(font_delim, f"DELIVERED TO: {delivered_contact}\n"))
    else:
        deliv_blocks.append(TextBlock(font_delim, "DELIVERED TO:\n"))
    deliv_blocks.append(TextBlock(font_comp, f"{delivered_comp}\n"))
    deliv_blocks.append(TextBlock(font_spacer_calibri, "\n"))
    if delivered_addr:
        deliv_blocks.append(TextBlock(font_addr, delivered_addr))
    style_box(1, 11, 1, 14, CellRichText(*deliv_blocks), alignment=align_top_left, fill=fill_gray)

    # Block 4: PI Summary Info (O1:Q1)
    formatted_date = pi.pi_date.strftime('%d/%m/%Y') if pi.pi_date else ''
    formatted_ex_fac = pi.ex_factory_date.strftime('%d %B, %Y') if pi.ex_factory_date else ''
    font_pi_bold = InlineFont(rFont='Times New Roman', sz=12, b=True)
    font_spacer_times = InlineFont(rFont='Times New Roman', sz=6)
    
    pi_summary_text = CellRichText(
        TextBlock(font_spacer_times, "\n"),
        TextBlock(font_pi_bold, f"PI of PO # {pi.pi_no}\n"),
        TextBlock(font_pi_bold, f"Date : {formatted_date}\n"),
        TextBlock(font_pi_bold, f"Ex-Factory : {formatted_ex_fac}\n"),
        TextBlock(font_pi_bold, f"Payment: {pi.payment_terms or '100% TT 30 Days from BL'}")
    )
    style_box(1, 15, 1, 17, pi_summary_text, alignment=align_top_left, fill=fill_gray)

    # Table Headers (Row 2)
    ws.row_dimensions[2].height = 28
    headers_first_part = [
        ("S. No.", 1, 1),
        ("Barcode", 2, 2),
        ("Buyer #", 3, 3),
        ("Style No.", 4, 4),
        ("Picture", 5, 5),
        ("Name", 6, 6),
        ("Size CMs", 7, 9),
    ]
    headers_second_part = [
        ("Material", 10),
        ("Finish", 11),
        ("CBM", 12),
        ("Price USD", 13),
        ("Units", 14),
        ("Total CBM", 15),
        ("Total Amount", 16),
        ("Remarks", 17),
    ]

    for title, start_col, end_col in headers_first_part:
        style_box(2, start_col, 2, end_col, title, font=font_bold_sm, alignment=align_center)
    for title, col_idx in headers_second_part:
        style_box(2, col_idx, 2, col_idx, title, font=font_bold_sm, alignment=align_center)

    blue_medium = Side(style='medium', color='1F4E78')
    thin_black = Side(style='thin', color='000000')

    for r in range(1, 3):
        for c in range(1, 18):
            cell = ws.cell(row=r, column=c)
            left_side = blue_medium if c == 1 else (thin_black if c in (6, 11, 15) else Side(style=None))
            right_side = blue_medium if c == 17 else (thin_black if c in (5, 10, 14) else Side(style=None))
            top_side = blue_medium if r == 1 else thin_black
            bottom_side = thin_black
            
            if r == 2:
                left_side = blue_medium if c == 1 else thin_black
                right_side = blue_medium if c == 17 else thin_black
            
            cell.border = Border(left=left_side, right=right_side, top=top_side, bottom=bottom_side)

    # Line Items (Row 3 onwards)
    curr_row = 3
    tot_units = 0
    tot_cbm = 0.0
    tot_amt = 0.0

    col_widths = {
        1: 5, 2: 12, 3: 12, 4: 14, 5: 20,
        6: 30, 7: 7, 8: 7, 9: 7, 10: 12,
        11: 14, 12: 9, 13: 12, 14: 9, 15: 12, 16: 14, 17: 22
    }
    for col_idx, width in col_widths.items():
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = width
        if col_idx == 9:
            ws.column_dimensions[col_letter].hidden = True

    for idx, item in enumerate(items, 1):
        ws.row_dimensions[curr_row].height = 80

        c = ws.cell(row=curr_row, column=1, value=idx)
        c.font = font_regular
        c.alignment = align_center
        c.border = border_all

        c = ws.cell(row=curr_row, column=2, value=item.barcode or "")
        c.font = font_regular
        c.alignment = align_center
        c.border = border_all

        c = ws.cell(row=curr_row, column=3, value=item.buyer_no or "")
        c.font = font_regular
        c.alignment = align_center
        c.border = border_all

        c = ws.cell(row=curr_row, column=4, value=item.style_no or "")
        c.font = font_bold_sm
        c.alignment = align_center
        c.border = border_all

        c = ws.cell(row=curr_row, column=5, value="")
        c.border = border_all

        c = ws.cell(row=curr_row, column=6, value=item.product_name or "")
        c.font = font_regular
        c.alignment = align_left
        c.border = border_all

        l = float(item.size_length) if item.size_length else ""
        b_dim = float(item.size_breadth) if item.size_breadth else ""
        h = float(item.size_height) if item.size_height else ""
        
        c_l = ws.cell(row=curr_row, column=7, value=l)
        c_l.font = font_regular
        c_l.alignment = align_center
        c_l.border = border_all
        
        c_b = ws.cell(row=curr_row, column=8, value=b_dim)
        c_b.font = font_regular
        c_b.alignment = align_center
        c_b.border = border_all
        
        c_h = ws.cell(row=curr_row, column=9, value=h)
        c_h.font = font_regular
        c_h.alignment = align_center
        c_h.border = border_all

        c = ws.cell(row=curr_row, column=10, value=item.material or "")
        c.font = font_regular
        c.alignment = align_center
        c.border = border_all

        c = ws.cell(row=curr_row, column=11, value=item.finish_color or "")
        c.font = font_regular
        c.alignment = align_center
        c.border = border_all

        cbm_val = float(item.cbm) if item.cbm else 0.0
        c = ws.cell(row=curr_row, column=12, value=cbm_val)
        c.font = font_regular
        c.alignment = align_right
        c.number_format = '0.0000'
        c.border = border_all

        price_val = float(item.price_usd) if item.price_usd else 0.0
        c = ws.cell(row=curr_row, column=13, value=price_val)
        c.font = font_regular
        c.alignment = align_right
        c.number_format = '"$"#,##0.00'
        c.border = border_all

        u_val = item.units or 0
        tot_units += u_val
        c = ws.cell(row=curr_row, column=14, value=u_val)
        c.font = font_bold_sm
        c.alignment = align_center
        c.border = border_all

        tcbm_val = float(item.total_cbm) if item.total_cbm else (u_val * cbm_val)
        tot_cbm += tcbm_val
        c = ws.cell(row=curr_row, column=15, value=tcbm_val)
        c.font = font_regular
        c.alignment = align_right
        c.number_format = '0.0000'
        c.border = border_all

        tamt_val = float(item.total_amount) if item.total_amount else (u_val * price_val)
        tot_amt += tamt_val
        c = ws.cell(row=curr_row, column=16, value=tamt_val)
        c.font = font_bold_sm
        c.alignment = align_right
        c.number_format = '"$"#,##0.00'
        c.border = border_all

        c = ws.cell(row=curr_row, column=17, value=item.remarks or "")
        c.font = font_regular
        c.alignment = align_left
        c.border = border_all

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
                add_centered_image(ws, f"E{curr_row}", xl_img)
            except Exception as e:
                print(f"Failed to embed image: {e}")

        curr_row += 1

    # Totals Row
    ws.row_dimensions[curr_row].height = 30
    style_box(curr_row, 1, curr_row, 13, "TOTAL", font=font_bold_md, alignment=align_right)
    
    c_u = ws.cell(row=curr_row, column=14, value=tot_units)
    c_u.font = font_bold_md
    c_u.alignment = align_center
    c_u.border = border_all

    c_cbm = ws.cell(row=curr_row, column=15, value=tot_cbm)
    c_cbm.font = font_bold_md
    c_cbm.alignment = align_right
    c_cbm.number_format = '0.0000'
    c_cbm.border = border_all

    c_amt = ws.cell(row=curr_row, column=16, value=tot_amt)
    c_amt.font = font_bold_md
    c_amt.alignment = align_right
    c_amt.number_format = '"$"#,##0.00'
    c_amt.border = border_all

    c_rem = ws.cell(row=curr_row, column=17, value="")
    c_rem.border = border_all


def generate_ef_pi_excel(ws, pi, items, temp_files):
    """
    Generates the comprehensive 31-column EF PI Excel format.
    Includes Pinkcity Enterprises header, buyer consignee info, finish & fabric swatches,
    packing sizes, weights, delivery remarks box, Kotak bank info, and contractual terms.
    """
    total_cols = 31  # Columns A to AE

    side_thin_black = Side(style='thin', color='000000')
    side_medium_black = Side(style='medium', color='000000')
    side_thick_red = Side(style='medium', color='FF0000')
    side_thin_red = Side(style='thin', color='FF0000')

    box_border = Border(left=side_thin_black, right=side_thin_black, top=side_thin_black, bottom=side_thin_black)
    header_border = Border(left=side_thin_black, right=side_thin_black, top=side_medium_black, bottom=side_medium_black)

    # Fonts matching exact reference specifications
    font_title = Font(name="Calibri", size=16, bold=True, color="000000")
    font_sub_blue = Font(name="Calibri", size=10, bold=True, color="0070C0")
    font_header_sub = Font(name="Calibri", size=9.5, bold=True, color="000000")
    font_pi_title = Font(name="Calibri", size=11, bold=True, color="000000")

    font_label_bold = Font(name="Calibri", size=9.5, bold=True, color="000000")
    font_value_bold = Font(name="Calibri", size=9.5, bold=True, color="000000")
    font_value_reg = Font(name="Calibri", size=9, bold=False, color="000000")

    font_table_hdr = Font(name="Calibri", size=9, bold=True, color="000000")
    font_table_hdr_red = Font(name="Calibri", size=9, bold=True, color="FF0000")
    font_table_data = Font(name="Calibri", size=9, bold=False, color="000000")
    font_table_data_bold = Font(name="Calibri", size=9.5, bold=True, color="000000")

    font_rem_hdr = Font(name="Calibri", size=10, bold=True, color="FF0000")
    font_rem_text = Font(name="Calibri", size=9.5, bold=False, color="FF0000")
    font_rem_date = Font(name="Calibri", size=15, bold=True, color="FF0000")

    font_term_title = Font(name="Calibri", size=10, bold=True, color="000000")
    font_term_body = Font(name="Calibri", size=8.5, bold=False, color="000000")

    fill_header = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")
    fill_yellow = PatternFill(start_color="FFFF00", end_color="FFFF00", fill_type="solid")

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center", wrap_text=True)

    # 1. Exact Column Widths (Cols A to AE)
    col_widths = {
        'A': 22,  # ITEM NO.
        'B': 18,  # Picture
        'C': 26,  # Product Name
        'D': 24,  # Description
        'E': 14,  # MATERIAL
        'F': 12,  # No. Fabric
        'G': 14,  # Picture (Fabric)
        'H': 12,  # Metal colour
        'I': 12,  # Plastic colour
        'J': 15,  # Wood Colour
        'K': 13,  # Price / Parts
        'L': 16,  # Remark [required]
        'M': 7,   # Product Size H
        'N': 7,   # Product Size W
        'O': 7,   # Product Size D
        'P': 7,   # Packing Size H
        'Q': 7,   # Packing Size W
        'R': 7,   # Packing Size D
        'S': 9,   # CBM
        'T': 9,   # Total CBM
        'U': 12,  # Leg color
        'V': 12,  # Table top colour
        'W': 10,  # CTN
        'X': 15,  # Certification & Warranty
        'Y': 13,  # ID (provided)
        'Z': 14,  # Barcode / Certification (provided)
        'AA': 10, # QTY (PCS)
        'AB': 14, # FOB CITY (Price per Unit)
        'AC': 14, # Total Amount
        'AD': 13, # Net Weight
        'AE': 13, # Gross Weight
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    # Helper to style outer border of a rectangular area without interior vertical grid lines
    def apply_outer_frame(ws_obj, r_start, c_start, r_end, c_end, side_style):
        for r in range(r_start, r_end + 1):
            for c in range(c_start, c_end + 1):
                cell = ws_obj.cell(row=r, column=c)
                top_b = side_style if r == r_start else (cell.border.top if cell.border else None)
                bot_b = side_style if r == r_end else (cell.border.bottom if cell.border else None)
                left_b = side_style if c == c_start else (cell.border.left if cell.border else None)
                right_b = side_style if c == c_end else (cell.border.right if cell.border else None)
                cell.border = Border(top=top_b, bottom=bot_b, left=left_b, right=right_b)

    # 2. Section 1: Top Exporter Header (Rows 1 to 5)
    # Merging across A to AE ensures zero interior vertical grid lines and perfect centering
    ws.merge_cells('A1:AE1')
    ws['A1'] = "PINKCITY ENTERPRISES"
    ws['A1'].font = font_title
    ws['A1'].alignment = align_center
    ws.row_dimensions[1].height = 24

    ws.merge_cells('A2:AE2')
    ws['A2'] = "TEL:+911412771144    FAX: +911412771144    Mob:+91 9929777222"
    ws['A2'].font = font_sub_blue
    ws['A2'].alignment = align_center
    ws.row_dimensions[2].height = 18

    ws.merge_cells('A3:AE3')
    ws['A3'] = "E-mail:sourabh@pinkcityfurniture.com                                                Contact Person :  SOURABH YADAV"
    ws['A3'].font = font_header_sub
    ws['A3'].alignment = align_center
    ws.row_dimensions[3].height = 18

    ws.merge_cells('A4:AE4')
    ws['A4'] = "G78, EPIP, SITAPURA INDUSTRIAL AREA, JAIPUR 302022"
    ws['A4'].font = font_header_sub
    ws['A4'].alignment = align_center
    ws.row_dimensions[4].height = 18

    ws.merge_cells('A5:AE5')
    ws['A5'] = "PROFORMA INVOICE"
    ws['A5'].font = font_pi_title
    ws['A5'].alignment = align_center
    ws.row_dimensions[5].height = 20

    # Horizontal divider border under Row 5
    for c in range(1, total_cols + 1):
        cell = ws.cell(row=5, column=c)
        cell.border = Border(bottom=side_medium_black)

    # 3. Section 2: Consignee & Order Metadata (Rows 6 to 12)
    # Merging text cells across C to L and O to R completely eliminates "boxes inside the details"
    buyer = pi.buyer
    buyer_name = (pi.delivered_to_company or (buyer.name if buyer else '') or 'PROCEED YOUR COMMERCE S.L.').strip()
    buyer_addr = (pi.delivered_to_address or (buyer.address if buyer else '') or 'Poligono Industrial La Planiza s/n 46725 Llocnou de Sant Jeroni (Valencia). Spain').strip()
    buyer_phone = (buyer.phone if buyer else '') or '+34 678064958'
    buyer_email = (buyer.email if buyer else '') or 'purchases04@europefurni.com'
    contact_name = (pi.delivered_to_name or "Evans").strip()

    # Compute delivery week (e.g. W43)
    deliv_date_str = ""
    deliv_week_str = ""
    if pi.ex_factory_date:
        deliv_date_str = pi.ex_factory_date.strftime("%d %b, %Y")
        week_num = pi.ex_factory_date.isocalendar()[1]
        deliv_week_str = f" (W{week_num})"
    elif pi.pi_date:
        week_num = pi.pi_date.isocalendar()[1]
        deliv_week_str = f" (W{week_num})"

    pi_date_formatted = pi.pi_date.strftime("%d-%b-%y") if pi.pi_date else ""

    ws.row_dimensions[6].height = 6  # Spacing row

    # Row 7: Consigned to / Date
    ws.row_dimensions[7].height = 18
    ws.merge_cells('A7:B7')
    c_a7 = ws.cell(row=7, column=1, value="CONSIGNED TO:")
    c_a7.font = font_label_bold
    c_a7.alignment = align_left

    ws.merge_cells('C7:L7')
    c_c7 = ws.cell(row=7, column=3, value=f"{buyer_name}       CIF B88390984")
    c_c7.font = font_value_bold
    c_c7.alignment = align_left

    ws.merge_cells('M7:N7')
    c_m7 = ws.cell(row=7, column=13, value="DATE:")
    c_m7.font = font_label_bold
    c_m7.alignment = align_right

    ws.merge_cells('O7:R7')
    c_o7 = ws.cell(row=7, column=15, value=pi_date_formatted)
    c_o7.font = font_value_bold
    c_o7.alignment = align_left

    # Row 8: Telf / Invoice No
    ws.row_dimensions[8].height = 18
    ws.merge_cells('A8:B8')
    c_a8 = ws.cell(row=8, column=1, value="Telf:")
    c_a8.font = font_label_bold
    c_a8.alignment = align_left

    ws.merge_cells('C8:L8')
    c_c8 = ws.cell(row=8, column=3, value=buyer_addr)
    c_c8.font = font_value_reg
    c_c8.alignment = align_left

    ws.merge_cells('M8:N8')
    c_m8 = ws.cell(row=8, column=13, value="INVOICE NO:")
    c_m8.font = font_label_bold
    c_m8.alignment = align_right

    ws.merge_cells('O8:R8')
    c_o8 = ws.cell(row=8, column=15, value=f"PI # {pi.pi_no}{deliv_week_str}")
    c_o8.font = font_value_bold
    c_o8.alignment = align_left

    # Row 9: Contacts / TO
    ws.row_dimensions[9].height = 18
    ws.merge_cells('A9:B9')
    c_a9 = ws.cell(row=9, column=1, value="Cell phone:")
    c_a9.font = font_label_bold
    c_a9.alignment = align_left

    ws.merge_cells('C9:L9')
    c_c9 = ws.cell(row=9, column=3, value=f"{contact_name} {buyer_phone} EMAIL: {buyer_email}")
    c_c9.font = font_value_reg
    c_c9.alignment = align_left

    ws.merge_cells('M9:N9')
    c_m9 = ws.cell(row=9, column=13, value="TO:")
    c_m9.font = font_label_bold
    c_m9.alignment = align_right

    ws.merge_cells('O9:R9')
    c_o9 = ws.cell(row=9, column=15, value="Valencia / Spain")
    c_o9.font = font_value_bold
    c_o9.alignment = align_left

    # Row 10: Delivery
    ws.row_dimensions[10].height = 18
    ws.merge_cells('A10:B10')
    c_a10 = ws.cell(row=10, column=1, value="DELIVERY:")
    c_a10.font = font_label_bold
    c_a10.alignment = align_left

    ws.merge_cells('C10:L10')
    c_c10 = ws.cell(row=10, column=3, value=getattr(pi, 'terms_delivery', None) or "Ex-Factory")
    c_c10.font = font_value_reg
    c_c10.alignment = align_left

    # Row 11: Payment
    ws.row_dimensions[11].height = 18
    ws.merge_cells('A11:B11')
    c_a11 = ws.cell(row=11, column=1, value="PAYMENT:")
    c_a11.font = font_label_bold
    c_a11.alignment = align_left

    ws.merge_cells('C11:L11')
    c_c11 = ws.cell(row=11, column=3, value=pi.payment_terms or "30% deposit and 70% Balance payment for Telex")
    c_c11.font = font_value_reg
    c_c11.alignment = align_left

    # Row 12: From
    ws.row_dimensions[12].height = 18
    ws.merge_cells('A12:B12')
    c_a12 = ws.cell(row=12, column=1, value="FROM:")
    c_a12.font = font_label_bold
    c_a12.alignment = align_left

    ws.merge_cells('C12:L12')
    c_c12 = ws.cell(row=12, column=3, value="Jaipur, India / MUNDRA PORT")
    c_c12.font = font_value_reg
    c_c12.alignment = align_left

    # Outer border around entire top header & details frame (A1:AE12)
    apply_outer_frame(ws, 1, 1, 12, total_cols, side_medium_black)
    for c in range(1, total_cols + 1):
        cell = ws.cell(row=12, column=c)
        top_b = cell.border.top if cell.border else None
        left_b = cell.border.left if cell.border else None
        right_b = cell.border.right if cell.border else None
        cell.border = Border(top=top_b, bottom=side_medium_black, left=left_b, right=right_b)

    # 4. Section 3: Data Table Headers (Row 13)
    ws.row_dimensions[13].height = 40
    headers = [
        'ITEM NO.', 'Picture', 'Product Name', 'Description', 'MATERIAL',
        'No. Fabric', 'Picture', 'Metal colour', 'Plastic colour', 'Wood Colour',
        'Price', 'Remark [required]', 'Product Size ( Height, Width, Depth) (cm)', '', '',
        'Packing Size ( Height, Width, Depth) (cm)', '', '', 'CBM', 'Total',
        'Leg color', 'Table top colour', 'CTN (Units per ...)', 'Certification & Warranty',
        'ID (provided)', 'Certification (provided)', 'QTY (PCS)', 'FOB CITY (Price per Unit)',
        'Total Amount', 'Net Weight', 'Gross Weight'
    ]
    for col_idx, h_text in enumerate(headers, 1):
        c = ws.cell(row=13, column=col_idx, value=h_text)
        c.fill = fill_header
        c.font = font_table_hdr_red if ('Remark' in h_text or 'Price' in h_text or 'FOB' in h_text) else font_table_hdr
        c.alignment = align_center
        c.border = header_border

    ws.merge_cells('M13:O13')
    ws.merge_cells('P13:R13')

    # Lookup finish records for wood/fabric swatch images
    finish_records = []
    try:
        for fin in Finish.objects.filter(image__isnull=False):
            if fin.image and os.path.exists(fin.image.path):
                finish_records.append({
                    'category': (fin.category or 'wood').lower().strip(),
                    'name': (fin.name or '').lower().strip(),
                    'code': (fin.finish_code or '').lower().strip(),
                    'path': fin.image.path
                })
    except Exception:
        pass

    # Helper function to find swatch path
    def find_swatch_path(finish_str, category):
        if not finish_str:
            return None
        clean_name = str(finish_str).split('/')[0].strip().lower()
        if not clean_name:
            return None
        for rec in finish_records:
            if rec['category'] == category and (rec['name'] == clean_name or rec['code'] == clean_name):
                return rec['path']
        for rec in finish_records:
            if rec['name'] == clean_name or rec['code'] == clean_name:
                return rec['path']
        for rec in finish_records:
            if (rec['category'] == category or not category) and (clean_name in rec['name'] or rec['name'] in clean_name):
                return rec['path']
        return None

    # Helper to sanitize strings so Excel doesn't misinterpret them as broken formulas or #Value!
    def clean_str(val):
        if val is None:
            return ""
        s = str(val).strip()
        if s.startswith("="):
            return "'" + s
        return s

    # 5. Populate Data Rows (Row 14 onwards)
    curr_row = 14
    tot_units = 0
    tot_cbm = 0.0
    tot_amt = 0.0

    for idx, item in enumerate(items, 1):
        ws.row_dimensions[curr_row].height = 75
        bm = item.buyer_master

        # Extract values
        item_style = clean_str(item.style_no or (bm.style_no if bm else ""))
        prod_name = clean_str((bm.product_name if bm and bm.product_name else item.product_name) or "")
        desc = clean_str((bm.description if bm and bm.description else item.remarks) or "")
        material_val = clean_str((bm.wood_type if bm and bm.wood_type else item.material) or "Mango")
        fabric_type = clean_str(bm.fabric_type if bm else "")
        metal_col = clean_str(bm.metal_finish if bm else "")
        plastic_col = clean_str(bm.plastic_type if bm else "")
        wood_col = clean_str((bm.wood_finish if bm and bm.wood_finish else item.finish_color) or "")
        price_val = float(item.price_usd) if item.price_usd else (float(bm.price_usd) if bm and bm.price_usd else 0.0)
        remark_val = clean_str(item.remarks or (bm.remark if bm else ""))

        # Sizes
        p_h = float(item.size_height) if item.size_height else (float(bm.size_height) if bm and bm.size_height else "")
        p_w = float(item.size_length) if item.size_length else (float(bm.size_length) if bm and bm.size_length else "")
        p_d = float(item.size_breadth) if item.size_breadth else (float(bm.size_breadth) if bm and bm.size_breadth else "")

        pack_h = float(bm.box_height) if bm and bm.box_height else ""
        pack_w = float(bm.box_length) if bm and bm.box_length else ""
        pack_d = float(bm.box_breadth) if bm and bm.box_breadth else ""

        cbm_val = float(item.cbm) if item.cbm else (float(bm.cbm) if bm and bm.cbm else 0.15)
        u_val = item.units or (bm.units if bm else 1)
        tot_units += u_val

        item_tcbm = float(item.total_cbm) if item.total_cbm else round(u_val * cbm_val, 4)
        tot_cbm += item_tcbm

        leg_col = clean_str(bm.leg_color if bm and bm.leg_color else wood_col)
        top_col = clean_str(bm.table_top_color if bm and bm.table_top_color else wood_col)
        ctn_val = str(bm.ctn) if bm and bm.ctn is not None and str(bm.ctn) != "" else "1"

        buyer_id_val = clean_str(item.buyer_no or (bm.buyer_code if bm else ""))
        barcode_val = clean_str(item.barcode or "")

        fob_city_val = float(bm.fob_city) if bm and bm.fob_city else price_val
        tamt_val = float(item.total_amount) if item.total_amount else round(u_val * price_val, 2)
        tot_amt += tamt_val

        net_wt_str = f"{float(bm.net_weight):.3f} Kg." if bm and bm.net_weight else ""
        gross_wt_str = f"{float(bm.gross_weight):.3f} Kg." if bm and bm.gross_weight else ""

        row_vals = [
            item_style, "", prod_name, desc, material_val,
            fabric_type, "", metal_col, plastic_col, wood_col,
            price_val, remark_val, p_h, p_w, p_d,
            pack_h, pack_w, pack_d, cbm_val, item_tcbm,
            leg_col, top_col, ctn_val, "Standard",
            buyer_id_val, barcode_val, u_val, fob_city_val,
            tamt_val, net_wt_str, gross_wt_str
        ]

        for col_idx, val in enumerate(row_vals, 1):
            cell = ws.cell(row=curr_row, column=col_idx, value=val)
            cell.alignment = align_center if col_idx not in (3, 4, 12) else align_left
            cell.font = font_table_data_bold if col_idx in (1, 11, 27, 29) else font_table_data
            cell.border = box_border

            # Formats
            if col_idx in (11, 28, 29) and isinstance(val, (int, float)):
                cell.number_format = '"$"#,##0.00'
            elif col_idx in (19, 20) and isinstance(val, (int, float)):
                cell.number_format = '0.00'

        # Embed Product Picture (Col B)
        sample_img = None
        if bm and bm.sample:
            first_s_img = bm.sample.images.first()
            if first_s_img and first_s_img.image and os.path.exists(first_s_img.image.path):
                sample_img = first_s_img.image.path
        if not sample_img and bm and bm.packaging_image and os.path.exists(bm.packaging_image.path):
            sample_img = bm.packaging_image.path

        if sample_img:
            try:
                p_img = PILImage.open(sample_img)
                if p_img.mode in ('RGBA', 'LA', 'P'):
                    p_img = p_img.convert('RGB')
                p_img.thumbnail((80, 60))
                tmp_f = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                p_img.save(tmp_f.name, format='JPEG', quality=85)
                tmp_f.close()
                temp_files.append(tmp_f.name)

                xl_img = OpenpyxlImage(tmp_f.name)
                add_centered_image(ws, f"B{curr_row}", xl_img)
            except Exception as e:
                print(f"Error drawing product picture: {e}")

        # Embed Wood Swatch (Col J)
        wood_swatch_path = find_swatch_path(wood_col, 'wood')
        if wood_swatch_path and os.path.exists(wood_swatch_path):
            try:
                w_img = PILImage.open(wood_swatch_path)
                if w_img.mode in ('RGBA', 'LA', 'P'):
                    w_img = w_img.convert('RGB')
                w_img.thumbnail((55, 55))
                tmp_f = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                w_img.save(tmp_f.name, format='JPEG', quality=85)
                tmp_f.close()
                temp_files.append(tmp_f.name)

                xl_w_img = OpenpyxlImage(tmp_f.name)
                add_centered_image(ws, f"J{curr_row}", xl_w_img)
            except Exception as e:
                print(f"Error drawing wood swatch: {e}")

        curr_row += 1

    # 6. Totals Row
    ws.row_dimensions[curr_row].height = 26
    c_tcbm_lbl = ws.cell(row=curr_row, column=19, value="TOTAL CBM")
    c_tcbm_lbl.font = font_table_data_bold
    c_tcbm_lbl.alignment = align_right

    c_tcbm_val = ws.cell(row=curr_row, column=20, value=round(tot_cbm, 2))
    c_tcbm_val.font = font_table_data_bold
    c_tcbm_val.alignment = align_center
    c_tcbm_val.number_format = '0.00'

    c_tpcs_lbl = ws.cell(row=curr_row, column=26, value="TOTAL PCS")
    c_tpcs_lbl.font = font_table_data_bold
    c_tpcs_lbl.alignment = align_right

    c_tpcs_val = ws.cell(row=curr_row, column=27, value=tot_units)
    c_tpcs_val.font = font_table_data_bold
    c_tpcs_val.alignment = align_center

    curr_row += 2

    # 7. Financial Summary Box (Right) & Red/Yellow Remarks Box (Left)
    start_box_row = curr_row

    # Financial Summary (Cols AA to AC)
    deposit_amt = tot_amt * 0.30
    balance_amt = tot_amt * 0.70

    ws.row_dimensions[start_box_row].height = 20
    ws.merge_cells(f'AA{start_box_row}:AB{start_box_row}')
    ws.cell(row=start_box_row, column=27, value="Total:").font = font_table_data_bold
    c_tot = ws.cell(row=start_box_row, column=29, value=tot_amt)
    c_tot.font = font_table_data_bold
    c_tot.alignment = align_right
    c_tot.number_format = '"$"#,##0.00'

    ws.row_dimensions[start_box_row + 1].height = 20
    ws.merge_cells(f'AA{start_box_row + 1}:AB{start_box_row + 1}')
    ws.cell(row=start_box_row + 1, column=27, value="30% Deposit:").font = font_table_data_bold
    c_dep = ws.cell(row=start_box_row + 1, column=29, value=deposit_amt)
    c_dep.font = font_table_data_bold
    c_dep.alignment = align_right
    c_dep.number_format = '"$"#,##0.00'

    ws.row_dimensions[start_box_row + 2].height = 20
    ws.merge_cells(f'AA{start_box_row + 2}:AB{start_box_row + 2}')
    ws.cell(row=start_box_row + 2, column=27, value="70% Balance:").font = font_table_data_bold
    c_bal = ws.cell(row=start_box_row + 2, column=29, value=balance_amt)
    c_bal.font = font_table_data_bold
    c_bal.alignment = align_right
    c_bal.number_format = '"$"#,##0.00'

    for r_idx in range(start_box_row, start_box_row + 3):
        for c_idx in range(27, 30):
            ws.cell(row=r_idx, column=c_idx).border = box_border

    # Red/Yellow Remarks Box (Cols A to L, Rows start_box_row to start_box_row + 5)
    # Merging each row across all 12 columns completely eliminates internal vertical grid boxes
    r_box_start = start_box_row
    r_box_end = start_box_row + 5

    # Yellow Header Row: REMARKS:
    ws.row_dimensions[r_box_start].height = 20
    ws.merge_cells(start_row=r_box_start, start_column=1, end_row=r_box_start, end_column=12)
    c_rem_hdr = ws.cell(row=r_box_start, column=1, value="REMARKS:")
    c_rem_hdr.fill = fill_yellow
    c_rem_hdr.font = font_rem_hdr
    c_rem_hdr.alignment = align_center

    # Row 1: Payment term
    ws.row_dimensions[r_box_start + 1].height = 18
    ws.merge_cells(start_row=r_box_start + 1, start_column=1, end_row=r_box_start + 1, end_column=12)
    c_pay = ws.cell(row=r_box_start + 1, column=1, value="1. Payment term: 30% deposit and 70% Balance payment for Telex")
    c_pay.font = font_rem_text
    c_pay.alignment = align_center

    # Row 2: Delivery Date (Big Bold Red)
    ws.row_dimensions[r_box_start + 2].height = 28
    ws.merge_cells(start_row=r_box_start + 2, start_column=1, end_row=r_box_start + 2, end_column=12)
    c_deliv = ws.cell(row=r_box_start + 2, column=1, value=f"2. Delivery date: {deliv_date_str or '20 Oct, 2026'}{deliv_week_str or ' (W43)'}")
    c_deliv.font = font_rem_date
    c_deliv.alignment = align_center

    # Row 3: Delivery Port
    ws.row_dimensions[r_box_start + 3].height = 18
    ws.merge_cells(start_row=r_box_start + 3, start_column=1, end_row=r_box_start + 3, end_column=12)
    c_port = ws.cell(row=r_box_start + 3, column=1, value="3. Delivery Port: MUNDRA")
    c_port.font = font_rem_text
    c_port.alignment = align_center

    # Row 4: PI Validity
    ws.row_dimensions[r_box_start + 4].height = 18
    ws.merge_cells(start_row=r_box_start + 4, start_column=1, end_row=r_box_start + 4, end_column=12)
    c_val = ws.cell(row=r_box_start + 4, column=1, value="4. PI Validity: 30 DAYS FOR CONFIRMATION")
    c_val.font = font_rem_text
    c_val.alignment = align_center

    # Row 5: Seal:
    ws.row_dimensions[r_box_start + 5].height = 36
    ws.merge_cells(start_row=r_box_start + 5, start_column=1, end_row=r_box_start + 5, end_column=12)
    c_seal = ws.cell(row=r_box_start + 5, column=1, value="  Seal:")
    c_seal.font = font_rem_text
    c_seal.alignment = Alignment(horizontal="left", vertical="top")

    # Apply Clean Red Borders to the Remarks Box:
    # Outer red medium border, horizontal thin red lines between rows, NO vertical lines inside
    for r in range(r_box_start, r_box_end + 1):
        for c in range(1, 13):
            cell = ws.cell(row=r, column=c)
            top_b = side_thick_red if r == r_box_start else side_thin_red
            bot_b = side_thick_red if r == r_box_end else side_thin_red
            left_b = side_thick_red if c == 1 else None
            right_b = side_thick_red if c == 12 else None
            cell.border = Border(left=left_b, right=right_b, top=top_b, bottom=bot_b)

    # 8. Section 6: Bank Details Block (Positioned cleanly directly below Remarks Box without interior grid boxes)
    curr_row = r_box_end + 2
    bank_lines = [
        ("Bank Name:", "Kotak Mahindra Bank Ltd"),
        ("BANK ADDRESS :", "Malviya Nagar, Jaipur Rajasthan"),
        ("BANK ACCONUNT:", "2811431462"),
        ("SWIFT CODE:", "KKBKINBB"),
        ("Beneficiary's Name:", "PINKCITY ENTERPRISES"),
        ("Beneficiary's Name:", "PINKCITY ENTERPRISES")
    ]
    for lbl, val in bank_lines:
        ws.row_dimensions[curr_row].height = 18
        ws.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=3)
        c_lbl = ws.cell(row=curr_row, column=1, value=lbl)
        c_lbl.font = font_label_bold
        c_lbl.alignment = align_left

        ws.merge_cells(start_row=curr_row, start_column=4, end_row=curr_row, end_column=12)
        c_val = ws.cell(row=curr_row, column=4, value=val)
        c_val.font = font_value_bold
        c_val.alignment = align_left
        curr_row += 1

    # 9. Section 7: Contractual Terms Box & Signatures (Framed in an outer border with clean white text)
    curr_row += 1
    terms_start_row = curr_row

    terms = [
        ("1.Terms of payment:", font_term_title, 20),
        ("- 30% deposit and 70% Balance payment for Telex", font_term_body, 18),
        ("2.Cargo Ready & Shipment:", font_term_title, 20),
        ("a. Cargo Ready Date schedule strictly refer to Cargo Ready Plan document in next sheet . Quality inspection will follow AQL INTERNATIONAL STANDARD and the additional annex attached (Annex I & II) ,", font_term_body, 22),
        ("b. Except for force majeure, if delay on Cargo Ready Date occurs:", font_term_body, 18),
        ("  1)If there is any problem with the cargo seller should update buyer within 2 weeks in advance to be available to delay the SO without fine, late than that it would be a fine and it would be undertaken by seller.", font_term_body, 24),
        ("  Nowadays all our shipments are subjected to a contract with the shipping companies. In case, the seller notice the buyer in less than 2 weeks in order to delay the shipment, the containers will be subjected to a fine from $5000 up to the full cost of the space based on the contract with each shipping company.", font_term_body, 32),
        (f"  2) In case of production delay buyer will allow a period of 7 days to release the production in good conditions based in Annex I & AQL Annex II . All delayed volume after Delivery date: {deliv_date_str or '20 Oct, 2026'}{deliv_week_str or ' (W43)'} + 7 days and the batch afterwards are considered to be cancelled. After the cancellation, the deposit for this cancelled order volume should be refunded to buyer within 7 days.", font_term_body, 32),
        ("  3) In case the buyer place the order from a Hongkongese company wich it will be signed and stamped by the buyer and seller. The manufacturer must provide the stamp and signature of the Chinese company in this same contract in addition to the company name from the manufacturer and the exporting company.", font_term_body, 32),
        ("  4) The supreme court will be define by the contract in case of dispute.", font_term_body, 18),
        ("  5) Late shipment terms: except for force majeure, buyer has the right to deduct 1.5% from this PI if seller deliver shipment later than agreed dates between both parties.", font_term_body, 20),
        ("3.Loading port & Destination: From (MUNDRA) for the most part to VALENCIA W/T FREIGHT COLLECT", font_term_title, 20),
        ("4.Insurance:", font_term_title, 18),
        ("TO BE COVERED BY THE BUYERS AND SELLER RELATED TO THE INCOTERM", font_term_body, 18),
        ("5. MAIN MARK:", font_term_title, 18),
        ("THE MASIE", font_term_title, 18),
        ("6.Additional terms:", font_term_title, 20),
        ("Product Warranty Terms. In case of quality discrepancy, claim should be filed by the Buyer within 365 days after the arrival of the goods at port of destination. It is understood that the Seller shall not be liable for any discrepancy of the goods shipped due to causes for which the Insurance Company, Shipping Company, other Transportation Organization /or Post Office are liable.", font_term_body, 30),
        ("The seller guarantees that the products purchased the buyer are directly produced by it or legally adapted by it or designed by it without any disputes of ownership, including but not limited to ownership, intellectual products, copyrights, brands, trademarks, copyrights, etc., and these products should meet the requirements of various legal regulations of European safety and quality standards, otherwise all responsibilities shall be borne by the seller. If the buyer is thus claimed by a third party for its rights and interests, the buyer has the right to request the seller to bear the corresponding responsibilities and to request the seller to bear the liability for breach of contract and accordingly pay 30% of the total purchase amount the batch of goods, and if the agreed penalty is still insufficient to cover the buyer's losses, the buyer has the right to request the seller to compensate for the actual losses.", font_term_body, 50),
        ("", font_term_body, 10),
        ("Force Majeure : The Seller shall not be held liable for failure delay delivery of the entire lot or a portion of the commodity under this Contract in consequence of any force majeure incidents.", font_term_body, 22),
        ("REMARKS", font_term_title, 20),
        ("ALL PAYMENT TERMS QUALITY AGREEMENT AND SHIPPING TERMS INCLUDING SHIPPING DATE UNDER THIS ORDER IS INDEPENDENT FROM ANY OTHER AGREEMENT SIGNED BETWEEN SELLER AND BUYER", font_term_title, 22),
        ("", font_term_body, 14),
        ("SIGN AND STAMP", Font(name="Calibri", size=9.5, bold=True, underline="single"), 20),
    ]

    for text_val, text_font, r_height in terms:
        ws.row_dimensions[curr_row].height = r_height
        ws.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=total_cols)
        c = ws.cell(row=curr_row, column=1, value=text_val)
        c.font = text_font
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        curr_row += 1

    # Signature Block: Buyer & Seller
    ws.row_dimensions[curr_row].height = 36
    ws.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=10)
    c_b = ws.cell(row=curr_row, column=1, value="BUYER")
    c_b.font = font_title
    c_b.alignment = align_left

    ws.merge_cells(start_row=curr_row, start_column=20, end_row=curr_row, end_column=total_cols)
    c_s = ws.cell(row=curr_row, column=20, value="SELLER")
    c_s.font = font_title
    c_s.alignment = align_left

    terms_end_row = curr_row

    # Outer border around entire Contract Terms Box (A{terms_start_row}:AE{terms_end_row})
    apply_outer_frame(ws, terms_start_row, 1, terms_end_row, total_cols, side_medium_black)


def export_buyer_pi_excel(pi, format_type='general', item_ids=None):
    """
    Main dispatch service for exporting a Buyer PI to Excel.
    - format_type: 'general' (Standard 17-col) or 'ef' (31-col with swatches & legal terms)
    - item_ids: Optional list/set of BuyerPIItem UUID strings for partial selective export
    """
    format_type = (format_type or 'general').lower().strip()

    wb = openpyxl.Workbook()
    ws = wb.active
    clean_title = f"PI_{pi.pi_no}"[:31]
    ws.title = clean_title
    ws.views.sheetView[0].showGridLines = True

    temp_files = []

    # Filter items if specific item_ids are provided
    items_qs = pi.items.select_related(
        'buyer_master',
        'buyer_master__sample',
        'buyer_master__buyer'
    ).prefetch_related(
        'buyer_master__sample__images'
    ).all()

    if item_ids:
        # Preserve original ordering
        id_set = set(str(i) for i in item_ids)
        items = [it for it in items_qs if str(it.id) in id_set]
    else:
        items = list(items_qs)

    if format_type == 'ef':
        generate_ef_pi_excel(ws, pi, items, temp_files)
        suffix = "EF"
    else:
        generate_general_pi_excel(ws, pi, items, temp_files)
        suffix = "General"

    selected_tag = "_Selected" if item_ids and len(items) < len(items_qs) else ""
    filename = f"PI_{pi.pi_no}_{suffix}{selected_tag}.xlsx"

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    wb.save(response)

    for f in temp_files:
        try:
            os.remove(f)
        except Exception:
            pass

    return response

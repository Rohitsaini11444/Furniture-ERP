import os
from decimal import Decimal
from io import BytesIO
from django.utils import timezone
from django.conf import settings
from PIL import Image as PILImage

# python-pptx imports
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE


def find_image_path(item):
    """
    Finds absolute image file path for a Sample or BuyerMaster item.
    Checks model fields, related models (SampleImage, BuyerMasterFinishingImage),
    associated models, and media storage folders.
    """
    # 1. Direct image field on sample or buyer master
    for field_name in ['image', 'packaging_image']:
        img_attr = getattr(item, field_name, None)
        if img_attr and hasattr(img_attr, 'path') and os.path.exists(img_attr.path):
            return img_attr.path

    # 2. Check SampleImage related objects (item.images) if item is a Sample
    if hasattr(item, 'images'):
        try:
            first_img = item.images.filter(image__isnull=False).exclude(image='').first()
            if first_img and hasattr(first_img.image, 'path') and os.path.exists(first_img.image.path):
                return first_img.image.path
        except Exception:
            pass

    # 3. If item is a BuyerMaster, check associated Sample and its images
    sample = getattr(item, 'sample', None)
    if sample:
        if sample.image and hasattr(sample.image, 'path') and os.path.exists(sample.image.path):
            return sample.image.path
        if hasattr(sample, 'images'):
            try:
                first_img = sample.images.filter(image__isnull=False).exclude(image='').first()
                if first_img and hasattr(first_img.image, 'path') and os.path.exists(first_img.image.path):
                    return first_img.image.path
            except Exception:
                pass

    # 4. Check finishing_images if item is BuyerMaster
    if hasattr(item, 'finishing_images'):
        try:
            first_finish = item.finishing_images.filter(image__isnull=False).exclude(image='').first()
            if first_finish and hasattr(first_finish.image, 'path') and os.path.exists(first_finish.image.path):
                return first_finish.image.path
        except Exception:
            pass

    # 5. Check associated BuyerMaster packaging_image if item is Sample
    if hasattr(item, 'buyer_masters'):
        try:
            bm = item.buyer_masters.filter(packaging_image__isnull=False).exclude(packaging_image='').first()
            if bm and hasattr(bm.packaging_image, 'path') and os.path.exists(bm.packaging_image.path):
                return bm.packaging_image.path
        except Exception:
            pass

    # 6. Check media directory for matching file name by style_no or sample_id
    media_root = getattr(settings, 'MEDIA_ROOT', os.path.join(os.path.dirname(__file__), '..', 'media'))
    identifiers = [getattr(item, 'style_no', ''), getattr(item, 'sample_id', '')]
    identifiers = [i for i in identifiers if i]

    for identifier in identifiers:
        for ext in ['.jpg', '.jpeg', '.png', '.webp']:
            for folder in ['samples', 'buyer_masters', 'buyer_masters/packaging', 'buyer_masters/finishing', '']:
                test_path = os.path.join(media_root, folder, f"{identifier}{ext}")
                if os.path.exists(test_path):
                    return test_path

    return None


def generate_pptx_presentation(buyer, items):
    """
    Generates a 16:9 widescreen PowerPoint Presentation (.pptx)
    - Slide 1: Cover Page with Company Logo, Title, Prepared For Buyer, Date.
    - Slide 2..N: 2 Selected Items per Slide (Left/Right side-by-side: Image + Specs Table).
    - Slide N+1: Clean, Centered Thank You & Contact Info Card Slide.
    """
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette Tokens
    C_WALNUT = RGBColor(139, 90, 43)      # #8B5A2B Brand Theme
    C_GOLD = RGBColor(217, 119, 6)        # #D97706 Gold Accent
    C_CREAM_BG = RGBColor(248, 246, 242)  # #F8F6F2 Light Luxury Background
    C_DARK = RGBColor(30, 41, 59)         # #1E293B Primary Text
    C_SLATE = RGBColor(71, 85, 105)       # #475569 Subtitle Text
    C_MUTED = RGBColor(100, 116, 139)     # #64748B Label Muted Text
    C_WHITE = RGBColor(255, 255, 255)
    C_ROW_ALT = RGBColor(248, 250, 252)   # #F8FAFC Table Alt Row
    C_BORDER = RGBColor(226, 232, 240)    # #E2E8F0 Table Border

    # ── SLIDE 1: Cover Page ──
    slide1 = prs.slides.add_slide(blank_layout)
    
    # Background
    bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = C_CREAM_BG
    bg1.line.fill.background()

    # Brand Header Bar
    top_bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(1.3))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = C_WALNUT
    top_bar.line.fill.background()

    # Company Logo Insertion
    logo_path = os.path.join(settings.BASE_DIR, '..', 'Frontend', 'src', 'assets', 'Pinkcity_Logo.png')
    if not os.path.exists(logo_path):
        logo_path = r"C:\Users\User\OneDrive\Desktop\ERP Furniture\Frontend\src\assets\Pinkcity_Logo.png"

    text_left = Inches(0.4)
    if os.path.exists(logo_path):
        try:
            slide1.shapes.add_picture(logo_path, Inches(0.4), Inches(0.15), width=Inches(1.0), height=Inches(1.0))
            text_left = Inches(1.6)
        except Exception as e:
            print("Error rendering logo in PPT:", e)

    tf_brand = slide1.shapes.add_textbox(text_left, Inches(0.25), Inches(11.0), Inches(0.8)).text_frame
    tf_brand.word_wrap = True
    p_brand = tf_brand.paragraphs[0]
    p_brand.text = "PINKCITY ENTERPRISES"
    p_brand.font.size = Pt(26)
    p_brand.font.bold = True
    p_brand.font.color.rgb = C_WHITE

    # Accent Gold Line
    gold_line = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(1.3), Inches(13.333), Inches(0.06))
    gold_line.fill.solid()
    gold_line.fill.fore_color.rgb = C_GOLD
    gold_line.line.fill.background()

    # Title & Subtitle Card
    title_box = slide1.shapes.add_textbox(Inches(1.0), Inches(1.9), Inches(11.333), Inches(2.2))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    
    p_title = tf_title.paragraphs[0]
    p_title.text = "EXCLUSIVE FURNITURE COLLECTION"
    p_title.font.size = Pt(36)
    p_title.font.bold = True
    p_title.font.color.rgb = C_DARK

    p_sub = tf_title.add_paragraph()
    p_sub.text = "Sample & Product Catalog Presentation"
    p_sub.font.size = Pt(20)
    p_sub.font.bold = True
    p_sub.font.color.rgb = C_WALNUT

    # Prepared For Card Box
    card_box = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(4.3), Inches(11.333), Inches(2.5))
    card_box.fill.solid()
    card_box.fill.fore_color.rgb = C_WHITE
    card_box.line.color.rgb = C_BORDER

    tf_info = card_box.text_frame
    tf_info.word_wrap = True
    
    p_b1 = tf_info.paragraphs[0]
    p_b1.text = "PREPARED SPECIALLY FOR:"
    p_b1.font.size = Pt(12)
    p_b1.font.bold = True
    p_b1.font.color.rgb = C_MUTED

    p_b2 = tf_info.add_paragraph()
    p_b2.text = f"{buyer.name} ({buyer.code})" if buyer else "Valued Client / General Presentation"
    p_b2.font.size = Pt(22)
    p_b2.font.bold = True
    p_b2.font.color.rgb = C_DARK

    if buyer and buyer.email:
        p_b3 = tf_info.add_paragraph()
        p_b3.text = f"Email: {buyer.email}"
        p_b3.font.size = Pt(14)
        p_b3.font.color.rgb = C_SLATE

    p_dt = tf_info.add_paragraph()
    p_dt.text = f"Date: {timezone.now().strftime('%d %B %Y')}"
    p_dt.font.size = Pt(14)
    p_dt.font.color.rgb = C_SLATE

    # ── SLIDES 2..N: 2 Selected Items per Slide ──
    item_chunks = [items[i:i + 2] for i in range(0, len(items), 2)]

    col_width = Inches(6.0)
    gap = Inches(0.533)
    start_left = Inches(0.4)

    for page_idx, chunk in enumerate(item_chunks, start=1):
        slide = prs.slides.add_slide(blank_layout)
        
        # Background
        s_bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        s_bg.fill.solid()
        s_bg.fill.fore_color.rgb = RGBColor(250, 250, 249)
        s_bg.line.fill.background()

        # Header Bar Banner
        h_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.4), Inches(0.3), Inches(12.533), Inches(0.7))
        h_bar.fill.solid()
        h_bar.fill.fore_color.rgb = C_WALNUT
        h_bar.line.fill.background()
        
        h_tf = h_bar.text_frame
        h_tf.word_wrap = True
        h_p = h_tf.paragraphs[0]
        h_p.text = f"  PINKCITY ENTERPRISES   |   PRODUCT CATALOG (Page {page_idx} of {len(item_chunks)})"
        h_p.font.size = Pt(16)
        h_p.font.bold = True
        h_p.font.color.rgb = C_WHITE
        h_bar.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

        for col_idx, item in enumerate(chunk):
            global_idx = (page_idx - 1) * 2 + col_idx + 1
            item_left = start_left + col_idx * (col_width + gap)

            style_val = getattr(item, 'style_no', '') or getattr(item, 'sample_id', '') or f"Item #{global_idx}"
            prod_val = getattr(item, 'product_name', 'Furniture Style')

            # Item Section Title Bar
            item_title_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, item_left, Inches(1.15), Inches(6.0), Inches(0.5))
            item_title_box.fill.solid()
            item_title_box.fill.fore_color.rgb = C_WALNUT
            item_title_box.line.fill.background()
            
            t_tf = item_title_box.text_frame
            t_tf.word_wrap = True
            t_p = t_tf.paragraphs[0]
            display_title = prod_val if len(prod_val) <= 32 else prod_val[:30] + "..."
            t_p.text = f" {global_idx}. {display_title} | {style_val}"
            t_p.font.size = Pt(11)
            t_p.font.bold = True
            t_p.font.color.rgb = C_WHITE
            item_title_box.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

            # Left Box: Image Container
            box_x = item_left
            box_y = Inches(1.75)
            box_w = Inches(2.5)
            box_h = Inches(5.35)

            img_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, box_x, box_y, box_w, box_h)
            img_box.fill.solid()
            img_box.fill.fore_color.rgb = RGBColor(241, 245, 249)
            img_box.line.color.rgb = C_BORDER

            # Try inserting product image
            has_image = False
            img_path = find_image_path(item)

            if img_path:
                try:
                    im = PILImage.open(img_path)
                    im_w, im_h = im.size
                    if im_w > 0 and im_h > 0:
                        aspect = im_w / im_h

                        max_w = 2.3
                        max_h = 5.15

                        if aspect > (max_w / max_h):
                            w = max_w
                            h = max_w / aspect
                        else:
                            h = max_h
                            w = max_h * aspect

                        img_left_in = (2.5 - w) / 2
                        img_top_in = 1.75 + (5.35 - h) / 2

                        slide.shapes.add_picture(
                            img_path,
                            item_left + Inches(img_left_in),
                            Inches(img_top_in),
                            width=Inches(w),
                            height=Inches(h)
                        )
                        has_image = True
                except Exception as e:
                    print(f"Error rendering image {img_path} in PPT: {e}")

            if not has_image:
                img_tf = img_box.text_frame
                img_tf.word_wrap = True
                img_p = img_tf.paragraphs[0]
                img_p.text = f"🛋️\n\n{prod_val}\nStyle #: {style_val}"
                img_p.font.size = Pt(12)
                img_p.font.color.rgb = RGBColor(148, 163, 184)
                img_p.alignment = PP_ALIGN.CENTER

            # Right Box: Structured Specs Table
            wood_val = getattr(item, 'wood_type', None) or getattr(item, 'material', '—')
            finish_val = getattr(item, 'finish_color', '—')
            length_val = getattr(item, 'size_length', 0) or 0
            breadth_val = getattr(item, 'size_breadth', 0) or 0
            height_val = getattr(item, 'size_height', 0) or 0
            cbm_val = getattr(item, 'cbm', None) or getattr(item, 'total_cbm', '—')
            price_val = getattr(item, 'price_usd', None) or getattr(item, 'usd', None) or 0
            remark_val = getattr(item, 'remark', None) or getattr(item, 'remarks', None) or 'Export Quality Specification.'

            specs_rows = [
                ("Style No", str(style_val)),
                ("Product", str(prod_val)),
                ("Material", str(wood_val)),
                ("Finish", str(finish_val)),
                ("Size (L×B×H)", f"{length_val}×{breadth_val}×{height_val} cm"),
                ("Volume", f"{cbm_val} CBM" if cbm_val != '—' else '—'),
                ("Price (USD)", f"${float(price_val):.2f}" if price_val else 'Contact Quote'),
                ("Remarks", str(remark_val))
            ]

            total_rows = len(specs_rows) + 1
            table_shape = slide.shapes.add_table(
                total_rows, 2, item_left + Inches(2.6), box_y, Inches(3.4), box_h
            )
            table = table_shape.table
            table.columns[0].width = Inches(1.1)
            table.columns[1].width = Inches(2.3)

            # Header Row
            hdr_cell = table.cell(0, 0)
            table.cell(0, 1)
            hdr_cell.fill.solid()
            hdr_cell.fill.fore_color.rgb = C_WALNUT
            hdr_tf = hdr_cell.text_frame
            hdr_p = hdr_tf.paragraphs[0]
            hdr_p.text = "PRODUCT DETAILS"
            hdr_p.font.size = Pt(10)
            hdr_p.font.bold = True
            hdr_p.font.color.rgb = C_WHITE
            hdr_cell.vertical_anchor = MSO_ANCHOR.MIDDLE

            hdr_cell2 = table.cell(0, 1)
            hdr_cell2.fill.solid()
            hdr_cell2.fill.fore_color.rgb = C_WALNUT

            # Populate Rows
            for r_idx, (label, val) in enumerate(specs_rows, start=1):
                cell_lbl = table.cell(r_idx, 0)
                cell_val = table.cell(r_idx, 1)

                row_bg = C_ROW_ALT if r_idx % 2 == 1 else C_WHITE
                cell_lbl.fill.solid()
                cell_lbl.fill.fore_color.rgb = row_bg
                cell_val.fill.solid()
                cell_val.fill.fore_color.rgb = row_bg

                cell_lbl.vertical_anchor = MSO_ANCHOR.MIDDLE
                cell_val.vertical_anchor = MSO_ANCHOR.MIDDLE

                # Label text
                p_l = cell_lbl.text_frame.paragraphs[0]
                p_l.text = f"• {label}"
                p_l.font.size = Pt(8.5)
                p_l.font.bold = True
                p_l.font.color.rgb = C_DARK

                # Value text
                p_v = cell_val.text_frame.paragraphs[0]
                p_v.text = str(val)
                p_v.font.size = Pt(8.5)
                if "Price" in label:
                    p_v.font.bold = True
                    p_v.font.color.rgb = C_GOLD
                else:
                    p_v.font.color.rgb = C_SLATE

    # ── SLIDE N+1: Ending / Thank You Page ──
    end_slide = prs.slides.add_slide(blank_layout)
    
    e_bg = end_slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    e_bg.fill.solid()
    e_bg.fill.fore_color.rgb = C_WALNUT
    e_bg.line.fill.background()

    # Center Card Container Box
    e_card = end_slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.333), Inches(5.1))
    e_card.fill.solid()
    e_card.fill.fore_color.rgb = C_WHITE
    e_card.line.color.rgb = C_BORDER

    e_tf = e_card.text_frame
    e_tf.word_wrap = True

    ep1 = e_tf.paragraphs[0]
    ep1.text = "THANK YOU FOR YOUR INTEREST!"
    ep1.font.size = Pt(34)
    ep1.font.bold = True
    ep1.font.color.rgb = C_WALNUT
    ep1.alignment = PP_ALIGN.CENTER

    ep2 = e_tf.add_paragraph()
    ep2.text = "We look forward to partnering with you on this exclusive collection."
    ep2.font.size = Pt(16)
    ep2.font.color.rgb = C_SLATE
    ep2.alignment = PP_ALIGN.CENTER

    ep_space = e_tf.add_paragraph()
    ep_space.text = "──────────────────────────────────────────────"
    ep_space.font.size = Pt(12)
    ep_space.font.color.rgb = C_BORDER
    ep_space.alignment = PP_ALIGN.CENTER

    ep3 = e_tf.add_paragraph()
    ep3.text = "PINKCITY ENTERPRISES"
    ep3.font.size = Pt(20)
    ep3.font.bold = True
    ep3.font.color.rgb = C_DARK
    ep3.alignment = PP_ALIGN.CENTER

    ep4 = e_tf.add_paragraph()
    ep4.text = "📍 Office & Works: G-78, EPIP, Sitapura Industrial Area, Tonk Road, Jaipur-302022 Rajasthan, India."
    ep4.font.size = Pt(12)
    ep4.font.color.rgb = C_SLATE
    ep4.alignment = PP_ALIGN.CENTER

    ep5 = e_tf.add_paragraph()
    ep5.text = "📞 Tele #: +91-141-2771144 / 2770033   |   📋 GSTIN/UIN: 08ABXPS4077R1Z8   |   IEC: 1397002620   |   State Code: 08"
    ep5.font.size = Pt(12)
    ep5.font.bold = True
    ep5.font.color.rgb = C_WALNUT
    ep5.alignment = PP_ALIGN.CENTER

    buf = BytesIO()
    prs.save(buf)
    return buf.getvalue()


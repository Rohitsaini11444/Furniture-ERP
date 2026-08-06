"""
db_diagram_pdf.py — ERP Database Relationships PDF Generator

Uses a proper Sugiyama-style layered hierarchical layout:
  1. Assign layers via longest-path from root nodes (topological sort)
  2. Place tables in a grid: layer = Y row, position within layer = X column
  3. Minimize crossings with barycenter ordering
  4. Draw clean top-to-bottom connectors (no criss-crossing, no spring physics)

Result: Clean, readable diagram like dbdiagram.io / MySQL Workbench
"""

import io
import math
from datetime import datetime
from collections import defaultdict, deque

from django.apps import apps
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib import colors
from reportlab.pdfgen import canvas


# ---------------------------------------------------------------------------
# Domain accent colors — used ONLY for the narrow left-edge stripe on each box.
# All headers are the same dark slate; the stripe is the domain identifier.
# ---------------------------------------------------------------------------
DOMAIN_ACCENT = {
    'Finish':                    '#16a34a',   # MASTERS — Green
    'StoreItemCategory':         '#16a34a',
    'StoreItem':                 '#16a34a',
    'ProductionUnit':            '#16a34a',
    'StoreItemRateHistory':      '#16a34a',
    'User':                      '#2563eb',   # PARTY & USERS — Blue
    'Buyer':                     '#2563eb',
    'ContractorPerson':          '#2563eb',
    'Notification':              '#2563eb',
    'UserSession':               '#2563eb',
    'Sample':                    '#ea580c',   # PRODUCT & INV — Orange
    'SampleImage':               '#ea580c',
    'StoreMaterialIn':           '#ea580c',
    'StoreDailyIssue':           '#ea580c',
    'StorePurchaseOrder':        '#ea580c',
    'StorePurchaseOrderItem':    '#ea580c',
    'BuyerMaster':               '#7c3aed',   # PURCHASE & ORDER — Purple
    'BuyerMasterFinishingImage': '#7c3aed',
    'BuyerPI':                   '#7c3aed',
    'BuyerPIItem':               '#7c3aed',
    'POExtensionLog':            '#7c3aed',
    'PerformaInvoice':           '#7c3aed',
    'PerformaInvoiceItem':       '#7c3aed',
    'BuyerUnitAllocation':       '#7c3aed',
    'UnitWorkReallocation':      '#7c3aed',
    'StockItem':                 '#dc2626',   # PRODUCTION & STOCK — Red
    'ProductionJob':             '#dc2626',
    'ProductionQCLog':           '#dc2626',
    'Supplier':                  '#0d9488',   # SUPPLIER MGMT — Teal
    'SupplierTaxInvoice':        '#0d9488',
    'SupplierTaxInvoiceItem':    '#0d9488',
    'SupplierDebitNote':         '#0d9488',
    'SupplierDebitNoteItem':     '#0d9488',
    'SupplierPO':                '#0d9488',
    'SupplierPOItem':            '#0d9488',
    'SupplierPOItemDefect':      '#0d9488',
    'SupplierPOItemDefectImage': '#0d9488',
    'POSupplierHistory':         '#0d9488',
    'GateInwardReceipt':         '#475569',   # SYSTEM & LOGS — Slate
}

# Unified header colors — same for ALL tables (professional enterprise style)
HEADER_BG  = '#1e293b'   # dark slate — same across all tables
HEADER_FG  = '#ffffff'   # white text
BOX_BG     = '#ffffff'   # white body
BOX_BORDER = '#e2e8f0'   # light gray border


def _box_height(pk_count, fk_count):
    """Calculate table box height based on row count."""
    HEADER_H = 22.0
    PK_ROW_H = 13.0
    FK_ROW_H = 11.0    # tighter FK rows
    SEPARATOR = 3.0 if (pk_count > 0 and fk_count > 0) else 0.0
    PAD = 6.0
    return HEADER_H + pk_count * PK_ROW_H + fk_count * FK_ROW_H + SEPARATOR + PAD


def _box_width(model_name, pk_fields, fk_fields):
    """Calculate table box width — consistent minimum so narrow tables don't look mismatched."""
    ICON_W = 22.0
    CHAR_W = 5.8
    MIN_W = 155.0    # raised: ensures SampleImage / BuyerMasterFinishingImage are consistent
    MAX_W = 195.0
    candidates = [len(model_name) * 7]
    for pk in pk_fields:
        candidates.append(ICON_W + len(pk) * CHAR_W)
    for fk in fk_fields:
        label = f"{fk['name']} → {fk['target_model']}"
        candidates.append(ICON_W + len(label) * 5.2)
    return min(MAX_W, max(MIN_W, max(candidates) + 10))


def generate_db_relationships_pdf():
    """
    Main entry — returns PDF bytes.
    Layout: Sugiyama hierarchical (longest-path layers, barycenter ordering).
    """
    buffer = io.BytesIO()

    # ------------------------------------------------------------------
    # 1. Introspect Django models
    # ------------------------------------------------------------------
    erp_app = apps.get_app_config('erp')
    all_models = list(erp_app.get_models())

    nodes = {}    # model_name -> {pk_fields, fk_fields}
    children = defaultdict(set)  # parent_name -> {child_names}
    parents  = defaultdict(set)  # child_name  -> {parent_names}
    all_edges = []               # (child, parent, field_name, rel_type)

    for model in all_models:
        m = model.__name__
        pk_fields, fk_fields = [], []

        for field in model._meta.get_fields():
            if getattr(field, 'primary_key', False):
                pk_fields.append(field.name)
            elif field.is_relation and field.many_to_one and not field.auto_created:
                tgt = field.remote_field.model.__name__
                rel = '1:1' if getattr(field, 'one_to_one', False) else '1:N'
                fk_fields.append({'name': field.name, 'target_model': tgt, 'type': rel})
                all_edges.append((m, tgt, field.name, rel))
                # Only track non-User edges for tree layout (User is central hub)
                if tgt != 'User':
                    children[tgt].add(m)
                    parents[m].add(tgt)
            elif field.is_relation and field.many_to_many and not field.auto_created:
                tgt = field.remote_field.model.__name__
                fk_fields.append({'name': field.name, 'target_model': tgt, 'type': 'N:N'})
                all_edges.append((m, tgt, field.name, 'N:N'))

        nodes[m] = {'pk_fields': pk_fields or ['id'], 'fk_fields': fk_fields}

    # Only include erp models
    erp_names = set(nodes.keys())

    # ------------------------------------------------------------------
    # 2. Assign layers via longest-path (Sugiyama Layer Assignment)
    #    layer 0 = root tables (no parents within erp)
    # ------------------------------------------------------------------
    # Filter parents/children to erp-only
    for m in list(children.keys()):
        children[m] = children[m] & erp_names
    for m in list(parents.keys()):
        parents[m] = parents[m] & erp_names

    # Compute longest path from each root
    layer = {}
    in_progress = set()

    def longest_path(m):
        if m in layer:
            return layer[m]
        if m in in_progress:   # cycle — break by treating as root
            return 0
        in_progress.add(m)
        if not parents[m]:
            layer[m] = 0
        else:
            layer[m] = max(longest_path(p) for p in parents[m] if p in erp_names) + 1
        in_progress.discard(m)
        return layer[m]

    for m in erp_names:
        longest_path(m)

    # Group by layer
    layers = defaultdict(list)
    for m, l in layer.items():
        layers[l].append(m)

    num_layers = max(layers.keys()) + 1

    # ------------------------------------------------------------------
    # 3. Barycenter ordering within each layer (reduce crossings)
    # ------------------------------------------------------------------
    # Top-down pass: order each layer's nodes by average parent X position
    layer_order = {}
    # Layer 0: sort alphabetically
    layer_order[0] = sorted(layers[0])

    for l in range(1, num_layers):
        def bary(m):
            par = [p for p in parents[m] if p in erp_names and layer.get(p, 0) == l - 1]
            if not par:
                return 999
            parent_layer = layer_order.get(l - 1, layers[l - 1])
            pos_map = {n: i for i, n in enumerate(parent_layer)}
            return sum(pos_map.get(p, 0) for p in par) / len(par)
        layer_order[l] = sorted(layers[l], key=bary)

    # ------------------------------------------------------------------
    # 4. Calculate box dimensions per node
    # ------------------------------------------------------------------
    box_dims = {}
    for m, n in nodes.items():
        w = _box_width(m, n['pk_fields'], n['fk_fields'])
        h = _box_height(len(n['pk_fields']), len(n['fk_fields']))
        box_dims[m] = (w, h)

    # ------------------------------------------------------------------
    # 5. Compute canvas size and node positions
    #    Layout: columns = nodes in layer, rows = layers
    #    Spacing: horizontal gap between columns, vertical gap between layers
    # ------------------------------------------------------------------
    COL_GAP = 20.0    # horizontal gap between tables
    ROW_GAP = 46.0    # vertical gap between layers (~18% tighter)
    MARGIN_L = 36.0
    MARGIN_T_OFFSET = 85.0   # below header bar
    MARGIN_B = 80.0

    # Compute per-layer column widths and row heights
    layer_widths = {}   # layer -> total row pixel width
    row_heights  = {}   # layer -> max box height in that row

    for l in range(num_layers):
        order = layer_order[l]
        total_w = sum(box_dims[m][0] for m in order) + COL_GAP * max(0, len(order) - 1)
        max_h   = max((box_dims[m][1] for m in order), default=40)
        layer_widths[l] = total_w
        row_heights[l]  = max_h

    # Canvas width = widest layer + margins
    content_w = max(layer_widths.values()) + 2 * MARGIN_L
    page_w = max(landscape(A3)[0], content_w)

    # Canvas height = sum of row heights + gaps + margins
    content_h = (sum(row_heights.values())
                 + ROW_GAP * (num_layers - 1)
                 + MARGIN_T_OFFSET + MARGIN_B)
    page_h = max(landscape(A3)[1], content_h)

    # Assign (x, y) top-left of each box
    # PDF y=0 is bottom → convert: box_top_pdf = page_h - (margin_from_top)
    node_pos = {}   # model_name -> (x, y) = bottom-left in PDF coords

    current_y_from_top = MARGIN_T_OFFSET

    for l in range(num_layers):
        order = layer_order[l]
        row_h = row_heights[l]

        # Centre this layer horizontally on the page
        total_row_w = layer_widths[l]
        start_x = MARGIN_L + (page_w - 2 * MARGIN_L - total_row_w) / 2.0

        cx = start_x
        for m in order:
            w, h = box_dims[m]
            # y in PDF coords (bottom-left origin): boxes hang DOWN from current_y_from_top
            y_pdf = page_h - current_y_from_top - h
            node_pos[m] = (cx, y_pdf, w, h)
            cx += w + COL_GAP

        current_y_from_top += row_h + ROW_GAP

    # ------------------------------------------------------------------
    # 6. Create canvas and draw
    # ------------------------------------------------------------------
    cv = canvas.Canvas(buffer, pagesize=(page_w, page_h))
    cv.setTitle("Database_Relationships.pdf")

    # Background
    cv.setFillColor(colors.white)
    cv.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    # -- Header bar --
    cv.setFillColor(colors.HexColor('#1a1a2e'))
    cv.rect(0, page_h - 52, page_w, 52, fill=1, stroke=0)
    cv.setFillColor(colors.HexColor('#b87333'))
    cv.rect(0, page_h - 52, 6, 52, fill=1, stroke=0)

    cv.setFillColor(colors.white)
    cv.setFont("Helvetica-Bold", 17)
    cv.drawString(22, page_h - 34, "PINKCITY ERP — DATABASE RELATIONSHIPS DIAGRAM")

    cv.setFillColor(colors.HexColor('#94a3b8'))
    cv.setFont("Helvetica", 8.5)
    now_str = datetime.now().strftime("%B %d, %Y — %H:%M")
    cv.drawRightString(page_w - 20, page_h - 34,
        f"Hierarchical Layout  |  Total Models: {len(nodes)}  |  Generated: {now_str}")

    # -- Legend bar --
    cv.setFillColor(colors.HexColor('#f8f9fa'))
    cv.rect(0, page_h - 68, page_w, 16, fill=1, stroke=0)
    cv.setStrokeColor(colors.HexColor('#e2e8f0'))
    cv.setLineWidth(0.6)
    cv.line(0, page_h - 68, page_w, page_h - 68)

    lx = 20
    items = [
        ("1:N", '#64748b', False),
        ("1:1", '#2563eb', False),
        ("N:N", '#9333ea', False),
        ("→ User (audit)", '#94a3b8', True),
    ]
    cv.setFont("Helvetica-Bold", 7.5)
    cv.setFillColor(colors.HexColor('#334155'))
    cv.drawString(lx, page_h - 63, "LEGEND:")
    lx += 58

    for label, clr, dashed in items:
        cv.setStrokeColor(colors.HexColor(clr))
        cv.setLineWidth(1.2)
        if dashed:
            cv.setDash([3, 2], 0)
        cv.line(lx, page_h - 60, lx + 22, page_h - 60)
        cv.setDash([], 0)
        cv.setFillColor(colors.HexColor('#334155'))
        cv.setFont("Helvetica", 7.5)
        cv.drawString(lx + 26, page_h - 63, label)
        lx += 26 + len(label) * 5.5 + 18

    # ------------------------------------------------------------------
    # 7. Draw connectors BEFORE boxes (so boxes render on top)
    # ------------------------------------------------------------------
    # Group edges by (child, parent) to merge multiple FK trunks
    edge_groups = defaultdict(list)
    for (child, parent, fname, rel_type) in all_edges:
        if child in node_pos and parent in node_pos:
            edge_groups[(child, parent)].append((fname, rel_type))

    rel_1n = rel_11 = rel_nn = 0

    for (child, parent), fk_list in edge_groups.items():
        for _, rt in fk_list:
            if rt == '1:1': rel_11 += 1
            elif rt == 'N:N': rel_nn += 1
            else: rel_1n += 1

        cx, cy, cw, ch = node_pos[child]
        px, py, pw, ph = node_pos[parent]

        is_audit = (parent == 'User')
        rt = fk_list[0][1]

        if is_audit:
            lc = colors.HexColor('#94a3b8')
            lw = 0.6
            dsh = [3, 2]
        elif rt == '1:1':
            lc = colors.HexColor('#2563eb')
            lw = 1.1
            dsh = []
        elif rt == 'N:N':
            lc = colors.HexColor('#9333ea')
            lw = 1.1
            dsh = []
        else:
            # 1:N — dark slate (not brown); clean, enterprise-grade
            lc = colors.HexColor('#64748b')
            lw = 0.85
            dsh = []

        cv.setStrokeColor(lc)
        cv.setLineWidth(lw)
        cv.setDash(dsh, 0)

        # Source: middle-top of child box
        s_x = cx + cw / 2
        s_y = cy + ch   # top of child

        # Target: middle-bottom of parent box
        t_x = px + pw / 2
        t_y = py        # bottom of parent

        # Simple L-shaped elbow: vertical then horizontal
        mid_y = (s_y + t_y) / 2

        path = cv.beginPath()
        path.moveTo(s_x, s_y)
        path.lineTo(s_x, mid_y)
        path.lineTo(t_x, mid_y)
        path.lineTo(t_x, t_y)
        cv.drawPath(path, fill=0, stroke=1)
        cv.setDash([], 0)

        # Arrowhead pointing DOWN into parent (at t_y)
        cv.setFillColor(lc)
        cv.setStrokeColor(lc)
        p = cv.beginPath()
        p.moveTo(t_x,     t_y)
        p.lineTo(t_x - 4, t_y + 6)
        p.lineTo(t_x + 4, t_y + 6)
        p.close()
        cv.drawPath(p, fill=1, stroke=0)

        # Cardinality label at midpoint
        if not is_audit:
            lbl = rt
            cv.setFillColor(lc)
            cv.setFont("Helvetica-Bold", 6.5)
            cv.drawString(t_x + 3, mid_y + 2, lbl)

        # Trunk badge if multiple FKs merged
        if len(fk_list) > 1 and not is_audit:
            cv.setFillColor(lc)
            cv.setFont("Helvetica-Bold", 5.8)
            cv.drawString(s_x + 3, (s_y + mid_y) / 2, f"{len(fk_list)}×FK")

    # ------------------------------------------------------------------
    # 8. Draw table boxes ON TOP of connectors
    # ------------------------------------------------------------------
    for m, n in nodes.items():
        if m not in node_pos:
            continue
        x, y, w, h = node_pos[m]

        hdr_clr  = HEADER_BG
        accent   = DOMAIN_ACCENT.get(m, '#64748b')

        # Drop shadow
        cv.setFillColor(colors.HexColor('#d1d5db'))
        cv.roundRect(x + 2.5, y - 2.5, w, h, 4, fill=1, stroke=0)

        # White box body
        cv.setFillColor(colors.HexColor(BOX_BG))
        cv.setStrokeColor(colors.HexColor(BOX_BORDER))
        cv.setLineWidth(1.0)
        cv.roundRect(x, y, w, h, 4, fill=1, stroke=1)

        # Uniform dark slate header strip
        hdr_h = 21.0
        cv.setFillColor(colors.HexColor(hdr_clr))
        cv.roundRect(x, y + h - hdr_h, w, hdr_h, 3, fill=1, stroke=0)
        cv.rect(x, y + h - hdr_h, w, hdr_h / 2, fill=1, stroke=0)

        # Domain accent stripe — 4px left edge colored bar
        cv.setFillColor(colors.HexColor(accent))
        cv.rect(x, y, 4, h - hdr_h, fill=1, stroke=0)

        # Model name in header
        cv.setFillColor(colors.HexColor(HEADER_FG))
        fs = 9.5 if len(m) <= 14 else (8.5 if len(m) <= 18 else 7.5)
        cv.setFont("Helvetica-Bold", fs)
        cv.drawCentredString(x + w / 2, y + h - hdr_h + 7, m)

        # Divider line
        cv.setStrokeColor(colors.HexColor('#e2e8f0'))
        cv.setLineWidth(0.5)
        cv.line(x + 5, y + h - hdr_h, x + w - 5, y + h - hdr_h)

        # PK rows
        row_y = y + h - hdr_h - 14
        for pk in n['pk_fields']:
            # PK pill
            cv.setFillColor(colors.HexColor('#fef3c7'))
            cv.roundRect(x + 6, row_y - 1, 16, 10, 2, fill=1, stroke=0)
            cv.setFillColor(colors.HexColor('#92400e'))
            cv.setFont("Helvetica-Bold", 5.5)
            cv.drawCentredString(x + 14, row_y + 2, "PK")
            cv.setFillColor(colors.HexColor('#1e293b'))
            cv.setFont("Helvetica-Bold", 7.8)
            cv.drawString(x + 26, row_y, pk)
            row_y -= 13.0

        # Thin separator between PK and FK sections
        if n['pk_fields'] and n['fk_fields']:
            row_y -= 2
            cv.setStrokeColor(colors.HexColor('#f1f5f9'))
            cv.setLineWidth(0.4)
            cv.line(x + 6, row_y + 6, x + w - 6, row_y + 6)
            row_y -= 1

        # FK rows — tightly grouped (11pt per row)
        for fk in n['fk_fields']:
            label = f"{fk['name']} → {fk['target_model']}"
            cv.setFillColor(colors.HexColor('#dbeafe'))
            cv.roundRect(x + 6, row_y - 1, 16, 9, 2, fill=1, stroke=0)
            cv.setFillColor(colors.HexColor('#1e40af'))
            cv.setFont("Helvetica-Bold", 5.2)
            cv.drawCentredString(x + 14, row_y + 1.5, "FK")
            cv.setFillColor(colors.HexColor('#475569'))
            fs_fk = 6.5 if len(label) > 26 else 7.0
            cv.setFont("Helvetica", fs_fk)
            cv.drawString(x + 26, row_y, label)
            row_y -= 11.0

    # ------------------------------------------------------------------
    # 9. Footer cards
    # ------------------------------------------------------------------
    foot_y = 10
    foot_h = 58

    cv.setFillColor(colors.white)
    cv.setStrokeColor(colors.HexColor('#e2e8f0'))
    cv.setLineWidth(0.8)
    cv.roundRect(20, foot_y, 480, foot_h, 6, fill=1, stroke=1)

    cv.setFont("Helvetica-Bold", 8)
    cv.setFillColor(colors.HexColor('#1e293b'))
    cv.drawString(32, foot_y + foot_h - 14, "NOTES:")
    cv.setFont("Helvetica", 7.2)
    cv.setFillColor(colors.HexColor('#64748b'))
    cv.drawString(32, foot_y + foot_h - 26, "• Hierarchical layout: root tables (no FK) at top, children cascade down.")
    cv.drawString(32, foot_y + foot_h - 37, "• Layer ordering uses barycenter heuristic to minimize edge crossings.")
    cv.drawString(32, foot_y + foot_h - 48, "• Multiple FK references to the same table merge into one shared connector trunk.")
    cv.drawString(32, foot_y + foot_h - 58, "• Generated automatically from live Django models.")

    cv.setFillColor(colors.white)
    cv.setStrokeColor(colors.HexColor('#e2e8f0'))
    cv.roundRect(515, foot_y, page_w - 535, foot_h, 6, fill=1, stroke=1)

    cv.setFont("Helvetica-Bold", 8)
    cv.setFillColor(colors.HexColor('#1e293b'))
    cv.drawString(530, foot_y + foot_h - 14, "RELATIONSHIP SUMMARY")

    metrics = [
        (f"1:N   {rel_1n}", '#b87333'),
        (f"1:1   {rel_11}", '#2563eb'),
        (f"N:N  {rel_nn}", '#9333ea'),
        (f"Models: {len(nodes)}", '#1e293b'),
    ]
    mx = 530
    for txt, clr in metrics:
        cv.setFont("Helvetica-Bold" if "Models" in txt else "Helvetica", 8.5)
        cv.setFillColor(colors.HexColor(clr))
        cv.drawString(mx, foot_y + 20, txt)
        mx += len(txt) * 6 + 22

    cv.showPage()
    cv.save()
    buffer.seek(0)
    return buffer.getvalue()

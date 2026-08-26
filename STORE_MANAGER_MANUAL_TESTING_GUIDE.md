# 📋 Store Manager Manual Testing Guide & Step-by-Step Flow

**Target User**: Store Manager / Store Supervisor  
**ERP Application URL**: `http://localhost:5173/store-management`  
**Purpose**: Complete manual end-to-end testing of Store Management operations with dummy test data.

---

## 📌 Prerequisites & Login Instructions
1. Open Chrome browser and go to `http://localhost:5173/login`.
2. Login with credentials:
   - **Username**: `ramesh_store_mgr`
   - **Password**: `1234`
3. Click **Sign In**. You will land on **Store Management Hub** (`/store-management`).

---

## 🛠️ Step-by-Step Testing Flow (Module by Module)

---

### MODULE 1: Create New Store Item Master (`+ New Item Master`)
> **Goal**: Add a new raw material item into the Store Master Catalog.

1. **Click Button**: Click top-right **`+ New Item Master`** button (or navigate to `/store-management/item-master/new`).
2. **Fill Dummy Test Data**:
   - **Item Code**: `TEST-SCR-2026`
   - **Item Name**: `Hardware Screw 2.5 inch`
   - **Category**: Select `Hardware` (or click `+ Category` to create a new category `Fasteners`).
   - **Unit**: Select `pcs`
   - **Base Rate (₹)**: `12.50`
   - **Reorder Level (Min Stock)**: `40`
   - **Default Status**: `Chargeable`
   - **Upload Image**: *(Optional)* Upload any sample image file.
3. **Save**: Click **`Save Item Master`**.
4. **Expected Outcome**:
   - Success toast appears: *"Item created successfully"*.
   - Item appears in **Item Master & Rate Comparison (Sheet 5)** tab with Initial Stock `0 pcs`.

---

### MODULE 2: Record Material Inward (`Material In (Credit Stock)`)
> **Goal**: Credit new stock into the store upon receiving goods from a supplier.

1. **Click Button**: Click green **`Material In (Credit Stock)`** button (or navigate to `/store-management/material-in`).
2. **Fill Dummy Test Data**:
   - **Entry Date**: Today's Date
   - **Supplier**: Select any Supplier from dropdown (e.g., *Pinkcity Suppliers*).
   - **Supplier Bill / Invoice #**: `BILL-9901`
   - **Store Item**: Select `TEST-SCR-2026 - Hardware Screw 2.5 inch`
   - **Received Quantity**: `150`
   - **Bill Rate (₹)**: `12.50`
   - **Total Amount**: Auto-calculated as `₹ 1,875.00`
3. **Save**: Click **`Save Material Inward`**.
4. **Expected Outcome**:
   - Success message appears and redirects to Store Hub.
   - **Stock Summary (Sheet 1)** updates:
     - **Inward Received Stock**: `150 pcs`
     - **Available Balance Stock**: `150 pcs`
   - Notification Bell receives a new notification: *"Material Inward Recorded"*.

---

### MODULE 3: Record Daily Outward Issue (`Daily Issue Entry (Outward)`)
> **Goal**: Issue material out of the store to a contractor for factory production.

1. **Click Button**: Click orange **`Daily Issue Entry (Outward)`** button (or navigate to `/store-management/daily-issue`).
2. **Fill Dummy Test Data**:
   - **Issue Date**: Today's Date
   - **Target Contractor**: Select any Contractor (e.g., *Suresh Contractor*).
   - **Contractor Worker / Delegate Name**: `Raju Carpenter`
   - **Store Item**: Select `TEST-SCR-2026 - Hardware Screw 2.5 inch`
   - **Issued Quantity**: `20`
   - **Issue Rate (₹)**: `12.50`
   - **Charge Status**: `Chargeable`
3. **Save**: Click **`Save Daily Issue Entry`**.
4. **Expected Outcome**:
   - Success message appears.
   - **Stock Summary (Sheet 1)** updates:
     - **Issued Stock Qty**: `20 pcs`
     - **Available Balance Stock**: Decreases from `150` $\rightarrow$ `130 pcs`.
   - **Daily Issue Entry (Sheet 2)** tab lists the voucher record.

---

### MODULE 4: Record Material Return (`Record Material Return`)
> **Goal**: Return unused/surplus material from a contractor back into store balance.

1. **Click Button**: Click amber **`Record Material Return`** button.
2. **Fill Dummy Test Data**:
   - **Return Date**: Today's Date
   - **Contractor**: Select *Suresh Contractor*
   - **Store Item**: Select `TEST-SCR-2026 - Hardware Screw 2.5 inch`
   - **Returned Quantity**: `5`
   - **Return Rate (₹)**: `12.50`
   - **Reason / Remark**: `Unused screws returned after assembly`
3. **Save**: Click **`Save Material Return`**.
4. **Expected Outcome**:
   - Success message appears: *"Material return voucher saved successfully"*.
   - **Stock Summary (Sheet 1)** updates:
     - **Available Balance Stock**: Restores from `130` $\rightarrow$ `135 pcs`.
   - **Material Returns (Sheet 3)** tab logs the return voucher.

---

### MODULE 5: Perform Physical Stock Audit (`Start Physical Audit`)
> **Goal**: Count actual physical stock in warehouse and submit variance adjustments.

1. **Click Button**: Click **`📋 Start Physical Audit`** button in the header.
2. **Perform Audit Worksheet**:
   - Find `TEST-SCR-2026` in the worksheet table.
   - **System Stock**: Displays `135.00 pcs`.
   - **Physical Count Input**: Type `130` (simulating 5 pcs lost/damaged).
   - **Variance Delta**: Auto-displays `-5.000 pcs (Deduction)`.
   - **Audit Reason**: `Physical count verification variance`.
3. **Submit**: Click **`Submit Audit Adjustments`**.
4. **Expected Outcome**:
   - Success modal confirms: *"Audit adjustments submitted to Admin for approval"*.
   - Pending adjustment request is logged for Admin review.

---

### MODULE 6: Store Analytics & Batch Low Stock Reorder Indent
> **Goal**: Review consumption speed and generate batch Purchase Requisitions for low-stock items.

1. **Store Analytics**:
   - Click **`📊 Store Analytics`** button in the header.
   - **Contractor Consumption Chart**: Displays progress bars for contractor material usage.
   - **Inventory Velocity**: Categorizes items as 🔥 **Fast-Moving**, 🔄 **Moderate**, or 💤 **Slow/Dead Stock**.
2. **Low Stock Reorder Indent**:
   - Look at top **⚠️ Low Stock Alert Banner** (or click **`Review & Generate Indent`**).
   - Modal displays items below reorder threshold with auto-calculated suggested reorder quantities.
   - Select urgency (High / Medium) and click **`Generate Purchase Requisitions`**.
3. **Expected Outcome**:
   - Green success modal: *"Successfully generated Purchase Requisitions!"*.
   - Purchase Requisition requests are sent to Admin for PO approval.

---

## 🔍 Verification Checklist Summary
| Module | Action | Expected Output | Status |
|---|---|---|---|
| **Item Master** | Add `TEST-SCR-2026` | Item listed in Sheet 5 | [ ] |
| **Material In** | Receive `150 pcs` | Balance = `150 pcs` | [ ] |
| **Daily Issue** | Issue `20 pcs` to contractor | Balance = `130 pcs` | [ ] |
| **Material Return**| Return `5 pcs` from contractor | Balance = `135 pcs` | [ ] |
| **Physical Audit** | Count `130 pcs` (Delta `-5`) | Adjustment draft sent to Admin | [ ] |
| **Reorder Indent** | Click `Generate Purchase Requisitions` | MRN Requisitions generated | [ ] |

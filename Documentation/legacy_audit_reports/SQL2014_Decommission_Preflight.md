# SQL Server 2014 Decommissioning — Final Safety Preflight Report

**Document Name:** `SQL2014_Decommission_Preflight.md`  
**Date:** November 12, 2026  
**Auditor Role:** Senior Windows Database Administrator  
**Host Machine:** HP Victus 15-fb0040AX (AMD Ryzen 5 5600H, Windows 11 Pro 64-bit)  
**Target Instance:** `MSSQLSERVER` (Microsoft SQL Server 2014 Express, 64-bit, v12.0.2269.0)  
**Retained Instance:** `SQLEXPRESS` (Microsoft SQL Server 2022 Express, 64-bit, v16.0.1220.3)  
**Active Production/Dev ERP Database:** PostgreSQL 18.6-1 (`postgresql-x64-18`, Port 5432)  
**Operational Status:** **READ-ONLY PREFLIGHT COMPLETE. NO CHANGES HAVE BEEN MADE.**

---

## Final Recommendation: GO (Approved for Phased Decommissioning)

Based on rigorous read-only verification across the Windows operating system, the database engines, the file system, and the Furniture ERP project, decommissioning **SQL Server 2014 Express (`MSSQLSERVER`)** is classified as **SAFE (GO)**.

### Summary of Authoritative Evidence:
1. **Zero User Data:** There are `0` attached user databases, `0` detached database files in registered data directories, and `0` backup (`.bak`) files.
2. **Zero Dependencies:** No local services, applications, scheduled tasks, ODBC DSNs, or ERP configurations depend on SQL Server 2014.
3. **Clean Isolation:** SQL Server 2014 binaries and data reside exclusively in version `120` directories (`MSSQL12.MSSQLSERVER`). Removing it leaves SQL Server 2022 (version `160`), Visual Studio LocalDB (version `130`), and modern ODBC/client tools completely unharmed.
4. **End-of-Life Security Benefit:** SQL Server 2014 reached official Microsoft End-of-Life on July 9, 2024. Decommissioning eliminates an unpatched background service from your system.
5. **Resource Recovery:** Reclaims **~1.32 GB of SSD storage** and eliminates background RAM/CPU draw.

---

## 1. SQL Server 2014 Instance Verification

Authoritative runtime inspection of the `MSSQLSERVER` instance via SQL Server internal dynamic management views, error logs, and Windows service infrastructure:

| Attribute | Verified Setting / State | Technical Source |
| :--- | :--- | :--- |
| **Instance Name** | `MSSQLSERVER` (Default Instance) | `SERVERPROPERTY('ServerName')` |
| **Product Edition** | Express Edition (64-bit) | `SERVERPROPERTY('Edition')` |
| **Engine Build** | `12.0.2269.0` (RTM Patch Level GDR 2269) | `SERVERPROPERTY('ProductVersion')` |
| **Process ID (PID)** | `5800` | `sys.dm_server_services` |
| **Service Account** | `NT Service\MSSQLSERVER` | `sys.dm_server_services` |
| **Current Service Status** | `Running` (Startup: `Automatic`) | `Get-Service MSSQLSERVER` |
| **Service Dependencies** | **Depends On:** None (`{}`)<br>**Dependent Services:** `{SQLSERVERAGENT}` | Windows Service Control Manager |
| **Startup Parameters** | `-d C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\master.mdf`<br>`-e C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\Log\ERRORLOG`<br>`-l C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\mastlog.ldf`<br>`-s "MSSQLSERVER"` | SQL Server ERRORLOG initialization |
| **Default Data Path** | `C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\` | `SERVERPROPERTY('InstanceDefaultDataPath')` |
| **Default Log Path** | `C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\` | `SERVERPROPERTY('InstanceDefaultLogPath')` |
| **Default Backup Path** | `C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\Backup\` | SQL Server Installation Metadata |
| **Network Listeners** | • `\\.\pipe\SQLLocal\MSSQLSERVER` (Named Pipes)<br>• `\\.\pipe\sql\query` (Shared Memory)<br>• TCP/IP Port 1433: **Inactive / Not Bound** | SQL Server ERRORLOG & `Get-NetTCPConnection` |
| **Related Services** | • `SQLSERVERAGENT`: **Stopped, Disabled**<br>• `SQLBrowser`: **Stopped, Disabled** | Windows Service Control Manager |

---

## 2. Database & Data Safety Audit

A recursive physical file audit was executed using SQL Server internal file system enumeration (`xp_dirtree`) to inspect the restricted instance storage directory:

### A. Data Directory Inventory (`MSSQL12.MSSQLSERVER\MSSQL\DATA`)
Enumeration of all files located within the default data folder:

| File Name | Extension | Role | Attached State | Size |
| :--- | :---: | :--- | :---: | :---: |
| `master.mdf` | Primary Data | SQL Server System Database (`database_id = 1`) | ONLINE | 4.00 MB |
| `mastlog.ldf` | Log | SQL Server System Log (`database_id = 1`) | ONLINE | 2.00 MB |
| `model.mdf` | Primary Data | SQL Server System Template (`database_id = 3`) | ONLINE | 3.19 MB |
| `modellog.ldf` | Log | SQL Server System Template Log (`database_id = 3`) | ONLINE | 0.75 MB |
| `MSDBData.mdf` | Primary Data | SQL Server System Job/Alert (`database_id = 4`) | ONLINE | 14.13 MB |
| `MSDBLog.ldf` | Log | SQL Server System Job Log (`database_id = 4`) | ONLINE | 0.75 MB |
| `tempdb.mdf` | Primary Data | SQL Server Transient Scratchpad (`database_id = 2`) | ONLINE | 2.00 MB |
| `templog.ldf` | Log | SQL Server Transient Log (`database_id = 2`) | ONLINE | 0.50 MB |

- **Total Files in DATA Directory:** Exactly `8` files.
- **Detached Database Files (`.mdf`, `.ndf`, `.ldf`):** **ZERO (0).** No orphan, detached, or unmounted database files exist.
- **User Databases Attached (`database_id > 4`):** **ZERO (0).**
- **Default Backup Directory (`MSSQL\Backup`):** **Empty (0 files).**
- **User Folders (`Desktop`, `Documents`, `Downloads`):** **0** SQL database or backup files.

### B. Scheduled Operations & Jobs (`msdb.dbo.sysjobs`)
- Querying `sysjobs` returned only the factory Microsoft maintenance item `syspolicy_purge_history`.
- User scheduled jobs: **ZERO (0).**
- `SQLSERVERAGENT` service: **Disabled and Stopped.**

### C. Active Connection Verification
- Active user process sessions (`sys.dm_exec_sessions WHERE is_user_process = 1`): **ZERO (0).**
- No external application or background task is connecting to this instance.

---

## 3. Shared Component & Tooling Safety

A critical concern during database decommissioning is ensuring shared developer components are not damaged. The following audit confirms complete architectural isolation between SQL Server 2014 and the rest of your toolchain:

```
C:\Program Files\Microsoft SQL Server\
├── 120\                           <-- [EXCLUSIVE TO 2014] Safe to remove
│   └── Setup Bootstrap, Engine, Tools
├── MSSQL12.MSSQLSERVER\           <-- [EXCLUSIVE TO 2014] Safe to remove
│   └── DATA, Binn, Log
├── 130\                           <-- [VISUAL STUDIO LOCALDB] RETAINED
│   └── LocalDB\Binn (LocalDB 2016 runtime used by Visual Studio 2019)
├── 160\                           <-- [SQL SERVER 2022 EXPRESS] RETAINED
│   └── Shared Management Objects, Tools, DMF, XEvent
├── MSSQL16.SQLEXPRESS\            <-- [SQL SERVER 2022 EXPRESS] RETAINED
│   └── DATA, Binn, Log (Fully functional instance)
└── Client SDK\ODBC\170\           <-- [MODERN CLIENT TOOLS] RETAINED
    └── Binn\SQLCMD.EXE (Modern command-line utilities)
```

### Component Isolation Matrix:

| Component Category | Exclusive to SQL Server 2014 (To be removed) | Shared / Retained for Visual Studio & SQL Server 2022 | Impact of 2014 Removal |
| :--- | :--- | :--- | :--- |
| **Database Engine** | `SQL Server 2014 Database Engine Services` (12.0.2000.8) | `SQL Server 2022 Database Engine Services` (16.0.1000.6) | None on 2022 |
| **Shared Libraries** | `SQL Server 2014 Common Files`<br>`Microsoft SQL Server 2014 Transact-SQL Compiler Service`<br>`Microsoft SQL Server 2014 RsFx Driver` | `SQL Server 2022 Common Files`<br>`SQL Server 2022 Batch Parser`<br>`SQL Server 2022 Shared Management Objects` | None. 2022 uses its own v160 libraries. |
| **Visual Studio Tools** | None | `Microsoft SQL Server 2016 LocalDB` (13.3.7037.1)<br>`SQL Server Data Tools (SSDT)` in VS 2019 | None. Visual Studio uses LocalDB (v130). |
| **Client Drivers** | `Microsoft ODBC Driver 11 for SQL Server` | `Microsoft ODBC Driver 17 for SQL Server` (17.10.6.1)<br>`Microsoft Command Line Utilities 15` (`sqlcmd`) | None. Modern tools utilize ODBC 17. |
| **System VSS Writer** | None | `Microsoft VSS Writer for SQL Server 2022` (16.0.1000.6) | None. Running under 2022 VSS writer. |

---

## 4. ERP Protection Reconfirmation

Authoritative verification of the **Furniture ERP** application environment:

1. **Local ERP Database Engine:**
   - **Service:** `postgresql-x64-18` (PostgreSQL Server 18.6-1)
   - **Status:** Running, Automatic startup
   - **Port:** `127.0.0.1:5432` (PID 7452)
   - **Database:** `erp_furniture_db`
   - **Status:** **Completely untouched and operational.**
2. **Django Backend Configuration:**
   - Database engine in `Backend/core/settings.py`: `django.db.backends.postgresql`
   - Driver in `Backend/requirements.txt`: `psycopg2-binary==2.9.12`
   - Configuration in `Backend/.env`: Localhost connection to PostgreSQL port 5432.
   - **Status:** **100% unchanged.**
3. **Production Database Configuration (Sanitized):**
   - **Provider:** Cloud-managed PostgreSQL (Railway / Neon infrastructure)
   - **Access Pattern:** Managed strictly through execution-scoped `DATABASE_URL` via `.\scripts\migrate-production.ps1`.
   - **Status:** **Completely isolated and untouched.**
4. **Codebase Scan:**
   - Zero references to SQL Server 2014, `MSSQLSERVER`, `pyodbc`, or port 1433 across all models, views, serializers, migrations, and scripts.

---

## 5. Proposed Phased Decommissioning Plan

To guarantee zero operational risk, decommissioning is structured into **5 distinct phases**:

```mermaid
flowchart LR
    A["Phase A: Manual Startup"] --> B["Phase B: Soak Observation"]
    B --> C["Phase C: Official Uninstall"]
    C --> D["Phase D: Verification"]
    D --> E["Phase E: Final Cleanup"]
```

### Phase A: Graceful Disablement (Proposed Only — Not Executed)
- Set the startup type of `MSSQLSERVER` from `Automatic` to `Manual`:
  ```powershell
  Set-Service -Name "MSSQLSERVER" -StartupType Manual
  ```
- Stop the service:
  ```powershell
  Stop-Service -Name "MSSQLSERVER"
  ```
- *Immediate Benefit:* SQL Server 2014 stops consuming ~28.5 MB RAM and CPU cycles on startup, while remaining 100% available to start on demand if needed.

### Phase B: Operational Soak Period
- Continue normal daily development on Furniture ERP (run Django backend `python manage.py runserver`, run React frontend `npm run dev`, execute local queries).
- Launch Visual Studio Community 2019 and open projects.
- Verify that zero applications report connection failures.

### Phase C: Clean Uninstallation (When Approved)
- Launch the official Microsoft SQL Server uninstaller via Windows GUI:
  - Navigate to: **Windows Settings** > **Apps** > **Installed Apps**.
  - Locate: **Microsoft SQL Server 2014 (64-bit)**.
  - Click **...** > **Uninstall**.
  - In the SQL Server 2014 wizard: Select **Remove** > Choose Instance **MSSQLSERVER** > Select all 2014 instance features (`Database Engine Services`).
  - Proceed through the wizard to complete standard, supported Microsoft uninstallation.
  - *Registry Uninstall String:* `"C:\Program Files\Microsoft SQL Server\120\Setup Bootstrap\SQLServer2014\x64\SetupARP.exe"`

### Phase D: Post-Removal Health Check
- Verify that `postgresql-x64-18` is running and serving Furniture ERP data on port 5432.
- Verify that `MSSQL$SQLEXPRESS` (SQL Server 2022) continues to accept connections:
  ```powershell
  sqlcmd -S ".\SQLEXPRESS" -E -Q "SELECT @@VERSION;"
  ```
- Verify that `sqlcmd` utility is functional via `ODBC Driver 17`.
- Run Django development server to confirm baseline ERP connectivity.

### Phase E: Storage Reclamation & Verification
- Verify that obsolete instance directory `C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\` has been removed.
- Verify reclaimed storage: **~1.32 GB freed on drive C**.

---

## Safety Confirmation

> [!IMPORTANT]
> **NO MODIFICATIONS WERE PERFORMED.**
> This audit was strictly observational and read-only. 
> Services, startup types, registries, and ERP files remain in their exact original states.
> 
> **Awaiting your explicit instruction before proceeding with Phase A.**


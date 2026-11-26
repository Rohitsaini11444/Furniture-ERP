# ERP Development Environment — SQL Server Dependency Audit Report

**Date of Audit:** November 12, 2026  
**Auditor Role:** Senior Windows Database Administrator & Software Development Environment Engineer  
**Host Machine:** HP Victus 15-fb0040AX  
**Processor:** AMD Ryzen 5 5600H with Radeon Graphics (6 Cores / 12 Threads)  
**Operating System:** Windows 11 Pro (64-bit)  
**Primary Project Workspace:** `C:\Users\User\Desktop\ERP Furniture`  
**Audit Scope & Status:** 100% Read-Only Inspection. Zero files modified, zero services altered, zero registries touched.

---

## Executive Summary

A comprehensive, non-destructive audit of the **Furniture ERP** development environment and the host Windows operating system was performed.

### Key Audit Findings:
1. **The Furniture ERP application has ZERO dependency on Microsoft SQL Server** (neither SQL Server 2014 nor SQL Server 2022).
2. **Local Development Database:** The ERP application connects exclusively to a local instance of **PostgreSQL Server 18** (`postgresql-x64-18`, port `5432`) using `psycopg2-binary` and Django's `django.db.backends.postgresql` engine.
3. **Production Database:** Configured for cloud-hosted **PostgreSQL** (hosted on Railway / Neon cloud infrastructure), accessed via temporary `DATABASE_URL` during migrations.
4. **SQL Server Instances Status:**
   - Both **SQL Server 2014 Express** (`MSSQLSERVER`) and **SQL Server 2022 Express** (`MSSQL$SQLEXPRESS`) are running in the background, set to Automatic startup.
   - **Zero user databases** (`database_id > 4`) exist on either instance. Both hold only standard, default system databases (`master`, `tempdb`, `model`, `msdb`).
   - **Zero user connections** or active sessions exist (only background telemetry and our read-only audit query).
   - **Zero backup files** (`.bak`) or backup histories exist in either instance or user directories.
   - Together with the SQL Server VSS Writer and CEIP Telemetry services, these idle instances continuously consume **~141 MB of RAM** and **~4.8 GB of disk space**.
5. **Visual Studio & Tooling Dependencies:** Visual Studio Community 2019 was installed with `SQL.LocalDB.Runtime` (SQL LocalDB) and client tools, but the LocalDB automatic instance (`MSSQLLocalDB`) has never been created or started. Neither Visual Studio nor any installed developer tool depends on the standalone SQL Server 2014 instance.
6. **SQL Server 2014 End-of-Life:** SQL Server 2014 reached official Microsoft **End-of-Life (EOL) on July 9, 2024**, and no longer receives security updates, posing an unpatched security exposure on the system.

---

## 1. Actual ERP Database Architecture

The Furniture ERP application architecture consists of:
- **Presentation Layer (Frontend):** React 19 single-page application bundled with Vite 8. Communicates exclusively through HTTP/REST API endpoints (`/api`) using `axios`. It contains no database drivers, no direct database connections, and no connection strings.
- **Application Layer (Backend):** Django 5.x REST framework application served by WSGI/ASGI and Gunicorn/Uvicorn.
- **Data Access Layer:** Django ORM configured with `django.db.backends.postgresql` database backend. The Python driver utilized is `psycopg2-binary==2.9.12`.
- **Database Driver Audit:**
  - Audited `Backend\requirements.txt`, `Backend\venv\Lib\site-packages`, and root `.venv\Lib\site-packages`.
  - Confirmed drivers: `psycopg2`, `psycopg2-binary`.
  - Non-existent packages: `pyodbc`, `django-mssql-backend`, `mssql-django`, `pymssql`, `aioodbc`, `pydbc` are **NOT** installed anywhere on the project virtual environments.

---

## 2. Local Development Database

- **Database Engine:** **PostgreSQL 18.6-1 (64-bit)**
- **Windows Service Name:** `postgresql-x64-18` (Display Name: *postgresql-x64-18 - PostgreSQL Server 18*)
- **Service Status:** Running, Automatic startup
- **Listening Endpoint:** `127.0.0.1:5432` / `[::]:5432` (TCP PID: 7452)
- **Local Database Name:** `erp_furniture_db`
- **Django Configuration:**
  - Specified in `Backend\.env`:
    - `DB_NAME=erp_furniture_db`
    - `DB_HOST=localhost`
    - `DB_PORT=5432`
    - `DB_SSLMODE=disable`
  - In `Backend\core\settings.py`, lines 138–153 define the fallback local configuration when `DATABASE_URL` is absent:
    ```python
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'CONN_MAX_AGE': 600,
            'OPTIONS': {
                'sslmode': os.environ.get('DB_SSLMODE', 'disable'),
            },
        }
    }
    ```
- **Historical Note on `db.sqlite3`:**
  - A 1.25 MB file named `Backend\db.sqlite3` exists with a timestamp of August 13, 2026.
  - Inspection of `Backend\dump_utf8.py` and `Backend\init_postgres_db.py` confirms this was the initial prototyping database used when scaffolding the project. Its contents were dumped to `datadump.json` and loaded into the local PostgreSQL instance. It is currently inactive and unreferenced by Django settings.

---

## 3. Production Database Configuration

- **Database Engine:** **PostgreSQL (Cloud Managed)**
- **Hosting Platform:** Railway / Neon Cloud Infrastructure
- **Security & Separation Protocol:**
  - Production database connection is managed strictly via the `DATABASE_URL` environment variable.
  - In accordance with enterprise DBA security practices, production credentials and host strings were **not exposed, logged, or altered** during this audit.
  - Schema migrations are gated by `.\scripts\migrate-production.ps1`, which explicitly enforces human confirmation (`MIGRATE-PRODUCTION`), sets a temporary execution-scoped `DATABASE_URL`, runs `python manage.py migrate`, and immediately unsets the variable upon completion or failure.
  - Production environment has zero connection to or dependency on local Microsoft SQL Server instances.

---

## 4. SQL Server 2022 Dependency Analysis

### Instance Profile
- **Instance Identifier:** `SQLEXPRESS`
- **Product:** Microsoft SQL Server 2022 Express (64-bit)
- **Engine Version:** `16.0.1220.3` (Patch KB5132747, GDR 1220, applied 2026-11-12)
- **Service Name:** `MSSQL$SQLEXPRESS` (PID: 26196)
- **Associated Services:**
  - `SQLTELEMETRY$SQLEXPRESS` (CEIP Telemetry Service, PID: 25392, Running, Automatic)
  - `SQLAgent$SQLEXPRESS` (SQL Server Agent, Stopped, Disabled)
  - `SQLWriter` (SQL Server VSS Writer, PID: 5540, Running, Automatic)
- **Installation Date:** July 28, 2024 (Installed alongside Visual Studio 2019)
- **Network Listener:** Dynamic Shared Memory / Named Pipes (TCP 1433 is disabled)

### Database & Activity Audit
- **Active User Sessions:** `0` (Only Microsoft Telemetry `SQLServerCEIP` and our read-only audit `SQLCMD` session were detected).
- **User Databases:** `0` (Only `master`, `tempdb`, `model`, `msdb`).
- **Backup History:** `0` records in `msdb.dbo.backupset`.
- **Resource Footprint:**
  - Working Set RAM: **~73.0 MB** (`sqlservr.exe`) + **~30.4 MB** (`sqlceip.exe`) = **~103.4 MB**
  - Disk Footprint: **~3,108.8 MB** (`MSSQL16.SQLEXPRESS` 530.6 MB + Shared Tools `160` 2,578.2 MB)

### Dependency Assessment
- **ERP Project:** Zero dependency.
- **Visual Studio 2019 / 2022:** Visual Studio 2019 uses SQL Server Data Tools (SSDT) and `SQL.LocalDB.Runtime` (LocalDB). Visual Studio does not require a continuously running standalone Express service instance (`MSSQL$SQLEXPRESS`) unless a developer explicitly binds a project to `.\SQLEXPRESS`. No projects on this machine are bound to `.\SQLEXPRESS`.

---

## 5. SQL Server 2014 Dependency Analysis

### Instance Profile
- **Instance Identifier:** `MSSQLSERVER` (Default Instance)
- **Product:** Microsoft SQL Server 2014 Express (64-bit)
- **Engine Version:** `12.0.2269.0` (Patch KB3045324, GDR 2269)
- **Service Name:** `MSSQLSERVER` (PID: 5800)
- **Associated Services:**
  - `SQLSERVERAGENT` (SQL Server Agent, Stopped, Disabled)
  - `SQLBrowser` (SQL Server Browser, Stopped, Disabled)
- **Installation Date:** August 7, 2024
- **Network Listener:** Shared Memory / Local Named Pipes (TCP 1433 disabled)

### Database & Activity Audit
- **Active User Sessions:** `0` (Only the audit `SQLCMD` session was registered).
- **User Databases:** `0` (Only `master`, `tempdb`, `model`, `msdb`).
- **Backup History:** `0` records in `msdb.dbo.backupset`.
- **Resource Footprint:**
  - Working Set RAM: **~28.5 MB** (`sqlservr.exe`)
  - Disk Footprint: **~1,323.8 MB** (`MSSQL12.MSSQLSERVER` 326.2 MB + Shared Tools `120` 997.6 MB)

### Lifecycle & Security Assessment
- **End-of-Life Notice:** Microsoft officially terminated extended support for SQL Server 2014 on **July 9, 2024**.
- **Security Vulnerability:** SQL Server 2014 does not receive Common Vulnerabilities and Exposures (CVE) patches or Cumulative Updates from Microsoft. Running an unpatched, obsolete database engine on Windows 11 constitutes an unnecessary attack surface.
- **Dependency Assessment:** Zero applications, zero development tools, zero scheduled tasks, zero ODBC DSNs, and zero ERP components reference or depend on SQL Server 2014.

---

## 6. Visual Studio & Other Development Tool Dependencies

An audit of developer tools installed on this laptop yielded the following findings:

| Installed Tool / Component | Version | Database Dependency | Evidence / Verification |
| :--- | :--- | :--- | :--- |
| **Antigravity IDE (User)** | 2.6.0 | None (Uses internal workspace files) | No external DB calls |
| **Visual Studio Community 2019** | 16.11.63 | Bundled with `SQL.LocalDB.Runtime` & SSDT | `sqllocaldb info` confirms `MSSQLLocalDB` automatic instance was never created. Does not require running service instances. |
| **Visual Studio Build Tools 2022** | 17.14.45 | C++ Native Toolchain / MSBuild | No database engine dependency |
| **PostgreSQL 18** | 18.6-1 | **Primary ERP Local Database** | Actively hosting `erp_furniture_db` on port 5432 |
| **MySQL Server 8.0 & Workbench** | 8.0.39 / 8.0.38 | Independent local RDBMS | Running on separate service `MySQL80` |
| **Beekeeper Studio** | 5.9.2 | Multi-database client GUI | Connects as a client to PostgreSQL/MySQL/SQLite as directed by user |
| **SQL Server Management Studio (SSMS)** | *Not Installed* | N/A | No SSMS installation exists on this PC |

### System ODBC Configuration Audit:
- **User / System DSNs:** Audited via `Get-OdbcDsn`. Zero DSNs point to SQL Server. (Only standard legacy Access/Excel drivers exist).
- **Installed Drivers:** `ODBC Driver 11 for SQL Server`, `ODBC Driver 17 for SQL Server`, `SQL Server Native Client 11.0`. These are client driver libraries; they do not depend on the local SQL Server service engines running.

### Windows Scheduled Tasks:
- Audited all registered tasks in Windows Task Scheduler. Zero tasks invoke SQL Server executables, maintenance plans, or scripts.

---

## 7. Database File Inventory

### A. SQL Server 2022 (`.\SQLEXPRESS`)
Default Data Directory: `C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\`

| Database ID | Database Name | Logical Name | Physical File Path | File Size | State |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | `master` | `master` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\master.mdf` | 4.00 MB | ONLINE |
| 1 | `master` | `mastlog` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\mastlog.ldf` | 1.25 MB | ONLINE |
| 2 | `tempdb` | `tempdev` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\tempdb.mdf` | 8.00 MB | ONLINE |
| 2 | `tempdb` | `templog` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\templog.ldf` | 8.00 MB | ONLINE |
| 3 | `model` | `modeldev` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\model.mdf` | 8.00 MB | ONLINE |
| 3 | `model` | `modellog` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\modellog.ldf` | 8.00 MB | ONLINE |
| 4 | `msdb` | `MSDBData` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\MSDBData.mdf` | 16.88 MB | ONLINE |
| 4 | `msdb` | `MSDBLog` | `...\MSSQL16.SQLEXPRESS\MSSQL\DATA\MSDBLog.ldf` | 23.81 MB | ONLINE |
| **Total** | *System Only (0 User DBs)* | | | **77.94 MB** | |

### B. SQL Server 2014 (`MSSQLSERVER`)
Default Data Directory: `C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\`

| Database ID | Database Name | Logical Name | Physical File Path | File Size | State |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | `master` | `master` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\master.mdf` | 4.00 MB | ONLINE |
| 1 | `master` | `mastlog` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\mastlog.ldf` | 2.00 MB | ONLINE |
| 2 | `tempdb` | `tempdev` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\tempdb.mdf` | 2.00 MB | ONLINE |
| 2 | `tempdb` | `templog` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\templog.ldf` | 0.50 MB | ONLINE |
| 3 | `model` | `modeldev` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\model.mdf` | 3.19 MB | ONLINE |
| 3 | `model` | `modellog` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\modellog.ldf` | 0.75 MB | ONLINE |
| 4 | `msdb` | `MSDBData` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\MSDBData.mdf` | 14.13 MB | ONLINE |
| 4 | `msdb` | `MSDBLog` | `...\MSSQL12.MSSQLSERVER\MSSQL\DATA\MSDBLog.ldf` | 0.75 MB | ONLINE |
| **Total** | *System Only (0 User DBs)* | | | **27.32 MB** | |

### C. Backup File Inventory
- `C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Backup\`: **Empty (0 files)**
- `C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\Backup\`: **Empty (0 files)**
- `C:\Users\User\Desktop`, `Documents`, `Downloads`: **0 `.mdf`, 0 `.ldf`, 0 `.bak` files**

---

## 8. Potential Application Compatibility Risks

1. **Furniture ERP Application:**
   - **Risk Level:** **ZERO RISK.**
   - **Reasoning:** ERP code, environment variables, settings, and migration workflows exclusively target PostgreSQL. Modifying or stopping SQL Server will have zero impact on the ERP.
2. **Visual Studio 2019 / Build Tools 2022:**
   - **Risk Level:** **VERY LOW.**
   - Visual Studio uses `SQL.LocalDB.Runtime` for on-demand local database testing in ASP.NET projects, not the full background Windows services.
   - Removing or stopping SQL Server 2014 will have zero impact on Visual Studio.
   - If SQL Server 2022 shared client tools (`ODBC Driver 17`, `Command Line Utilities`) were ever removed carelessly, command-line tools like `sqlcmd` would disappear, but the underlying .NET development tools remain intact.
3. **Third-Party Applications (AnyDesk, Adobe Photoshop, CapCut, etc.):**
   - **Risk Level:** **ZERO RISK.** None of the installed consumer or productivity applications utilize SQL Server.

---

## 9. Is SQL Server 2014 Necessary, Optional, or Undetermined?

- **Conclusion:** **SQL Server 2014 is COMPLETELY UNNECESSARY.**
- **Supporting Evidence:**
  1. Contains 0 user databases.
  2. Receives 0 user connections.
  3. Has 0 backup histories.
  4. Was superseded by SQL Server 2022 installed on the same system.
  5. Reached Microsoft End-of-Life in July 2024.
  6. No application, script, or configuration on this PC references `MSSQL12.MSSQLSERVER`.

---

## 10. Should SQL Server 2022 Be Retained?

- **Conclusion:** **SQL Server 2022 is currently OPTIONAL.**
- **Analysis:**
  - It is currently not used by any active project on this machine.
  - However, because it is modern (SQL Server 2022), fully supported, and actively patched by Windows Update, you may choose to retain its installation binaries in case you ever develop with .NET/C# in Visual Studio 2019.
  - Even if retained, its services should not be running automatically in the background consuming memory on laptop battery.

---

## 11. Safe Recommendations for Reducing Background Resource Usage

Without uninstalling or deleting anything right now, your laptop can instantly recover resources by changing the service startup type:

1. **Set SQL Server Services to Manual (Demand-Start):**
   - Changing service startup from `Automatic` to `Manual` prevents them from starting when Windows boots.
   - If an application ever requests them, or if you ever need them, they can be started on demand.
   - Immediate savings: **~141 MB RAM** freed continuously, zero background CPU cycles, lower battery drain.
2. **Services to switch to Manual/Disabled when ready:**
   - `MSSQLSERVER` (SQL Server 2014) -> Set to `Manual` or `Disabled`
   - `MSSQL$SQLEXPRESS` (SQL Server 2022) -> Set to `Manual`
   - `SQLTELEMETRY$SQLEXPRESS` (CEIP Telemetry) -> Set to `Manual` or `Disabled`
   - `SQLWriter` (VSS Writer) -> Set to `Manual`

---

## 12. Final Decision & Options

| Option | Description | Pros | Cons / Considerations | Safety Rating |
| :--- | :--- | :--- | :--- | :---: |
| **Option A** | **Keep Both SQL Server Versions** (Change startup to Manual) | Zero changes to installed applications; maximum theoretical rollback safety. | Retains ~4.8 GB of occupied disk space and an obsolete, EOL 2014 database engine. | High |
| **Option B** *(Recommended)* | **Keep SQL Server 2022 (Set to Manual) & Decommission SQL Server 2014** | Completely eliminates unsupported EOL 2014 engine; frees ~1.3 GB disk space; retains modern 2022 tools for Visual Studio; eliminates background RAM usage. | Requires running official SQL Server 2014 Uninstaller via Windows Settings / Control Panel when approved. | **Safest & Best Engineered** |
| **Option C** | **Decommission Both SQL Server Versions** | Reclaims all ~4.8 GB disk space and all associated background services. | If you ever want to build local SQL Server / ASP.NET projects in Visual Studio in the future, you would need to reinstall SQL Server 2022 or rely solely on LocalDB. | Moderate |

### Senior DBA Recommendation:
**Option B is the safest and cleanest path forward.**
- **Why?** SQL Server 2014 has been out of support since July 2024 and is an exact duplicate of what SQL Server 2022 provides. It contains zero user data, zero backups, and zero connections. Removing 2014 eliminates an obsolete, unpatched engine while freeing disk space.
- Keeping SQL Server 2022 (with its services switched to `Manual`) ensures that any future Visual Studio development remains 100% supported without consuming your laptop's battery and RAM during your daily Furniture ERP development work.

---

> [!IMPORTANT]
> **NO ACTIONS HAVE BEEN TAKEN.**
> This audit was strictly observational and read-only. No services were stopped, disabled, modified, or uninstalled.
> Awaiting your explicit review and instruction before any action is scheduled.


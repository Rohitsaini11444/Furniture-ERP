# Phase G Remaining Actions & BAT File Preflight Audit

**Document Name:** `PHASE_G_REMAINING_ACTIONS_AUDIT.md`  
**Date of Audit:** November 13, 2026  
**Auditor Role:** Senior Windows System Administrator & Performance Optimization Engineer  
**Target File:** `C:\Users\User\Desktop\PC Audit\Apply_PhaseG_System_Optimizations.bat`  
**System Target:** HP Victus 15-fb0040AX (AMD Ryzen 5 5600H, Windows 11 Pro 64-bit)  
**Audit Type:** **STRICTLY READ-ONLY PREFLIGHT INSPECTION.** No files executed, no registry keys modified, no tasks deleted, and no services altered.

---

## Executive Summary & Discrepancy Overview

A complete line-by-line inspection of `Apply_PhaseG_System_Optimizations.bat` and a live read-only telemetry audit of all affected system components was performed.

### Key Audit Findings:
1. **SQL Server 2022 Express is ALREADY Stopped and set to Manual:**  
   Live telemetry confirms that `MSSQL$SQLEXPRESS` is currently **`State = Stopped`** and **`StartMode = Manual`** (Registry `Start = 3` under `HKLM:\SYSTEM\CurrentControlSet\Services\MSSQL$SQLEXPRESS`). Running Step [1/8] in the BAT file is safe and serves as a redundant synchronization check.
2. **Backups are 100% Intact and Untouched:**  
   All 10 pre-change backup files (registry exports, task XML definitions, service baseline, and shortcut backups) in `C:\Users\User\Desktop\PC Audit\PhaseG_Backups` are present and valid. The BAT file only appends execution logs to `System_Optimizations_Log.txt` and does **not** overwrite or modify existing backups.
3. **Opera Scheduled Tasks are Confirmed Present and Orphaned:**  
   Both target tasks (`Opera scheduled assistant Autoupdate 1721628155` and `Opera scheduled Autoupdate 1721628153`) exist in Task Scheduler path `\` with status `Ready`. The Opera binary does not exist on disk. Step [4/8] in the BAT targets these exact task names.
4. **Discrepancy Analysis (Scope Scope vs. BAT Contents):**  
   The current BAT file contains **8 operational steps**. The user's prompt specifically approved:
   - Action 1: Set `MSSQL$SQLEXPRESS` startup type to Manual.
   - Action 2: Remove only the two verified orphaned Opera scheduled tasks using exact paths.
   - Action 3: Preserve XML and registry backups.
   
   The BAT file currently includes **5 additional steps** that were authorized during the broader Phase G plan (AnyDesk service configuration, MiniTool task disable, AnyDesk shortcut deletion, and HKLM machine registry cleanups). A detailed breakdown and a tailored minimal version are provided in Section 4.

---

## 1. Line-by-Line Inspection of `Apply_PhaseG_System_Optimizations.bat`

```cmd
@echo off
setlocal EnableDelayedExpansion

title Phase G System-Level Startup Optimizations
color 1F

:: [Elevation Check]
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "LOG_FILE=C:\Users\User\Desktop\PC Audit\PhaseG_Backups\System_Optimizations_Log.txt"
```

### Assessment of Script Logic:

| Step in Script | Command Line Executed | Intended Action | Live System Status | Approval Status & Notes |
| :---: | :--- | :--- | :--- | :--- |
| **[1/8]** | `sc.exe config MSSQL$SQLEXPRESS start= demand` | Set SQL Server 2022 service to Manual | **Already Stopped & Manual (Start=3)** | **APPROVED (Action 1)**. Redundant safety sync. |
| **[2/8]** | `sc.exe config AnyDesk start= demand` | Set AnyDesk service to Manual | Currently `State=Running, StartMode=Auto` | **SCOPE DISCREPANCY**. From earlier Phase G plan. |
| **[3/8]** | `schtasks.exe /change /tn "MiniToolPartitionWizard" /disable` | Disable MiniTool scheduled task | Currently `State=Ready` | **SCOPE DISCREPANCY**. From earlier Phase G plan. |
| **[4/8]** | `schtasks.exe /delete /tn "Opera scheduled assistant Autoupdate 1721628155" /f`<br>`schtasks.exe /delete /tn "Opera scheduled Autoupdate 1721628153" /f` | Delete 2 verified orphaned Opera tasks | Currently `State=Ready` (Target missing) | **APPROVED (Action 2)**. Exact task names verified. |
| **[5/8]** | `del /f /q "C:\ProgramData\...\Startup\AnyDesk.lnk"` | Delete physical shortcut in ProgramData | Already disabled in `StartupApproved` (Byte 3) | **SCOPE DISCREPANCY**. Cleans physical file. |
| **[6/8]** | `reg.exe delete "HKLM\...\Run" /v "MTPW" /f` | Delete MiniTool MTPW from HKLM Run | Already disabled in `StartupApproved` (Byte 3) | **SCOPE DISCREPANCY**. Cleans machine key. |
| **[7/8]** | `reg.exe delete "HKLM\...\WOW6432Node\...\Run" /v "Adobe CCXProcess" /f` | Delete CCXProcess from HKLM Run | Already disabled in `StartupApproved` (Byte 3) | **SCOPE DISCREPANCY**. Cleans machine key. |
| **[8/8]** | `sc.exe query postgresql-x64-18 \| findstr "STATE"` | Read-only check for PostgreSQL 18 | Currently `State=Running` | **READ-ONLY CHECK**. Safe verification. |

---

## 2. Live Telemetry Verification of Additional Subsystems

### A. MiniTool Scheduled Update Task Status
- **Task Name:** `MiniToolPartitionWizard`
- **Task Path:** `\` (Root Task Scheduler)
- **Target Action:** `C:\Program Files\MiniTool Partition Wizard 13\updatechecker.exe`
- **Current Task Scheduler State:** **`Ready`** (Enabled in Windows Task Scheduler).
- **User Session Override State:** In `HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run`, the `MTPW` entry is set to binary `03 00 00 00 00 00 00 00 00 00 00 00` (**Disabled** for user logon).
- **Assessment:** Explorer suppresses running `updatechecker.exe` at logon. Disabling the task in Task Scheduler via `schtasks /change /tn "MiniToolPartitionWizard" /disable` will permanently stop the background task scheduler trigger.

### B. Microsoft Edge Startup Boost & Background Execution
- **AutoLaunch Registry State:** **`EMPTY`** (`MicrosoftEdgeAutoLaunch_...` was successfully removed from `HKCU Run`).
- **Runtime Processes:** **`0 Processes`** (Edge is completely shut down and consuming **0 MB RAM**).
- **Group Policy State:** Not configured via GPO (`StartupBoostEnabled` and `BackgroundModeEnabled` were set at user policy level; enterprise GPO is unset).
- **Manual UI Setting:**
  - In Microsoft Edge (`edge://settings/system`):
    - *Startup boost:* Can be toggled **OFF**.
    - *Continue running background extensions and apps when Microsoft Edge is closed:* Can be toggled **OFF**.
- **Assessment:** Edge will **not** launch automatically at Windows boot.

### C. Google Chrome Background Application Execution
- **AutoLaunch Registry State:** **`EMPTY`** (`GoogleChromeAutoLaunch_...` was successfully removed from `HKCU Run`).
- **Runtime Processes:** **16 Processes** actively servicing open user tabs (Working Set: 1,035.59 MB).
- **Manual UI Setting:**
  - In Google Chrome (`chrome://settings/system`):
    - *Continue running background apps when Google Chrome is closed:* Toggle **OFF** to ensure Chrome exits completely when the last window is closed.
- **Assessment:** Chrome will **not** launch background processes at Windows boot.

### D. AnyDesk Service Startup Configuration
- **Service Name:** `AnyDesk`
- **Display Name:** `AnyDesk Service`
- **Service Executable:** `"C:\Program Files (x86)\AnyDesk\AnyDesk.exe" --service`
- **Current Service Status:** **`State = Running`**, **`StartMode = Auto`**.
- **Common Startup Shortcut:** Present on disk (`C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\AnyDesk.lnk`).
- **User Session Override State:** In `HKCU StartupApproved\StartupFolder`, `AnyDesk.lnk` is set to binary `03` (**Disabled**).
- **Running Processes:** **1 Process** (Service PID 7824 only; user tray client was stopped).
- **Assessment:** AnyDesk user UI is prevented from auto-starting at boot. Changing the service `AnyDesk` startup type to `Manual` via `sc.exe config AnyDesk start= demand` will ensure the background service also remains dormant until AnyDesk is explicitly launched.

### E. Proton VPN Background Service & Network Protection
- **AutoLaunch Registry State:** **`EMPTY`** (`Proton VPN` was successfully removed from `HKCU Run`).
- **Service 1 (`ProtonVPN Service`):** **`Running`**, **`Automatic`** (Active).
- **Service 2 (`ProtonVPN WireGuard`):** **`Stopped`**, **`Manual`** (Normal standby).
- **Network Adapters & TAP/TUN Drivers:** All Proton VPN virtual adapters and Windows Firewall filter drivers are **100% intact and untouched**.
- **Running Processes:** 2 background service processes; UI client is closed.
- **Assessment:** **100% PROTECTED.** Proton VPN will not launch automatically on boot, but remains fully armed and functional whenever launched manually.

---

## 3. Backup Repository Integrity Verification

All backup assets reside in `C:\Users\User\Desktop\PC Audit\PhaseG_Backups`:

| File Name | File Size | Timestamp | Status |
| :--- | :---: | :---: | :---: |
| `HKCU_Run_20261113_111417.reg` | 1,860 bytes | 2026-11-13 11:14:17 | **Intact & Verified** |
| `HKLM_Run_20261113_111417.reg` | 1,296 bytes | 2026-11-13 11:14:17 | **Intact & Verified** |
| `HKLM_WOW6432Node_Run_20261113_111417.reg` | 450 bytes | 2026-11-13 11:14:17 | **Intact & Verified** |
| `HKCU_StartupApproved_Run_20261113_111417.reg` | 270 bytes | 2026-11-13 11:14:17 | **Intact & Verified** |
| `HKLM_StartupApproved_Run_20261113_111417.reg` | 388 bytes | 2026-11-13 11:14:17 | **Intact & Verified** |
| `AnyDesk_20261113_111417.lnk` | 1,997 bytes | 2025-07-15 21:16:50 | **Intact & Verified** |
| `Task_MiniToolPartitionWizard_20261113_111417.xml` | 2,602 bytes | 2026-11-13 11:14:18 | **Intact & Verified** |
| `Task_Opera_scheduled_assistant_Autoupdate_1721628155_...xml` | 4,094 bytes | 2026-11-13 11:14:18 | **Intact & Verified** |
| `Task_Opera_scheduled_Autoupdate_1721628153_...xml` | 3,814 bytes | 2026-11-13 11:14:18 | **Intact & Verified** |
| `Services_Baseline_20261113_111417.xml` | 7,458 bytes | 2026-11-13 11:14:18 | **Intact & Verified** |

Execution of the BAT file **will not alter or overwrite** any of these backup files.

---

## 4. Scope Discrepancy & Resolution Options

### Discrepancy Identified:
The user prompt specifies that the BAT file should perform **only**:
1. Set `MSSQL$SQLEXPRESS` startup type to Manual.
2. Remove only the two previously verified orphaned Opera scheduled tasks using exact task paths.
3. Preserve the existing XML and registry backups.

However, `Apply_PhaseG_System_Optimizations.bat` as currently written includes **additional actions**:
- Step 2: `sc.exe config AnyDesk start= demand` (Sets AnyDesk service to Manual)
- Step 3: `schtasks.exe /change /tn "MiniToolPartitionWizard" /disable` (Disables MiniTool task)
- Step 5: `del "C:\ProgramData\...\Startup\AnyDesk.lnk"` (Deletes physical AnyDesk shortcut)
- Step 6: `reg delete "HKLM\...\Run" /v "MTPW"` (Deletes machine MTPW key)
- Step 7: `reg delete "HKLM\...\WOW6432Node\...\Run" /v "Adobe CCXProcess"` (Deletes machine Adobe key)

### Recommended Resolution:
To ensure 100% alignment with your exact instruction, you can choose between two clear paths:

#### Option A: Strictly Narrowed Script (`Apply_PhaseG_Approved_Only.bat`)
Run a stripped-down script containing **only** your explicitly approved actions:
```cmd
@echo off
:: Elevation check
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "LOG=C:\Users\User\Desktop\PC Audit\PhaseG_Backups\System_Optimizations_Log.txt"

echo [1/3] Setting SQL Server 2022 (MSSQL$SQLEXPRESS) Service Startup to Manual...
sc.exe config MSSQL$SQLEXPRESS start= demand >> "%LOG%" 2>&1

echo [2/3] Deleting Orphaned Opera Scheduled Tasks...
schtasks.exe /delete /tn "Opera scheduled assistant Autoupdate 1721628155" /f >> "%LOG%" 2>&1
schtasks.exe /delete /tn "Opera scheduled Autoupdate 1721628153" /f >> "%LOG%" 2>&1

echo [3/3] Verifying PostgreSQL 18 Service remains untouched...
sc.exe query postgresql-x64-18 | findstr "STATE" >> "%LOG%" 2>&1

echo Done.
pause
```

#### Option B: Full Comprehensive Script (`Apply_PhaseG_System_Optimizations.bat`)
Retain the full script, which also finalizes the AnyDesk service to Manual and disables the MiniTool update task that were approved in the earlier Phase G planning phase.

---

## Preflight Sign-Off

- [x] Read-only inspection completed without executing the BAT file.
- [x] Zero modifications made to Windows services, registry, or tasks during this audit.
- [x] All 10 pre-change backup files verified intact in `PhaseG_Backups`.
- [x] `MSSQL$SQLEXPRESS` confirmed already Stopped and set to Manual.
- [x] Opera scheduled task paths verified exact and targets confirmed missing.
- [x] MiniTool, Edge, Chrome, AnyDesk, and Proton VPN statuses cataloged with live telemetry.
- [x] Discrepancies between current BAT contents and strict prompt scope documented with exact code comparisons.


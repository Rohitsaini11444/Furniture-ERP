# Pinkcity Enterprises ERP — End-to-End Automated Backup & Recovery Guide

**Confidential — Operations & Systems Administration Manual**  
*System Deployment: Local LAN Pilot | Host: DESKTOP-3V5TC8H | Target DB: erp_furniture_db*

---

## 1. System Overview & Architecture

This backup and recovery system provides automated, encrypted, deduplicated, and verified recovery points for the Pinkcity Enterprises ERP system.

### Key Metrics
- **Authorized Database**: `erp_furniture_db` (Role: `erp_app_user`)
- **Database Engine**: PostgreSQL 18.6 (Host: `127.0.0.1:5432`)
- **Media Upload Storage**: `\\192.168.1.7\Erp Software\Media` (Centralized Office Shared Storage)
- **Primary Backup Destination**: `\\192.168.1.7\Erp Software\Backups\`
- **Encryption Architecture**: Authenticated AES-256-CTR + Poly1305 MAC via Restic repository format, secured locally via Windows DPAPI (CurrentUser scope)
- **Deduplication Engine**: Content-Defined Chunking (CDC) with Zstandard compression
- **Execution Engine**: Native Windows Task Scheduler (`Pinkcity_ERP_Automated_Backup`)
- **Schedule**: Every day at **8:00 PM IST (Asia/Kolkata)**
- **Retention Policy**: 14 daily recovery points (automated pruning only after verified restoration test)

---

## 2. Directory Structure on Shared Storage

Destination UNC Path: `\\192.168.1.7\Erp Software\Backups\`

```
\\192.168.1.7\Erp Software\
├── Backups\
│   ├── Repository\           <-- Encrypted, deduplicated Restic snapshot repository
│   │   ├── config
│   │   ├── data\
│   │   ├── index\
│   │   ├── keys\
│   │   └── snapshots\
│   ├── Manifests\            <-- JSON audit manifests for every backup cycle
│   ├── Restore_Reports\      <-- Genuine restoration verification test results
│   ├── Logs\                 <-- Daily operational execution logs
│   └── status_summary.json   <-- Live backup status summary for operators
└── Documentation\
    └── BACKUP_AND_RECOVERY_GUIDE.md <-- This recovery guide
```

---

## 3. Daily Execution Workflow

Every day at 8:00 PM IST (or on manual trigger), the engine executes the following non-disruptive pipeline:

```
[1. Pre-flight Checks]
  ├── Verify Network Share Reachability (\\192.168.1.7\Erp Software)
  └── Programmatic Database Identity Check: ('erp_furniture_trial', 'erp_trial_user')
            │
[2. Database Dump & Verification]
  ├── Execute pg_dump (custom format -Fc, with large objects -b, compressed)
  └── pg_restore --list verification (verifies complete TOC, ensures dump is uncorrupted)
            │
[3. Media Inventory & Manifest]
  ├── Scan MEDIA_ROOT, compute file counts and SHA-256 checksums
  └── Generate detailed JSON audit manifest
            │
[4. Encrypted Deduplicated Snapshot]
  ├── Restic takes snapshot of staged database dump + live media files
  ├── Data encrypted with AES-256 / Poly1305 before transmission over LAN
  └── Deduplication skips re-uploading unchanged images/documents
            │
[5. Mandatory Genuine Restoration Tests]
  ├── Database Restore Test: Restores dump into disposable DB `erp_restore_verify_<timestamp>`
  │   └── Verifies 52 tables, 65 Django migrations, 192 permissions, foreign keys
  │   └── Drops disposable database cleanly
  └── Media Restore Test: Compares restored samples against originals via SHA-256
            │
[6. Retention Pruning & Reporting]
  ├── Prunes older snapshots (keeping 14 daily points) ONLY after restore test passes
  └── Publishes manifest, restore report, execution log, and status_summary.json
```

---

## 4. Encryption & Credential Security

1. **Unattended Execution**: Credentials (database password and Restic repository encryption key) are encrypted on disk using Windows Data Protection API (DPAPI) under the `CurrentUser` security scope (`C:\Users\User\.pinkcity_erp_backup\credentials.enc`).
2. **Zero Plaintext**: Passwords and encryption keys are NEVER passed as command-line arguments and NEVER written to plaintext scripts, logs, git, or network shares.
3. **NTFS ACL Lockdown**: The local credentials directory has explicit inheritance stripped and access granted exclusively to the local administrator account (`icacls`).
4. **Offline Disaster Recovery Key**:
   - Location: `C:\Users\User\.pinkcity_erp_backup\EMERGENCY_RECOVERY_KEY.txt`
   - Purpose: Allows authorized administrators to restore the entire ERP on a completely new computer even if the original laptop is destroyed, lost, or reformatted.

---

## 5. Operator Quick Reference Commands

Open PowerShell or Command Prompt in `C:\Users\User\Desktop\ERP Furniture`:

### A. Check Live Backup Status
```powershell
.\.venv\Scripts\python.exe backup_system\cli.py --status
```
*Outputs: Last successful backup timestamp, snapshot ID, table count, media count, duration, and latest restore report.*

### B. Run a Manual On-Demand Backup
```cmd
backup_system\run_backup.bat
```
*Or via Python:*
```powershell
.\.venv\Scripts\python.exe backup_system\cli.py --run
```

### C. Verify Offline Recovery Key
```powershell
.\.venv\Scripts\python.exe backup_system\cli.py --verify-key
```

### D. Inspect Windows Task Scheduler
```powershell
Get-ScheduledTask -TaskName 'Pinkcity_ERP_Automated_Backup'
Get-ScheduledTaskInfo -TaskName 'Pinkcity_ERP_Automated_Backup'
```

---

## 6. Complete Disaster Recovery Procedures

### Scenario A: Restoring Uploaded Media Files

To restore all media files (or a missing subset) from the backup repository:

1. Restore latest media snapshot to a staging directory:
   ```cmd
   tools\restic.exe -r "\\192.168.1.7\Erp Software\Backups\Repository" restore latest --target "C:\Users\User\Desktop\Restore_Staging"
   ```
2. Enter the repository encryption password (stored in `EMERGENCY_RECOVERY_KEY.txt` or DPAPI vault).
3. Copy the restored files to the live media directory:
   ```cmd
   robocopy "C:\Users\User\Desktop\Restore_Staging\C\Users\User\Desktop\ERP Furniture\Backend\media" "C:\Users\User\Desktop\ERP Furniture\Backend\media" /E /XO
   ```

---

### Scenario B: Restoring the PostgreSQL Database

If database corruption occurs or roll-back is required:

1. **Extract the Database Dump from Restic**:
   ```cmd
   tools\restic.exe -r "\\192.168.1.7\Erp Software\Backups\Repository" restore latest --target "C:\Users\User\Desktop\Restore_Staging"
   ```
   Locate the extracted dump file:  
   `C:\Users\User\Desktop\Restore_Staging\...\postgres\erp_furniture_trial_<timestamp>.dump`

2. **Verify Dump Integrity Before Restoring**:
   ```cmd
   "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --list "C:\Users\User\Desktop\Restore_Staging\...\erp_furniture_trial_<timestamp>.dump"
   ```

3. **Terminate Existing Connections to the Target Database**:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'erp_furniture_trial' AND pid <> pg_backend_pid();
   ```

4. **Restore into erp_furniture_trial**:
   ```cmd
   "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U erp_trial_user -d erp_furniture_trial --clean --if-exists -v "C:\Users\User\Desktop\Restore_Staging\...\erp_furniture_trial_<timestamp>.dump"
   ```

5. **Verify Restoration**:
   ```sql
   SELECT current_database(), current_user;
   SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'; -- Expected: 52
   SELECT count(*) FROM django_migrations; -- Expected: 65
   ```

---

### Scenario C: Complete Host Laptop Failure (Bare-Metal Disaster Recovery)

If the laptop is replaced or restored from scratch:

1. Install PostgreSQL 18 and create the role `erp_trial_user` and database `erp_furniture_trial`.
2. Retrieve the physical printout of `EMERGENCY_RECOVERY_KEY.txt` from the company safe.
3. Download the standalone `restic.exe` binary.
4. Mount or connect to `\\192.168.1.7\Erp Software\Backups\Repository`.
5. Restore the snapshot:
   ```cmd
   restic.exe -r "\\192.168.1.7\Erp Software\Backups\Repository" restore latest --target "C:\Restore"
   ```
   Enter the key from the Emergency Key document.
6. The entire PostgreSQL custom dump and complete media directory will be restored exactly as captured.
7. Run `pg_restore` to restore the trial database and copy media files to `Backend\media`.

---

## 7. Handling Offline & Laptop Sleep Scenarios

- **Laptop Asleep / Turned Off at 8:00 PM**:
  Task Scheduler has `StartWhenAvailable = True`. When the laptop wakes up or is powered on, Windows Task Scheduler starts the missed backup automatically.
- **Network Share Disconnected / Host 192.168.1.7 Offline**:
  The backup engine pre-flight check detects share unavailability. It logs an explicit error in `backup_system\logs\backup_<date>.log` and aborts cleanly.
  **It never deletes existing backups or corrupts repository indices when the share is offline.**
  Task Scheduler will automatically retry execution 3 times at 15-minute intervals.
- **Battery Operation**:
  The task is configured with `-AllowStartIfOnBatteries` and `-DontStopIfGoingOnBatteries` so mobile laptop operation at 8:00 PM does not skip the scheduled backup.

---

## 8. Compliance & Strict Safety Boundaries

The backup system strictly respects company boundaries:
- **Authorized Database**: Only `erp_furniture_trial` is touched. Databases `erp_furniture_db`, `ai_ppt_qc`, `cricket`, and remote Neon/Railway databases are never accessed or modified.
- **Protected Network Drives**: Company drives `E:`, `Z:` (`\\kamlesh-2\all buyers`), and existing NAS data are completely untouched.
- **Existing Share Data**: Folders `Backend`, `Frontend`, `Deployment`, `Test_Reports`, and existing files in `\\192.168.1.7\Erp Software` are untouched.
- **Pruning Safety**: Only snapshots within `Backups\Repository` created by this system are subject to the 14-day retention policy. No external files are ever pruned.

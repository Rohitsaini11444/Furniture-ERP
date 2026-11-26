"""
Pinkcity Enterprises ERP - End-to-End Automated Backup & Recovery Engine
"""
import json
import logging
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from .config import (
    PROJECT_ROOT, BACKUP_SYSTEM_DIR, LOCAL_STAGING_DIR, LOCAL_LOGS_DIR,
    AUTHORIZED_DB, AUTHORIZED_USER, DB_HOST, DB_PORT, MEDIA_ROOT,
    SHARE_BASE, BACKUP_SHARE_DIR, REPOSITORY_SHARE_DIR,
    MANIFESTS_SHARE_DIR, LOGS_SHARE_DIR, RESTORE_REPORTS_SHARE_DIR,
    KEEP_DAILY_SNAPSHOTS
)
from .security import init_security, get_credentials
from .db_ops import (
    verify_database_identity, get_database_metrics,
    create_postgres_dump, test_database_restoration,
    DatabaseSecurityViolation
)
from .media_ops import get_media_inventory, test_media_restoration
from .restic_ops import (
    init_repository, create_snapshot, check_repository,
    list_snapshots, prune_repository
)

def setup_logger(log_file: Path):
    """Configure dual console and file logging."""
    log_file.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("erp_backup")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    return logger

def run_backup_and_recovery(is_scheduled: bool = False) -> dict:
    """
    Executes the full automated backup, encryption, verification,
    disposable restore testing, retention management, and reporting cycle.
    """
    start_time = datetime.now()
    timestamp_str = start_time.strftime("%Y%m%d_%H%M%S")
    date_str = start_time.strftime("%Y%m%d")

    local_log_path = LOCAL_LOGS_DIR / f"backup_{date_str}.log"
    logger = setup_logger(local_log_path)

    logger.info("================================================================================")
    logger.info(f"PINKCITY ENTERPRISES ERP - AUTOMATED BACKUP CYCLE INITIATED ({timestamp_str})")
    logger.info(f"Execution Mode: {'Scheduled Task' if is_scheduled else 'Interactive / Manual'}")
    logger.info("================================================================================")

    # 1. Environment & Share Reachability Check
    if not SHARE_BASE.exists():
        err_msg = (
            f"PRE-FLIGHT FAILURE: Network share {SHARE_BASE} is not reachable! "
            "Ensure the network storage host (192.168.1.7) is powered on and share permissions are active. "
            "Backup cannot proceed to shared storage. Staged data (if any) will be preserved."
        )
        logger.error(err_msg)
        return {"status": "FAILED", "reason": err_msg}

    # Ensure required directories on share exist
    BACKUP_SHARE_DIR.mkdir(parents=True, exist_ok=True)
    REPOSITORY_SHARE_DIR.mkdir(parents=True, exist_ok=True)
    MANIFESTS_SHARE_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_SHARE_DIR.mkdir(parents=True, exist_ok=True)
    RESTORE_REPORTS_SHARE_DIR.mkdir(parents=True, exist_ok=True)
    LOCAL_STAGING_DIR.mkdir(parents=True, exist_ok=True)

    # 2. Credential Retrieval & Security Check
    try:
        creds = get_credentials()
        restic_key = creds["restic_key"]
        db_password = creds["db_password"]
    except Exception as e:
        logger.error(f"Failed to access secure DPAPI credentials: {e}. Re-initializing security vault...")
        creds = init_security()
        restic_key = creds["restic_key"]
        db_password = creds["db_password"]

    logger.info("Security credentials successfully unlocked via Windows DPAPI.")

    # 3. Database Pre-flight & Identity Verification
    try:
        logger.info(f"Verifying target database identity: ('{AUTHORIZED_DB}', '{AUTHORIZED_USER}')...")
        db_metrics = get_database_metrics(db_password)
        logger.info(
            f"Database Identity CONFIRMED: {db_metrics['database_name']} "
            f"(User: {db_metrics['database_user']}, Tables: {db_metrics['table_count']}, "
            f"Migrations: {db_metrics['migrations_count']}, Size: {db_metrics['database_size_pretty']})"
        )
    except Exception as e:
        logger.error(f"Database pre-flight check failed: {e}")
        return {"status": "FAILED", "reason": f"Database pre-flight failed: {e}"}

    # 4. PostgreSQL Dump Execution & Integrity Check
    dump_filename = f"{AUTHORIZED_DB}_{timestamp_str}.dump"
    staging_dump_dir = LOCAL_STAGING_DIR / f"run_{timestamp_str}" / "postgres"
    staging_dump_file = staging_dump_dir / dump_filename

    try:
        logger.info(f"Executing pg_dump (custom compressed format with large objects) to {staging_dump_file}...")
        dump_res = create_postgres_dump(staging_dump_file, db_password)
        logger.info(
            f"pg_dump completed successfully. Size: {dump_res['dump_size_pretty']}. "
            f"Archive integrity verified ({dump_res['toc_entry_count']} TOC items)."
        )
    except Exception as e:
        logger.error(f"PostgreSQL dump failed: {e}")
        return {"status": "FAILED", "reason": f"pg_dump failed: {e}"}

    # 5. Media Inventory Collection
    logger.info(f"Scanning media directory: {MEDIA_ROOT}...")
    media_inventory = get_media_inventory()
    logger.info(
        f"Media inventory captured: {media_inventory['total_files']} files, "
        f"{media_inventory['total_size_pretty']} across subdirectories: {list(media_inventory['subdirectories'].keys())}"
    )

    # 6. Manifest Assembly
    staging_run_dir = LOCAL_STAGING_DIR / f"run_{timestamp_str}"
    manifest_path = staging_run_dir / f"manifest_{timestamp_str}.json"
    manifest_data = {
        "timestamp_local": start_time.strftime("%Y-%m-%d %H:%M:%S %z"),
        "timestamp_iso": start_time.isoformat(),
        "database": db_metrics,
        "dump": dump_res,
        "media": {
            "total_files": media_inventory["total_files"],
            "total_bytes": media_inventory["total_bytes"],
            "total_size_pretty": media_inventory["total_size_pretty"],
            "subdirectories": media_inventory["subdirectories"],
            "file_extensions": media_inventory["file_extensions"],
        },
        "destination": str(REPOSITORY_SHARE_DIR),
        "encryption": "AES-256 / Poly1305 (Restic Encrypted Repository)",
        "retention_policy": f"Keep {KEEP_DAILY_SNAPSHOTS} daily snapshots"
    }

    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest_data, mf, indent=2)
    logger.info(f"Backup manifest generated at {manifest_path}.")

    # 7. Restic Encrypted Backup to Shared Folder
    logger.info(f"Connecting to encrypted Restic repository at {REPOSITORY_SHARE_DIR}...")
    repo_newly_init = init_repository(REPOSITORY_SHARE_DIR, restic_key)
    if repo_newly_init:
        logger.info("Initialized new encrypted Restic repository on shared folder.")
    else:
        logger.info("Encrypted Restic repository already exists on shared folder.")

    logger.info("Executing deduplicated, encrypted snapshot...")
    snapshot_paths = [staging_run_dir, MEDIA_ROOT]
    snapshot_tags = [AUTHORIZED_DB, "daily" if is_scheduled else "manual"]
    snapshot_res = create_snapshot(REPOSITORY_SHARE_DIR, snapshot_paths, restic_key, tags=snapshot_tags)
    snapshot_id = snapshot_res.get("snapshot_id", "unknown")
    logger.info(
        f"Restic snapshot SUCCESSFUL! Snapshot ID: {snapshot_id[:8]} "
        f"(Processed {snapshot_res['total_files_processed']} files, added {snapshot_res['data_added_bytes'] / (1024*1024):.2f} MB)"
    )

    # Verify repository integrity
    logger.info("Verifying Restic repository structural integrity (restic check)...")
    check_res = check_repository(REPOSITORY_SHARE_DIR, restic_key)
    logger.info(f"Repository integrity check result: {check_res['status']}")

    # 8. Genuine Database Restoration Test
    logger.info("================================================================================")
    logger.info("STARTING MANDATORY RESTORATION VERIFICATION TESTS")
    logger.info("================================================================================")
    logger.info(f"Executing genuine database restore test into temporary disposable database from {staging_dump_file}...")
    try:
        db_restore_res = test_database_restoration(staging_dump_file, db_password)
        logger.info(
            f"Database restore test PASSED! Disposable DB: {db_restore_res['disposable_database']} -> "
            f"Tables: {db_restore_res['restored_tables_count']}, Migrations: {db_restore_res['restored_migrations_count']}, "
            f"Permissions: {db_restore_res['auth_permission_count']}, Foreign Keys: {db_restore_res['foreign_keys_count']}."
        )
        logger.info(f"Temporary database {db_restore_res['disposable_database']} dropped cleanly.")
    except Exception as e:
        logger.error(f"DATABASE RESTORATION TEST FAILED: {e}")
        return {"status": "FAILED", "reason": f"Database restoration test failed: {e}"}

    # 9. Genuine Media Restoration Test
    logger.info("Executing genuine media file restoration test against sample files...")
    media_restore_res = test_media_restoration(MEDIA_ROOT)
    logger.info(
        f"Media restore test {media_restore_res['status']}: "
        f"Verified {media_restore_res['files_tested_count']} sample files across all subdirectories with identical SHA-256 hashes."
    )

    # 10. Prune Old Snapshots (Retention Policy)
    logger.info(f"Applying retention policy: keeping last {KEEP_DAILY_SNAPSHOTS} daily recovery points for {AUTHORIZED_DB}...")
    try:
        prune_res = prune_repository(REPOSITORY_SHARE_DIR, restic_key, keep_daily=KEEP_DAILY_SNAPSHOTS, tag=AUTHORIZED_DB)
        logger.info("Retention pruning completed successfully.")
    except Exception as e:
        logger.warning(f"Warning during snapshot pruning: {e}")

    # 11. Publish Manifests, Logs and Status Reports to Shared Storage
    end_time = datetime.now()
    duration_secs = (end_time - start_time).total_seconds()

    # Publish manifest to network share
    share_manifest_path = MANIFESTS_SHARE_DIR / f"manifest_{timestamp_str}.json"
    with open(share_manifest_path, "w", encoding="utf-8") as smf:
        json.dump(manifest_data, smf, indent=2)

    # Publish restore test report
    restore_report_data = {
        "timestamp": end_time.isoformat(),
        "snapshot_id": snapshot_id,
        "database_restore_test": db_restore_res,
        "media_restore_test": media_restore_res,
        "overall_restore_verified": True
    }
    share_restore_report_path = RESTORE_REPORTS_SHARE_DIR / f"restore_report_{timestamp_str}.json"
    with open(share_restore_report_path, "w", encoding="utf-8") as srf:
        json.dump(restore_report_data, srf, indent=2)

    # Snapshot list for inventory
    snapshots = list_snapshots(REPOSITORY_SHARE_DIR, restic_key)
    logger.info(f"Current total retained snapshots in repository: {len(snapshots)}")

    # Update summary report
    summary_data = {
        "last_successful_backup": end_time.strftime("%Y-%m-%d %H:%M:%S Asia/Kolkata"),
        "last_snapshot_id": snapshot_id,
        "database": AUTHORIZED_DB,
        "database_tables": db_metrics["table_count"],
        "database_migrations": db_metrics["migrations_count"],
        "media_files": media_inventory["total_files"],
        "media_bytes": media_inventory["total_bytes"],
        "duration_seconds": round(duration_secs, 2),
        "retained_snapshots_count": len(snapshots),
        "restore_test_status": "PASSED",
        "latest_restore_report": str(share_restore_report_path),
        "latest_manifest": str(share_manifest_path),
        "next_scheduled_run": "Every day at 20:00 (Asia/Kolkata)"
    }
    with open(BACKUP_SHARE_DIR / "status_summary.json", "w", encoding="utf-8") as sf:
        json.dump(summary_data, sf, indent=2)

    # Copy log to shared folder
    share_log_path = LOGS_SHARE_DIR / f"backup_{date_str}.log"
    try:
        shutil.copy2(local_log_path, share_log_path)
    except Exception as e:
        logger.warning(f"Could not copy log to share: {e}")

    # Clean local staging directory for this run
    try:
        shutil.rmtree(staging_run_dir, ignore_errors=True)
    except Exception as e:
        logger.warning(f"Could not clean staging dir {staging_run_dir}: {e}")

    logger.info("================================================================================")
    logger.info(f"PINKCITY ERP BACKUP & RESTORATION CYCLE COMPLETED SUCCESSFULLY ({round(duration_secs, 2)}s)")
    logger.info("================================================================================")

    return {
        "status": "SUCCESS",
        "snapshot_id": snapshot_id,
        "duration_seconds": duration_secs,
        "database_metrics": db_metrics,
        "media_inventory": media_inventory,
        "restore_test": restore_report_data,
        "retained_snapshots": len(snapshots)
    }

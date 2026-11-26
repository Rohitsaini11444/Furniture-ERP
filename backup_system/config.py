"""
Pinkcity Enterprises ERP - Backup System Configuration
"""
import os
from pathlib import Path

# Base Paths
PROJECT_ROOT = Path(r"C:\Users\User\Desktop\ERP Furniture")
BACKUP_SYSTEM_DIR = PROJECT_ROOT / "backup_system"
LOCAL_STAGING_DIR = BACKUP_SYSTEM_DIR / "staging"
LOCAL_LOGS_DIR = BACKUP_SYSTEM_DIR / "logs"
TOOLS_DIR = PROJECT_ROOT / "tools"

# Security & Credentials
CREDENTIALS_DIR = Path(os.environ.get("USERPROFILE", r"C:\Users\User")) / ".pinkcity_erp_backup"
CREDENTIALS_FILE = CREDENTIALS_DIR / "credentials.enc"
EMERGENCY_KEY_FILE = CREDENTIALS_DIR / "EMERGENCY_RECOVERY_KEY.txt"

# Tools
RESTIC_EXE = TOOLS_DIR / "restic.exe"
PG_BIN_DIR = Path(r"C:\Program Files\PostgreSQL\18\bin")
PG_DUMP_EXE = PG_BIN_DIR / "pg_dump.exe"
PG_RESTORE_EXE = PG_BIN_DIR / "pg_restore.exe"
PSQL_EXE = PG_BIN_DIR / "psql.exe"
PYTHON_EXE = PROJECT_ROOT / ".venv" / "Scripts" / "python.exe"

# Database Configuration (STRICT SAFETY BOUNDARIES)
AUTHORIZED_DB = "erp_furniture_db"
AUTHORIZED_USER = "erp_app_user"
DB_HOST = "127.0.0.1"
DB_PORT = 5432

# Remote Shared Destination (UNC Paths)
SHARE_BASE = Path(r"\\192.168.1.7\Erp Software")
BACKUP_SHARE_DIR = SHARE_BASE / "Backups"
REPOSITORY_SHARE_DIR = BACKUP_SHARE_DIR / "Repository"
MANIFESTS_SHARE_DIR = BACKUP_SHARE_DIR / "Manifests"
LOGS_SHARE_DIR = BACKUP_SHARE_DIR / "Logs"
RESTORE_REPORTS_SHARE_DIR = BACKUP_SHARE_DIR / "Restore_Reports"
DOCUMENTATION_SHARE_DIR = SHARE_BASE / "Documentation"

# Media Configuration (Centralized Office Network Share)
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", str(SHARE_BASE / "Media")))

# Retention & Pruning
KEEP_DAILY_SNAPSHOTS = 14
KEEP_WEEKLY_SNAPSHOTS = 4

# Task Scheduler Configuration
TASK_NAME = "Pinkcity_ERP_Automated_Backup"
SCHEDULE_TIME = "20:00:00"  # 8:00 PM Asia/Kolkata
TIMEZONE = "India Standard Time"

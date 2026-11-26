"""
Pinkcity Enterprises ERP - Backup & Recovery CLI Interface
"""
import argparse
import json
import sys
from pathlib import Path

# Ensure backup_system can be imported when running as script
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from backup_system.config import (
    AUTHORIZED_DB, AUTHORIZED_USER, REPOSITORY_SHARE_DIR,
    BACKUP_SHARE_DIR, EMERGENCY_KEY_FILE
)
from backup_system.security import init_security, get_credentials
from backup_system.backup_engine import run_backup_and_recovery
from backup_system.restic_ops import list_snapshots, check_repository

def main():
    parser = argparse.ArgumentParser(description="Pinkcity Enterprises ERP Backup & Recovery CLI")
    parser.add_argument("--init-security", action="store_true", help="Initialize DPAPI credentials and emergency recovery key")
    parser.add_argument("--run", action="store_true", help="Execute complete automated backup and restore test cycle")
    parser.add_argument("--scheduled", action="store_true", help="Flag indicating execution from Windows Task Scheduler")
    parser.add_argument("--status", action="store_true", help="Show backup repository status, snapshots and health")
    parser.add_argument("--verify-key", action="store_true", help="Verify offline emergency recovery key against repository")

    args = parser.parse_args()

    if args.init_security:
        print("[*] Initializing DPAPI credential vault and Emergency Disaster Recovery Key...")
        creds = init_security()
        print("[+] Security credentials successfully protected with Windows DPAPI.")
        print(f"[+] Emergency Recovery Key document generated at: {EMERGENCY_KEY_FILE}")
        return 0

    if args.verify_key:
        print("[*] Verifying Emergency Recovery Key independence...")
        if not EMERGENCY_KEY_FILE.exists():
            print(f"[-] Emergency key file not found at {EMERGENCY_KEY_FILE}")
            return 1

        # Read key from emergency file
        with open(EMERGENCY_KEY_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        extracted_key = None
        for i, line in enumerate(lines):
            if "RESTIC REPOSITORY ENCRYPTION KEY:" in line and i + 1 < len(lines):
                extracted_key = lines[i+1].strip()
                break

        if not extracted_key:
            print("[-] Could not extract recovery key from emergency document.")
            return 1

        print("[*] Testing repository unlock with offline recovery key (simulating foreign machine recovery)...")
        try:
            snaps = list_snapshots(REPOSITORY_SHARE_DIR, extracted_key)
            print(f"[+] SUCCESS: Offline Emergency Recovery Key verified! Repository unlocked.")
            print(f"[+] Retained snapshots found: {len(snaps)}")
            return 0
        except Exception as e:
            print(f"[-] Key verification failed: {e}")
            return 1

    if args.status:
        print("================================================================================")
        print("PINKCITY ENTERPRISES ERP - BACKUP STATUS")
        print("================================================================================")
        summary_file = BACKUP_SHARE_DIR / "status_summary.json"
        if summary_file.exists():
            with open(summary_file, "r", encoding="utf-8") as f:
                summary = json.load(f)
            for k, v in summary.items():
                print(f"  {k:25}: {v}")
        else:
            print("  No status summary found on shared storage yet.")

        try:
            creds = get_credentials()
            snaps = list_snapshots(REPOSITORY_SHARE_DIR, creds["restic_key"])
            print(f"\nTotal Retained Snapshots: {len(snaps)}")
            for s in snaps[-5:]:
                print(f"  Snapshot {s.get('short_id', s.get('id', ''))[:8]} | Date: {s.get('time', '')} | Paths: {s.get('paths', [])}")
        except Exception as e:
            print(f"  Could not read snapshots: {e}")
        return 0

    if args.run or args.scheduled:
        res = run_backup_and_recovery(is_scheduled=args.scheduled)
        if res.get("status") == "SUCCESS":
            print("\n[+] Automated backup and verification cycle completed successfully.")
            return 0
        else:
            print(f"\n[-] Backup cycle failed: {res.get('reason')}")
            return 1

    parser.print_help()
    return 0

if __name__ == "__main__":
    sys.exit(main())

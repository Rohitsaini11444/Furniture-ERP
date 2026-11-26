"""
Restic Operations: Initialization, Encrypted Snapshots, Deduplication, Verification and Pruning
"""
import json
import os
import subprocess
from pathlib import Path
from .config import RESTIC_EXE

class ResticExecutionError(Exception):
    pass

def _run_restic(args: list, restic_key: str, check_rc: bool = True) -> subprocess.CompletedProcess:
    """Execute restic with RESTIC_PASSWORD in environment (non-interactive, no plaintext in CLI)."""
    env = os.environ.copy()
    env["RESTIC_PASSWORD"] = restic_key

    cmd = [str(RESTIC_EXE)] + args
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if check_rc and res.returncode != 0:
        raise ResticExecutionError(
            f"Restic command failed with exit code {res.returncode}:\n"
            f"Args: {' '.join(args[:4])} ...\n"
            f"Error: {res.stderr.strip() or res.stdout.strip()}"
        )
    return res

def init_repository(repo_path: Path, restic_key: str) -> bool:
    """Initialize restic repository if it does not already exist."""
    repo_str = str(repo_path)
    # Check if already initialized by running restic snapshots or checking config file
    config_file = repo_path / "config"
    if config_file.exists():
        return False

    res = _run_restic(["init", "-r", repo_str], restic_key)
    return True

def create_snapshot(repo_path: Path, paths_to_backup: list, restic_key: str, tags: list = None) -> dict:
    """Create an encrypted, deduplicated restic snapshot."""
    repo_str = str(repo_path)
    args = ["backup", "-r", repo_str, "--json"]
    if tags:
        for t in tags:
            args.extend(["--tag", t])
    for p in paths_to_backup:
        args.append(str(p))

    res = _run_restic(args, restic_key)

    # Parse JSON output from restic
    snapshot_info = {}
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
            if msg.get("message_type") == "summary":
                snapshot_info = msg
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "snapshot_id": snapshot_info.get("snapshot_id", "unknown"),
        "files_new": snapshot_info.get("files_new", 0),
        "files_changed": snapshot_info.get("files_changed", 0),
        "files_unmodified": snapshot_info.get("files_unmodified", 0),
        "data_added_bytes": snapshot_info.get("data_added", 0),
        "total_files_processed": snapshot_info.get("total_files_processed", 0),
        "total_bytes_processed": snapshot_info.get("total_bytes_processed", 0),
        "raw_summary": snapshot_info
    }

def check_repository(repo_path: Path, restic_key: str) -> dict:
    """Run integrity check on restic repository."""
    repo_str = str(repo_path)
    res = _run_restic(["check", "-r", repo_str], restic_key)
    return {
        "status": "SUCCESS" if res.returncode == 0 else "FAILED",
        "output": res.stdout.strip()
    }

def list_snapshots(repo_path: Path, restic_key: str) -> list:
    """List all snapshots in repository."""
    repo_str = str(repo_path)
    res = _run_restic(["snapshots", "--json", "-r", repo_str], restic_key)
    try:
        return json.loads(res.stdout)
    except Exception:
        return []

def prune_repository(repo_path: Path, restic_key: str, keep_daily: int = 14, tag: str = None) -> dict:
    """Prune older snapshots based on retention policy for a specific tag (or all if omitted)."""
    repo_str = str(repo_path)
    args = ["forget", "-r", repo_str]
    if tag:
        args.extend(["--tag", tag])
    args.extend(["--keep-daily", str(keep_daily), "--prune"])
    res = _run_restic(args, restic_key)
    return {
        "status": "SUCCESS",
        "output": res.stdout.strip()
    }

def restore_snapshot_subset(repo_path: Path, snapshot_id: str, target_dir: Path, restic_key: str, include_patterns: list = None) -> dict:
    """Restore snapshot or subset to a target directory."""
    repo_str = str(repo_path)
    args = ["restore", snapshot_id, "-r", repo_str, "--target", str(target_dir)]
    if include_patterns:
        for pat in include_patterns:
            args.extend(["--include", pat])

    res = _run_restic(args, restic_key)
    return {
        "status": "SUCCESS",
        "target_dir": str(target_dir)
    }
